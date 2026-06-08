# 📦 Documento de Transferência — Novo Sistema de Onboarding WeCare

> **Como usar:** cole TODO este documento na primeira mensagem do novo chat. Ele contém tudo que o assistente precisa pra construir o sistema do zero, com o mesmo padrão técnico da Claire e sincronizando com ela.

---

## 1. Contexto

A **WeCare Hosting** gerencia imóveis de temporada (Airbnb/Booking). Já existe um painel chamado **Claire** (hospedado em Cloudflare Pages, repositório GitHub `Nicole211206/claire-project`). A Claire tem hoje um módulo de Onboarding, mas vamos **desmembrá-lo num sistema NOVO e 100% independente** — repositório próprio, deploy próprio.

**Objetivo:** sistema dedicado ao processo de implementação de novos imóveis (do contrato assinado até o anúncio ativo), com MAIS funcionalidades que o módulo atual da Claire.

**Importante:** o novo sistema deve **sincronizar com a Claire** os dados de ativação dos imóveis, porque a Claire tem um KPI de "Tempo de Ativação do Anúncio" que precisa desses dados (ver seção 6).

---

## 2. Padrão técnico (manter igual ao da Claire)

- **Stack:** HTML + CSS + JavaScript **vanilla** (sem framework, sem build). Um `index.html`, `css/styles.css`, `js/app.js`.
- **Hospedagem:** Cloudflare Pages, conectado a um repositório GitHub (deploy automático a cada push). Criar repo NOVO (ex: `wecare-onboarding`).
- **Cache-bust:** o `<script src="js/app.js?v=N">` usa um número de versão que incrementa a cada deploy (pra forçar o navegador a pegar a versão nova).
- **Dados compartilhados / multiusuário:** um **Cloudflare Worker + KV** (key-value store gratuito) com endpoints `/load` e `/save` (autenticação por token compartilhado). O app carrega o estado do KV no início e salva (debounced) nas mudanças. A Claire já usa esse padrão — o Worker dela se chama `claire-dados`.
- **Login multiusuário:** email/senha, perfis (admin / coordenação / atendente), com escopo de acesso por pessoa. Mesmo modelo da Claire.
- **Design:** paleta pastel (rosa/lavanda/sage/peach), fonte Fraunces (títulos) + Plus Jakarta Sans (texto). Pode reaproveitar o `css/styles.css` da Claire como base.

---

## 3. Estrutura de dados de um Imóvel (baseline da Claire)

```js
{
  id, nome, endereco, status, // status: contrato | compras | definicoes | producao | auditoria | ativo | perdido
  dataCriacao,        // ISO — quando o contrato foi assinado (entrada no sistema)
  dataAtivacao,       // ISO — quando virou "ativo" (anúncio no ar) → usado no KPI da Claire
  statusAnterior,     // pra restaurar quando volta de "perdido"
  proprietarioNome, proprietarioTel,
  comissaoWecare,     // % (default 20)
  comissaoBase,       // 'liquida' | 'bruta'
  plataformas: [],    // 'airbnb','booking','expedia','siteproprio'
  quartos, banheiros,
  camas: [{tipo, qtd}],   // tipos: Solteiro, Casal, Queen, King, Sofá-cama Solteiro, Sofá-cama Casal, Beliche, Bicama, Viúva
  // Definições:
  seguroEasyCover, kitAmenities, internetClaro, ecohost, fechaduraEletronica, // booleanos
  defLimpeza: { responsavel },
  defEnxoval: { tipo:'comprado'|'alugado', fornecedor, valorAluguelMensal, valorSetupAluguel },
  // Operacional:
  ops: { fotos:{data,responsavel,hora,custo}, limpeza:{...}, vistoria:{...} },
  // Custos / Setup:
  custos: [{desc, valor}],   // os custos de ops alimentam isto automaticamente
  margemWecare,              // % (default 15) — Total Setup = subtotal × (1 + margem/100)
  valorSetup,                // calculado
  descontoTipo:'reais'|'percent', descontoValor, formasPagamento,
  // Compras:
  compras: { 'Categoria__Item': {tem, valorUnit} }, // quantidade que tem + valor unitário
  // Final:
  linkFotos, linkRelatorio, responsavelCriacao,
  prazoAtivacaoHoras, dataEnvioParaCriacao, // controle de prazo do anúncio
  valorMinNoite, valorBaseNoite, taxaHospedeExtra, taxaHospedeExtraAcimaDe, taxaLimpeza, observacoes,
  comentarios: { fase: [{texto, data}] } // comentários por fase
}
```

---

## 4. Funcionalidades do módulo atual (baseline a recriar)

**Kanban de fases:** Contrato Assinado → Compras → Definições → Produção → Auditoria → Ativo. Botão "Avançar Fase". Cards clicáveis abrem o detalhe.

**Status "Perdido":** botão pra marcar imóvel como perdido (some do kanban, fica numa seção discreta "Imóveis Perdidos" com botão "Voltar à operação"). Botão "Apagar imóvel".

**Modal do imóvel com abas:** Dados · Definições · Operacional · Custos · Compras · Final. Cada aba tem campo de **comentários por fase**.

**Definições:** checkboxes (Seguro EasyCover R$117,85, Kit Amenities, Internet Claro, Ecohost, Fechadura Eletrônica) + responsável pela limpeza + tipo de enxoval (comprado: fornecedor / alugado: fornecedor + valor mensal + valor de setup que cai nos custos).

**Operacional:** Sessão de Fotos, Primeira Limpeza, Vistoria — cada um com data + responsável + hora + **custo** (que alimenta a aba Custos). Botão de criar evento no Google Agenda.

