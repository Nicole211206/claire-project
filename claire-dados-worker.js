/*
 * ════════════════════════════════════════════════════════════
 *  CLAIRE — Worker de Dados Compartilhados (Cloudflare KV)
 * ════════════════════════════════════════════════════════════
 *
 *  PARA QUE SERVE:
 *  Guarda os dados da Claire num lugar central (Cloudflare KV) para que
 *  TODOS os usuários (admin, coordenação, atendentes) vejam os mesmos
 *  dados de qualquer dispositivo — contas de login, turnos, demandas, etc.
 *
 *  ════════ COMO PUBLICAR (passo a passo) ════════
 *  1. Cloudflare Dashboard → Workers & Pages → Create → Worker
 *       Nome: claire-dados  →  Deploy
 *  2. Edit code → cole TODO este arquivo → Deploy
 *  3. Criar o banco KV:
 *       Storage & Databases → KV → Create namespace
 *       Nome do namespace: CLAIRE_KV  → Create
 *  4. Ligar o KV ao Worker:
 *       claire-dados → Settings → Bindings → Add binding → KV namespace
 *       Variable name: CLAIRE_KV   |   KV namespace: (selecione o que criou)  → Deploy
 *  5. Criar o token de segurança:
 *       claire-dados → Settings → Variables and Secrets → Add
 *       Tipo: Secret  |  Nome: CLAIRE_TOKEN  |  Valor: (invente uma senha forte)
 *       → Deploy
 *  6. Copie a URL do Worker (ex: https://claire-dados.SEU.workers.dev)
 *     e o token escolhido — você vai colar os dois na Claire
 *     (arquivo index.html, no bloco window.CLAIRE_SYNC).
 *
 *  Endpoints:
 *    GET  <worker>/load          → devolve o estado salvo (JSON) ou null
 *    POST <worker>/save  (body)  → grava o estado (JSON) enviado
 *    Autenticação: ?token=XXX  ou  header X-Token: XXX
 */

const KEY = 'claire-state-v1';
const BACKUP_PREFIX = 'claire-backup-';
const BACKUP_TTL = 8 * 24 * 3600; // 8 dias em segundos

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Token',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // Autenticação simples por token compartilhado
    const token = url.searchParams.get('token') || request.headers.get('X-Token') || '';
    if (env.CLAIRE_TOKEN && token !== env.CLAIRE_TOKEN) {
      return jsonResp({ error: 'nao autorizado' }, cors, 401);
    }
    if (!env.CLAIRE_KV) {
      return jsonResp({ error: 'KV nao configurado: crie o binding CLAIRE_KV' }, cors, 500);
    }

    try {
      if (url.pathname.endsWith('/load')) {
        const v = await env.CLAIRE_KV.get(KEY);
        return jsonResp({ data: v ? JSON.parse(v) : null }, cors);
      }
      if (url.pathname.endsWith('/save') && request.method === 'POST') {
        const body = await request.text();
        // valida que é JSON antes de gravar
        const parsed = JSON.parse(body);
        await env.CLAIRE_KV.put(KEY, body);
        // Snapshot diário: salva uma vez por dia (primeira gravação do dia), expira em 8 dias
        const today = new Date().toISOString().substring(0, 10);
        const backupKey = BACKUP_PREFIX + today;
        const existing = await env.CLAIRE_KV.get(backupKey);
        if (!existing) {
          await env.CLAIRE_KV.put(backupKey, body, { expirationTtl: BACKUP_TTL });
        }
        return jsonResp({ ok: true }, cors);
      }
      // Lista snapshots disponíveis
      if (url.pathname.endsWith('/backups')) {
        const list = await env.CLAIRE_KV.list({ prefix: BACKUP_PREFIX });
        const backups = list.keys.map(k => ({ date: k.name.replace(BACKUP_PREFIX, '') }));
        backups.sort((a, b) => b.date.localeCompare(a.date));
        return jsonResp({ backups }, cors);
      }
      // Carrega um snapshot específico
      if (url.pathname.endsWith('/load-backup')) {
        const date = url.searchParams.get('date');
        if (!date) return jsonResp({ error: 'parametro date obrigatorio' }, cors, 400);
        const v = await env.CLAIRE_KV.get(BACKUP_PREFIX + date);
        return jsonResp({ data: v ? JSON.parse(v) : null }, cors);
      }
      if (url.pathname.endsWith('/health')) {
        return jsonResp({ ok: true, kv: !!env.CLAIRE_KV }, cors);
      }
      return jsonResp({ error: 'rota nao encontrada' }, cors, 404);
    } catch (e) {
      return jsonResp({ error: String(e && e.message || e) }, cors, 500);
    }
  },
};

function jsonResp(obj, cors, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
