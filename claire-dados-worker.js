/*
 * ════════════════════════════════════════════════════════════
 *  CLAIRE — Worker de Dados Compartilhados (Cloudflare KV)
 * ════════════════════════════════════════════════════════════
 *
 *  PARA QUE SERVE:
 *  Guarda os dados da Claire num lugar central (Cloudflare KV) para que
 *  TODOS os usuários (admin, coordenação, atendentes) vejam os mesmos
 *  dados de qualquer dispositivo — contas de login, turnos, demandas, etc.
 *
 *  ════════ COMO PUBLICAR (passo a passo) ════════
 *  1. Cloudflare Dashboard → Workers & Pages → Create → Worker
 *       Nome: claire-dados  →  Deploy
 *  2. Edit code → cole TODO este arquivo → Deploy
 *  3. Criar o banco KV:
 *       Storage & Databases → KV → Create namespace
 *       Nome do namespace: CLAIRE_KV  → Create
 *  4. Ligar o KV ao Worker:
 *       claire-dados → Settings → Bindings → Add binding → KV namespace
 *       Variable name: CLAIRE_KV   |   KV namespace: (selecione o que criou)  → Deploy
 *  5. Criar o token de segurança:
 *       claire-dados → Settings → Variables and Secrets → Add
 *       Tipo: Secret  |  Nome: CLAIRE_TOKEN  |  Valor: (invente uma senha forte)
 *       → Deploy
 *  6. Copie a URL do Worker (ex: https://claire-dados.SEU.workers.dev)
 *     e o token escolhido — você vai colar os dois na Claire
 *     (arquivo index.html, no bloco window.CLAIRE_SYNC).
 *
 *  Endpoints internos (Claire app):
 *    GET  <worker>/load               → devolve o estado completo (JSON)
 *    POST <worker>/save  (body JSON)  → grava o estado completo
 *    GET  <worker>/backups            → lista snapshots disponíveis
 *    GET  <worker>/load-backup?date=  → restaura snapshot de uma data
 *    Autenticação: ?token=XXX  ou  header X-Token: XXX
 *
 *  API Jarvis (REST):
 *    GET    /api/tasks              → lista tarefas
 *    POST   /api/tasks              → cria tarefa  {text, cat?, prio?, due?, status?}
 *    PATCH  /api/tasks/:id          → atualiza tarefa (campos parciais)
 *    DELETE /api/tasks/:id          → apaga tarefa
 *    GET    /api/demands            → lista demandas de todas as ATTs
 *    POST   /api/demands            → cria demanda  {attId, text, prio?, due?, status?}
 *    PATCH  /api/demands/:attId/:idx → atualiza demanda
 *    GET    /api/projects           → lista projetos
 *    POST   /api/projects           → cria projeto  {nome, status?, dataInicio?, dataFim?}
 *    PATCH  /api/projects/:id       → atualiza projeto
 *    GET    /api/summary            → resumo rápido para o Jarvis
 */