**Custos:** lista de itens + valor, margem WeCare % editável, desconto (R$ ou %), formas de pagamento. Total Setup = subtotal × (1 + margem%).

**Compras (lista de itens obrigatórios):** categorias **Cama, Banheiro, Lavanderia, Cozinha, Quarto, Limpeza, Outros** (tudo editável numa Central de Configurações — adicionar/remover itens e categorias). Cada item: quantidade **Necessária** (calculada), **Tem** (preenchido), **Falta** (calculado), **R$/un**.
- **Quantidade necessária** baseada na composição: ex. Jogo de Cama = 3×colchão, Travesseiros = 1×leito, Toalhas = 3×banheiro, etc.
- **Beliche e Bicama contam como 2** (colchões/leitos).
- **Itens de enxoval (Cama/Banheiro) só aparecem se o enxoval for "Comprado"** nas Definições.

**Tabela de preços (editável na config):**
- Itens gerais: preço único por item.
- **Enxoval varia por tipo de cama** (Solteiro/Casal/Queen/King). Valores conhecidos:
  - Jogo de Cama Basic Percalle: Solteiro 259 / Casal 309 / Queen 319 / King 379
  - Cobertor Aspen II: 98 / 144 / 158 / 192
  - Edredom Premier Hotel: 429 / 499 / 779 / 899
  - Capa p/ Edredom Hotel: 259 / 305 / 345 / 409
  - Protetor de Colchão: 188 / 238 / 148 / 178
  - Gerais: Fronha R$43, Travesseiro Sanomed R$285, Toque de Pluma R$99, Protetor Travesseiro R$52, Toalha Banho R$64, Toalha Rosto R$30, Piso R$42
  - (Bicama e Beliche usam preço de Solteiro)

**Orçamento PDF:** gerado com logo/cabeçalho WeCare, nome do imóvel, proprietário, lista de itens que faltam (Necessário − Tem) com quantidade + valor unitário + total, **agrupado em Enxoval / Imóvel / Outros** (total por grupo), total geral, desconto e formas de pagamento. (Implementado via `window.open` + `window.print()`.)

**Controle de ativação do anúncio:** campo "Responsável pela Criação" (seleciona um membro), prazo em horas (default 24h), botão "Anúncio enviado para criação" (registra o horário) → cria uma demanda pra essa pessoa → se passar do prazo sem dar baixa, mostra alerta de "ATRASADO" no card.

---

## 5. Regras de negócio importantes

- **Tempo de ativação** = dias entre `dataCriacao` (contrato) e `dataAtivacao` (virou ativo). É isso que a Claire usa no KPI.
- Imóvel só conta no tempo médio quando está **ativo**.
- Comissão WeCare pode ser sobre receita **bruta ou líquida** (campo de escolha).

---

## 6. ⭐ Sincronização com a Claire (KPI de Onboarding)

A Claire tem um KPI **"Tempo de Ativação do Anúncio"** = média de dias entre contrato e ativação dos imóveis. Hoje ela calcula com os imóveis do módulo interno. Quando o onboarding virar sistema separado, a Claire precisa **ler os dados de ativação do novo sistema**.

**Como fazer (mesma conta Cloudflare):**
- O novo sistema usa um **Worker + KV** (pode ser o mesmo namespace KV `CLAIRE_KV` que a Claire já usa, ou um novo).
- O novo sistema grava num **key compartilhado** (ex: `wecare-onboarding-stats`) um resumo dos imóveis: `[{nome, dataCriacao, dataAtivacao, status}]`.
- A Claire passa a **ler esse key** pra calcular o KPI de Tempo de Ativação (em vez do array local `imoveis`).
- Detalhe técnico: o Worker da Claire (`claire-dados`) e o novo Worker podem apontar pro **mesmo KV namespace**, só usando keys diferentes. Assim os dois sistemas compartilham sem conflito.

> Peça ao assistente do novo chat pra **expor um endpoint `/onboarding-stats`** no Worker do novo sistema (ou gravar no KV compartilhado). Depois, eu (ou você) ajusto a Claire pra ler de lá no KPI.

---

## 7. Funcionalidades NOVAS a acrescentar (além da Claire)

> A Nicole quer adicionar mais coisas. Liste e detalhe com ela no novo chat. Ideias prováveis: relatórios/dashboard de onboardings em andamento, prazos por fase, checklist de tarefas por fase, anexos/fotos, histórico, integração com fornecedores (Buddemeyer/Flashee), aprovação do proprietário, etc.

---

## 8. Credenciais / infra que já existem

- **Conta Cloudflare:** subdomínio dos Workers = `nicole-0e7.workers.dev`.
- **KV namespace existente:** `CLAIRE_KV` (binding usado pelo Worker `claire-dados`).
- **Worker de dados da Claire:** `claire-dados` (endpoints `/load`, `/save`, auth por token).
- **Fluxo de deploy:** GitHub Desktop (ou git CLI) → push → Cloudflare Pages publica sozinho.
- A Nicole consegue criar Workers, KV e bindings no painel da Cloudflare (já fez isso pra Claire e pro Hostaway).

---

## 9. Primeiro passo sugerido no novo chat

1. Criar a estrutura base (index.html + css + js) reaproveitando o visual da Claire.
2. Recriar o kanban de fases + modal de imóvel com as abas.
3. Configurar o repositório GitHub + deploy Cloudflare Pages.
4. Montar o Worker + KV do novo sistema (com o key compartilhado pra Claire ler).
5. Ir acrescentando as funcionalidades novas que a Nicole pedir.
