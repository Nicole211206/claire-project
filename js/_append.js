
// ═══════════════════ ACOMPANHAMENTO — ABAS ═══════════════════
let _acompTab = 'avaliacoes';

function switchAcompTab(tab, btn) {
  _acompTab = tab;
  ['avaliacoes','superhost','cancelamentos'].forEach(t => {
    const el = document.getElementById('acomp-content-'+t);
    if (el) el.style.display = t === tab ? '' : 'none';
    const act = document.getElementById('acomp-actions-'+t);
    if (act) act.style.display = t === tab ? 'flex' : 'none';
  });
  document.querySelectorAll('.acomp-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'superhost') renderSuperhost();
  if (tab === 'cancelamentos') renderCancelamentos();
  if (tab === 'avaliacoes') renderAvaliacoes();
}

// ── SUPERHOST ──
const SUPERHOST_CRITERIOS = [
  {id:'nota', label:'Nota geral', meta:4.8, unit:'estrelas', desc:'Mínimo 4,8 estrelas'},
  {id:'qtdAvaliacoes', label:'Nº de avaliações', meta:10, unit:'aval.', desc:'Mínimo 10 no período'},
  {id:'taxaResposta', label:'Taxa de resposta', meta:90, unit:'%', desc:'Mínimo 90%'},
  {id:'qtdCancelamentos', label:'Cancelamentos pelo anfitrião', meta:1, unit:'canc.', desc:'Máximo 1 (quanto menor melhor)', inverso:true},
];

function renderSuperhost() {
  const el = document.getElementById('superhost-lista'); if (!el) return;
  const ultimo = superhostPeriodos.length > 0 ? superhostPeriodos[superhostPeriodos.length-1] : null;
  const resumoEl = document.getElementById('superhost-criterios-resumo');
  if (resumoEl && ultimo) {
    resumoEl.innerHTML = SUPERHOST_CRITERIOS.map(c => {
      const v = ultimo[c.id]; const ok = v == null ? null : (c.inverso ? v <= c.meta : v >= c.meta);
      const cor = ok === null ? 'sky' : ok ? 'sage' : 'rose';
      const iconName = ok===null ? 'fa-circle-question' : ok ? 'fa-circle-check' : 'fa-circle-xmark';
      const displayVal = v != null ? (v + (c.unit === 'estrelas' ? '★' : ' ' + c.unit)) : '—';
      return '<div class="metric-card '+cor+'"><div class="metric-icon '+cor+'"><i class="fa-solid '+iconName+'"></i></div><div class="metric-value" style="font-size:22px;">'+displayVal+'</div><div class="metric-label">'+c.label+'<br><span style="font-size:10px;opacity:0.7;">'+c.desc+'</span></div></div>';
    }).join('');
  } else if (resumoEl) {
    resumoEl.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:16px;">Nenhum período registrado ainda.</div>';
  }
  if (superhostPeriodos.length === 0) {
    el.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3);"><i class="fa-solid fa-award" style="font-size:32px;opacity:0.35;margin-bottom:10px;display:block;"></i><div>Nenhum período registrado.</div></div></div>';
    return;
  }
  el.innerHTML = '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:10px;">Histórico de Períodos</div>' +
    superhostPeriodos.slice().reverse().map(p => {
      const oks = SUPERHOST_CRITERIOS.filter(c => p[c.id] != null ? (c.inverso ? p[c.id] <= c.meta : p[c.id] >= c.meta) : false).length;
      const status = oks === SUPERHOST_CRITERIOS.length ? 'sage' : oks >= 3 ? 'gold' : 'rose';
      const criteriosHtml = SUPERHOST_CRITERIOS.map(c => {
        const v = p[c.id]; const ok = v!=null?(c.inverso?v<=c.meta:v>=c.meta):null;
        const dv = v!=null?(v+(c.unit==='estrelas'?'★':' '+c.unit)):'—';
        const clr = ok===null?'var(--text3)':ok?'var(--sage)':'var(--vermelha)';
        return '<div style="background:var(--bg3);border-radius:6px;padding:8px;"><div style="font-size:10px;color:var(--text3);">'+c.label+'</div><div style="font-weight:700;color:'+clr+';">'+dv+'</div></div>';
      }).join('') + (p.obsExtra ? '<div style="grid-column:1/-1;font-size:12px;color:var(--text3);padding:4px 0;">'+esc(p.obsExtra)+'</div>' : '');
      return '<div class="card" style="margin-bottom:8px;"><div class="card-header"><div class="card-title">'+esc(p.periodo||'—')+'</div><span style="font-size:11px;background:var(--bg3);padding:2px 8px;border-radius:8px;font-weight:600;">'+oks+'/'+SUPERHOST_CRITERIOS.length+' critérios</span><button class="btn btn-sm" onclick="editarSuperhost(\''+p.id+'\')"><i class="fa-solid fa-pencil"></i></button><button onclick="excluirSuperhost(\''+p.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;"><i class="fa-solid fa-trash"></i></button></div><div class="card-body" style="padding:10px 16px;"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;font-size:12px;">'+criteriosHtml+'</div></div></div>';
    }).join('');
}

