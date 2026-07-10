// Onda 1 (prep) da Fase 2 do plano de arquitetura: semeia o D1 (tabela
// generica `records`, colecao "manutencoes") com o estado ATUAL de
// nx_manutencoes do KV, via o endpoint /api/v2/manutencoes (POST faz
// upsert por id — idempotente, seguro rodar mais de uma vez).
//
// Não apaga nem altera nada no KV — só LÊ de lá e ESCREVE no D1 (que ainda
// não é usado por ninguém). O espelhamento contínuo (worker /save) já cobre
// as mudanças daqui pra frente; este script só cobre o histórico que já
// existia antes do espelhamento entrar no ar.
//
// Execute: node backfill-manutencoes-d1.js

const WORKER_URL = 'https://claire-dados.nicole-0e7.workers.dev';
const TOKEN = 'wecare-claire-2026-k7x9q2';

async function main() {
  const r = await fetch(`${WORKER_URL}/load?token=${TOKEN}`);
  const j = await r.json();
  const manutencoes = (j.data && j.data.nx_manutencoes) || [];
  console.log(`Encontradas ${manutencoes.length} manutenções no KV. Semeando o D1...`);

  let ok = 0, falhas = 0;
  for (const m of manutencoes) {
    try {
      const resp = await fetch(`${WORKER_URL}/api/v2/manutencoes?token=${TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m),
      });
      const jr = await resp.json();
      if (jr.ok) ok++; else { falhas++; console.warn('falhou', m.id, jr); }
    } catch (err) { falhas++; console.warn('falhou', m.id, err.message); }
  }
  console.log(`Backfill concluído: ${ok} ok, ${falhas} falhas.`);

  // Confere: lista o que ficou no D1 e compara a contagem com o KV.
  const check = await fetch(`${WORKER_URL}/api/v2/manutencoes?token=${TOKEN}`);
  const cj = await check.json();
  console.log(`D1 agora tem ${cj.items ? cj.items.length : '?'} manutenções (KV tem ${manutencoes.length}).`);
}

main().catch(console.error);
