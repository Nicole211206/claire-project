# Deploy — Claire Project (Jarvis VPS)

Segue o mesmo padrão do [wecare-onboarding](../../wecare-onboarding/deploy/README.md): Ubuntu no
VPS Jarvis, backend FastAPI atrás de nginx, systemd, certbot. Frontend (`index.html`/`js/`/`css/`)
e backend vivem no mesmo domínio e no mesmo checkout do repositório neste VPS — nginx serve os
arquivos estáticos direto e faz proxy só das rotas de API pro backend. (Versão anterior deste
deploy hospedava o frontend no Netlify, com o VPS só respondendo pela API; migrado para cá — ver
`netlify.toml` no repo como histórico, não é mais o caminho usado em produção.)

**Domínio:** `claire.wecarehosting.com.br` (DNS já apontado pro VPS, certificado já emitido)
**Backend:** porta `18792` (FastAPI + uvicorn, só localhost — nginx é quem expõe pra fora)
**Frontend:** servido pelo próprio nginx deste VPS, a partir da raiz do checkout (`index.html`,
`css/`, `js/`, `assets/`) — sem Netlify.

---

## 1. Pré-requisitos no servidor

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx

# uv (gerenciador Python) — pule se o VPS já tiver (mesmo usado pelo wecare-onboarding/wecare-parceiros)
curl -LsSf https://astral.sh/uv/install.sh | sh
# Reinicie o shell ou: source ~/.local/bin/env
```

```bash
sudo mkdir -p /home/jarvis/apps
sudo chown jarvis:jarvis /home/jarvis/apps
```

---

## 2. Clone do repositório

```bash
cd /home/jarvis/apps
git clone git@github.com:Nicole211206/claire-project.git
cd claire-project
```

---

## 3. Backend

```bash
cd /home/jarvis/apps/claire-project/backend

uv sync
cp .env.example .env
nano .env
```

Variáveis mínimas para produção:

```env
CLAIRE_TOKEN=<mesmo-token-usado-no-window.CLAIRE_SYNC-do-frontend>
DATABASE_URL=sqlite:////home/jarvis/apps/claire-project/backend/claire.db
UPLOADS_DIR=/home/jarvis/apps/claire-project/backend/uploads
PORT=18792
HOSTAWAY_ACCOUNT_ID=<account-id-do-hostaway>
HOSTAWAY_API_KEY=<api-key-do-hostaway>
```

```bash
uv run alembic upgrade head
```

> `uploads/` já vem versionado (com `.gitkeep`) — não precisa criar a pasta na mão.

---

## 4. Frontend (servido pelo próprio nginx deste VPS)

Nada a instalar: os mesmos arquivos do checkout (`index.html`, `css/`, `js/`, `assets/`) já ficam
na raiz do repositório clonado no passo 2 — o nginx (passo 5) aponta `root` direto pra lá.

Confirme que `index.html` aponta pro domínio de produção (não pro Cloudflare Worker antigo nem
pro `localhost:18792` usado em dev):

```bash
grep -n "CLAIRE_SYNC" index.html
```

Deve ser `window.CLAIRE_SYNC = { url: 'https://claire.wecarehosting.com.br', token: '<CLAIRE_TOKEN-igual-ao-.env-do-backend>' };`.
Se quiser usar o proxy Hostaway pelas Configurações da própria Claire, o campo "URL do Worker
Hostaway" aceita `https://claire.wecarehosting.com.br/hostaway`.

---

## 5. Nginx

```bash
sudo cp /home/jarvis/apps/claire-project/deploy/nginx/proxy_params_claire /etc/nginx/proxy_params_claire

sudo cp /home/jarvis/apps/claire-project/deploy/nginx/claire.wecarehosting.com.br.conf \
  /etc/nginx/sites-available/claire.wecarehosting.com.br

sudo ln -sf /etc/nginx/sites-available/claire.wecarehosting.com.br \
  /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

O `root` do bloco nginx é a raiz do checkout (`/home/jarvis/apps/claire-project` — onde vive o
`index.html`), com rotas específicas (`/load`, `/save`, `/upload`, `/backups`, `/load-backup`,
`/health`, `/files/`, `/api/`, `/hostaway/`) proxyando pro backend e um catch-all servindo o
frontend estático.

> **Permissão do diretório home:** o nginx roda como `www-data` e precisa conseguir atravessar
> `/home/jarvis` pra chegar nos arquivos estáticos. Se `/home/jarvis` estiver com permissão `750`
> (padrão do Ubuntu), rode `sudo chmod o+x /home/jarvis` — isso libera só trânsito (não lista nem
> lê o conteúdo do diretório), não expõe nada além do necessário.

Confirme que o DNS de `claire.wecarehosting.com.br` já aponta pro IP do VPS antes do certbot.

---

## 6. Systemd

```bash
sudo cp /home/jarvis/apps/claire-project/deploy/systemd/claire-project.service \
  /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable claire-project