let _superhostEditId = null;
function abrirModalSuperhost(id) {
  _superhostEditId = id || null;
  const p = id ? superhostPeriodos.find(x=>x.id===id) : null;
  document.getElementById('sh-periodo').value = p ? (p.periodo||'') : '';
  document.getElementById('sh-nota').value = p ? (p.nota!=null?p.nota:'') : '';
  document.getElementById('sh-qtd-aval').value = p ? (p.qtdAvaliacoes!=null?p.qtdAvaliacoes:'') : '';
  document.getElementById('sh-taxa-resp').value = p ? (p.taxaResposta!=null?p.taxaResposta:'') : '';
  document.getElementById('sh-qtd-canc').value = p ? (p.qtdCancelamentos!=null?p.qtdCancelamentos:'') : '';
  document.getElementById('sh-obs').value = p ? (p.obsExtra||'') : '';
  document.getElementById('modal-superhost').classList.add('open');
}
function editarSuperhost(id) { abrirModalSuperhost(id); }
function salvarSuperhost() {
  const periodo = document.getElementById('sh-periodo').value.trim();
  if (!periodo) { showToast('Informe o período.', 'peach'); return; }
  const obj = {
    id: _superhostEditId || ('sh'+Date.now()),
    periodo,
    nota: document.getElementById('sh-nota').value !== '' ? parseFloat(document.getElementById('sh-nota').value) : null,
    qtdAvaliacoes: document.getElementById('sh-qtd-aval').value !== '' ? parseInt(document.getElementById('sh-qtd-aval').value) : null,
    taxaResposta: document.getElementById('sh-taxa-resp').value !== '' ? parseFloat(document.getElementById('sh-taxa-resp').value) : null,
    qtdCancelamentos: document.getElementById('sh-qtd-canc').value !== '' ? parseInt(document.getElementById('sh-qtd-canc').value) : null,
    obsExtra: document.getElementById('sh-obs').value.trim(),
    criadoEm: Date.now()
  };
  if (_superhostEditId) { const i = superhostPeriodos.findIndex(x=>x.id===_superhostEditId); if(i>=0) superhostPeriodos[i]=obj; }
  else superhostPeriodos.push(obj);
  closeModal('modal-superhost');
  if (typeof saveAll === 'function') saveAll();
  renderSuperhost();
  showToast('Período salvo!', 'sage');
}
function excluirSuperhost(id) {
  if (!confirm('Excluir este período?')) return;
  superhostPeriodos = superhostPeriodos.filter(x=>x.id!==id);
  if (typeof saveAll === 'function') saveAll();
  renderSuperhost();
}

