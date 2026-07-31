# Claire — Painel de Gestão WeCare

Painel de gestão pessoal da Nicole, gerente de operações da WeCare.

## Estrutura do Projeto

```
claire-project/
├── index.html          ← Página principal (HTML)
├── css/
│   └── styles.css      ← Todos os estilos (variáveis, componentes, layout)
├── js/
│   └── app.js          ← Toda a lógica (KPIs, equipe, salários, integrações)
├── backend/             ← API FastAPI + SQLite (persistência compartilhada)
├── deploy/              ← systemd, nginx, cron/sudoers do auto-deploy no VPS
└── README.md            ← Este arquivo
```

## Produção

Site e API rodam juntos no VPS Jarvis, no mesmo domínio:
**https://claire.wecarehosting.com.br**

nginx serve `index.html`/`css`/`js`/`assets` estaticamente e faz proxy das rotas de API
(`/load`, `/save`, `/upload`, `/backups`, `/load-backup`, `/health`, `/api/*`, `/hostaway/*`)
pro backend FastAPI (porta 18792, só localhost). Deploy completo documentado em
[`deploy/README.md`](deploy/README.md).

> **Histórico:** antes desta migração, o site já foi hospedado no Netlify (deploy manual via
> drag-and-drop) e os dados já passaram por um Cloudflare Worker + KV (`claire-dados`). Nenhum
> dos dois está mais em uso — tudo roda no VPS Jarvis hoje.

## Como rodar localmente

O front pode abrir direto no navegador, mas para login/sincronização funcionarem de verdade
também precisa do backend rodando local:

```bash
cd backend
uv sync
cp .env.example .env   # ajuste CLAIRE_TOKEN
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 18792
```

Frontend (outro terminal, na raiz do repo):
```bash
python3 -m http.server 3000
# ou: npx serve .
```

Aponte `window.CLAIRE_SYNC` em `index.html` pra `http://localhost:18792` com o mesmo
`CLAIRE_TOKEN` do `.env` do backend enquanto testar localmente.

## Configurações (dentro do painel)

Clique no ícone ⚙️ no canto superior direito e configure:

| Campo | Para que serve |
|-------|---------------|
| Chave API Anthropic | Assistente IA (chat, edição de docs) |
| Google Drive OAuth Token | Listar, criar e editar arquivos |
| Google Agenda OAuth Token | Sincronizar eventos da agenda |
| Gmail OAuth Token | Ler e enviar e-mails |
| URL do Worker Hostaway | Proxy de avaliações/reservas (hoje: `https://claire.wecarehosting.com.br/hostaway`) |

### Como gerar tokens Google (OAuth 2.0 Playground)

1. Acesse: https://developers.google.com/oauthplayground
2. Selecione os escopos:
   - Drive: `https://www.googleapis.com/auth/drive`
   - Agenda: `https://www.googleapis.com/auth/calendar.readonly`
   - Gmail: `https://mail.google.com/`
3. Clique "Authorize APIs" → faça login com sua conta Google
4. Clique "Exchange authorization code for tokens"
5. Copie o **Access Token** e cole nas configurações do Claire

> ⚠️ Tokens OAuth expiram em ~1 hora. Para uso prolongado, configure um refresh token ou use um servidor backend.

## Funcionalidades

### Sem custo (100% gratuito)
- ✅ KPIs com calculadora automática (baseado no Excel da Nicole)
- ✅ Calculadora de salários (atendentes + heads)
- ✅ Gestão de equipe e demandas
- ✅ Tarefas (lista + kanban)
- ✅ Anotações
- ✅ Timer Pomodoro
- ✅ Google Drive (listar, buscar, criar, ler arquivos)
- ✅ Google Agenda (sincronizar eventos reais)
- ✅ Gmail (ler e enviar e-mails)

### Com custo (API Anthropic — pague por uso)
- 💬 Assistente IA (chat)
- 💬 Editar documentos com IA

## KPIs implementados (baseado no Excel)

| KPI | Peso | Meta |
|-----|------|------|
| Avaliação dos Hóspedes | 25% | 4.8★ |
| Tempo de Resposta | 15% | 5 min |
| Onboarding | 20% | 10 dias |
| Conversão de Avaliações | 15% | 60% |
| Redução de Custos | 15% | 10% |
| Avaliação 360 | 10% | 4.8★ |

### Níveis salariais (N1–N8)

| Nível | Fixo | Variável (100%) |
|-------|------|-----------------|
| N1 | R$ 5.500 | R$ 2.000 |
| N2 | R$ 6.050 | R$ 2.200 |
| N3 | R$ 6.655 | R$ 2.420 |
| N4 | R$ 7.321 | R$ 2.662 |
| N5 | R$ 8.053 | R$ 2.928 |
| N6 | R$ 8.858 | R$ 3.221 |
| N7 | R$ 9.744 | R$ 3.543 |
| N8 | R$ 10.718 | R$ 3.897 |

## Equipe

- **Patrícia** — R$ 17/h
- **Sara** — R$ 14/h
- **Lisarb** — R$ 14/h
- **Laís** — R$ 14/h
- **Nicole** (Head) — Fixo por nível + comissão por KPI
- **Gabriela** (Head) — Fixo editável + comissão
- **Felipe** (Head) — Fixo editável + comissão
