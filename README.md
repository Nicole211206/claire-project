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
└── README.md           ← Este arquivo
```

## Como rodar localmente

Abra diretamente no navegador — não precisa de servidor:
```
Duplo clique em index.html
```

Ou use um servidor local simples:
```bash
npx serve .
# ou
python3 -m http.server 3000
```

## Como publicar (Netlify)

1. Acesse https://app.netlify.com/drop
2. Arraste a **pasta inteira** `claire-project/`
3. Clique "Rename and deploy"

## Configurações (dentro do painel)

Clique no ícone ⚙️ no canto superior direito e configure:

| Campo | Para que serve |
|-------|---------------|
| Chave API Anthropic | Assistente IA (chat, edição de docs) |
| Google Drive OAuth Token | Listar, criar e editar arquivos |
| Google Agenda OAuth Token | Sincronizar eventos da agenda |
| Gmail OAuth Token | Ler e enviar e-mails |

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