// ── CANCELAMENTOS ──
function renderCancelamentos() {
  const el = document.getElementById('cancelamentos-lista'); if (!el) return;
  const resumoEl = document.getElementById('cancelamentos-resumo');
  if (resumoEl) {
    const total = cancelamentos.reduce((s,c)=>s+(c.valorAtualizado||0),0);
    const wecare = cancelamentos.reduce((s,c)=>s+(c.valorWecare||0),0);
    const prop = cancelamentos.reduce((s,c)=>s+(c.valorProprietario||0),0);
    resumoEl.innerHTML = [
      {l:'Total recebido',v:brl(total),c:'sage',i:'fa-money-bill-wave'},
      {l:'Valor WeCare',v:brl(wecare),c:'rose',i:'fa-building'},
      {l:'Valor proprietários',v:brl(prop),c:'sky',i:'fa-person-shelter'},
      {l:'Total de cancelamentos',v:cancelamentos.length,c:'peach',i:'fa-ban'},
    ].map(x=>'<div class="metric-card '+x.c+'"><div class="metric-icon '+x.c+'"><i class="fa-solid '+x.i+'"></i></div><div class="metric-value" style="font-size:22px;">'+x.v+'</div><div class="metric-label">'+x.l+'</div></div>').join('');
  }
  if (cancelamentos.length === 0) {
    el.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3);"><i class="fa-solid fa-ban" style="font-size:32px;opacity:0.35;margin-bottom:10px;display:block;"></i><div>Nenhum cancelamento registrado.</div></div></div>';
    return;
  }
  el.innerHTML = '<div class="card"><div style="overflow-x:auto;"><table class="data-table" style="font-size:12.5px;"><thead><tr><th>Hóspede</th><th>Imóvel</th><th>Período</th><th>Política</th><th>Valor original</th><th>Valor atualizado</th><th>WeCare</th><th>Proprietário</th><th></th></tr></thead><tbody>'+
    cancelamentos.slice().reverse().map(c=>'<tr>'+
      '<td>'+esc(c.hospede||'—')+'</td>'+
      '<td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(c.imovel||'—')+'</td>'+
      '<td style="white-space:nowrap;">'+esc(c.periodo||'—')+'</td>'+
      '<td><span style="background:var(--bg3);padding:2px 7px;border-radius:6px;font-weight:600;">'+esc(c.politica||'—')+'</span></td>'+
      '<td style="text-align:right;">'+(c.valorOriginal?brl(c.valorOriginal):'—')+'</td>'+
      '<td style="text-align:right;font-weight:600;">'+(c.valorAtualizado?brl(c.valorAtualizado):'—')+'</td>'+
      '<td style="text-align:right;color:var(--rose);">'+(c.valorWecare?brl(c.valorWecare):'—')+'</td>'+
      '<td style="text-align:right;color:var(--sky);">'+(c.valorProprietario?brl(c.valorProprietario):'—')+'</td>'+
      '<td><button class="btn btn-sm" onclick="editarCancelamento(\''+c.id+'\')"><i class="fa-solid fa-pencil"></i></button><button onclick="excluirCancelamento(\''+c.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;"><i class="fa-solid fa-trash"></i></button></td>'+
      '</tr>').join('')+
    '</tbody></table></div></div>';
}

