# Segurança e Riscos — Claire

Consolidado da investigação de 06/08/2026: incidente de perda de dados na
Passagem de Turno, auditoria de segurança do backend + infra, e checagem de
uso real dos endpoints `/api/*` e `/api/v2/*`. Este documento existe pra dar
continuidade — o que já foi corrigido, o que foi conscientemente adiado (e
por quê), e quando reavaliar cada adiamento.

---

## 1. Já corrigido

### 1.1 Rajada de tombstones no boot lento — causa raiz da perda de dados na Passagem de Turno
**Commit:** `d1b33ae` (main + develop, 06/08 13:45) — testado com harness Node isolado antes do commit.

`setInterval(saveAll, 5000)` começava a rodar assim que o script carregava,
antes do `DOMContentLoaded`/`loadAll()` hidratarem as variáveis em memória a
partir do `localStorage`. Num boot lento (ou num reload automático via
`_checkAppVersion()`, que baixa o `app.js` novo pela rede), `saveAll()`
disparava com os arrays ainda vazios (valor padrão) enquanto o
`localStorage` já tinha o estado real da sessão anterior —
`_carimbarTsEDeletes()` interpretava todo id "desconhecido" como exclusão
deliberada do usuário, gerando uma tombstone por item. Foi isso que zerou
`nx_plantao` e mais 7 coleções em produção em 03/08 às ~16:58 (52→1 item em
`nx_plantao`, e quedas equivalentes em `nx_manutencoes`, `nx_conquistas`,
`nx_despesas`, `nx_anotacoes_controle`, `nx_superhost`, `nx_cancelamentos`,
`nx_extras`).

- **Fix client-side:** guard `if(!_dataLoaded) return;` no topo de
  `saveAll()` (`js/app.js`), mesmo padrão que já existia em `_kvFlush()`.
- **Fix server-side (rede de segurança):** `backend/app/merge.py` passou a
  rejeitar um lote de tombstones se ele cobrir >80% dos ids de uma coleção
  de uma vez (mínimo 5 ids) dentro de uma janela de 5s — mantém os itens e
  loga aviso, em vez de aplicar às cegas.
- **Validado:** harness Node reproduziu o bug na versão antiga (80
  tombstones espúrias, dados zerados) e confirmou proteção total na versão
  corrigida — inclusive no cenário específico de reload automático
  disparado por `_checkAppVersion()` (não só boot inicial de aba nova) e
  com múltiplos dispositivos recarregando de forma escalonada.
- **Dados recuperados:** 134 registros restaurados em produção via merge do
  backup horário de 03/08 19h com o estado atual (por id, mantendo `_ts`
  maior), sem perder nada criado depois do incidente. Backup pré-restore
  salvo em `~/Projetos/Trabalho/WeCare/dev/claire-backups/` (fora do repo).

### 1.2 nginx servia o checkout git inteiro sem autenticação
**Aplicado direto em produção:** 06/08 ~14:53 (commit do template `de5affb`).

`root /home/jarvis/apps/claire-project` com catch-all `try_files $uri $uri/
/index.html` servia **qualquer arquivo existente**, sem checar nada.
Confirmado ao vivo, publicamente, sem token: `backend/claire.db` (banco de
produção inteiro, 9.2MB), `.git/HEAD`, `.git/config`, `backend/app/config.py`,
`deploy/auto-deploy.sh` — todos HTTP 200.

- **Fix:** allowlist explícita — só `/`, `/index.html`, `/restaurar.html`,
  `/css/`, `/js/`, `/assets/` são servidos; qualquer outra coisa cai no
  catch-all final e dá 404. Uma pasta nova no repo amanhã fica bloqueada por
  padrão, sem precisar lembrar de negar cada uma.
- **Validado:** os 5 caminhos antes expostos → 404. App (`/`, css, js,
  assets, `restaurar.html`, `/load`) continua servindo normal.
- Backup do config nginx antigo salvo no próprio servidor
  (`claire.wecarehosting.com.br.bak-20260806T145305`).

### 1.3 `/hostaway/*` sem autenticação nenhuma
**Commits:** `0877017` (auth) + `f6213bf` (bump de versão), 06/08 ~15:00.

Único router sem `auth_dependency`. Com CORS `*` em `main.py`, qualquer site
podia chamar `/hostaway/reviews`/`/hostaway/debug` do navegador de qualquer
visitante e puxar `comentarioInterno` (feedback privado sobre hóspede) e
dados de reserva, além de abusar da cota paga da conta Hostaway.

