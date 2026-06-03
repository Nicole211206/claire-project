/*
 * ════════════════════════════════════════════════════════════
 *  CLAIRE × HOSTAWAY — Cloudflare Worker (proxy de avaliações)
 * ════════════════════════════════════════════════════════════
 *
 *  PARA O TIME DE TI:
 *  Este Worker fica entre a Claire e a API do Hostaway. Ele:
 *   - Guarda as credenciais do Hostaway em segurança (Secrets do Worker)
 *   - Resolve o problema de CORS
 *   - Busca o token e as avaliações, e devolve um JSON limpo pra Claire
 *
 *  COMO PUBLICAR (resumo):
 *  1. Cloudflare Dashboard → Workers & Pages → Create → Worker
 *  2. Cole este código e faça Deploy
 *  3. Em Settings → Variables and Secrets, adicione 2 SECRETS:
 *        HOSTAWAY_ACCOUNT_ID  = (Account ID do Hostaway)
 *        HOSTAWAY_API_KEY     = (API Key do Hostaway)
 *  4. (Opcional) Em Settings, restrinja o CORS trocando "*" pela URL da Claire
 *  5. Copie a URL do Worker (ex: https://claire-hostaway.SEU-SUBDOMINIO.workers.dev)
 *     e cole nas Configurações da Claire → Hostaway → "URL do Worker"
 *
 *  Endpoints expostos:
 *    GET <worker>/reviews   → lista de avaliações normalizadas
 *    GET <worker>/health    → teste de conexão
 */

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*', // troque por sua URL da Claire para restringir
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
      if (url.pathname.endsWith('/health')) {
        return json({ ok: true }, cors);
      }
      if (url.pathname.endsWith('/reviews')) {
        const token = await getToken(env);
        // Paginação robusta: dedup por ID + usa o 'count' oficial do Hostaway pra saber quando parar.
        const limit = 100;
        let offset = 0;
        let hostawayCount = null;
        const porId = new Map();
        for (let pagina = 0; pagina < 300; pagina++) { // teto de segurança
          const r = await fetch(HOSTAWAY_BASE + '/reviews?limit=' + limit + '&offset=' + offset, {
            headers: { 'Authorization': 'Bearer ' + token, 'Cache-control': 'no-cache' },
          });
          const data = await r.json();
          if (hostawayCount === null && data.count != null) hostawayCount = data.count;
          const lote = data.result || [];
          if (lote.length === 0) break;
          lote.forEach(function (rv) { if (rv && rv.id != null) porId.set(rv.id, rv); });
          offset += limit;
          if (hostawayCount !== null && offset >= hostawayCount) break;
        }
        const arr = Array.from(porId.values());
        const list = arr.map(normalizeReview);
        const comTexto = list.filter(function (x) { return x.texto && x.texto.trim(); }).length;
        const comNota = list.filter(function (x) { return x.rating != null; }).length;
        return json({ reviews: list, total: list.length, hostawayCount: hostawayCount, comTexto: comTexto, comNota: comNota }, cors);
      }
      // Contagem de reservas por período de CHECK-OUT: /reservations?from=YYYY-MM-DD&to=YYYY-MM-DD
      if (url.pathname.endsWith('/reservations')) {
        const token = await getToken(env);
        const from = url.searchParams.get('from') || '';
        const to = url.searchParams.get('to') || '';
        const qs = new URLSearchParams({ limit: '1', includeResources: '0' });
        if (from) qs.set('departureStartDate', from);
        if (to) qs.set('departureEndDate', to);
        const r = await fetch(HOSTAWAY_BASE + '/reservations?' + qs.toString(), {
          headers: { 'Authorization': 'Bearer ' + token, 'Cache-control': 'no-cache' },
        });
        const data = await r.json();
        // Hostaway devolve 'count' com o total que casa com o filtro
        return json({ total: (data.count != null ? data.count : (data.result ? data.result.length : 0)) }, cors);
      }
      // Estatísticas: números resumidos pra verificação rápida (resposta pequena)
      if (url.pathname.endsWith('/stats')) {
        const token = await getToken(env);
        const limit = 100;
        let offset = 0;
        let hostawayCount = null;
        const porId = new Map();
        for (let pagina = 0; pagina < 300; pagina++) {
          const r = await fetch(HOSTAWAY_BASE + '/reviews?limit=' + limit + '&offset=' + offset, {
            headers: { 'Authorization': 'Bearer ' + token, 'Cache-control': 'no-cache' },
          });
          const data = await r.json();
          if (hostawayCount === null && data.count != null) hostawayCount = data.count;
          const lote = data.result || [];
          if (lote.length === 0) break;
          lote.forEach(function (rv) { if (rv && rv.id != null) porId.set(rv.id, rv); });
          offset += limit;
          if (hostawayCount !== null && offset >= hostawayCount) break;
        }
        const arr = Array.from(porId.values()).map(normalizeReview);
        const comTexto = arr.filter(function (x) { return x.texto && x.texto.trim(); }).length;
        const comNota = arr.filter(function (x) { return x.rating != null; }).length;
        const porCanal = {};
        arr.forEach(function (x) { porCanal[x.canal] = (porCanal[x.canal] || 0) + 1; });
        return json({ totalBaixado: arr.length, hostawayCount: hostawayCount, comTexto: comTexto, comNota: comNota, porCanal: porCanal }, cors);
      }
      // Diagnóstico: retorna 2 avaliações cruas (sem normalizar) pra inspecionar os campos do Hostaway
      if (url.pathname.endsWith('/debug')) {
        const token = await getToken(env);
        const r = await fetch(HOSTAWAY_BASE + '/reviews?limit=2&sortOrder=desc', {
          headers: { 'Authorization': 'Bearer ' + token, 'Cache-control': 'no-cache' },
        });
        const data = await r.json();
        return json({ raw: (data.result || []).slice(0, 2) }, cors);
      }
      return json({ error: 'rota não encontrada' }, cors, 404);
    } catch (e) {
      return json({ error: String(e && e.message || e) }, cors, 500);
    }
  },
};