let _cancelamentoEditId = null;
function abrirModalCancelamento(id) {
  _cancelamentoEditId = id || null;
  const c = id ? cancelamentos.find(x=>x.id===id) : null;
  // popular select de imóveis
  const selIm = document.getElementById('canc-imovel');
  if (selIm) {
    selIm.innerHTML = '<option value="">Selecione...</option>' +
      imovelsCatalog.map(im => '<option value="'+esc(im.nome)+'">'+esc(im.nome)+'</option>').join('');
    selIm.value = c ? (c.imovel||'') : '';
  }
  document.getElementById('canc-hospede').value = c ? (c.hospede||'') : '';
  document.getElementById('canc-periodo').value = c ? (c.periodo||'') : '';
  document.getElementById('canc-politica').value = c ? (c.politica||'100%') : '100%';
  document.getElementById('canc-valor-orig').value = c ? (c.valorOriginal||'') : '';
  document.getElementById('canc-valor-atual').value = c ? (c.valorAtualizado||'') : '';
  const split = c ? (c.split||'50-50') : '50-50';
  document.getElementById('canc-split').value = split;
  document.getElementById('canc-obs').value = c ? (c.obs||'') : '';
  if (split === 'custom' && c && c.customDetalhes) {
    const d = c.customDetalhes;
    document.getElementById('canc-custom-bruto').value = d.bruto||'';
    document.getElementById('canc-custom-plataforma').value = d.plataforma||'';
    document.getElementById('canc-custom-comissao').value = d.comissao||'';
    document.getElementById('canc-custom-limpeza').value = d.limpeza||'';
    document.getElementById('canc-custom-repasse').value = d.repasse||'';
  } else {
    ['bruto','plataforma','comissao','limpeza','repasse'].forEach(f => {
      const el = document.getElementById('canc-custom-'+f); if(el) el.value='';
    });
  }
  calcularSplitCancelamento();
  document.getElementById('modal-cancelamento').classList.add('open');
}
function editarCancelamento(id) { abrirModalCancelamento(id); }
function calcularSplitCancelamento() {
  const valor = parseFloat(document.getElementById('canc-valor-atual').value) || 0;
  const split = document.getElementById('canc-split').value;
  const previewEl = document.getElementById('canc-split-preview');
  const customFields = document.getElementById('canc-custom-fields');
  if (customFields) customFields.style.display = split === 'custom' ? 'block' : 'none';
  if (!previewEl) return;
  if (split === 'custom') {
    const repasse = parseFloat(document.getElementById('canc-custom-repasse').value) || 0;
    const comissao = parseFloat(document.getElementById('canc-custom-comissao').value) || 0;
    previewEl.innerHTML = '<span style="color:var(--rose);">WeCare: '+brl(comissao)+'</span> · <span style="color:var(--sky);">Proprietário: '+brl(repasse)+'</span>';
  } else {
    let wecare = 0, prop = 0;
    if (split === '50-50') { wecare = valor * 0.5; prop = valor * 0.5; }
    else { wecare = valor * 0.2; prop = valor * 0.8; }
    previewEl.innerHTML = '<span style="color:var(--rose);">WeCare: '+brl(wecare)+'</span> · <span style="color:var(--sky);">Proprietário: '+brl(prop)+'</span>';
  }
}
function salvarCancelamento() {
  const hospede = document.getElementById('canc-hospede').value.trim();
  const valor = parseFloat(document.getElementById('canc-valor-atual').value) || 0;
  const split = document.getElementById('canc-split').value;
  let wecare = 0, prop = 0, customDetalhes = null;
  if (split === 'custom') {
    customDetalhes = {
      bruto: parseFloat(document.getElementById('canc-custom-bruto').value) || 0,
      plataforma: parseFloat(document.getElementById('canc-custom-plataforma').value) || 0,
      comissao: parseFloat(document.getElementById('canc-custom-comissao').value) || 0,
      limpeza: parseFloat(document.getElementById('canc-custom-limpeza').value) || 0,
      repasse: parseFloat(document.getElementById('canc-custom-repasse').value) || 0,
    };
    wecare = customDetalhes.comissao;
    prop = customDetalhes.repasse;
  } else if (split === '50-50') { wecare = valor * 0.5; prop = valor * 0.5; }
  else { wecare = valor * 0.2; prop = valor * 0.8; }
  const obj = {
    id: _cancelamentoEditId || ('canc'+Date.now()),
    hospede,
    imovel: document.getElementById('canc-imovel').value,
    periodo: document.getElementById('canc-periodo').value.trim(),
    politica: document.getElementById('canc-politica').value,
    valorOriginal: parseFloat(document.getElementById('canc-valor-orig').value) || 0,
    valorAtualizado: valor,
    split,
    customDetalhes,
    valorWecare: wecare,
    valorProprietario: prop,
    obs: document.getElementById('canc-obs').value.trim(),
    criadoEm: Date.now()
  };
  if (_cancelamentoEditId) { const i = cancelamentos.findIndex(x=>x.id===_cancelamentoEditId); if(i>=0) cancelamentos[i]=obj; }
  else cancelamentos.push(obj);
  closeModal('modal-cancelamento');
  if (typeof saveAll === 'function') saveAll();
  renderCancelamentos();
  showToast('Cancelamento salvo!', 'sage');
}
function excluirCancelamento(id) {
  if (!confirm('Excluir este cancelamento?')) return;
  cancelamentos = cancelamentos.filter(x=>x.id!==id);
  if (typeof saveAll === 'function') saveAll();
  renderCancelamentos();
}

// ═══════════════════ MANUAL ═══════════════════
let _manualEditId = null;

function renderManual() {
  const el = document.getElementById('manual-lista'); if (!el) return;
  if (manualEntradas.length === 0) {
    el.innerHTML = '<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3);"><i class="fa-solid fa-book-open" style="font-size:32px;opacity:0.35;margin-bottom:10px;display:block;"></i><div style="font-size:13px;">Nenhuma entrada no manual. Clique em "Nova Entrada" para começar.</div></div></div>';
    return;
  }
  el.innerHTML = manualEntradas.map(e =>
    '<div class="card" style="margin-bottom:10px;">'+
    '<div class="card-header">'+
    '<div style="flex:1;"><div class="card-title">'+esc(e.titulo)+'</div><div class="card-sub" style="font-size:10.5px;color:var(--text3);">'+(e.categoria ? esc(e.categoria)+' · ' : '')+new Date(e.criadoEm||Date.now()).toLocaleDateString('pt-BR')+'</div></div>'+
    '<button class="btn btn-sm" onclick="editarEntradaManual(\''+e.id+'\')"><i class="fa-solid fa-pencil"></i></button>'+
    '<button onclick="excluirEntradaManual(\''+e.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;" title="Excluir"><i class="fa-solid fa-trash"></i></button>'+
    '</div>'+
    '<div class="card-body" style="padding:12px 16px;"><div style="font-size:13px;line-height:1.7;white-space:pre-wrap;">'+esc(e.conteudo)+'</div></div>'+
    '</div>'
  ).join('');
}

