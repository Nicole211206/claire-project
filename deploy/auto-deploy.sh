#!/usr/bin/env bash
# Auto-deploy do claire-project — git pull (branch develop) + restart condicional
# do serviço systemd. Pensado pra rodar via cron a cada 5 minutos.
#
# Só mexe em nada se houver commit novo em origin/$BRANCH: compara o HEAD local
# com o remoto antes de fazer qualquer coisa, então rodar isso a cada 5min sem
# deploy nenhum pendente é barato (um git fetch) e não reinicia o serviço à toa.
#
# Restart do backend só acontece se algo em backend/ mudou nesse pull. Mudança
# só em frontend (index.html/css/js/assets) não precisa de build nem restart —
# o nginx já serve direto do checkout, então o git pull sozinho já é o deploy.
set -euo pipefail

REPO_DIR="/home/jarvis/apps/claire-project"
BACKEND_DIR="$REPO_DIR/backend"
SERVICE_NAME="claire-project"
BRANCH="develop"
UV_BIN="/home/jarvis/.local/bin/uv"
LOG_FILE="$REPO_DIR/deploy/auto-deploy.log"
LOCK_FILE="/tmp/claire-project-autodeploy.lock"

log() { printf '%s %s\n' "$(date -Is)" "$1" >> "$LOG_FILE"; }

# Evita duas execuções sobrepostas (ex: um deploy anterior ainda rodando uv sync
# quando o cron dispara de novo 5min depois).
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Já existe um deploy em andamento — saindo."
  exit 0
fi

cd "$REPO_DIR"
git fetch origin "$BRANCH" --quiet

LOCAL_REV="$(git rev-parse HEAD)"
REMOTE_REV="$(git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_REV" = "$REMOTE_REV" ]; then
  exit 0  # nada novo — sem log, senão o arquivo cresce sem parar a cada 5min
fi

CHANGED_FILES="$(git diff --name-only "$LOCAL_REV" "$REMOTE_REV")"
BACKEND_CHANGED=false
FRONTEND_CHANGED=false
grep -q '^backend/' <<<"$CHANGED_FILES" && BACKEND_CHANGED=true
grep -qE '^(index\.html|css/|js/|assets/)' <<<"$CHANGED_FILES" && FRONTEND_CHANGED=true

log "Novo commit detectado (${LOCAL_REV:0:8} -> ${REMOTE_REV:0:8}). Arquivos alterados:"
log "$(sed 's/^/    /' <<<"$CHANGED_FILES")"

if ! git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "ERRO: git pull --ff-only falhou (histórico divergente?). Abortando deploy."
  exit 1
fi

if [ "$BACKEND_CHANGED" = true ]; then
  cd "$BACKEND_DIR"

  if ! "$UV_BIN" sync >> "$LOG_FILE" 2>&1; then
    log "ERRO: uv sync falhou. Abortando restart do serviço."
    exit 1
  fi

  if ! "$UV_BIN" run alembic upgrade head >> "$LOG_FILE" 2>&1; then
    log "ERRO: alembic upgrade head falhou. Abortando restart do serviço."
    exit 1
  fi

  if sudo /usr/bin/systemctl restart "$SERVICE_NAME"; then
    log "Backend mudou — serviço reiniciado. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
  else
    log "ERRO: falha ao reiniciar $SERVICE_NAME via systemctl. Verifique o sudoers (deploy/sudoers/claire-project-deploy)."
    exit 1
  fi
else
  log "Backend não mudou nesse pull — sem restart."
fi

if [ "$FRONTEND_CHANGED" = true ]; then
  log "Frontend (index.html/css/js/assets) mudou — nada a buildar, arquivos já atualizados no checkout (nginx serve direto de lá)."
fi

log "Deploy concluído. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