const KEY = 'claire-state-v1';
const BACKUP_PREFIX = 'claire-backup-'; // chave agora é por HORA (ex.: claire-backup-2026-07-02T14), não mais por dia
const BACKUP_TTL = 8 * 24 * 3600; // 8 dias em segundos

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Token',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Autenticação simples por token compartilhado
    const token = url.searchParams.get('token') || request.headers.get('X-Token') || '';
    if (env.CLAIRE_TOKEN && token !== env.CLAIRE_TOKEN) {
      return jsonResp({ error: 'nao autorizado' }, cors, 401);
    }
    if (!env.CLAIRE_KV) {
      return jsonResp({ error: 'KV nao configurado: crie o binding CLAIRE_KV' }, cors, 500);
    }

    try {
      if (url.pathname.endsWith('/load')) {
        const v = await env.CLAIRE_KV.get(KEY);
        return jsonResp({ data: v ? JSON.parse(v) : null }, cors);
      }
      // ── ANEXOS (fotos, PDFs, NF) ──
      // Guardados como chave própria no MESMO namespace CLAIRE_KV (sem R2 —
      // R2 exige cartão cadastrado na conta, que não temos por enquanto).
      // Cada anexo vira uma chave separada (fora do documento grande), então
      // não infla mais o localStorage/documento sincronizado de ninguém.
      if (url.pathname.endsWith('/upload') && request.method === 'POST') {
        const body = await request.json();
        const dataUrl = body.dataUrl || '';
        const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
        if (!m) return jsonResp({ error: 'dataUrl invalido' }, cors, 400);
        const mime = body.mime || m[1] || 'application/octet-stream';
        let bytes;
        try {
          const bin = atob(m[2]);
          bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } catch (e) {
          return jsonResp({ error: 'base64 invalido' }, cors, 400);
        }
        const key = 'anexo_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        await env.CLAIRE_KV.put(key, bytes, { metadata: { mime, filename: body.filename || '' } });
        const fileUrl = url.origin + '/files/' + key + '?token=' + encodeURIComponent(token);
        return jsonResp({ ok: true, url: fileUrl, key }, cors, 201);
      }
      if (url.pathname.includes('/files/') && request.method === 'GET') {
        const key = url.pathname.split('/files/')[1];
        if (!key) return jsonResp({ error: 'chave obrigatoria' }, cors, 400);
        const obj = await env.CLAIRE_KV.getWithMetadata(key, 'arrayBuffer');
        if (!obj || obj.value === null) return jsonResp({ error: 'arquivo nao encontrado' }, cors, 404);
        const meta = obj.metadata || {};
        return new Response(obj.value, {
          status: 200,
          headers: { 'Content-Type': meta.mime || 'application/octet-stream', 'Cache-Control': 'private, max-age=31536000', ...cors },
        });
      }
      if (url.pathname.endsWith('/save') && request.method === 'POST') {
        const body = await request.text();
        // valida que é JSON antes de gravar
        const parsed = JSON.parse(body);
        // ── TRAVA ANTI-PERDA (lado do servidor) ──
        // 1) CHAVE AUSENTE NO ENVIO → preserva o valor anterior daquela chave.
        //    Um aparelho com o app desatualizado (aba velha aberta, cache) não
        //    conhece campos novos e nunca os inclui no envio — sem isso, seu
        //    "put" (que sobrescreve o documento inteiro) apagaria silenciosamente
        //    qualquer campo novo que outro aparelho/versão tenha acabado de
        //    gravar. Isso já causou dados "sumindo" sem ninguém apagar nada.
        // 2) LISTA QUE ENCOLHERIA CATASTROFICAMENTE (zerar, ou ≥8 caindo p/ ≤2)
        //    → também mantém a versão do servidor NAQUELA chave.
        // Não RECUSA a gravação inteira (isso bloquearia adições legítimas de
        // quem está com alguma lista atrasada) — mescla por chave e aceita o
        // resto. Falha-segura: qualquer erro aqui cai no salvamento normal do body.
        let bodyToSave = body;
        try {
          const prevRaw = await env.CLAIRE_KV.get(KEY);
          if (prevRaw) {
            const prev = JSON.parse(prevRaw);
            // Chaves fora do padrão nx_* (ex.: "data", "error") nunca são legítimas
            // neste documento — nunca gravar nem herdar. Isso limpa sozinho qualquer
            // contaminação antiga (ex.: um payload colado errado em algum momento)
            // em vez de preservá-la para sempre por causa da regra de baixo.
            for (const k of Object.keys(parsed)) { if (!k.startsWith('nx_')) delete parsed[k]; }
            for (const k of Object.keys(prev)) { if (!k.startsWith('nx_')) delete prev[k]; }
            const merged = { ...prev, ...parsed }; // chave ausente em parsed → mantém a de prev
            // ── MESCLAGEM POR REGISTRO (id + _ts), à prova de aparelho desatualizado ──
            // Para as listas com id próprio: em vez de o envio substituir a lista
            // inteira, mescla item a item. Para cada id:
            //   • presente nos dois lados → fica a versão com _ts MAIOR (a mais
            //     recente). Um aparelho com app velho manda registros sem _ts (ou
            //     _ts antigo) e NÃO consegue mais reverter o que outro editou depois.
            //   • presente só de um lado → é mantido (união) — nada é apagado.
            // (Deletes só se propagam via nx_tombstones, tratado logo abaixo.)
            const MERGE_POR_ID = ['nx_manutencoes','nx_tasks','nx_plantao','nx_projetos','nx_compras','nx_extras','nx_conquistas','nx_despesas','nx_anotacoes_controle','nx_superhost','nx_cancelamentos'];
            const _tsNum = o => Number(o && o._ts || 0);
            const _temId = a => Array.isArray(a) && a.every(o => o && typeof o === 'object' && o.id !== undefined && o.id !== null);
            for (const k of MERGE_POR_ID) {
              const P = prev[k], N = parsed[k];
              if (!_temId(P) || !_temId(N)) continue; // se qualquer lado não for lista-com-id, deixa a regra normal cuidar
              const pMap = new Map(P.map(o => [o.id, o]));
              const nMap = new Map(N.map(o => [o.id, o]));
              const ordem = []; const visto = new Set();
              for (const o of N) if (!visto.has(o.id)) { visto.add(o.id); ordem.push(o.id); }
              for (const o of P) if (!visto.has(o.id)) { visto.add(o.id); ordem.push(o.id); }
              merged[k] = ordem.map(id => {
                const p = pMap.get(id), n = nMap.get(id);
                if (p && n) return _tsNum(p) > _tsNum(n) ? p : n; // mais recente vence
                return n || p; // só de um lado → mantém
              });
            }
            // Tombstones: exclusões explícitas { id, ts }. Remove das listas o id
            // marcado como apagado com ts >= _ts do registro (assim delete funciona
            // mesmo com a união acima, sem "ressuscitar" o que foi apagado de verdade).
            const tombs = Array.isArray(merged.nx_tombstones) ? merged.nx_tombstones : [];
            if (tombs.length) {
              const tMap = new Map(); for (const t of tombs) if (t && t.id != null) tMap.set(t.id, Number(t.ts || 0));
              for (const k of MERGE_POR_ID) {
                if (!Array.isArray(merged[k])) continue;
                merged[k] = merged[k].filter(o => { const tt = tMap.get(o.id); return !(tt !== undefined && tt >= _tsNum(o)); });
              }
            }
            // 3) ENCOLHEU DEMAIS DE UMA VEZ (mesmo sem zerar) → também protege.
            //    A regra antiga só pegava quase-zerar (≥8 caindo a ≤2). Isso deixou
            //    passar um aparelho desatualizado derrubando 89 tarefas para 72 (uma
            //    perda de 17, real, silenciosa) porque 72 não é "quase zero". Agora:
            //    perdeu 5+ de uma vez, OU perdeu mais de 20% (lista com 10+), protege.
            //    nx_turnos fica de fora dessa regra mais sensível porque tem uma ação
            //    própria ("Zerar Mês") que apaga um bloco grande de propósito.
            // Trava de encolhimento — só para as chaves que NÃO passam pela mesclagem
            // por id acima (essas já são união, nunca encolhem sozinhas).
            const PROT = ['nx_turnos','nx_users','nx_catalog','nx_notes','nx_imoveis'];
            const PROT_SENSIVEL = new Set(PROT.filter(k => k !== 'nx_turnos'));
            for (const k of PROT) {
              if (MERGE_POR_ID.includes(k)) continue;
              const nNew = Array.isArray(parsed[k]) ? parsed[k].length : null;
              const nOld = Array.isArray(prev[k]) ? prev[k].length : null;
              if (nOld == null || nNew == null || nNew >= nOld) continue;
              const catastrofico = (nNew === 0 && nOld >= 3) || (nOld >= 8 && nNew <= 2);
              const encolheuDemais = PROT_SENSIVEL.has(k) && ((nOld - nNew) >= 5 || (nOld >= 10 && nNew < nOld * 0.8));
              if (catastrofico || encolheuDemais) {
                merged[k] = prev[k]; // mantém a lista do servidor (não deixa encolher)
              }
            }
            // não deixa zerar todas as fotos dos atendentes
            const fOld = (Array.isArray(prev.nx_atts) ? prev.nx_atts : []).filter(x => x && x.foto).length;
            const fNew = (Array.isArray(parsed.nx_atts) ? parsed.nx_atts : []).filter(x => x && x.foto).length;
            if (fOld >= 2 && fNew === 0) { merged.nx_atts = prev.nx_atts; }
            merged.nx_lastSaved = String(Date.now());
            bodyToSave = JSON.stringify(merged);
          }
        } catch (e) { /* falha-segura: salva o body original */ }
        await env.CLAIRE_KV.put(KEY, bodyToSave);
        // Snapshot de hora em hora: salva uma vez por hora (primeira gravação daquela
        // hora), expira em 8 dias. Antes era 1x por dia — a janela de risco entre um
        // problema acontecer e o snapshot mais próximo ainda "limpo" chegava a 24h.
        // Isso custa no máximo +23 gravações/dia no KV (a gravação principal acima já
        // é 1 por hora, essa aqui só ativa quando ainda não existe o snapshot da hora),
        // bem longe do limite gratuito de ~1000 escritas/dia.
        const horaAtual = new Date().toISOString().substring(0, 13); // "2026-07-02T14"
        const backupKey = BACKUP_PREFIX + horaAtual;
        const existing = await env.CLAIRE_KV.get(backupKey);
        if (!existing) {
          await env.CLAIRE_KV.put(backupKey, bodyToSave, { expirationTtl: BACKUP_TTL });
        }
        return jsonResp({ ok: true }, cors);
      }
      // Lista snapshots disponíveis
      if (url.pathname.endsWith('/backups')) {
        const list = await env.CLAIRE_KV.list({ prefix: BACKUP_PREFIX });
        const backups = list.keys.map(k => ({ date: k.name.replace(BACKUP_PREFIX, '') }));
        backups.sort((a, b) => b.date.localeCompare(a.date));
        return jsonResp({ backups }, cors);
      }
      // Carrega um snapshot específico
      if (url.pathname.endsWith('/load-backup')) {
        const date = url.searchParams.get('date');
        if (!date) return jsonResp({ error: 'parametro date obrigatorio' }, cors, 400);
        const v = await env.CLAIRE_KV.get(BACKUP_PREFIX + date);
        return jsonResp({ data: v ? JSON.parse(v) : null }, cors);
      }
      if (url.pathname.endsWith('/health')) {
        return jsonResp({ ok: true, kv: !!env.CLAIRE_KV }, cors);
      }

      // ═══ API Jarvis ═══
      const corsApi = { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
      if (url.pathname.startsWith('/api/')) {
        return handleApi(request, url, env, corsApi);
      }

      return jsonResp({ error: 'rota nao encontrada' }, cors, 404);
    } catch (e) {
      return jsonResp({ error: String(e && e.message || e) }, cors, 500);
    }
  },
};

