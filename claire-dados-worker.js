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
 *  Endpoints internos (Claire app):
 *    GET  <worker>/load               → devolve o estado completo (JSON)
 *    POST <worker>/save  (body JSON)  → grava o estado completo
 *    GET  <worker>/backups            → lista snapshots disponíveis
 *    GET  <worker>/load-backup?date=  → restaura snapshot de uma data
 *    Autenticação: ?token=XXX  ou  header X-Token: XXX
 *
 *  API Jarvis (REST):
 *    GET    /api/tasks              → lista tarefas
 *    POST   /api/tasks              → cria tarefa  {text, cat?, prio?, due?, status?}
 *    PATCH  /api/tasks/:id          → atualiza tarefa (campos parciais)
 *    DELETE /api/tasks/:id          → apaga tarefa
 *    GET    /api/demands            → lista demandas de todas as ATTs
 *    POST   /api/demands            → cria demanda  {attId, text, prio?, due?, status?}
 *    PATCH  /api/demands/:attId/:idx → atualiza demanda
 *    GET    /api/projects           → lista projetos
 *    POST   /api/projects           → cria projeto  {nome, status?, dataInicio?, dataFim?}
 *    PATCH  /api/projects/:id       → atualiza projeto
 *    GET    /api/summary            → resumo rápido para o Jarvis
 */

