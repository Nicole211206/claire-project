#!/usr/bin/env bash
# Auto-deploy do ambiente de STAGING do claire-project — git pull (branch
# develop) + restart condicional do serviço systemd. Cópia parametrizada de
# auto-deploy.sh (que cuida só de produção/main): mesma lógica, apontando
# pro checkout/serviço de staging e acompanhando develop em vez de main.
#
# CLAIRE_SYNC do index.html: o valor commitado no repo é sempre o de
# PRODUÇÃO (window.CLAIRE_SYNC aponta pro domínio/token de
# claire.wecarehosting.com.br), porque essa mesma linha existe tanto em
# develop quanto em main (e os dois branches são mantidos iguais). Por isso
# esse script SEMPRE reescreve essa linha pro domínio/token de staging
# depois de cada pull -- nunca commitar esse valor de volta pro git, senão
# um merge develop->main vaza a URL/token de staging pra produção.
set -euo pipefail

REPO_DIR="/home/jarvis/apps/claire-project-staging"
BACKEND_DIR="$REPO_DIR/backend"
SERVICE_NAME="claire-project-staging"
BRANCH="develop"
UV_BIN="/home/jarvis/.local/bin/uv"
LOG_FILE="$REPO_DIR/deploy/auto-deploy-staging.log"
LOCK_FILE="/tmp/claire-project-staging-autodeploy.lock"
# Token lido do .env do próprio staging (nunca hardcoded aqui/no repo).
STAGING_TOKEN="$(grep '^CLAIRE_TOKEN=' "$BACKEND_DIR/.env" | cut -d= -f2-)"
STAGING_URL="https://dev-claire.wecarehosting.com.br"

log() { printf '%s %s\n' "$(date -Is)" "$1" >> "$LOG_FILE"; }

apply_claire_sync_override() {
  sed -i -E "s#window\.CLAIRE_SYNC = \{ url: '[^']*', token: '[^']*' \};#window.CLAIRE_SYNC = { url: '${STAGING_URL}', token: '${STAGING_TOKEN}' };#" "$REPO_DIR/index.html"
}

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
  # Mesmo sem commit novo, garante que o CLAIRE_SYNC não tenha revertido pro
  # valor commitado de produção por algum motivo externo a este script (ex.:
  # um `git pull`/`git checkout` manual feito fora do auto-deploy). Idempotente
  # e barato — roda toda vez, sem log (senão o arquivo cresce à toa a cada 5min).
  apply_claire_sync_override
  exit 0
fi

CHANGED_FILES="$(git diff --name-only "$LOCAL_REV" "$REMOTE_REV")"
BACKEND_CHANGED=false
grep -q '^backend/' <<<"$CHANGED_FILES" && BACKEND_CHANGED=true

log "Novo commit detectado (${LOCAL_REV:0:8} -> ${REMOTE_REV:0:8}). Arquivos alterados:"
log "$(sed 's/^/    /' <<<"$CHANGED_FILES")"

# Reverte o CLAIRE_SYNC pro valor commitado (produção) antes do pull, senão o
# diff local (índice.html editado) pode fazer o --ff-only falhar.
git checkout -- index.html 2>/dev/null || true

if ! git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1; then
  log "ERRO: git pull --ff-only falhou (histórico divergente?). Abortando deploy."
  exit 1
fi

apply_claire_sync_override
log "index.html ajustado pro domínio/token de staging (${STAGING_URL})."

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
    log "ERRO: falha ao reiniciar $SERVICE_NAME via systemctl. Verifique o sudoers (deploy/sudoers/claire-project-staging-deploy)."
    exit 1
  fi
else
  log "Backend não mudou nesse pull — sem restart."
fi

log "Deploy de staging concluído. HEAD agora em $(git -C "$REPO_DIR" rev-parse --short HEAD)."