function jsonResp(obj, cors, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

// ─── Helpers KV ───
async function kvLoad(env) {
  const v = await env.CLAIRE_KV.get(KEY);
  return v ? JSON.parse(v) : {};
}
async function kvSave(env, state) {
  state.nx_lastSaved = Date.now();
  await env.CLAIRE_KV.put(KEY, JSON.stringify(state));
}

// ─── Roteador da API Jarvis ───
async function handleApi(request, url, env, cors) {
  const method = request.method;
  const path = url.pathname.replace('/api/', '');   // ex: "tasks", "tasks/123"
  const parts = path.split('/');                     // ["tasks"] ou ["tasks","123"]
  const resource = parts[0];
  const param1 = parts[1];
  const param2 = parts[2];

  try {
    const state = await kvLoad(env);

    // ── /api/summary ──────────────────────────────────────────
    if (resource === 'summary' && method === 'GET') {
      const tasks = state.nx_tasks || [];
      const projects = state.nx_projetos || [];
      const atts = state.nx_atts || [];
      const demands = atts.flatMap(a => (a.demands || []).map(d => ({ ...d, attId: a.id, attName: a.name })));
      return jsonResp({
        tasks:    { total: tasks.length, pending: tasks.filter(t => !t.done).length, done: tasks.filter(t => t.done).length },
        projects: { total: projects.length, active: projects.filter(p => p.status === 'andamento').length },
        demands:  { total: demands.length, pending: demands.filter(d => d.status !== 'done').length },
      }, cors);
    }

    // ── /api/tasks ────────────────────────────────────────────
    if (resource === 'tasks') {
      let tasks = state.nx_tasks || [];

      if (method === 'GET' && !param1) {
        const status = url.searchParams.get('status');
        const list = status ? tasks.filter(t => status === 'done' ? t.done : !t.done) : tasks;
        return jsonResp({ tasks: list }, cors);
      }

      if (method === 'POST' && !param1) {
        const body = await request.json();
        if (!body.text) return jsonResp({ error: 'campo text obrigatorio' }, cors, 400);
        const task = {
          id: Date.now(),
          text: body.text,
          cat: body.cat || 'work',
          prio: body.prio || 'med',
          due: body.due || null,
          status: body.status || 'todo',
          done: false,
          updates: [],
          createdBy: 'jarvis',
        };
        tasks.push(task);
        state.nx_tasks = tasks;
        await kvSave(env, state);
        return jsonResp({ ok: true, task }, cors, 201);
      }

      if (method === 'PATCH' && param1) {
        const id = parseInt(param1);
        const idx = tasks.findIndex(t => t.id === id);
        if (idx < 0) return jsonResp({ error: 'tarefa nao encontrada' }, cors, 404);
        const body = await request.json();
        if (body.done !== undefined || body.status === 'done') {
          tasks[idx].done = true; tasks[idx].status = 'done';
        } else if (body.status) {
          tasks[idx].status = body.status; tasks[idx].done = false;
        }
        const campos = ['text','cat','prio','due','dataInicio','projetoId'];
        campos.forEach(c => { if (body[c] !== undefined) tasks[idx][c] = body[c]; });
        state.nx_tasks = tasks;
        await kvSave(env, state);
        return jsonResp({ ok: true, task: tasks[idx] }, cors);
      }

      if (method === 'DELETE' && param1) {
        const id = parseInt(param1);
        const before = tasks.length;
        state.nx_tasks = tasks.filter(t => t.id !== id);
        if (state.nx_tasks.length === before) return jsonResp({ error: 'tarefa nao encontrada' }, cors, 404);
        await kvSave(env, state);
        return jsonResp({ ok: true }, cors);
      }
    }

    // ── /api/demands ──────────────────────────────────────────
    if (resource === 'demands') {
      const atts = state.nx_atts || [];

      if (method === 'GET' && !param1) {
        const attFilter = url.searchParams.get('attId');
        const demands = atts.flatMap(a =>
          (a.demands || []).map((d, i) => ({ ...d, attId: a.id, attName: a.name, _idx: i }))
        );
        return jsonResp({ demands: attFilter ? demands.filter(d => d.attId === attFilter) : demands }, cors);
      }

      if (method === 'POST' && !param1) {
        const body = await request.json();
        if (!body.attId || !body.text) return jsonResp({ error: 'campos attId e text obrigatorios' }, cors, 400);
        const att = atts.find(a => a.id === body.attId);
        if (!att) return jsonResp({ error: 'ATT nao encontrada' }, cors, 404);
        if (!att.demands) att.demands = [];
        const demand = {
          id: Date.now(),
          text: body.text,
          prio: body.prio || 'med',
          due: body.due || null,
          status: body.status || 'todo',
          done: false,
          createdBy: 'jarvis',
        };
        att.demands.push(demand);
        state.nx_atts = atts;
        await kvSave(env, state);
        return jsonResp({ ok: true, demand }, cors, 201);
      }

      // PATCH /api/demands/:attId/:idx
      if (method === 'PATCH' && param1 && param2 !== undefined) {
        const att = atts.find(a => a.id === param1);
        if (!att) return jsonResp({ error: 'ATT nao encontrada' }, cors, 404);
        const idx = parseInt(param2);
        if (!att.demands || !att.demands[idx]) return jsonResp({ error: 'demanda nao encontrada' }, cors, 404);
        const body = await request.json();
        if (body.done !== undefined || body.status === 'done') {
          att.demands[idx].done = true; att.demands[idx].status = 'done';
        } else if (body.status) {
          att.demands[idx].status = body.status; att.demands[idx].done = false;
        }
        ['text','prio','due'].forEach(c => { if (body[c] !== undefined) att.demands[idx][c] = body[c]; });
        state.nx_atts = atts;
        await kvSave(env, state);
        return jsonResp({ ok: true, demand: att.demands[idx] }, cors);
      }
    }

    // ── /api/projects ─────────────────────────────────────────
    if (resource === 'projects') {
      let projects = state.nx_projetos || [];

      if (method === 'GET' && !param1) {
        return jsonResp({ projects }, cors);
      }

      if (method === 'POST' && !param1) {
        const body = await request.json();
        if (!body.nome) return jsonResp({ error: 'campo nome obrigatorio' }, cors, 400);
        const project = {
          id: Date.now(),
          nome: body.nome,
          status: body.status || 'planejamento',
          dataInicio: body.dataInicio || null,
          dataFim: body.dataFim || null,
          desc: body.desc || '',
          tasks: [],
          createdBy: 'jarvis',
        };
        projects.push(project);
        state.nx_projetos = projects;
        await kvSave(env, state);
        return jsonResp({ ok: true, project }, cors, 201);
      }

      if (method === 'PATCH' && param1) {
        const id = parseInt(param1);
        const idx = projects.findIndex(p => p.id === id);
        if (idx < 0) return jsonResp({ error: 'projeto nao encontrado' }, cors, 404);
        const body = await request.json();
        ['nome','status','dataInicio','dataFim','desc'].forEach(c => {
          if (body[c] !== undefined) projects[idx][c] = body[c];
        });
        state.nx_projetos = projects;
        await kvSave(env, state);
        return jsonResp({ ok: true, project: projects[idx] }, cors);
      }
    }

    // ── /api/manutencoes ──────────────────────────────────────
    if (resource === 'manutencoes' && method === 'POST' && !param1) {
      const body = await request.json();
      if (!body.imovelNome) return jsonResp({ error: 'campo imovelNome obrigatorio' }, cors, 400);
      let manutencoes = state.nx_manutencoes || [];
      const m = {
        id: Date.now(), status: 'solicitacao', pausado: false, origem: 'onboarding',
        imovelNome: body.imovelNome,
        dataSolicitacao: body.dataSolicitacao || new Date().toISOString().split('T')[0],
        dataPrazo: '', tipo: 'reparo',
        itens: [{ desc: body.nome || 'Manutenção', valor: body.valor || 0 }],
        margemPercent: 20, fotos: [], quemPaga: 'proprietario',
        fornecedor: { nome: '', contato: '', email: '', pix: '' },
        precisaComprar: false, linksItens: [], ondeEntregar: '', obsCompra: '',
        pagarFornecedor: false,
        pagFornecedor: { valor: 0, nome: '', email: '', pix: '', cpfCnpj: '', dataPagamento: '', fornCadId: null },
        repassarHostaway: false, valorPago: 0, pagoPor: 'proprietario', valorGasto: 0,
        obs: body.obs || '', tarefasManut: [], responsavel: '', dataCriacao: new Date().toISOString(),
      };
      manutencoes.unshift(m);
      state.nx_manutencoes = manutencoes;
      await kvSave(env, state);
      return jsonResp({ ok: true, manutencao: m }, cors, 201);
    }

    return jsonResp({ error: 'rota nao encontrada' }, cors, 404);
  } catch (e) {
    return jsonResp({ error: String(e && e.message || e) }, cors, 500);
  }
}