- **Fix:** `APIRouter(dependencies=[Depends(auth_dependency)])`, mesmo
  padrão de `records.py`/`jarvis.py`.
- Como o front chamava essas rotas sem token, os 3 `fetch()` correspondentes
  em `js/app.js` (`sincronizarAvaliacoes`, `carregarReservasPeriodo`,
  `aplicarAvaliacoesNoKPI`) passaram a anexar `?token=`/`&token=`.
- `APP_VERSION`/`?v=` bumpado de 103→104 pra abas já abertas detectarem e
  recarregarem sozinhas (senão ficariam presas no JS antigo, chamando sem
  token, tomando 401 em silêncio).
- **Validado:** sem token → 401, com token → 200, `/load` continua normal.
  Investigação de uso real (ver seção 3) mostrou que essa rota nunca foi
  chamada por tráfego legítimo em produção — só pelos meus próprios testes —
  então não há usuário afetado por essa mudança.

---

## 2. Agendado (adiado conscientemente)

Cada item abaixo tem risco real, mas nenhum tem exposição ativa comprovada
hoje — corrigir depois é uma escolha deliberada, não descuido.

### 2.1 Backend (`backend/app/`)

| # | Item | Severidade | Por que pode esperar |
|---|---|---|---|
| 1 | `jarvis.py`: toda rota faz ler-documento-inteiro → mexe 1 chave → grava-documento-inteiro, sem passar por `do_merge` (`create_task`, `patch_task`, `create_demand`, `create_project`, `create_manutencao`, `create_extra` etc.) | Alta (se usado) | **Uso real = zero.** 15 dias de log do nginx: nenhuma chamada legítima a `/api/summary`\|`/tasks`\|`/demands`\|`/projects`\|`/manutencoes`\|`/extras` — só ruído de scanner (graphql/gql, PHPUnit RCE probe, sonicos). Nenhum cron (VPS) nem skill do OpenClaw local chama essas rotas. Ver seção 3. |
| 2 | `records.py` (`/api/v2`): `PATCH` lê, mescla em Python, grava sem checar `_ts`/versão — mesma classe de race do item acima | Média (se usado) | Mesmo motivo: zero uso real confirmado nos logs. |
| 3 | Stored XSS via `/upload`: `mime` vem do cliente sem whitelist, devolvido sem filtro em `/files/{key}` (sem `Content-Disposition: attachment`) | Alta | Exige o token compartilhado pra explorar (não é anônimo como o `/hostaway` era). Ainda assim, qualquer vazamento do token (URL em histórico do navegador, screenshot, etc.) o torna explorável — não depender disso pra sempre. |
| 4 | Sem limite de tamanho em `/save`/`/upload` (memória/disco) | Média | Precisa de um payload deliberadamente grande; não é um bug que dispara sozinho no uso normal. |
| 5 | Handler global devolve `str(exc)` pra qualquer chamador | Baixa | Vaza detalhe interno, não dado de negócio; baixo valor pra um atacante hoje. |
| 6 | `merge.py`: falha no espelhamento pro `records` (D1-like) é engolida sem log (`_mirror_collection`) | Baixa | Best-effort por design; só mascara um problema secundário (o KV continua sendo fonte de verdade). |
| 7 | `auth.py`: `CLAIRE_TOKEN` vazio desliga autenticação inteira, em silêncio, em vez de falhar fechado | Baixa/Média | Só acontece com um `.env` malconfigurado; hoje o `.env` de produção está correto. |
| 8 | `/files/{key:path}` aceita `/`/`..` no path, sem `.resolve()`/containment check | Baixa | Inerte hoje — `key` só é gerado pelo servidor (`anexo_<ts>_<rand>`) e precisa bater com uma linha do banco antes de servir. Defesa em profundidade, não um caminho de exploração ativo. |

### 2.2 Infraestrutura / deploy

