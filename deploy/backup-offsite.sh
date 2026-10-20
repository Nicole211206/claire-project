#!/bin/bash
# Backup diário da Claire FORA da VPS (Google Drive, via rclone).
#
# - claire.db: cópia consistente e compacta (VACUUM INTO), checada com
#   integrity_check, compactada com gzip e enviada para <remote>:claire-backups/db/
#   com retenção de 14 dias.
# - uploads/: anexos, enviados de forma incremental para <remote>:claire-backups/uploads/
#   (copy, nunca sync: apagar um anexo aqui não apaga a cópia no Drive).
# - NÃO inclui o .env (segredos) — guarde esse arquivo à parte, num cofre.
#
# Cron (usuário jarvis), ver deploy/README.md:
#   30 3 * * * /home/jarvis/apps/claire-project/deploy/backup-offsite.sh >> /home/jarvis/apps/claire-project/deploy/backup-offsite.log 2>&1
#
# Status da última execução: /home/jarvis/claire-backup-offsite.status
set -euo pipefail

REMOTE="${CLAIRE_BACKUP_REMOTE:-gdrive-wecare}"
DEST="$REMOTE:claire-backups"
APP_DIR="${CLAIRE_APP_DIR:-/home/jarvis/apps/claire-project}"
DB="$APP_DIR/backend/claire.db"
UPLOADS="$APP_DIR/backend/uploads"
RETENCAO_DIAS="${CLAIRE_BACKUP_RETENCAO_DIAS:-14}"
STATUS="/home/jarvis/claire-backup-offsite.status"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d /tmp/claire-offsite.XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

falhou() { echo "$(date -Is) FALHOU: $1" | tee "$STATUS"; exit 1; }
log() { echo "$(date -Is) $*"; }

rclone listremotes | grep -qx "$REMOTE:" || falhou "remote '$REMOTE' não configurado no rclone"

log "gerando cópia consistente do banco"
sqlite3 "$DB" "VACUUM INTO '$WORK/claire.db'" || falhou "VACUUM INTO"
[ "$(sqlite3 "$WORK/claire.db" 'pragma integrity_check')" = "ok" ] || falhou "integrity_check da cópia"
REG="$(sqlite3 "$WORK/claire.db" 'select count(*) from records')"
gzip -9 "$WORK/claire.db"
ARQ="claire-$STAMP.db.gz"
mv "$WORK/claire.db.gz" "$WORK/$ARQ"
TAM="$(du -h "$WORK/$ARQ" | cut -f1)"

log "enviando $ARQ ($TAM, $REG registros)"
rclone copyto "$WORK/$ARQ" "$DEST/db/$ARQ" --checksum || falhou "upload do banco"
# confere que chegou com o mesmo tamanho
LOCAL_B="$(stat -c %s "$WORK/$ARQ")"
REMOTO_B="$(rclone size "$DEST/db/$ARQ" --json | python3 -c 'import sys,json; print(json.load(sys.stdin)["bytes"])')"
[ "$LOCAL_B" = "$REMOTO_B" ] || falhou "tamanho no Drive ($REMOTO_B) difere do local ($LOCAL_B)"

if [ -d "$UPLOADS" ]; then
  log "sincronizando anexos (incremental, sem apagar)"
  rclone copy "$UPLOADS" "$DEST/uploads" --checksum --transfers 4 || falhou "upload dos anexos"
fi

log "aplicando retenção de ${RETENCAO_DIAS} dias"
rclone delete "$DEST/db" --min-age "${RETENCAO_DIAS}d" || log "aviso: retenção não aplicada"

echo "$(date -Is) OK $ARQ ($TAM, $REG registros)" | tee "$STATUS"
