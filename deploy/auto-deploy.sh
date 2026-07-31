#!/usr/bin/env bash
# Auto-deploy do claire-project — git pull + restart do serviço systemd.
# Pensado pra rodar via cron a cada 5 minutos.
#
# Só mexe em nada se houver commit novo em origin/$BRANCH: compara o HEAD local
# com o remoto antes de fazer qualquer coisa, então rodar isso a cada 5min sem
# deploy nenhum pendente é barato (um git fetch) e não reinicia o serviço à toa.
set -euo pipefail

REPO_DIR="/home/jarvis/apps/claire-project"
BACKEND_DIR="$REPO_DIR/backend"
SERVICE_NAME="claire-project"
BRANCH="main"
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

log "Novo commit detectado (${LOCAL_REV:0:8} -> ${REMOTE_REV:0:8}). Atualizando..."

if ! git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "ERRO: git pull --ff-only falhou (histórico divergente?). Abortando deploy."
  exit 1
fi

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
  log "Deploy concluído. Serviço reiniciado. HEAD agora em $(git rev-parse --short HEAD)."
else
  log "ERRO: falha ao reiniciar $SERVICE_NAME via systemctl. Verifique o sudoers (ver deploy/README.md do wecare-onboarding como referência)."
  exit 1
fi