sudo systemctl start claire-project
```

Verificar:

```bash
sudo systemctl status claire-project
journalctl -u claire-project -f
```

---

## 7. SSL com Certbot

```bash
sudo certbot --nginx -d claire.wecarehosting.com.br
```

O certbot emite o certificado, insere o bloco `listen 443 ssl` e configura o redirecionamento
HTTP → HTTPS automaticamente. Renovação automática já vem configurada pelo certbot:

```bash
sudo certbot renew --dry-run
```

---

## 8. Auto-deploy (git pull + restart a cada 5 minutos)

O `deploy/auto-deploy.sh` faz `git fetch` em **`origin/main`** — `main` é o que roda de
verdade (Nicole e Felipe dependem disso pro trabalho, não é mais um ambiente de teste).
`develop` é onde qualquer mudança é testada/validada antes; só vai pra `main` (merge
deliberado, não automático) quando estiver confirmada. O cron nunca acompanha `develop`
diretamente — isso evitaria justamente a separação entre "testando" e "no ar". Só mexe em
algo se houver commit novo em `main`:

1. `git pull --ff-only`
2. Se o pull trouxe mudança em `backend/`: `uv sync` → `alembic upgrade head` →
   `systemctl restart claire-project`
3. Se o pull trouxe mudança só em frontend (`index.html`/`css/`/`js/`/`assets/`): nada a
   buildar nem reiniciar — o nginx já serve direto do checkout, o próprio `git pull` é o
   deploy.

Sem commit novo, cada execução é só um `git fetch` (barato) e sai sem logar nada.

> Avaliei usar um webhook do GitHub em vez de polling por cron (deploy quase instantâneo em
> vez de até 5min de atraso), mas descartei por agora: precisa de permissão de **Admin** no
> repositório (Settings → Webhooks), que vai além do que temos como colaborador com permissão
> de escrita. Cron é suficiente e não exige acesso novo.

### 8.1 Sudoers (restart sem senha)

O script roda como `jarvis` mas precisa reiniciar um serviço systemd (root). Libere só esse
comando específico:

```bash
sudo cp /home/jarvis/apps/claire-project/deploy/sudoers/claire-project-deploy /etc/sudoers.d/
sudo chmod 440 /etc/sudoers.d/claire-project-deploy
sudo visudo -c
```

### 8.2 Cron

```bash
crontab -u jarvis -e
```

Cole (ou use `deploy/cron/claire-project-autodeploy` como referência):

```
*/5 * * * * /home/jarvis/apps/claire-project/deploy/auto-deploy.sh
```

### 8.3 Acompanhar

```bash
tail -f /home/jarvis/apps/claire-project/deploy/auto-deploy.log
```

O arquivo só ganha linhas quando um deploy de fato roda (commit novo detectado) ou dá erro.

---

## 9. Atualização manual (se preferir não usar o cron)

```bash
cd /home/jarvis/apps/claire-project
git pull
cd backend
uv sync
uv run alembic upgrade head
sudo systemctl restart claire-project
```

---

## 10. Checklist rápido

- [ ] `.env` do backend preenchido (`CLAIRE_TOKEN` igual ao do frontend, credenciais do Hostaway)
- [ ] `alembic upgrade head` executado
- [ ] `index.html` apontando pro domínio de produção (`claire.wecarehosting.com.br`), não pro
      Cloudflare Worker antigo nem pro `localhost:18792` de dev
- [ ] Serviço systemd `claire-project` ativo na porta 18792 (só localhost)
- [ ] `proxy_params_claire` copiado pra `/etc/nginx/`
- [ ] `/home/jarvis` com permissão de trânsito (`o+x`) pro nginx conseguir servir os estáticos
- [ ] Nginx servindo o frontend estático na raiz e proxyando as rotas de API pra 18792
- [ ] Certbot emitiu SSL e HTTPS funcionando
- [ ] Sudoers + cron do `auto-deploy.sh` instalados e `deploy/auto-deploy.log` sendo criado
- [ ] Domínio já definido e DNS apontado (`claire.wecarehosting.com.br`)
- [ ] **Staging:** certbot emitiu SSL pra `dev-claire.wecarehosting.com.br` também (certificado
      próprio, separado do de produção)
- [ ] **Staging:** sudoers + cron do `auto-deploy-staging.sh` instalados e
      `deploy/auto-deploy-staging.log` sendo criado (cron separado do de produção, acompanhando
      `develop`)
- [ ] **Staging:** serviço systemd `claire-project-staging` ativo na porta 18793 (só localhost)
- [ ] **Staging:** `index.html` do checkout de staging apontando pro próprio domínio/token (não
      pro de produção) — conferir depois de qualquer deploy manual, já que o patch do
      `CLAIRE_SYNC` é reaplicado automaticamente só pelo `auto-deploy-staging.sh` (ver seção 11.3)

---

## 11. Ambiente de staging (branch `develop`)

### 11.1 Visão geral

Staging é um segundo ambiente completo, isolado de produção, rodando a partir da branch
`develop` — pra testar mudanças antes de promover pra `main`.

| | Produção | Staging |
|---|---|---|
| Domínio | `claire.wecarehosting.com.br` | `dev-claire.wecarehosting.com.br` |
| Branch | `main` | `develop` |
| Checkout | `/home/jarvis/apps/claire-project` | `/home/jarvis/apps/claire-project-staging` |
| Backend (porta) | `18792` | `18793` |
| Serviço systemd | `claire-project` | `claire-project-staging` |
| Banco | `backend/claire.db` | `backend/claire-staging.db` |
| Auto-deploy | `deploy/auto-deploy.sh` (cron próprio, a cada 5min) | `deploy/auto-deploy-staging.sh` (cron próprio, a cada 5min, independente do de produção) |
| Sudoers | `claire-project-deploy` | `claire-project-staging-deploy` |
| Nginx | `claire.wecarehosting.com.br.conf` | `dev-claire.wecarehosting.com.br.conf` |

Mesma allowlist de segurança do nginx de produção (só `/`, `/index.html`, `/restaurar.html`,
`/css/`, `/js/`, `/assets/` são servidos — o resto dá 404). Não repetir em staging o erro que
foi corrigido em produção (nginx servindo `backend/`/`.git/`/`deploy/` sem autenticação).

### 11.2 Fluxo de trabalho recomendado

```
código novo
  → commit em develop
  → auto-deploy-staging.sh puxa pra staging (até 5min)
  → testar em https://dev-claire.wecarehosting.com.br
  → se ok: promover develop → main (fast-forward ou merge, deliberado — nunca automático)
  → auto-deploy.sh (produção) puxa main automaticamente (até 5min)