const KEY = 'claire-state-v1';
const BACKUP_PREFIX = 'claire-backup-';
const BACKUP_TTL = 8 * 24 * 3600; // 8 dias em segundos

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
        // ── TRAVA ANTI-PERDA (lado do servidor), por MESCLAGEM ──
        // Não RECUSA a gravação inteira (isso bloquearia adições legítimas de quem
        // está com alguma lista atrasada). Em vez disso, para cada lista que
        // ENCOLHERIA catastroficamente (zerar, ou ≥8 caindo p/ ≤2), mantém a versão
        // do servidor NAQUELA chave, e ACEITA o resto (ex.: uma manutenção nova).
        // Falha-segura: qualquer erro aqui cai no salvamento normal do body.
        let bodyToSave = body;
        try {
          const prevRaw = await env.CLAIRE_KV.get(KEY);
          if (prevRaw) {
            const prev = JSON.parse(prevRaw);
            const PROT = ['nx_tasks','nx_projetos','nx_turnos','nx_conquistas','nx_manutencoes','nx_plantao','nx_compras','nx_extras','nx_users','nx_catalog','nx_notes','nx_imoveis'];
            let merged = null;
            const protege = (k) => { if (!merged) merged = JSON.parse(JSON.stringify(parsed)); merged[k] = prev[k]; };
            for (const k of PROT) {
              const nNew = Array.isArray(parsed[k]) ? parsed[k].length : null;
              const nOld = Array.isArray(prev[k]) ? prev[k].length : null;
              if (nOld != null && nNew != null && ((nNew === 0 && nOld >= 3) || (nOld >= 8 && nNew <= 2))) {
                protege(k); // mantém a lista do servidor (não deixa encolher)
              }
            }
            // não deixa zerar todas as fotos dos atendentes
            const fOld = (Array.isArray(prev.nx_atts) ? prev.nx_atts : []).filter(x => x && x.foto).length;
            const fNew = (Array.isArray(parsed.nx_atts) ? parsed.nx_atts : []).filter(x => x && x.foto).length;
            if (fOld >= 2 && fNew === 0) { protege('nx_atts'); }
            if (merged) { merged.nx_lastSaved = String(Date.now()); bodyToSave = JSON.stringify(merged); }
          }
        } catch (e) { /* falha-segura: salva o body original */ }
        await env.CLAIRE_KV.put(KEY, bodyToSave);
        // Snapshot diário: salva uma vez por dia (primeira gravação do dia), expira em 8 dias
        const today = new Date().toISOString().substring(0, 10);
        const backupKey = BACKUP_PREFIX + today;
        const existing = await env.CLAIRE_KV.get(backupKey);
        if (!existing) {
          await env.CLAIRE_KV.put(backupKey, bodyToSave, { expirationTtl: BACKUP_TTL });
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

      // ═══ API Jarvis ═══
      const corsApi = { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
      if (url.pathname.startsWith('/api/')) {
        return handleApi(request, url, env, corsApi);
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

// ─── Helpers KV ───
async function kvLoad(env) {
  const v = await env.CLAIRE_KV.get(KEY);
  return v ? JSON.parse(v) : {};
}
async function kvSave(env, state) {
  state.nx_lastSaved = Date.now();
  await env.CLAIRE_KV.put(KEY, JSON.stringify(state));
}

// ─── Roteador da API Jarvis ───
async function handleApi(request, url, env, cors) {
  const method = request.method;
  const path = url.pathname.replace('/api/', '');   // ex: "tasks", "tasks/123"
  const parts = path.split('/');                     // ["tasks"] ou ["tasks","123"]
  const resource = parts[0];
  const param1 = parts[1];
  const param2 = parts[2];

  try {
    const state = await kvLoad(env);

    // ── /api/summary ──────────────────────────────────────────
    if (resource === 'summary' && method === 'GET') {
      const tasks = state.nx_tasks || [];
      const projects = state.nx_projetos || [];
      const atts = state.nx_atts || [];
      const demands = atts.flatMap(a => (a.demands || []).map(d => ({ ...d, attId: a.id, attName: a.name })));
      return jsonResp({
        tasks:    { total: tasks.length, pending: tasks.filter(t => !t.done).length, done: tasks.filter(t => t.done).length },
        projects: { total: projects.length, active: projects.filter(p => p.status === 'andamento').length },
        demands:  { total: demands.length, pending: demands.filter(d => d.status !== 'done').length },
      }, cors);
    }

    // ── /api/tasks ────────────────────────────────────────────
    if (resource === 'tasks') {
      let tasks = state.nx_tasks || [];

      if (method === 'GET' && !param1) {
        const status = url.searchParams.get('status');
        const list = status ? tasks.filter(t => status === 'done' ? t.done : !t.done) : tasks;
        return jsonResp({ tasks: list }, cors);
      }

      if (method === 'POST' && !param1) {
        const body = await request.json();
        if (!body.text) return jsonResp({ error: 'campo text obrigatorio' }, cors, 400);
        const task = {
          id: Date.now(),
          text: body.text,
          cat: body.cat || 'work',
          prio: body.prio || 'med',
          due: body.due || null,
          status: body.status || 'todo',
          done: false,
          updates: [],
          createdBy: 'jarvis',
        };
        tasks.push(task);
        state.nx_tasks = tasks;
        await kvSave(env, state);
        return jsonResp({ ok: true, task }, cors, 201);
      }

      if (method === 'PATCH' && param1) {
        const id = parseInt(param1);
        const idx = tasks.findIndex(t => t.id === id);
        if (idx < 0) return jsonResp({ error: 'tarefa nao encontrada' }, cors, 404);
        const body = await request.json();
        if (body.done !== undefined || body.status === 'done') {
          tasks[idx].done = true; tasks[idx].status = 'done';
        } else if (body.status) {
          tasks[idx].status = body.status; tasks[idx].done = false;
        }
        const campos = ['text','cat','prio','due','dataInicio','projetoId'];
        campos.forEach(c => { if (body[c] !== undefined) tasks[idx][c] = body[c]; });
        state.nx_tasks = tasks;
        await kvSave(env, state);
        return jsonResp({ ok: true, task: tasks[idx] }, cors);
      }

      if (method === 'DELETE' && param1) {
        const id = parseInt(param1);
        const before = tasks.length;
        state.nx_tasks = tasks.filter(t => t.id !== id);
        if (state.nx_tasks.length === before) return jsonResp({ error: 'tarefa nao encontrada' }, cors, 404);
        await kvSave(env, state);
        return jsonResp({ ok: true }, cors);
      }
    }

    // ── /api/demands ──────────────────────────────────────────
    if (resource === 'demands') {
      const atts = state.nx_atts || [];

      if (method === 'GET' && !param1) {
        const attFilter = url.searchParams.get('attId');
        const demands = atts.flatMap(a =>
          (a.demands || []).map((d, i) => ({ ...d, attId: a.id, attName: a.name, _idx: i }))
        );
        return jsonResp({ demands: attFilter ? demands.filter(d => d.attId === attFilter) : demands }, cors);
      }

      if (method === 'POST' && !param1) {
        const body = await request.json();
        if (!body.attId || !body.text) return jsonResp({ error: 'campos attId e text obrigatorios' }, cors, 400);
        const att = atts.find(a => a.id === body.attId);
        if (!att) return jsonResp({ error: 'ATT nao encontrada' }, cors, 404);
        if (!att.demands) att.demands = [];
        const demand = {
          id: Date.now(),
          text: body.text,
          prio: body.prio || 'med',
          due: body.due || null,
          status: body.status || 'todo',
          done: false,
          createdBy: 'jarvis',
        };
        att.demands.push(demand);
        state.nx_atts = atts;
        await kvSave(env, state);
        return jsonResp({ ok: true, demand }, cors, 201);
      }

      // PATCH /api/demands/:attId/:idx
      if (method === 'PATCH' && param1 && param2 !== undefined) {
        const att = atts.find(a => a.id === param1);
        if (!att) return jsonResp({ error: 'ATT nao encontrada' }, cors, 404);
        const idx = parseInt(param2);
        if (!att.demands || !att.demands[idx]) return jsonResp({ error: 'demanda nao encontrada' }, cors, 404);
        const body = await request.json();
        if (body.done !== undefined || body.status === 'done') {
          att.demands[idx].done = true; att.demands[idx].status = 'done';
        } else if (body.status) {
          att.demands[idx].status = body.status; att.demands[idx].done = false;
        }
        ['text','prio','due'].forEach(c => { if (body[c] !== undefined) att.demands[idx][c] = body[c]; });
        state.nx_atts = atts;
        await kvSave(env, state);
        return jsonResp({ ok: true, demand: att.demands[idx] }, cors);
      }
    }

    // ── /api/projects ─────────────────────────────────────────
    if (resource === 'projects') {
      let projects = state.nx_projetos || [];

      if (method === 'GET' && !param1) {
        return jsonResp({ projects }, cors);
      }

      if (method === 'POST' && !param1) {
        const body = await request.json();
        if (!body.nome) return jsonResp({ error: 'campo nome obrigatorio' }, cors, 400);
        const project = {
          id: Date.now(),
          nome: body.nome,
          status: body.status || 'planejamento',
          dataInicio: body.dataInicio || null,
          dataFim: body.dataFim || null,
          desc: body.desc || '',
          tasks: [],
          createdBy: 'jarvis',
        };
        projects.push(project);
        state.nx_projetos = projects;
        await kvSave(env, state);
        return jsonResp({ ok: true, project }, cors, 201);
      }

      if (method === 'PATCH' && param1) {
        const id = parseInt(param1);
        const idx = projects.findIndex(p => p.id === id);
        if (idx < 0) return jsonResp({ error: 'projeto nao encontrado' }, cors, 404);
        const body = await request.json();
        ['nome','status','dataInicio','dataFim','desc'].forEach(c => {
          if (body[c] !== undefined) projects[idx][c] = body[c];
        });
        state.nx_projetos = projects;
        await kvSave(env, state);
        return jsonResp({ ok: true, project: projects[idx] }, cors);
      }
    }

    return jsonResp({ error: 'rota nao encontrada' }, cors, 404);
  } catch (e) {
    return jsonResp({ error: String(e && e.message || e) }, cors, 500);
  }
}
