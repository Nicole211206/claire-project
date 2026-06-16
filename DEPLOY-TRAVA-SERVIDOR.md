# Trava anti-perda no servidor (claire-dados) — instruções para o TI

O worker de dados `claire-dados` **não** é publicado pelo GitHub (o repositório só
publica o site). Por isso a trava abaixo, já escrita em `claire-dados-worker.js`,
**precisa ser publicada manualmente** no worker `claire-dados`.

## O que a trava faz
No endpoint `POST /save`, antes de gravar, compara o que chega com o que já está
salvo. Para cada lista que ENCOLHERIA catastroficamente (cair para 0, ou ≥8 caindo
para ≤2) — ou que zeraria todas as fotos — ela **mantém a versão do servidor naquela
chave** e **aceita o resto** (mescla). Assim nada é apagado, mas adições legítimas
(ex.: uma manutenção nova feita por quem está com outra lista atrasada) **passam
normalmente**. É **falha-segura**: qualquer erro cai no salvamento normal. Exclusões
pequenas do dia a dia continuam funcionando.

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
Depois de publicar, envie uma gravação "ruim" (tarefas vazias) e confirme que os
dados **NÃO** somem (a trava mantém a lista do servidor):
```
# manda tarefas vazias:
curl -s -X POST "https://claire-dados.nicole-0e7.workers.dev/save?token=<token>" \
  -H "Content-Type: application/json" --data '{"nx_tasks":[],"nx_lastSaved":"1"}'
# confere que nx_tasks continua cheio:
curl -s "https://claire-dados.nicole-0e7.workers.dev/load?token=<token>"
```
Se as tarefas continuarem lá (não viraram 0), a trava está ativa.
