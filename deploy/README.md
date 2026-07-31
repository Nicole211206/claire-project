# Deploy — Claire Project (Jarvis VPS)

Segue o mesmo padrão do [wecare-onboarding](../../wecare-onboarding/deploy/README.md): Ubuntu no
VPS Jarvis, backend FastAPI atrás de nginx, systemd, certbot. Diferença: aqui não tem frontend
estático pra servir — `index.html`/`js/app.js`/`css/` são publicados no **Netlify** (ver
`netlify.toml` no repo), então este VPS só roda a API (claire-dados + proxy Hostaway).

**Domínio:** `claire.wecarehosting.com.br` (placeholder — ainda a definir, troque nos arquivos abaixo quando decidir)
**Backend:** porta `18792` (FastAPI + uvicorn, só localhost — nginx é quem expõe pra fora)
**Frontend:** Netlify, fora deste VPS (nada a fazer aqui)

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

## 4. Frontend (Netlify — fora deste VPS)

Nada pra fazer no servidor: `index.html`/`js/app.js`/`css/` são publicados direto no Netlify a
partir deste mesmo repositório (ver `netlify.toml`).

Antes de publicar, confirme que apontam pro domínio de produção (não pro `localhost:18792`
usado em dev):

```bash
# window.CLAIRE_SYNC.url e window.CLAIRE_HOSTAWAY_URL (index.html)
grep -n "CLAIRE_SYNC\|CLAIRE_HOSTAWAY_URL" index.html
```

Troque `http://localhost:18792` por `https://claire.wecarehosting.com.br` (e
`http://localhost:18792/hostaway` por `https://claire.wecarehosting.com.br/hostaway`) antes do
deploy no Netlify.

---

## 5. Nginx

```bash
sudo cp /home/jarvis/apps/claire-project/deploy/nginx/claire.wecarehosting.com.br.conf \
  /etc/nginx/sites-available/claire.wecarehosting.com.br

sudo ln -sf /etc/nginx/sites-available/claire.wecarehosting.com.br \
  /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl reload nginx
```

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

O `deploy/auto-deploy.sh` faz `git fetch`, e só mexe em algo se houver commit novo em
`origin/main`: `git pull --ff-only` → `uv sync` → `alembic upgrade head` → `systemctl restart`.
Sem commit novo, cada execução é só um `git fetch` (barato) e sai sem logar nada.

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
- [ ] `index.html` (Netlify) apontando pro domínio de produção, não `localhost`
- [ ] Serviço systemd `claire-project` ativo na porta 18792 (só localhost)
- [ ] Nginx proxyando todas as rotas da API pra 18792
- [ ] Certbot emitiu SSL e HTTPS funcionando
- [ ] Sudoers + cron do `auto-deploy.sh` instalados e `deploy/auto-deploy.log` sendo criado
- [ ] Domínio definitivo escolhido e DNS apontado (o usado aqui é só placeholder)