```

`develop` e `main` são mantidos iguais depois de cada promoção (mesmo padrão já usado nas
últimas correções desta sessão) — staging sempre reflete o que está prestes a virar produção,
nunca um branch à parte que diverge pra sempre.

### 11.3 ⚠️ Cuidado: `CLAIRE_SYNC` do staging NUNCA é commitado

O `index.html` versionado no repo tem `window.CLAIRE_SYNC` apontando pro domínio/token de
**produção** — essa mesma linha existe tanto em `develop` quanto em `main`, porque os dois
branches são mantidos iguais (seção 11.2). Se o staging commitasse sua própria URL/token nessa
linha, o próximo merge `develop → main` vazaria o domínio e o token de staging pra produção,
quebrando o app da Nicole (apontando pro backend errado, com token errado).

Por isso `deploy/auto-deploy-staging.sh` faz, a cada execução:

1. `git checkout -- index.html` (descarta o patch anterior, volta pro valor commitado de produção)
2. `git pull --ff-only origin develop` (agora sem risco de conflito com o patch local)
3. Reescreve a linha do `CLAIRE_SYNC` via `sed`, direto no arquivo do checkout — **só no disco,
   nunca commitado** — apontando pro domínio de staging e lendo o token do próprio
   `backend/.env` (nunca hardcoded no script)

**Se for mexer em `auto-deploy-staging.sh` no futuro, não remova esse passo** achando que é
redundante — ele existe especificamente pra essa mistura de branch/domínio não vazar. Se um dia
staging precisar de outro token, troque só o `CLAIRE_TOKEN` no `.env` do staging — o script
reaplica sozinho no próximo deploy.

### 11.4 Banco de staging: cópia real de produção, não dado fake

O `claire-staging.db` foi inicializado como uma **cópia consistente do banco de produção**
(incluindo os usuários reais e as respectivas senhas) — não é um ambiente com dado de teste
fictício. Trate o acesso a staging com o mesmo cuidado que produção.

Pra resincronizar manualmente (staging fica cada vez mais desatualizado em relação a produção
conforme o tempo passa, já que não há sync automático entre os dois bancos):

```bash
sudo systemctl stop claire-project-staging

sudo -u jarvis python3 -c "
import sqlite3
src = sqlite3.connect('/home/jarvis/apps/claire-project/backend/claire.db')
dst = sqlite3.connect('/home/jarvis/apps/claire-project-staging/backend/claire-staging.db')
src.backup(dst)
dst.close()
src.close()
"
sudo -u jarvis rsync -a --delete \
  /home/jarvis/apps/claire-project/backend/uploads/ \
  /home/jarvis/apps/claire-project-staging/backend/uploads/

sudo systemctl start claire-project-staging
```

`sqlite3.connect(...).backup(...)` (API do próprio módulo `sqlite3` do Python) faz uma cópia
consistente mesmo com o banco de produção em uso — não é um `cp` bruto do arquivo, que arrisca
copiar no meio de uma escrita.

> **Atenção:** resincronizar **sobrescreve qualquer dado criado/editado em staging** desde a
> última cópia — se estiver no meio de um teste que depende de dados que só existem em staging,
> resincronize depois de terminar, não antes.