| # | Item | Severidade | Por que pode esperar |
|---|---|---|---|
| 1 | `auto-deploy.sh`: `git pull` avança o HEAD antes de `uv sync`/alembic/restart; se um desses falhar, a próxima execução do cron vê `LOCAL_REV == REMOTE_REV` e não tenta de novo — sem alerta | Alta | Ainda não aconteceu nenhuma vez (os deploys de hoje e da migração passaram limpos) — é um risco de "quando" não de "se", vale endurecer, mas não é uma falha ativa agora. |
| 2 | Sem rate limiting nos endpoints com token compartilhado | Média | Compounding do design já aceito (token único); reduz o custo de descobrir o token por força bruta, mas não é um vetor novo por si só. |
| 3 | `DEPLOY-TRAVA-SERVIDOR.md`/`wrangler-claire-dados.toml` (doc do Worker Cloudflare antigo) ainda instruem republicar o worker — risco de reviver uma segunda fonte de dados divergente se alguém seguir a doc | Média | Risco de processo, não técnico — só materializa se alguém literalmente seguir aquele doc desatualizado. |
| 4 | Comentário desatualizado em `auto-deploy.sh` (linha 2 diz "branch develop", código usa `main`) | Baixa | Cosmético, comportamento já está correto. |

### 2.3 Sistema de sync/merge (`js/app.js` + `merge.py`)

| # | Item | Severidade | Por que pode esperar |
|---|---|---|---|
| 1 | Lacuna de merge por campo generalizada: `nx_manutencoes`/`nx_imoveis` ganharam merge campo-a-campo depois de mordidos por "duas pessoas editam campos diferentes do mesmo registro, um apaga o outro"; `nx_plantao`, `nx_tasks`, `nx_projetos`, `nx_compras`, `nx_extras`, `nx_conquistas`, `nx_despesas`, `nx_anotacoes_controle`, `nx_superhost`, `nx_cancelamentos` continuam só com merge por id (registro inteiro é atômico) | Média | Não foi a causa do incidente de 03/08 (que era rajada de tombstones, já corrigida). É um risco distinto, mais raro de disparar (precisa de 2 pessoas editando campos diferentes do MESMO registro quase ao mesmo tempo). |
| 2 | `nx_turnos` (escala) não tem merge por id — só a trava de encolhimento, e nem a versão sensível dela (de propósito, pra não travar "Zerar Mês") | Média | Editado por menos gente (coordenação), com frequência menor que Passagem de Turno. |
| 3 | `_tem_id`/`_ehListaComId` são tudo-ou-nada: 1 item sem `id` válido desliga o merge por id pra chave inteira naquele save, sem rede de segurança (fica fora da trava de encolhimento também) | Baixa/Média | Latente, não veio à tona no incidente real; exigiria corrupção de dado já existente pra disparar. |
| 4 | `.claude/settings.local.json` versionado no repo público; working tree atual (não commitado) tem tokens/caminho de chave SSH desta sessão | Baixa/Média (processual) | Histórico do arquivo confirmado limpo (nunca teve segredo commitado) — risco é só se um `git add -A` futuro pegar o arquivo por engano. |

### 2.4 Origens extras escrevendo em `/save` — prioridade elevada (ver checklist)
Durante a checagem de logs (seção 3), apareceram requisições `/save` com
**token válido** vindas de origens além do domínio de produção (Referer):
`https://claire-project.pages.dev/` (Cloudflare Pages) e
`https://scintillating-muffin-a31c02.netlify.app/` (Netlify), além de
`http://localhost:8080/` (cliente Electron/Claude Desktop — dev local).

Timestamps de cada hit, extraídos do mesmo log de 15 dias da seção 3:

| Origem | Primeiro hit | Último hit |
|---|---|---|
| `claire-project.pages.dev` | 31/Jul 18:17 | 04/Aug 18:09 |
| `scintillating-muffin-a31c02.netlify.app` | 31/Jul 15:58 | 03/Aug 17:02 |
| `localhost:8080` | 03/Aug 15:37 | 03/Aug 17:20 |

**Nenhuma dessas 3 origens aparece nos logs de 05/Aug ou 06/Aug** (2 dias
sem nenhum hit até o momento em que os logs foram puxados) — indício de que
é tráfego morto (testes da janela de migração de 31/Jul–04/Aug), não uma
segunda fonte ativa hoje. Mas **indício não é confirmação**: só 2 dias sem
hit não descarta uso esporádico (ex.: alguém abre o preview do Netlify uma
vez por semana). Por isso isso não foi resolvido nesta sessão — só
documentado — e ganhou prioridade própria na checklist abaixo, porque o
plano de desligar Cloudflare/Netlify de vez torna essa pergunta urgente
quando esse desligamento for decidido, não antes.

---

## 3. Uso real de `jarvis.py`/`records.py` (investigação de 06/08)

Analisados ~15 dias de log do nginx (`access.log` até `access.log.14.gz`,
23/07–06/08), crontab da VPS (`jarvis` e `root`) e skills locais do OpenClaw.