function abrirNovaEntradaManual() {
  _manualEditId = null;
  document.getElementById('manual-modal-title').textContent = 'Nova Entrada';
  document.getElementById('manual-titulo').value = '';
  document.getElementById('manual-categoria').value = '';
  document.getElementById('manual-conteudo').value = '';
  document.getElementById('modal-manual').classList.add('open');
  setTimeout(() => document.getElementById('manual-titulo').focus(), 100);
}

function editarEntradaManual(id) {
  const e = manualEntradas.find(x => x.id === id); if (!e) return;
  _manualEditId = id;
  document.getElementById('manual-modal-title').textContent = 'Editar Entrada';
  document.getElementById('manual-titulo').value = e.titulo || '';
  document.getElementById('manual-categoria').value = e.categoria || '';
  document.getElementById('manual-conteudo').value = e.conteudo || '';
  document.getElementById('modal-manual').classList.add('open');
}

function salvarEntradaManual() {
  const titulo = document.getElementById('manual-titulo').value.trim();
  if (!titulo) { showToast('Informe o título.', 'peach'); return; }
  const obj = {
    id: _manualEditId || ('me' + Date.now()),
    titulo,
    categoria: document.getElementById('manual-categoria').value.trim(),
    conteudo: document.getElementById('manual-conteudo').value.trim(),
    criadoEm: _manualEditId ? (manualEntradas.find(x=>x.id===_manualEditId)||{}).criadoEm || Date.now() : Date.now()
  };
  if (_manualEditId) {
    const i = manualEntradas.findIndex(x => x.id === _manualEditId);
    if (i >= 0) manualEntradas[i] = obj;
  } else {
    manualEntradas.push(obj);
  }
  closeModal('modal-manual');
  if (typeof saveAll === 'function') saveAll();
  renderManual();
  showToast('Entrada salva!', 'sage');
}

function excluirEntradaManual(id) {
  if (!confirm('Excluir esta entrada?')) return;
  manualEntradas = manualEntradas.filter(x => x.id !== id);
  if (typeof saveAll === 'function') saveAll();
  renderManual();
  showToast('Entrada excuída.', 'peach');
}

function gerarPlaybook() {
  if (manualEntradas.length === 0) { showToast('Nenhuma entrada no manual.', 'peach'); return; }
  const data = new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'});
  let body = '';
  manualEntradas.forEach((e, i) => {
    body += '<h2 style="color:#c0616a;font-size:17px;border-bottom:1px solid #eee;padding-bottom:5px;margin-top:28px;">'+(i+1)+'. '+e.titulo+(e.categoria?' <span style="font-size:12px;color:#888;">('+e.categoria+')</span>':'')+'</h2>';
    body += '<p style="font-size:13px;line-height:1.8;white-space:pre-wrap;color:#333;">'+e.conteudo.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</p>';
  });
  const scriptClose = '<' + '/script>';
  const htmlDoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Playbook WeCare</title><style>body{font-family:Arial,sans-serif;padding:50px;max-width:800px;margin:0 auto;color:#222;}h1{color:#c0616a;font-size:26px;}@media print{button{display:none}}</style></head><body><h1>📖 Playbook Operacional — WeCare</h1><p style="color:#666;font-size:13px;">Gerado em '+data+'</p>'+body+'<p style="margin-top:40px;font-size:11px;color:#aaa;border-top:1px solid #eee;padding-top:12px;">Claire · Painel de Gestão WeCare</p><script>window.onload=function(){window.print();}'+scriptClose+'</body></html>';
  const win = window.open('', '_blank');
  if (!win) { showToast('Permita pop-ups para gerar o Playbook.', 'peach'); return; }
  win.document.write(htmlDoc); win.document.close();
}
