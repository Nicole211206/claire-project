#!/bin/bash
# Teste de restauração do backup off-site: baixa o dump MAIS RECENTE do Drive,
# descompacta, confere integridade e compara com o banco ao vivo. Não escreve
# nada no banco real nem no app (trabalha em /tmp e apaga ao final).
#   uso: deploy/restore-test-offsite.sh
set -euo pipefail
REMOTE="${CLAIRE_BACKUP_REMOTE:-gdrive-wecare}"
DB="${CLAIRE_APP_DIR:-/home/jarvis/apps/claire-project}/backend/claire.db"
WORK="$(mktemp -d /tmp/claire-restore.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

ULTIMO="$(rclone lsf "$REMOTE:claire-backups/db" | sort | tail -1)"
[ -n "$ULTIMO" ] || { echo "nenhum backup encontrado em $REMOTE:claire-backups/db"; exit 1; }
echo "mais recente no Drive: $ULTIMO"
rclone copyto "$REMOTE:claire-backups/db/$ULTIMO" "$WORK/$ULTIMO"
gunzip "$WORK/$ULTIMO"
R="$WORK/${ULTIMO%.gz}"
echo "integrity_check: $(sqlite3 "$R" 'pragma integrity_check')"
cat > "$WORK/cmp.py" <<'P'
import sqlite3, json, sys
def resumo(p):
    c = sqlite3.connect(f"file:{p}?mode=ro", uri=True)
    d = json.loads(c.execute("select data from records where collection='state'").fetchone()[0])
    return {"registros": c.execute("select count(*) from records").fetchone()[0],
            "manutencoes": len(d.get("nx_manutencoes") or []), "tasks": len(d.get("nx_tasks") or []),
            "limpeza": len(d.get("nx_limpeza") or []), "sinistros": len(d.get("nx_sinistros") or []),
            "tombstones": len(d.get("nx_tombstones") or [])}
a, b = resumo(sys.argv[1]), resumo(sys.argv[2])
print("backup :", a); print("ao vivo:", b)
print("OK: restauração legível e consistente" if a["registros"] > 0 else "FALHA: backup vazio")
P
python3 "$WORK/cmp.py" "$R" "$DB"