- **`/api/v2/*` (records.py):** 100% ruído de scanner (`feroxbuster`, sondas
  de `.env`/`.git/config`/`hoverfly`/`cmdb`). Zero chamada real em 15 dias.
- **`/api/*` (jarvis.py):** mesmo padrão — sondas de graphql/gql, PHPUnit
  RCE probe, SonicWall exploit probe, `.env`. Zero chamada real a
  `/api/summary`\|`tasks`\|`demands`\|`projects`\|`manutencoes`\|`extras`.
- **Crontab da VPS:** jobs existentes são pra `wecare-avaliacao-360`,
  `wecare-onboarding`, `vilaarapiuns`, backup do Jarvis, planilha de
  inquiries — nenhum chama `claire-project/api`. Único cron do claire-project
  é o `auto-deploy.sh` (não chama a API).
- **Skills locais do OpenClaw:** nenhum menciona Claire.
- **`/hostaway/*`:** tráfego real é só das minhas próprias sessões de teste
  manual (mesmo IP/UA `curl/8.5.0` das validações de 30-31/07 e de hoje) —
  nada indica que o front da Nicole já use essa rota (o campo
  `nx_hostaway_url` nas Configurações provavelmente ainda aponta pro Worker
  Cloudflare antigo).

**Conclusão:** as races de `jarvis.py`/`records.py` são bugs reais no
código, mas o raio de exposição atual é efetivamente zero — nada os chama.
Por isso ficaram agendados em vez de corrigidos agora.

---

## 4. Checklist de reavaliação — "corrigir X antes de Y acontecer"

- [ ] **`jarvis.py`/`records.py` (races de merge)** — corrigir **antes** de
  conectar qualquer automação (assistente Jarvis, integração externa, ou
  qualquer outro caller automatizado) a essas rotas. Reavaliar a urgência
  nesse momento, não depois.
- [ ] **Stored XSS via `/upload`** — corrigir **antes** de expandir o
  número de pessoas com acesso ao token compartilhado, ou assim que possível
  de qualquer forma (não depende de nenhum evento externo pra virar
  explorável, só de o token vazar uma vez).
- [ ] **Rate limiting no token** — corrigir **antes** de o token circular
  em mais lugares (novos dispositivos, link compartilhado, etc.) ou se
  houver qualquer suspeita de exposição do token atual.
- [ ] **Doc obsoleta do Worker Cloudflare** (`DEPLOY-TRAVA-SERVIDOR.md`,
  `wrangler-claire-dados.toml`) — limpar **antes** de qualquer nova pessoa
  mexer no deploy (para não seguir instrução desatualizada por engano).
- [ ] **Silêncio no `auto-deploy.sh` após falha pós-pull** — endurecer
  **antes** da próxima migração de schema (alembic) mais arriscada, ou
  assim que der pra encaixar (baixo esforço, alto valor).
- [ ] **Merge por campo generalizado** (`nx_plantao` e as demais 9 coleções
  só com merge por id) — corrigir **antes** de qualquer relato de "campo
  voltou sozinho"/"edição sumiu" nessas coleções especificamente (mesmo
  padrão que já apareceu 2x em `nx_manutencoes`/`nx_imoveis`).
- [ ] **`nx_turnos` sem merge por id** — corrigir **antes** de a
  coordenação da escala crescer pra mais de 1 pessoa editando com
  frequência.
- [ ] **`.claude/settings.local.json` no repo público** — resolver (gitignorar
  ou limpar) **antes** do próximo `git add -A`/commit amplo que possa pegar
  esse arquivo por engano.
- [ ] **Origens extras escrevendo em `/save`** (`claire-project.pages.dev`,
  `scintillating-muffin-a31c02.netlify.app` — ver seção 2.4) — investigar
  **antes de qualquer decisão de desligar Cloudflare Pages/Netlify
  definitivamente**, não só "antes de descartar infra antiga" de forma
  genérica. Concretamente: puxar os timestamps mais recentes desses hits de
  novo (log atual mostra último hit em 04/Aug pra ambas — 2 dias parado) pra
  confirmar se é tráfego morto (só histórico da janela de migração) ou algo
  ainda batendo esporadicamente. Desligar sem checar isso de novo, na hora,
  pode quebrar um uso esporádico que ninguém lembra que existe, ou mascarar
  uma segunda fonte de escrita ativa na mesma base de produção.

---

*Documento gerado em 06/08/2026 a partir da investigação da sessão do dia.
Não substitui revisão de código nem testes automatizados — é um mapa de
prioridades, não uma auditoria formal.*