async function getToken(env) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.HOSTAWAY_ACCOUNT_ID,
    client_secret: env.HOSTAWAY_API_KEY,
    scope: 'general',
  });
  const r = await fetch(HOSTAWAY_BASE + '/accessTokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-control': 'no-cache' },
    body: body.toString(),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Falha ao obter token do Hostaway: ' + JSON.stringify(d));
  return d.access_token;
}

// Mapa de canais do Hostaway (channelId → nome)
const CANAIS = {
  2000: 'Direct', 2002: 'HomeAway', 2005: 'Airbnb', 2007: 'Booking.com',
  2009: 'Expedia', 2010: 'Booking.com', 2013: 'Vrbo', 2015: 'Site Próprio',
  2018: 'Airbnb', // canal majoritário de Airbnb na conta WeCare
};

// Quando o rating principal vem vazio, calcula a média das sub-notas por categoria (escala 0-10)
function ratingDeCategorias(rv) {
  const cats = rv.reviewCategory || rv.reviewCategories || [];
  if (!Array.isArray(cats) || cats.length === 0) return null;
  const nums = cats.map(c => (c && (c.rating != null ? c.rating : c.value))).filter(x => x != null && !isNaN(x));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + Number(b), 0) / nums.length;
}

function normalizeReview(rv) {
  const status = (rv.status || '').toLowerCase();
  const ratingFinal = rv.rating != null ? rv.rating : ratingDeCategorias(rv);
  const publicada = (status === 'published') || rv.isPublished === true || rv.isPublished === 1;
  return {
    id: rv.id,
    rating: ratingFinal != null ? Math.round(ratingFinal * 100) / 100 : null,
    texto: rv.publicReview || '',           // comentário externo (público)
    comentarioInterno: rv.privateFeedback || '', // comentário interno (privado)
    hospede: rv.guestName || '',
    imovel: rv.listingName || '',
    canalId: rv.channelId || null,
    canal: CANAIS[rv.channelId] || (rv.channelName || 'Outro'),
    data: rv.submittedAt || rv.insertedOn || rv.departureDate || '',
    checkout: rv.departureDate || '',       // data de check-out (se disponível)
    checkin: rv.arrivalDate || '',
    submittedAt: rv.submittedAt || '',
    publicada: publicada,
    status: rv.status || '',
    tipo: rv.type || '',                    // guest-to-host | host-to-guest
    reservaId: rv.reservationId || null,
  };
}

function json(obj, cors, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
