# Trava anti-perda no servidor (claire-dados) — instruções para o TI

O worker de dados `claire-dados` **não** é publicado pelo GitHub (o repositório só
publica o site). Por isso a trava abaixo, já escrita em `claire-dados-worker.js`,
**precisa ser publicada manualmente** no worker `claire-dados`.

## O que a trava faz
No endpoint `POST /save`, antes de gravar, compara o que chega com o que já está
salvo e **recusa (HTTP 409) gravações que apagariam dados** — ex.: uma lista cair
para 0, ou uma lista grande (≥8) colapsar para ≤2 (assinatura de "voltou ao padrão
de fábrica"), ou zerar todas as fotos. É **falha-segura**: qualquer erro na trava
cai no salvamento normal. Exclusões pequenas do dia a dia continuam funcionando.

## Como publicar (jeito mais simples — painel Cloudflare)
1. Cloudflare Dashboard → **Workers & Pages** → abrir o worker **claire-dados**.
2. **Edit code** (Editar código).
3. Substituir o conteúdo pelo arquivo `claire-dados-worker.js` deste repositório
   (versão atual, que já contém a trava no bloco `/save`).
4. **Deploy**.

## Como publicar (via wrangler, se preferir)
Criar um `wrangler.jsonc` próprio do backend (NÃO o do site) com:
```jsonc
{
  "name": "claire-dados",
  "main": "claire-dados-worker.js",
  "compatibility_date": "2026-06-01",
  "kv_namespaces": [{ "binding": "CLAIRE_KV", "id": "<id-do-namespace-claire-dados>" }],
  "vars": { "CLAIRE_TOKEN": "<token-atual>" }
}
```
e rodar `wrangler deploy`.

## Como confirmar que ficou ativa
Depois de publicar, este comando deve **falhar com 409** (e NÃO apagar nada):
```
curl -s -o - -w "%{http_code}" -X POST \
  "https://claire-dados.nicole-0e7.workers.dev/save?token=<token>" \
  -H "Content-Type: application/json" \
  --data '{"nx_tasks":[],"nx_lastSaved":"1"}'
```
Resposta esperada: `409` com `{"blocked":true,...}`. Se vier `200`, a trava não está ativa.
