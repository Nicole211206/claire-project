import logging
from collections import defaultdict
from typing import Any

from sqlalchemy.orm import Session

from . import crud
from .utils import now_ms, to_number

logger = logging.getLogger(__name__)

# Rajada de tombstones: se um único lote (mesmo instante, ou dentro desta
# janela) cobrir uma fração muito alta de UMA coleção de uma vez, é mais
# provável ser um bug de cliente (ex.: variável em memória ainda vazia no
# boot, tratando "não conheço esse id" como "usuário apagou") do que uma
# exclusão em massa deliberada. Rede de segurança complementar ao fix no
# app.js (_dataLoaded antes de _carimbarTsEDeletes) — não substitui, cobre o
# caso de outro bug parecido aparecer no futuro.
TOMBSTONE_BURST_WINDOW_MS = 5000
TOMBSTONE_BURST_FRACTION = 0.8
TOMBSTONE_BURST_MIN_COUNT = 5


def _ids_em_rajada_suspeita(tomb_map: dict, would_remove_ids: set, total_na_colecao: int) -> set:
    """Agrupa os ids que SERIAM removidos por bucket de tempo (janela de
    TOMBSTONE_BURST_WINDOW_MS) e devolve os que pertencem a um bucket que
    cobre uma fração alta da coleção de uma só vez — esses ficam de fora da
    remoção (a exclusão é rejeitada só para eles, o resto do save segue
    normal)."""
    if total_na_colecao < TOMBSTONE_BURST_MIN_COUNT:
        return set()
    por_bucket = defaultdict(set)
    for rid in would_remove_ids:
        ts = tomb_map.get(rid, 0)
        bucket = int(ts // TOMBSTONE_BURST_WINDOW_MS)
        por_bucket[bucket].add(rid)
    suspeitos = set()
    for ids in por_bucket.values():
        if len(ids) >= TOMBSTONE_BURST_MIN_COUNT and (len(ids) / total_na_colecao) > TOMBSTONE_BURST_FRACTION:
            suspeitos |= ids
    return suspeitos


# As 12 listas com merge por registro (união por id, mantém o de _ts maior).
MERGE_POR_ID = [
    "nx_manutencoes", "nx_tasks", "nx_plantao", "nx_projetos", "nx_compras",
    "nx_extras", "nx_conquistas", "nx_despesas", "nx_anotacoes_controle",
    "nx_superhost", "nx_cancelamentos", "nx_imoveis",
]

# Listas com trava de encolhimento (não passam pelo merge por id acima).
PROT = ["nx_turnos", "nx_users", "nx_catalog", "nx_notes", "nx_imoveis"]
PROT_SENSIVEL = set(k for k in PROT if k != "nx_turnos")

# Dicionários por mês (nx_kpivals/nx_kpisub), mesclados campo a campo em
# qualquer profundidade — ver _merge_profundo.
MERGE_KPI_DICT = ["nx_kpivals", "nx_kpisub"]

# Coleções do documento sendo espelhadas na tabela genérica `records`
# (equivalente ao D1_MIRROR_COLLECTIONS do worker original).
MIRROR_COLLECTIONS = {"nx_manutencoes": "manutencoes"}


def _ts_num(o: Any) -> float:
    if not isinstance(o, dict):
        return 0
    return to_number(o.get("_ts") or 0)


def _tem_id(a: Any) -> bool:
    return isinstance(a, list) and all(isinstance(o, dict) and o.get("id") is not None for o in a)


def _merge_profundo(a: Any, b: Any) -> Any:
    """Réplica de _mergeProfundo do worker: em qualquer profundidade, o que
    chegou agora (b) vence só nas chaves que de fato trouxe; o resto de a fica."""
    if isinstance(b, dict) and isinstance(a, dict):
        out = dict(a)
        for k in b:
            out[k] = _merge_profundo(a.get(k), b[k])
        return out
    return b if b is not None else a


def _mirror_collection(db: Session, collection: str, arr: list, tomb_map: dict):
    agora = now_ms()
    for rec in arr:
        if not isinstance(rec, dict) or rec.get("id") is None:
            continue
        rid = str(rec["id"])
        raw_ts = rec.get("_ts")
        ts = to_number(raw_ts) if raw_ts else agora
        crud.upsert_record_if_newer(db, collection, rid, rec, int(ts))
    if tomb_map:
        for tid, tts in tomb_map.items():
            crud.soft_delete_record_if_newer(db, collection, str(tid), int(tts))


def do_merge(db: Session, prev: dict, parsed_in: dict) -> dict:
    """Réplica fiel do bloco de merge do POST /save do claire-dados-worker.js.

    Levanta exceção em qualquer erro inesperado — quem chama decide o
    fallback (falha-segura: usar o `parsed` original, sem merge nenhum).
    """
    # Chaves fora do padrão nx_* nunca são legítimas neste documento.
    parsed = {k: v for k, v in parsed_in.items() if k.startswith("nx_")}
    prev_f = {k: v for k, v in prev.items() if k.startswith("nx_")}
    merged = {**prev_f, **parsed}  # chave ausente em parsed -> mantém a de prev

    # ── merge por registro (id + _ts) ──
    for k in MERGE_POR_ID:
        P = prev_f.get(k)
        N = parsed.get(k)
        if not _tem_id(P) or not _tem_id(N):
            continue  # se qualquer lado não for lista-com-id, deixa a regra normal (spread) cuidar
        p_map = {o["id"]: o for o in P}
        n_map = {o["id"]: o for o in N}
        ordem = []
        visto = set()
        for o in N:
            if o["id"] not in visto:
                visto.add(o["id"])
                ordem.append(o["id"])
        for o in P:
            if o["id"] not in visto:
                visto.add(o["id"])
                ordem.append(o["id"])
        novo = []
        for id_ in ordem:
            p = p_map.get(id_)
            n = n_map.get(id_)
            if p is not None and n is not None:
                novo.append(p if _ts_num(p) > _ts_num(n) else n)  # mais recente vence
            else:
                novo.append(n if n is not None else p)  # só de um lado -> mantém
        merged[k] = novo

    # ── merge profundo (nx_kpivals/nx_kpisub): dicionário por mês, mescla
    # campo a campo em qualquer profundidade em vez do spread trocar o mês
    # inteiro ──
    for k in MERGE_KPI_DICT:
        P = prev_f.get(k)
        N = parsed.get(k)
        if not isinstance(P, dict) or not isinstance(N, dict):
            continue
        merged[k] = _merge_profundo(P, N)

    # ── tombstones: exclusões explícitas { id, ts } ──
    tombs = merged.get("nx_tombstones") if isinstance(merged.get("nx_tombstones"), list) else []
    tomb_map: dict = {}
    for t in tombs:
        if isinstance(t, dict) and t.get("id") is not None:
            tomb_map[t["id"]] = to_number(t.get("ts") or 0)
    if tombs:
        for k in MERGE_POR_ID:
            if not isinstance(merged.get(k), list):
                continue
            arr = merged[k]
            would_remove_ids = {
                o.get("id") for o in arr
                if o.get("id") in tomb_map and tomb_map[o.get("id")] >= _ts_num(o)
            }
            rajada = _ids_em_rajada_suspeita(tomb_map, would_remove_ids, len(arr))
            if rajada:
                logger.warning(
                    "merge: rajada de tombstones rejeitada em %s — %d de %d ids "
                    "(%.0f%%) num único lote; mantendo os itens no servidor.",
                    k, len(rajada), len(arr), 100 * len(rajada) / len(arr),
                )
            merged[k] = [
                o for o in arr
                if o.get("id") not in tomb_map
                or o.get("id") in rajada
                or tomb_map[o.get("id")] < _ts_num(o)
            ]

    # ── trava de encolhimento (clássica + "encolheu demais") ──
    for k in PROT:
        if k in MERGE_POR_ID:
            continue
        n_new = len(parsed[k]) if isinstance(parsed.get(k), list) else None
        n_old = len(prev_f[k]) if isinstance(prev_f.get(k), list) else None
        if n_old is None or n_new is None or n_new >= n_old:
            continue
        catastrofico = (n_new == 0 and n_old >= 3) or (n_old >= 8 and n_new <= 2)
        encolheu_demais = k in PROT_SENSIVEL and ((n_old - n_new) >= 5 or (n_old >= 10 and n_new < n_old * 0.8))
        if catastrofico or encolheu_demais:
            merged[k] = prev_f[k]  # mantém a lista do servidor (não deixa encolher)

    # ── não deixa zerar todas as fotos dos atendentes ──
    atts_prev = prev_f.get("nx_atts") if isinstance(prev_f.get("nx_atts"), list) else []
    atts_new = parsed.get("nx_atts") if isinstance(parsed.get("nx_atts"), list) else []
    f_old = sum(1 for x in atts_prev if isinstance(x, dict) and x.get("foto"))
    f_new = sum(1 for x in atts_new if isinstance(x, dict) and x.get("foto"))
    if f_old >= 2 and f_new == 0:
        merged["nx_atts"] = prev_f.get("nx_atts")

    merged["nx_lastSaved"] = str(now_ms())  # STRING aqui — igual ao worker original

    # ── espelha coleções "em transição" na tabela records (best-effort) ──
    for kv_key, col_name in MIRROR_COLLECTIONS.items():
        if isinstance(merged.get(kv_key), list):
            try:
                _mirror_collection(db, col_name, merged[kv_key], tomb_map)
            except Exception:
                pass

    return merged
