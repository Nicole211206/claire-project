// ═══════════════════ STATE ═══════════════════
const NIVEIS=[
  {n:'N1',fixo:5500,variavel:2000},{n:'N2',fixo:6050,variavel:2200},
  {n:'N3',fixo:6655,variavel:2420},{n:'N4',fixo:7321,variavel:2662},
  {n:'N5',fixo:8053,variavel:2928},{n:'N6',fixo:8858,variavel:3221},
  {n:'N7',fixo:9744,variavel:3543},{n:'N8',fixo:10718,variavel:3897},
];

const KPI_DEFS=[
  {id:'av',   label:'Avaliação dos Hóspedes', peso:0.25, unit:'estrelas', meta:4.8, color:'rose',  icon:'fa-star',        hint:'Média Airbnb + Booking',
   calc:v=>{if(v==null||v==='')return null;v=+v;if(isNaN(v))return null;if(v<4.7)return 79;if(v<4.8)return 80+(v-4.7)/0.01*2;if(v===4.8)return 100;if(v<4.9)return 100+(v-4.8)/0.01*2.222;if(v<5.0)return 121+(v-4.9)/0.01*2.9;return 150;}},
  {id:'tr',   label:'Tempo de Resposta',      peso:0.15, unit:'min',      meta:5,   color:'lav',   icon:'fa-clock',       hint:'Média da equipe (Conduit)',
   calc:v=>{if(v==null||v==='')return null;v=+v;if(isNaN(v))return null;if(v>6)return 79;if(v>5)return 80+(6-v)*20;if(v===5)return 100;if(v>4)return 100+(5-v)/0.1*2.222;if(v>=3)return 121+(4-v)/0.1*2.9;return 150;}},
  {id:'ob',   label:'Tempo de Onboarding',    peso:0.20, unit:'dias',     meta:10,  color:'sage',  icon:'fa-house-flag',  hint:'Assinatura → Anúncio ativo',
   calc:v=>{if(v==null||v==='')return null;v=+v;if(isNaN(v))return null;if(v>=12)return 79;if(v>10)return 80+(12-v)/2*20;if(v===10)return 100;if(v>9)return 100+(10-v)/0.1*2.222;if(v>=8)return 121+(9-v)/0.1*2.9;return 150;}},
  {id:'cv',   label:'Conversão de Avaliações',peso:0.15, unit:'%',        meta:60,  color:'peach', icon:'fa-comments',    hint:'% reviews/checkouts (Hostaway)',
   calc:v=>{if(v==null||v==='')return null;v=+v;if(isNaN(v))return null;if(v<50)return 79;if(v<60)return 80+(v-50)*2;if(v===60)return 100;if(v<=70)return 100+(v-60)*2.1;if(v<=80)return 121+(v-70)*2.9;return 150;}},
  {id:'rc',   label:'Redução de Custos',      peso:0.15, unit:'%',        meta:10,  color:'sky',   icon:'fa-piggy-bank',  hint:'% economia gerada',
   calc:v=>{if(v==null||v==='')return null;v=+v;if(isNaN(v))return null;if(v<0)return 79;if(v<10)return 80+v*2;if(v===10)return 100;if(v<=20)return 100+(v-10)*2.1;if(v<=30)return 121+(v-20)*2.9;return 150;}},
  {id:'av360',label:'Avaliação 360',          peso:0.10, unit:'estrelas', meta:4.8, color:'gold',  icon:'fa-user-check',  hint:'Formulário de desempenho',
   calc:v=>{if(v==null||v==='')return null;v=+v;if(isNaN(v))return null;if(v<4.7)return 79;if(v<4.8)return 80+(v-4.7)/0.01*2;if(v===4.8)return 100;if(v<4.9)return 100+(v-4.8)/0.01*2.222;return 150;}},
];

let kpiVals={};
let kpiSubVals={};
let imoveis=[];
let imovelAtivo=null;
let selNivelIdx=0;
let comprasList=[];

let imovelsCatalog = [
  {id:'c-150', code:'WC-00150', nome:'WC-00150 - Fernão 42'},
  {id:'c-057', code:'WC-00057', nome:'WC-00057 - Amores SC'},
  {id:'c-050', code:'WC-00050', nome:'WC-00050 - Tijucopava SP'},
  {id:'c-090', code:'WC-00090', nome:'WC-00090 - VN 2008 SP'},
  {id:'c-208', code:'WC-00208', nome:'WC-00208 - Float 72 SP'},
  {id:'c-274', code:'WC-00274', nome:'WC-00274 - Lorena 803 SP'},
  {id:'c-305', code:'WC-00305', nome:'WC-00305 - Gomes de Carvalho 3402 SP'},
  {id:'c-484', code:'WC-00484', nome:'WC-00484 - Peruibe 71'},
  {id:'c-566', code:'WC-00566', nome:'WC-00566 - Marieta 58'},
  {id:'c-067', code:'WC-00067', nome:'WC-00067 - Peruibe 82'},
  {id:'c-137', code:'WC-00137', nome:'WC-00137 - Alameda Mamoan'},
  {id:'c-543', code:'WC-00543', nome:'WC-00543 - Santo Amaro 403'},
  {id:'c-332', code:'WC-00332', nome:'WC-00332 - Joao Cachoeira 61 SP'},
  {id:'c-311', code:'WC-00311', nome:'WC-00311 - Roque Petroni 2216 SP'},
  {id:'c-443', code:'WC-00443', nome:'WC-00443 - Osório 109'},
  {id:'c-400', code:'WC-00400', nome:'WC-00400 - Alves 502'},
  {id:'c-602', code:'WC-00602', nome:'WC-00602 - Alberto Day 111'},
  {id:'c-601', code:'WC-00601', nome:'WC-00601 - Borges Lagoa 512'},
  {id:'c-510', code:'WC-00510', nome:'WC-00510 - Arraial'},
  {id:'c-407', code:'WC-00407', nome:'WC-00407 - Piratininga 422'},
  {id:'c-461', code:'WC-00461', nome:'WC-00461 - Rafael de Barros 131'},
  {id:'c-104', code:'WC-00104', nome:'WC-00104 - Pedroso 32 SP'},
  {id:'c-372', code:'WC-00372', nome:'WC-00372 - Pedroso 41'},
  {id:'c-388', code:'WC-00388', nome:'WC-00388 - Afonso Bras 1908'},
  {id:'c-428', code:'WC-00428', nome:'WC-00428 - Afonso Braz 608'},
  {id:'c-508', code:'WC-00508', nome:'WC-00508 - 9 de Julho 802'},
  {id:'c-541', code:'WC-00541', nome:'WC-00541 - 9 de Julho 804'},
  {id:'c-025', code:'WC-00025', nome:'WC-00025 - Campos do Jordao'},
  {id:'c-356', code:'WC-00356', nome:'WC-00356 - Jurupis 125'},
  {id:'c-374', code:'WC-00374', nome:'WC-00374 - Jose M. Lisboa 408'},
  {id:'c-612', code:'WC-00612', nome:'WC-00612 - Domingos Lopes 1602'},
  {id:'c-560', code:'WC-00560', nome:'WC-00560 - Urbano 801'},
  {id:'c-265', code:'WC-00265', nome:'WC-00265 - Invisible Maraú'},
  {id:'c-618', code:'WC-00618', nome:'WC-00618 - Carinas 715'},
  {id:'c-629', code:'WC-00629', nome:'WC-00629 - Afonso Celso 1102'},
  {id:'c-630', code:'WC-00630', nome:'WC-00630 - Simpatia 104'},
  {id:'c-631', code:'WC-00631', nome:'WC-00631 - Simpatia 108'},
  {id:'c-632', code:'WC-00632', nome:'WC-00632 - Simpatia 409'},
  {id:'c-633', code:'WC-00633', nome:'WC-00633 - Simpatia 501'},
  {id:'c-634', code:'WC-00634', nome:'WC-00634 - Simpatia 609'},
  {id:'c-622', code:'WC-00622', nome:'WC-00622 - Alves Guimaraes 1104'},
  {id:'c-625', code:'WC-00625', nome:'WC-00625 - Entremares 15D'},
  {id:'c-646', code:'WC-00646', nome:'WC-00646 - Maloca 2 qtos 4'},
  {id:'c-647', code:'WC-00647', nome:'WC-00647 - Maloca studio 2'},
  {id:'c-648', code:'WC-00648', nome:'WC-00648 - Maloca studio 3'},
  {id:'c-649', code:'WC-00649', nome:'WC-00649 - Maloca studio 5'},
  {id:'c-650', code:'WC-00650', nome:'WC-00650 - Maloca Studio 6'},
  {id:'c-651', code:'WC-00651', nome:'WC-00651 - Maloca Studio 8'},
  {id:'c-659', code:'WC-00659', nome:'WC-00659 - Alberto Day 73'},
  {id:'c-660', code:'WC-00660', nome:'WC-00660 - Casa MAD'},
  {id:'c-674', code:'WC-00674', nome:'WC-00674 - View 508-D'},
  {id:'c-898', code:'WC-00898', nome:'WC-00898 - Marieta 100'},
  {id:'c-628', code:'WC-00628', nome:'WC-00628 - Casa Nirvana'},
  {id:'c-635', code:'WC-00635', nome:'WC-00635 - Casa do Riacho'},
];

let tasks=[
  {id:1,text:'Verificar tempo médio de resposta',cat:'work',prio:'high',due:'2026-05-29',done:false,status:'todo'},
  {id:2,text:'Lançar KPIs de maio',cat:'work',prio:'high',due:'2026-05-31',done:false,status:'todo'},
  {id:3,text:'Feedback individual — Patrícia',cat:'meeting',prio:'med',due:'2026-06-02',done:false,status:'todo'},
];

let ATTS=[
  {id:'patricia',name:'Patrícia', av:'av-rose', ini:'P',  rate:17, escala:'12×36', note:'',resp:'',respWeekly:[null,null,null,null],respMes:null,demands:[]},
  {id:'sara',    name:'Sara',     av:'av-lav',  ini:'S',  rate:14, escala:'12×36', note:'',resp:'',respWeekly:[null,null,null,null],respMes:null,demands:[]},
  {id:'lisarb',  name:'Lisarb',   av:'av-sage', ini:'Li', rate:14, escala:'12×36', note:'',resp:'',respWeekly:[null,null,null,null],respMes:null,demands:[]},
  {id:'lais',    name:'Laís',     av:'av-peach',ini:'La', rate:14, escala:'12×36', note:'',resp:'',respWeekly:[null,null,null,null],respMes:null,demands:[]},
];
let nextAttId = 5;

let workDaysP1={patricia:8,sara:8,lisarb:8,lais:8};  // turnos dias 01-15
let workDaysP2={patricia:7,sara:7,lisarb:7,lais:7};  // turnos dias 16-31
let turnos=[]; // {id, data:'YYYY-MM-DD', turno:'dia'|'noite', attId, confirmado:false}
let turnosMesSel=''; // mês selecionado no admin (YYYY-MM)
let salPagos={}; // { 'attId_2026-06': true }
let outrosMembros=[]; // {id, nome, cargo, fixo, comissao}
let projetos=[];
let transcricoes=[];
let transcricaoAtiva=null;
let projetoAtivo=null;
let projetoAbaAtiva='info';
let headFixo={gabriela:6000,felipe:6000};
let headFotos={};
let nicoleComissaoOverride=null; // null = usa KPI; número = valor manual
let headComissao={gabriela:0,felipe:0};
let notes=[
  {id:1,title:'Meta de maio',content:'Reduzir tempo de resposta para < 4 min\nAcompanhar onboarding dos imóveis novos',color:'rose'},
  {id:2,title:'KPI — Notas',content:'Airbnb: verificar reviews semanalmente\nBooking: confirmar notas até dia 25',color:'sage'},
];
let noteClr='rose';
let calY=2026,calM=4;
let tLeft=25*60,tTotal=25*60,tRun=false,tInt=null;
let pomodoroSessions=0;
let chatHist=[];
let _gcalEventosHoje=[]; // eventos do Google Calendar carregados
let calViewMode='mes';
let _gcalTodosEventos=[]; // todos os eventos carregados do Google
let avaliacoes=[]; // avaliações carregadas do Hostaway
let avFiltroCanal='', avFiltroMinEstrelas=0, avOrdenar='recentes', avSoWecare=false;
let avFiltroPublicada='', avFiltroOrigem='', avBusca='', avDe='', avAte='';
let avView='cards';
function setAvView(modo,btn){
  avView=modo;
  document.querySelectorAll('#avview-cards,#avview-tabela').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderAvaliacoes();
}

// ═══════════════════ LOGIN MULTIUSUÁRIO ═══════════════════
let usuarios=[]; // gerenciados pelo admin (espelha localStorage nx_users)
const MODULOS_LISTA=[
  {id:'overview',label:'Visão Geral'},{id:'kpis',label:'Meus KPIs'},{id:'performance',label:'Performance'},
  {id:'avaliacoes',label:'Avaliações'},{id:'tasks',label:'Tarefas'},{id:'calendar',label:'Calendário'},
  {id:'ai',label:'Assistente IA'},{id:'team',label:'Equipe'},{id:'salary',label:'Salários'},
  {id:'drive',label:'Google Drive'},{id:'onboarding',label:'Onboarding'},{id:'compras',label:'Compras'},
  {id:'gmail',label:'Gmail'},{id:'projetos',label:'Projetos'},{id:'reunioes',label:'Reuniões'},
  {id:'notes',label:'Anotações'},{id:'focus',label:'Foco'},
  {id:'turnos',label:'Turnos'}
];
function getMinhaAtt(){ const u=getCurrentUser(); if(!u||!u.attId) return null; return ATTS.find(a=>a.id===u.attId)||null; }
function getCurrentUser(){ try{ return JSON.parse(sessionStorage.getItem('nx_currentuser')||'null'); }catch(e){ return null; } }
function isAdmin(){ const u=getCurrentUser(); return u && u.perfil==='admin'; }
function podeAcessar(modId){ const u=getCurrentUser(); if(!u) return false; if(u.perfil==='admin') return true; return (u.modulos||[]).includes(modId); }
function attsDoUsuario(){
  const u=getCurrentUser();
  if(!u) return [];
  if(u.perfil==='admin') return ATTS.slice();
  const ids=new Set(u.attsPermitidos||[]);
  if(u.attId) ids.add(u.attId); // atendente sempre vê a si mesmo
  return ATTS.filter(a=>ids.has(a.id));
}
function podeVerAtt(attId){
  const u=getCurrentUser();
  if(!u) return false;
  if(u.perfil==='admin') return true;
  if(u.attId===attId) return true;
  return (u.attsPermitidos||[]).includes(attId);
}
function carregarUsuarios(){ try{ usuarios=JSON.parse(localStorage.getItem('nx_users')||'[]'); }catch(e){ usuarios=[]; } }
function salvarUsuarios(){ localStorage.setItem('nx_users', JSON.stringify(usuarios)); }

function aplicarPermissoes(){
  const u=getCurrentUser();
  if(!u) return;
  // Atualizar rodapé com nome/perfil do usuário logado
  const nameEl=document.getElementById('sidebar-name'); if(nameEl) nameEl.textContent=u.nome||u.email;
  const roleEl=document.querySelector('.user-role'); if(roleEl) roleEl.textContent=({admin:'Administradora',coordenacao:'Coordenação',atendente:'Atendente'}[u.perfil]||u.perfil);
  const avEl=document.getElementById('sidebar-avatar'); if(avEl) avEl.textContent=(u.nome||u.email||'?').charAt(0).toUpperCase();
  // Mostrar/esconder cada nav-item conforme onclick showPanel('id')
  document.querySelectorAll('#sidebar .nav-item').forEach(btn=>{
    const oc=btn.getAttribute('onclick')||'';
    const m=oc.match(/showPanel\('([^']+)'/);
    if(m){
      const modId=m[1];
      btn.style.display = (u.perfil==='admin'||podeAcessar(modId)) ? '' : 'none';
    }
  });
  // Botão de Usuários (admin) — exibir só pra admin
  const btnUsuarios=document.getElementById('nav-usuarios');
  if(btnUsuarios) btnUsuarios.style.display = isAdmin() ? '' : 'none';
  // Esconder engrenagem de configurações pra não-admin
  const gear=document.querySelector('.topbar-btn'); if(gear) gear.style.display = isAdmin() ? '' : 'none';
  // Esconder seções (nav-section) que ficaram sem itens visíveis
  document.querySelectorAll('#sidebar .nav-section').forEach(sec=>{
    if(sec.id==='navsec-admin'){ sec.style.display=isAdmin()?'':'none'; return; }
    let el=sec.nextElementSibling, algumVisivel=false;
    while(el && !el.classList.contains('nav-section')){
      if(el.classList.contains('nav-item') && el.style.display!=='none'){ algumVisivel=true; break; }
      el=el.nextElementSibling;
    }
    sec.style.display=algumVisivel?'':'none';
  });
  // Se o painel atual não é permitido, ir para o primeiro permitido
  const ativo=document.querySelector('.panel.active');
  const ativoId=ativo?ativo.id.replace('panel-',''):null;
  if(ativoId && ativoId!=='usuarios' && !(u.perfil==='admin'||podeAcessar(ativoId))){
    const primeiro=MODULOS_LISTA.find(m=>u.perfil==='admin'||podeAcessar(m.id));
    if(primeiro){ const btn=document.querySelector('#sidebar .nav-item[onclick*="showPanel(\''+primeiro.id+'\'"]'); showPanel(primeiro.id, btn||null); }
  }
  // Redesenhar telas dependentes de permissão (importante: o 1º render ocorre antes do login)
  if(typeof renderOverview==='function') renderOverview();
  if(typeof renderTeam==='function') renderTeam();
  if(typeof renderSalary==='function') renderSalary();
  if(typeof renderTurnos==='function') renderTurnos();
  if(typeof renderKPIs==='function') renderKPIs();
}

function logout(){
  sessionStorage.removeItem('nx_currentuser');
  location.reload();
}

let _usuarioEditEmail=null;

function showPanelUsuarios(btn){
  if(!isAdmin()){ showToast('Apenas o admin acessa esta área.','peach'); return; }
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-usuarios').classList.add('active');
  if(btn)btn.classList.add('active');
  document.getElementById('panel-title').textContent='Usuários e Acessos';
  carregarUsuarios();
  renderUsuarios();
}

function renderUsuarios(){
  const el=document.getElementById('usuarios-lista');if(!el)return;
  const perfilLabel={admin:'Admin',coordenacao:'Coordenação',atendente:'Atendente'};
  el.innerHTML='<div class="card"><div style="overflow-x:auto;"><table class="data-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Módulos</th><th></th></tr></thead><tbody>'+
    usuarios.map(u=>'<tr>'+
      '<td style="font-weight:500;">'+esc(u.nome||'')+'</td>'+
      '<td style="font-size:12.5px;">'+esc(u.email||'')+'</td>'+
      '<td>'+(perfilLabel[u.perfil]||u.perfil)+'</td>'+
      '<td style="font-size:11px;color:var(--text3);">'+(u.perfil==='admin'?'Todos':(u.modulos||[]).length+' módulos')+'</td>'+
      '<td style="white-space:nowrap;"><button onclick="abrirEditarUsuario(\''+esc(u.email)+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 5px;"><i class="fa-solid fa-pen"></i></button>'+
      (usuarios.length>1?'<button onclick="apagarUsuario(\''+esc(u.email)+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 5px;" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-trash"></i></button>':'')+
      '</td></tr>').join('')+
    '</tbody></table></div></div>';
}

function _renderModulosChecks(modulosSelecionados){
  document.getElementById('u-modulos-checks').innerHTML=MODULOS_LISTA.map(m=>
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;"><input type="checkbox" class="u-mod-check" value="'+m.id+'"'+((modulosSelecionados||[]).includes(m.id)?' checked':'')+'> '+m.label+'</label>'
  ).join('');
}

function _renderAttsPermChecks(selecionados){
  document.getElementById('u-attsperm-checks').innerHTML=ATTS.map(a=>
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer;"><input type="checkbox" class="u-attperm-check" value="'+a.id+'"'+((selecionados||[]).includes(a.id)?' checked':'')+'> '+esc(a.name)+'</label>'
  ).join('');
}

function aplicarPresetPerfil(perfil){
  const grp=document.getElementById('u-modulos-group');
  const attGrp=document.getElementById('u-att-group');
  const attsPermGrp=document.getElementById('u-attsperm-group');
  if(attGrp) attGrp.style.display = perfil==='atendente'?'':'none';
  if(attsPermGrp) attsPermGrp.style.display = perfil==='coordenacao'?'':'none';
  if(perfil==='coordenacao') _renderAttsPermChecks([]);
  const attSel=document.getElementById('u-att');
  if(attSel) attSel.innerHTML = ATTS.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');
  if(perfil==='admin'){ grp.style.opacity='0.5'; _renderModulosChecks(MODULOS_LISTA.map(m=>m.id)); return; }
  grp.style.opacity='1';
  let preset=[];
  if(perfil==='coordenacao') preset=['team','onboarding','compras','overview'];
  else if(perfil==='atendente') preset=['team','turnos','overview'];
  _renderModulosChecks(preset);
}

function abrirNovoUsuario(){
  _usuarioEditEmail=null;
  document.getElementById('modal-usuario-title').textContent='Novo Usuário';
  document.getElementById('u-nome').value='';
  document.getElementById('u-email').value='';
  document.getElementById('u-senha').value='';
  document.getElementById('u-perfil').value='atendente';
  aplicarPresetPerfil('atendente');
  document.getElementById('modal-usuario').classList.add('open');
}

function abrirEditarUsuario(email){
  const u=usuarios.find(x=>x.email===email);if(!u)return;
  _usuarioEditEmail=email;
  document.getElementById('modal-usuario-title').textContent='Editar Usuário';
  document.getElementById('u-nome').value=u.nome||'';
  document.getElementById('u-email').value=u.email||'';
  document.getElementById('u-senha').value=u.senha||'';
  document.getElementById('u-perfil').value=u.perfil||'atendente';
  const attGrp=document.getElementById('u-att-group');
  if(attGrp) attGrp.style.display = u.perfil==='atendente'?'':'none';
  const attsPermGrp=document.getElementById('u-attsperm-group');
  if(attsPermGrp) attsPermGrp.style.display = u.perfil==='coordenacao'?'':'none';
  if(u.perfil==='coordenacao') _renderAttsPermChecks(u.attsPermitidos||[]);
  const attSel=document.getElementById('u-att');
  if(attSel){ attSel.innerHTML = ATTS.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join(''); if(u.attId) attSel.value=u.attId; }
  if(u.perfil==='admin'){ document.getElementById('u-modulos-group').style.opacity='0.5'; _renderModulosChecks(MODULOS_LISTA.map(m=>m.id)); }
  else { document.getElementById('u-modulos-group').style.opacity='1'; _renderModulosChecks(u.modulos||[]); }
  document.getElementById('modal-usuario').classList.add('open');
}

function salvarUsuario(){
  const nome=document.getElementById('u-nome').value.trim();
  const email=document.getElementById('u-email').value.trim().toLowerCase();
  const senha=document.getElementById('u-senha').value;
  const perfil=document.getElementById('u-perfil').value;
  if(!nome||!email||!senha){ showToast('Preencha nome, e-mail e senha.','peach'); return; }
  const modulos=Array.from(document.querySelectorAll('.u-mod-check:checked')).map(c=>c.value);
  const attId = perfil==='atendente' ? document.getElementById('u-att').value : '';
  const attsPermitidos = Array.from(document.querySelectorAll('.u-attperm-check:checked')).map(c=>c.value);
  // email duplicado?
  const jaExiste=usuarios.find(u=>u.email===email);
  if(jaExiste && email!==_usuarioEditEmail){ showToast('Já existe um usuário com este e-mail.','vermelha'); return; }
  if(_usuarioEditEmail){
    const idx=usuarios.findIndex(u=>u.email===_usuarioEditEmail);
    if(idx>=0) usuarios[idx]={email,nome,senha,perfil,modulos,attId,attsPermitidos};
  } else {
    usuarios.push({email,nome,senha,perfil,modulos,attId,attsPermitidos});
  }
  salvarUsuarios();
  renderUsuarios();
  closeModal('modal-usuario');
  showToast('Usuário salvo!','sage');
}

function apagarUsuario(email){
  if(usuarios.length<=1){ showToast('Deve haver ao menos um usuário.','peach'); return; }
  const cur=getCurrentUser();
  if(cur && cur.email===email){ showToast('Você não pode apagar o próprio usuário logado.','peach'); return; }
  if(!confirm('Apagar este usuário?'))return;
  usuarios=usuarios.filter(u=>u.email!==email);
  salvarUsuarios();
  renderUsuarios();
  showToast('Usuário apagado.','peach');
}

// ═══════════════════ INIT ═══════════════════
document.addEventListener('DOMContentLoaded', async ()=>{
  // Espera o backend KV popular o localStorage (dispositivos compartilham os dados)
  if(window._claireKVPromise){ try{ await window._claireKVPromise; }catch(e){} }
  loadAll();
  ATTS.forEach(a=>{if(!a.respWeekly)a.respWeekly=[null,null,null,null];if(a.respMes===undefined)a.respMes=null;});
  greet();
  renderOvAgenda();
  buildNivelGrid();
  renderKPIs();
  renderTaskFilterSel();
  renderTaskCatSelect();
  renderTasks();
  renderKanban();
  renderCal();
  renderAgenda();
  renderTeam();
  renderTeamOv();
  renderSalary();
  renderNotes();
  fillFocusSel();
  loadSettings();
  renderOnboardingKanban();
  renderProjetosKanban();
  renderReunioes();
  renderCompras();
  renderFocusInsights();
  renderPerformance();
  renderAvaliacoes();
  renderTurnos();
  const recEl=document.getElementById('d-recorrente');
  if(recEl)recEl.addEventListener('change',function(){document.getElementById('d-recorrencia').style.display=this.checked?'':'none';});
  carregarUsuarios();
  aplicarPermissoes();
  renderOverview();
});

// ═══════════════════ NAV ═══════════════════
const PT={overview:'Visão Geral',kpis:'Meus KPIs',performance:'Acompanhamento de Performance',tasks:'Tarefas',calendar:'Calendário',ai:'Assistente IA',team:'Equipe',salary:'Salários',drive:'Google Drive',onboarding:'Onboarding de Imóveis',gmail:'Gmail',notes:'Anotações',focus:'Foco',projetos:'Projetos',compras:'Registro de Compras',reunioes:'Reuniões e Transcrições',avaliacoes:'Avaliações de Hóspedes',usuarios:'Usuários e Acessos',turnos:'Escala de Turnos'};
function showPanel(id,btn){
  if(typeof podeAcessar==='function' && id!=='usuarios'){ const u=getCurrentUser(); if(u && u.perfil!=='admin' && !podeAcessar(id)){ return; } }
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('panel-'+id).classList.add('active');
  if(btn)btn.classList.add('active');
  document.getElementById('panel-title').textContent=PT[id]||id;
  if(id==='overview'){renderOverview();renderOvAgenda();var elDA=document.getElementById('ov-demandas-atrasadas');if(elDA)elDA.textContent=contarDemandasAtrasadas();if(ls('nx_gdrive'))loadCalendarEvents();}
  if(id==='calendar'){loadCalendarEvents();}
  if(id==='gmail'){checkGmailConfig();if(ls('nx_gmail'))loadEmails();}
  if(id==='onboarding'){renderOnboardingKanban();}
  if(id==='projetos'){renderProjetosKanban();}
  if(id==='reunioes'){renderReunioes();}
  if(id==='compras'){renderCompras();}
  if(id==='focus'){renderFocusInsights();}
  if(id==='performance'){renderPerformance();}
  if(id==='avaliacoes'){renderAvaliacoes();}
  if(id==='turnos'){renderTurnos();kvPull().then(function(ok){if(ok)renderTurnos();});}
  if(id==='team'){renderTeam();}
  if(id==='salary'){renderSalary();}
  if(id==='kpis'){renderKPIs();}
}

function contarDemandasAtrasadas(){
  const hoje=new Date().toISOString().split('T')[0];
  let n=0;
  ATTS.forEach(a=>{(a.demands||[]).forEach(d=>{ if(d.due && d.due<hoje && d.s!=='done' && d.s!=='concluida') n++; });});
  return n;
}

function greet(){
  const h=new Date().getHours(),name=ls('nx_name')||'Nicole';
  const g=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
  const e=h<12?'🌸':h<18?'☀️':'🌙';
  document.getElementById('greeting').textContent=g+', '+name+'! '+e;
  const opts={weekday:'long',year:'numeric',month:'long',day:'numeric'};
  document.getElementById('top-date').textContent='— '+new Date().toLocaleDateString('pt-BR',opts);
  const p=tasks.filter(t=>!t.done).length;
  document.getElementById('overview-sub').textContent='Você tem '+p+' tarefa'+(p!==1?'s':'')+' pendente'+(p!==1?'s':'')+'.';
}

function renderOvAgenda(){
  var el=document.getElementById('ov-agenda-body');
  if(!el)return;
  var hoje=new Date().toISOString().split('T')[0];

  var eventosHtml='';
  if(_gcalEventosHoje.length>0){
    var cores=['var(--sky)','var(--sage)','var(--rose)','var(--lavender)','var(--peach)'];
    eventosHtml=_gcalEventosHoje.map(function(ev,i){
      var start=ev.start&&(ev.start.dateTime||ev.start.date);
      var hora=start&&ev.start.dateTime?new Date(start).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'Dia todo';
      var local=ev.location?' · '+ev.location.split(',')[0]:'';
      return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'+
        '<div style="font-size:11px;color:var(--text3);width:40px;flex-shrink:0;">'+hora+'</div>'+
        '<div style="width:3px;border-radius:2px;background:'+cores[i%cores.length]+';flex-shrink:0;"></div>'+
        '<div><div style="font-size:13px;font-weight:500;">'+esc(ev.summary||'Evento')+'</div>'+
        (local?'<div style="font-size:11px;color:var(--text3);">'+esc(local)+'</div>':'')+'</div></div>';
    }).join('');
  } else if(ls('nx_gdrive')){
    eventosHtml='<div style="padding:10px 0;color:var(--text3);font-size:12.5px;text-align:center;">Nenhum evento no Google Agenda hoje.<br><button class="btn btn-sm" style="margin-top:6px;" onclick="loadCalendarEvents()"><i class="fa-solid fa-rotate"></i> Sincronizar</button></div>';
  } else {
    var evtsHoje=EVTS.filter(function(e){return e.date===hoje;});
    if(evtsHoje.length>0){
      eventosHtml=evtsHoje.map(function(e){return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'+
        '<div style="font-size:11px;color:var(--text3);width:40px;flex-shrink:0;">'+e.time+'</div>'+
        '<div style="width:3px;border-radius:2px;background:'+e.c+';flex-shrink:0;"></div>'+
        '<div><div style="font-size:13px;font-weight:500;">'+e.title+'</div>'+
        '<div style="font-size:11px;color:var(--text3);">'+e.sub+'</div></div></div>';}).join('');
    } else {
      eventosHtml='<div style="padding:10px 0;color:var(--text3);font-size:12.5px;text-align:center;">Nenhum evento hoje.<br><a href="#" onclick="openSettings()" style="font-size:11px;color:var(--rose);">Conectar Google Agenda</a></div>';
    }
  }

  var tarefasHoje=tasks.filter(function(t){return !t.done&&t.due===hoje;});
  var tarefasHtml='';
  if(tarefasHoje.length>0){
    var PCt={high:'var(--vermelha)',med:'var(--amarela)',low:'var(--sage)'};
    tarefasHtml='<div style="margin-top:12px;padding-top:10px;border-top:2px solid var(--border);">'+
      '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:8px;">&#x2705; Tarefas de Hoje</div>'+
      tarefasHoje.map(function(t){
        var cat=getCatInfo(t.cat);
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);">'+
          '<div style="width:3px;height:18px;border-radius:2px;background:'+(PCt[t.prio]||'var(--text3)')+';flex-shrink:0;"></div>'+
          '<div onclick="toggleTask('+t.id+')" style="width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border2);cursor:pointer;flex-shrink:0;"></div>'+
          '<span style="font-size:12.5px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(t.text)+'</span>'+
          '<span style="font-size:9.5px;padding:1px 6px;border-radius:12px;background:'+cat.color+'22;color:'+cat.color+';font-weight:600;">'+cat.label+'</span>'+
          '</div>';
      }).join('')+'</div>';
  }

  el.innerHTML=eventosHtml+tarefasHtml;
}

// ═══════════════════ KPIs ═══════════════════
function buildNivelGrid(){
  document.getElementById('nivel-grid').innerHTML=NIVEIS.map((n,i)=>`
    <div onclick="selNivel(${i})" style="text-align:center;padding:10px 5px;border-radius:var(--r-sm);border:1.5px solid ${i===selNivelIdx?'var(--rose)':'var(--border)'};background:${i===selNivelIdx?'var(--rose-light)':'var(--bg3)'};cursor:pointer;transition:all 0.15s;">
      <div style="font-size:11px;font-weight:700;color:${i===selNivelIdx?'var(--rose)':'var(--text3)'};">${n.n}</div>
      <div style="font-size:11.5px;font-weight:600;color:${i===selNivelIdx?'var(--rose)':'var(--text)'};">${brl(n.fixo)}</div>
    </div>`).join('');
  const n=NIVEIS[selNivelIdx];
  document.getElementById('n-fixo').textContent=brl(n.fixo);
  document.getElementById('n-var').textContent=brl(n.variavel);
  document.getElementById('n-ote').textContent=brl(n.fixo+n.variavel);
}

function selNivel(i){selNivelIdx=i;buildNivelGrid();renderKPIs();renderSalary();}

function calcGlobal(){
  // Média ponderada de TODOS os KPIs — não preenchidos contam como 0%
  let tot=0, totalPeso=0;
  KPI_DEFS.forEach(k=>{const p=k.calc(kpiVals[k.id]); tot+=((p!==null?p:0)/100)*k.peso; totalPeso+=k.peso;});
  return totalPeso>0?Math.round((tot/totalPeso)*100):0;
}

function getBand(pct){
  if(pct>=150)return{name:'ELITE',cls:'elite',mult:2.0};
  if(pct>=121)return{name:'AZUL',cls:'azul',mult:1.5};
  if(pct>=100)return{name:'VERDE',cls:'verde',mult:1.0};
  if(pct>=80) return{name:'AMARELA',cls:'amarela',mult:0.5};
  return          {name:'VERMELHA',cls:'vermelha',mult:0.0};
}

function bandHTML(name){
  const m={ELITE:'elite',AZUL:'azul',VERDE:'verde',AMARELA:'amarela',VERMELHA:'vermelha'};
  const ic={ELITE:'🏆',AZUL:'💎',VERDE:'✅',AMARELA:'⚠️',VERMELHA:'🚩'};
  return '<span class="bandeira '+(m[name]||'vermelha')+'">'+(ic[name]||'')+' '+name+'</span>';
}

function renderKPIs(){
  // Recalcular ob a partir dos imóveis
  // Calcular tempo de ativação automaticamente: dataCriacao → dataAtivacao
  const _imComTempo=imoveis.filter(im=>im.dataAtivacao&&im.dataCriacao);
  if(_imComTempo.length>0){
    kpiVals.ob=(_imComTempo.reduce((s,im)=>{
      const dias=(new Date(im.dataAtivacao)-new Date(im.dataCriacao))/(1000*60*60*24);
      return s+dias;
    },0)/_imComTempo.length).toFixed(1);
  } else {
    kpiVals.ob=null;
  }
  const g=calcGlobal(),band=getBand(g),nv=NIVEIS[selNivelIdx];
  const vp=Math.round(nv.variavel*band.mult);
  // global card
  document.getElementById('kpi-global').textContent=g+'%';
  document.getElementById('kpi-global-bar').style.width=Math.min(g,150)+'%';
  document.getElementById('kpi-global-band-html').innerHTML=bandHTML(band.name);
  document.getElementById('kpi-band-pill').innerHTML=bandHTML(band.name);
  document.getElementById('kpi-var-val').textContent=brl(vp);
  document.getElementById('kpi-var-max').textContent=brl(nv.variavel*2);
  document.getElementById('kpi-fixo').textContent=brl(nv.fixo);
  document.getElementById('kpi-total-sal').textContent='Total: '+brl(nv.fixo+vp);
  // overview
  document.getElementById('ov-kpi').textContent=g+'%';
  document.getElementById('ov-band').innerHTML='Bandeira '+bandHTML(band.name);
  var _elSal=document.getElementById('ov-salary'); if(_elSal) _elSal.textContent=brl(nv.fixo+vp);
  var _elNiv=document.getElementById('ov-nivel-lbl'); if(_elNiv) _elNiv.textContent=nv.n+' — OTE '+brl(nv.fixo+nv.variavel);
  var elD=document.getElementById('ov-demandas-atrasadas'); if(elD) elD.textContent=contarDemandasAtrasadas();
  // overview mini list
  document.getElementById('ov-kpi-list').innerHTML=KPI_DEFS.map(k=>{
    const p=k.calc(kpiVals[k.id]),ps=p!==null?Math.round(p):null;
    return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border);">'+
      '<div class="metric-icon '+k.color+'" style="width:24px;height:24px;font-size:11px;margin-bottom:0;flex-shrink:0;"><i class="fa-solid '+k.icon+'"></i></div>'+
      '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:500;">'+k.label+'</div>'+
      '<div class="kpi-track" style="margin-top:3px;"><div class="kpi-fill '+k.color+'" style="width:'+(p?Math.min(p,150)+'%':'0%')+'"></div></div></div>'+
      '<div style="font-size:12.5px;font-weight:600;min-width:38px;text-align:right;color:'+(ps===null?'var(--text3)':ps>=100?'var(--sage)':ps>=80?'var(--amarela)':'var(--vermelha)')+'">'+(ps!==null?ps+'%':'—')+'</div></div>';
  }).join('');
  // kpi cards
  document.getElementById('kpi-cards').innerHTML=KPI_DEFS.map(k=>{
    const p=k.calc(kpiVals[k.id]),ps=p!==null?Math.round(p):null,band2=ps!==null?getBand(ps):null;
    const pct=p?Math.min(p,150)+'%':'0%';
    const scoreColor=ps===null?'var(--text3)':ps>=100?'var(--sage)':ps>=80?'var(--amarela)':'var(--vermelha)';
    let inputHTML='';
    if(k.id==='av'){
      const sub=kpiSubVals.av||{};
      const hasA=sub.airbnb!==undefined&&sub.airbnb!=='';
      const hasB=sub.booking!==undefined&&sub.booking!=='';
      const partesAvg=[];
      if(hasA) partesAvg.push(+sub.airbnb||0);
      if(hasB) partesAvg.push((+sub.booking||0)/2);
      const avg=partesAvg.length?(partesAvg.reduce((a,b)=>a+b,0)/partesAvg.length).toFixed(2):null;
      inputHTML='<div style="display:grid;gap:6px;">'+
        '<div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;color:var(--text2);min-width:90px;">Airbnb (0-5):</label><input type="number" step="0.01" min="0" max="5" class="form-input" style="width:90px;padding:5px 8px;" value="'+(sub.airbnb||'')+'" placeholder="—" onchange="setKPISub(\'av\',\'airbnb\',this.value)"></div>'+
        '<div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;color:var(--text2);min-width:90px;">Booking (0-10):</label><input type="number" step="0.01" min="0" max="10" class="form-input" style="width:90px;padding:5px 8px;" value="'+(sub.booking||'')+'" placeholder="—" onchange="setKPISub(\'av\',\'booking\',this.value)"></div>'+
        (avg!==null?'<div style="font-size:12px;font-weight:700;color:var(--sage);margin-top:2px;">Média Total: '+avg+' estrelas <span style="font-weight:400;color:var(--text3);">(Booking normalizado p/ 0-5)</span></div>':'')+'</div>';
    } else if(k.id==='cv'){
      const sub=kpiSubVals.cv||{};
      const pct2=(sub.reviews!==undefined&&sub.checkouts!==undefined&&+sub.checkouts>0?(((+sub.reviews||0)/(+sub.checkouts||1))*100).toFixed(1):null);
      inputHTML='<div style="display:grid;gap:6px;">'+
        '<div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;color:var(--text2);min-width:120px;">Nº de reviews:</label><input type="number" step="1" min="0" class="form-input" style="width:90px;padding:5px 8px;" value="'+(sub.reviews||'')+'" placeholder="—" onchange="setKPISub(\'cv\',\'reviews\',this.value)"></div>'+
        '<div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;color:var(--text2);min-width:120px;">Nº de checkouts:</label><input type="number" step="1" min="0" class="form-input" style="width:90px;padding:5px 8px;" value="'+(sub.checkouts||'')+'" placeholder="—" onchange="setKPISub(\'cv\',\'checkouts\',this.value)"></div>'+
        (pct2!==null?'<div style="font-size:12px;font-weight:700;color:var(--sage);margin-top:2px;">Conversão: '+pct2+'%</div>':'')+'</div>';
    } else if(k.id==='tr'){
      const sub=kpiSubVals.tr||{};
      const atts=['patricia','sara','lisarb','lais'];
      const attLabels=['Patrícia','Sara','Lisarb','Laís'];
      const vals=atts.map(a=>sub[a]!==undefined&&sub[a]!==''?+sub[a]:null);
      const filled=vals.filter(v=>v!==null);
      const avg2=filled.length>0?(filled.reduce((a,b)=>a+b,0)/filled.length).toFixed(1):null;
      inputHTML='<div style="display:grid;gap:6px;">'+
        atts.map((a,i)=>'<div style="display:flex;align-items:center;gap:8px;"><label style="font-size:12px;color:var(--text2);min-width:80px;">'+attLabels[i]+':</label><input type="number" step="0.1" min="0" class="form-input" style="width:90px;padding:5px 8px;" value="'+(sub[a]||'')+'" placeholder="min" onchange="setKPISub(\'tr\',\''+a+'\',this.value)"></div>').join('')+
        (avg2!==null?'<div style="font-size:12px;font-weight:700;color:var(--sage);margin-top:2px;">Média: '+avg2+' min</div>':'')+'</div>';
    } else if(k.id==='ob'){
      // Imóveis ativados: tempo real = dataAtivacao - dataCriacao
      const imAtivos=imoveis.filter(im=>im.status==='ativo'&&im.dataAtivacao&&im.dataCriacao);
      // Imóveis em andamento: dias corridos desde o contrato
      const imAndamento=imoveis.filter(im=>im.status!=='ativo'&&im.dataCriacao);
      const calcDias=im=>{
        const fim=im.dataAtivacao?new Date(im.dataAtivacao):new Date();
        return Math.round((fim-new Date(im.dataCriacao))/(1000*60*60*24));
      };
      const mediaDias=imAtivos.length>0?(imAtivos.reduce((s,im)=>s+calcDias(im),0)/imAtivos.length).toFixed(1):null;
      inputHTML='<div style="margin-top:10px;">'+
        '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;font-weight:600;">Tempo de Ativação do Anúncio — Contrato → Ativo</div>'+
        (imAtivos.length===0&&imAndamento.length===0
          ?'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;">Nenhum imóvel no módulo de Onboarding ainda.</div>'
          :''
        )+
        // Imóveis já ativados
        (imAtivos.length>0?'<div style="font-size:10.5px;font-weight:700;color:var(--sage);margin-bottom:4px;">✓ Ativados</div>':'')+
        imAtivos.map(im=>{
          const d=calcDias(im);
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">'+
            '<span style="font-size:12.5px;">'+esc(im.nome||'Sem nome')+'</span>'+
            '<span style="font-size:12.5px;font-weight:600;color:'+(d<=10?'var(--sage)':d<=12?'var(--amarela)':'var(--vermelha)')+'">'+ d+' dias</span>'+
            '</div>';
        }).join('')+
        // Imóveis em andamento (dias corridos, ainda não ativados)
        (imAndamento.length>0?'<div style="font-size:10.5px;font-weight:700;color:var(--peach);margin-top:8px;margin-bottom:4px;">⏳ Em andamento</div>':'')+
        imAndamento.map(im=>{
          const d=calcDias(im);
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);">'+
            '<span style="font-size:12.5px;color:var(--text2);">'+esc(im.nome||'Sem nome')+'</span>'+
            '<span style="font-size:12px;color:var(--text3);">'+d+' dias corridos</span>'+
            '</div>';
        }).join('')+
        // Média (só dos ativados)
        (imAtivos.length>0
          ?'<div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:4px;border-top:2px solid var(--border);"><span style="font-size:12px;font-weight:700;">Média (imóveis ativados)</span><span style="font-size:14px;font-weight:700;color:var(--sage);">'+mediaDias+' dias</span></div>'
          :'')+
        '</div>';
    } else if(k.id==='rc'){
      const rcSub=kpiSubVals.rc||{limpeza:{previsto:'',gasto:''},manutencao:{previsto:'',gasto:''},setup:{previsto:'',gasto:''},margem:{previsto:'',gasto:''}};
      const rcItens=[
        {key:'limpeza',    label:'Limpeza',             hint:'Pago pelo hóspede — valor cobrado vs. custo real'},
        {key:'manutencao', label:'Manutenção',          hint:'Pago pelo proprietário/hóspede — cobrado vs. custo'},
        {key:'setup',      label:'On-boarding (Setup)', hint:'Taxa de setup — valor cobrado vs. custo de implementação'},
        {key:'margem',     label:'Margem Operacional',  hint:'1% da Receita Líquida — previsto vs. despesas reais'},
      ];
      const calcEco=(key)=>{const p=parseFloat(rcSub[key].previsto),g2=parseFloat(rcSub[key].gasto);return(p>0&&!isNaN(g2))?((p-g2)/p*100).toFixed(1):null;};
      const allEcos=['limpeza','manutencao','setup','margem'].map(calcEco).filter(x=>x!==null);
      const med=allEcos.length>0?(allEcos.reduce((a,b)=>a+parseFloat(b),0)/allEcos.length).toFixed(1):null;
      inputHTML='<div style="margin-top:10px;">'+
        '<div style="display:grid;grid-template-columns:1fr 90px 90px 70px;gap:4px;margin-bottom:4px;padding:4px 0;border-bottom:2px solid var(--border);">'+
        '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Item</div>'+
        '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center;">Previsto (R$)</div>'+
        '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center;">Gasto (R$)</div>'+
        '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center;">Economia</div>'+
        '</div>'+
        rcItens.map(it=>{
          const eco=calcEco(it.key);
          const ecoColor=eco===null?'var(--text3)':parseFloat(eco)>=10?'var(--sage)':parseFloat(eco)>=0?'var(--amarela)':'var(--vermelha)';
          return '<div style="display:grid;grid-template-columns:1fr 90px 90px 70px;gap:4px;padding:5px 0;border-bottom:1px solid var(--border);align-items:center;">'+
            '<div><div style="font-size:12.5px;font-weight:500;">'+it.label+'</div><div style="font-size:10.5px;color:var(--text3);">'+it.hint+'</div></div>'+
            '<input type="number" class="form-input" style="padding:4px 6px;font-size:12px;text-align:center;" placeholder="0" value="'+(rcSub[it.key].previsto||'')+'" onchange="setKPIRcSub(\''+it.key+'\',\'previsto\',this.value)">'+
            (it.key==='margem'
              ?'<div style="text-align:center;"><div style="font-size:12px;font-weight:600;">'+(rcSub.margem.gasto?'R$ '+rcSub.margem.gasto:'—')+'</div><div style="font-size:9px;color:var(--text3);">auto (compras)</div></div>'
              :'<input type="number" class="form-input" style="padding:4px 6px;font-size:12px;text-align:center;" placeholder="0" value="'+(rcSub[it.key].gasto||'')+'" onchange="setKPIRcSub(\''+it.key+'\',\'gasto\',this.value)">')+
            '<div style="text-align:center;font-size:13px;font-weight:700;color:'+ecoColor+';">'+(eco!==null?eco+'%':'—')+'</div>'+
            '</div>';
        }).join('')+
        '<div style="display:grid;grid-template-columns:1fr 90px 90px 70px;gap:4px;padding:7px 0;">'+
        '<div style="grid-column:1/4;font-size:12px;font-weight:700;text-align:right;padding-right:8px;">Média da Economia →</div>'+
        '<div style="text-align:center;font-size:14px;font-weight:700;color:'+(med?parseFloat(med)>=10?'var(--sage)':'var(--amarela)':'var(--text3)')+';">'+(med?med+'%':'—')+'</div>'+
        '</div>'+
        '</div>';
    } else {
      inputHTML='<div style="display:flex;align-items:center;gap:8px;">'+
        '<label style="font-size:12px;color:var(--text2);white-space:nowrap;">Valor ('+k.unit+'):</label>'+
        '<input type="number" step="0.01" class="form-input" style="width:100px;padding:5px 8px;" value="'+(kpiVals[k.id]||'')+'" placeholder="—" onchange="setKPI(\''+k.id+'\',this.value)">'+
        '</div>';
    }
    return '<div class="card"><div class="card-header">'+
      '<div class="metric-icon '+k.color+'" style="width:26px;height:26px;font-size:12px;margin-bottom:0;flex-shrink:0;"><i class="fa-solid '+k.icon+'"></i></div>'+
      '<div style="flex:1;"><div class="card-title">'+k.label+'</div><div class="card-sub">Peso: '+Math.round(k.peso*100)+'% · Meta: '+k.meta+' '+k.unit+'</div></div>'+
      (band2?bandHTML(band2.name):'')+
      '</div><div class="card-body">'+
      '<div class="kpi-bar-header" style="margin-bottom:4px;"><span style="font-size:12px;color:var(--text3);">'+k.hint+'</span>'+
      '<span style="font-weight:600;color:'+scoreColor+'">'+(ps!==null?ps+'%':'—')+'</span></div>'+
      '<div class="kpi-track" style="margin-bottom:12px;"><div class="kpi-fill '+k.color+'" style="width:'+pct+'"></div></div>'+
      inputHTML+'</div></div>';
  }).join('');
}

function setKPI(id,v){kpiVals[id]=v;renderKPIs();}

function setKPISub(id,subKey,value){
  if(!kpiSubVals[id])kpiSubVals[id]={};
  kpiSubVals[id][subKey]=value;
  if(id==='av'){
    const s=kpiSubVals.av;
    const partes=[];
    if(s.airbnb!==undefined&&s.airbnb!=='') partes.push(+s.airbnb||0);
    if(s.booking!==undefined&&s.booking!=='') partes.push((+s.booking||0)/2);
    kpiVals.av=partes.length?(partes.reduce((a,b)=>a+b,0)/partes.length).toFixed(2):null;
  } else if(id==='cv'){
    const s=kpiSubVals.cv;
    if(s.reviews!==undefined&&s.reviews!==''&&s.checkouts!==undefined&&s.checkouts!==''&&+s.checkouts>0){
      kpiVals.cv=(((+s.reviews||0)/(+s.checkouts||1))*100).toFixed(1);
    }
  } else if(id==='tr'){
    const s=kpiSubVals.tr||{};
    const vals=['patricia','sara','lisarb','lais'].map(a=>s[a]!==undefined&&s[a]!==''?+s[a]:null).filter(v=>v!==null);
    if(vals.length>0){kpiVals.tr=(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1);}
  }
  renderKPIs();
}

function setKPIRcSub(item,campo,valor){
  if(!kpiSubVals.rc)kpiSubVals.rc={limpeza:{previsto:'',gasto:''},manutencao:{previsto:'',gasto:''},setup:{previsto:'',gasto:''},margem:{previsto:'',gasto:''}};
  kpiSubVals.rc[item][campo]=valor;
  const itens=['limpeza','manutencao','setup','margem'];
  const economias=itens.map(it=>{
    const prev=parseFloat(kpiSubVals.rc[it].previsto);
    const gasto=parseFloat(kpiSubVals.rc[it].gasto);
    if(!prev||isNaN(prev)||isNaN(gasto))return null;
    return((prev-gasto)/prev)*100;
  }).filter(x=>x!==null);
  kpiVals.rc=economias.length>0?(economias.reduce((s,x)=>s+x,0)/economias.length).toFixed(2):null;
  renderKPIs();
}

function sincronizarMargemKPI(){
  // Soma das compras marcadas como margem operacional no mês vigente do filtro (ou mês atual)
  const filtroMes = document.getElementById('compras-filtro-mes');
  const mes = (filtroMes && filtroMes.value) ? filtroMes.value : new Date().toISOString().substring(0,7);
  const totalMargem = comprasList.filter(c=>c.margemOperacional && c.mesVigente===mes).reduce((s,c)=>s+(parseFloat(c.valor)||0),0);
  if(!kpiSubVals.rc) kpiSubVals.rc={limpeza:{previsto:'',gasto:''},manutencao:{previsto:'',gasto:''},setup:{previsto:'',gasto:''},margem:{previsto:'',gasto:''}};
  kpiSubVals.rc.margem.gasto = totalMargem>0 ? totalMargem.toFixed(2) : '';
  // Recalcular o KPI rc (mesma lógica de setKPIRcSub)
  const itens=['limpeza','manutencao','setup','margem'];
  const economias=itens.map(it=>{
    const prev=parseFloat(kpiSubVals.rc[it].previsto), gasto=parseFloat(kpiSubVals.rc[it].gasto);
    if(!prev||isNaN(prev)||isNaN(gasto)) return null;
    return ((prev-gasto)/prev)*100;
  }).filter(x=>x!==null);
  kpiVals.rc = economias.length>0 ? (economias.reduce((s,x)=>s+x,0)/economias.length).toFixed(2) : null;
  if(typeof renderKPIs==='function') renderKPIs();
}

// ═══════════════════ TASKS ═══════════════════
let taskCats=[
  {id:'work',    label:'Trabalho', color:'#e07a7a'},
  {id:'personal',label:'Pessoal',  color:'#a78bfa'},
  {id:'urgent',  label:'Urgente',  color:'#fb923c'},
  {id:'meeting', label:'Reunião',  color:'#60a5fa'},
];
function getCatInfo(id){return taskCats.find(c=>c.id===id)||{id,label:id,color:'#94a3b8'};}
const PC={high:'var(--vermelha)',med:'var(--amarela)',low:'var(--sage)'};

function aplicarFiltroPrazo(lista){
  const sel=document.getElementById('task-sort-prazo');
  const modo=sel?sel.value:'';
  const hoje=new Date().toISOString().split('T')[0];
  let r=lista.slice();
  if(modo==='hoje') r=r.filter(t=>t.due===hoje);
  else if(modo==='atrasadas') r=r.filter(t=>!t.done&&t.due&&t.due<hoje);
  else if(modo==='prazo-asc') r.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  else if(modo==='prazo-desc') r.sort((a,b)=>(b.due||'').localeCompare(a.due||''));
  return r;
}

function filtrarSequenciaProjetos(lista){
  const ocultar=new Set();
  const porProj={};
  lista.forEach(t=>{ if(t.projetoId){ (porProj[t.projetoId]=porProj[t.projetoId]||[]).push(t); } });
  Object.values(porProj).forEach(arr=>{
    const pend=arr.filter(t=>!t.done).sort((a,b)=>a.id-b.id);
    pend.slice(1).forEach(t=>ocultar.add(t.id));
  });
  return lista.filter(t=>!ocultar.has(t.id));
}

function renderTasks(f){
  if(f===undefined){const cs=document.getElementById('task-filter-sel');f=cs&&cs.value?cs.value:'all';}
  let list=f==='all'?tasks:tasks.filter(t=>t.cat===f);
  list=filtrarSequenciaProjetos(list);
  list=aplicarFiltroPrazo(list);
  document.getElementById('all-tasks-list').innerHTML=list.map(t=>{
    const cat=getCatInfo(t.cat);
    return '<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);'+(t.done?'opacity:0.5;':'')+'">'+
      '<div style="width:3px;height:36px;border-radius:2px;background:'+(PC[t.prio]||'var(--text3)')+';flex-shrink:0;margin-top:2px;"></div>'+
      '<div onclick="toggleTask('+t.id+')" style="width:18px;height:18px;border-radius:50%;border:1.5px solid '+(t.done?'var(--sage)':'var(--border2)')+';background:'+(t.done?'var(--sage)':'transparent')+';cursor:pointer;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;font-size:9px;color:'+(t.done?'#fff':'transparent')+';transition:all 0.15s;">'+(t.done?'<i class="fa-solid fa-check"></i>':'')+
      '</div>'+
      '<div style="flex:1;min-width:0;"><div onclick="abrirDetalheTask('+t.id+')" style="font-size:13.5px;cursor:pointer;'+(t.done?'text-decoration:line-through;color:var(--text3);':'')+'" title="Ver detalhes e atualizações">'+t.text+(t.recorrente&&t.tipoRecorrencia?'<span style="font-size:10px;color:var(--lavender);margin-left:6px;">🔁</span>':'')+'</div>'+
      '<div style="display:flex;gap:6px;margin-top:3px;align-items:center;">'+
      '<span style="font-size:10px;padding:1px 8px;border-radius:20px;font-weight:600;background:'+cat.color+'22;color:'+cat.color+';border:1px solid '+cat.color+'44;">'+cat.label+'</span>'+
      (t.due?'<span style="font-size:11px;color:var(--text3);"><i class="fa-regular fa-calendar fa-xs"></i> '+fd(t.due)+'</span>':'')+
      ((t.updates&&t.updates.length>0)?'<span style="font-size:10px;color:var(--text3);"><i class="fa-solid fa-message fa-xs"></i> '+t.updates.length+'</span>':'')+
      '</div></div>'+
      '<button onclick="delTask('+t.id+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 4px;transition:color 0.15s;" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-xmark"></i></button>'+
      ((!t.done&&t.due)?'<button onclick="criarEventoGCal(\''+escQ(t.text)+'\',\''+t.due+'\',\''+(t.hora||'09:00')+'\',60,\'Tarefa Claire\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:2px 4px;" title="Criar no Google Agenda"><i class="fa-brands fa-google"></i></button>':'')+
      '</div>';
  }).join('');
  const p=tasks.filter(t=>!t.done).length;
  document.getElementById('tasks-badge').textContent=p;
  document.getElementById('ov-tasks').textContent=p;
  renderOvAgenda();
}

function renderTaskFilterSel(){
  const el=document.getElementById('task-filter-sel');
  if(!el)return;
  const val=el.value||'all';
  el.innerHTML='<option value="all">Todas</option>'+taskCats.map(c=>'<option value="'+c.id+'"'+(val===c.id?' selected':'')+'>'+c.label+'</option>').join('');
}

function renderTaskCatSelect(){
  const sel=document.getElementById('t-cat');
  if(!sel)return;
  const val=sel.value;
  sel.innerHTML=taskCats.map(c=>'<option value="'+c.id+'"'+(val===c.id?' selected':'')+'>'+c.label+'</option>').join('');
}

function abrirGerenciarCats(){
  document.getElementById('modal-cats').classList.add('open');
  renderCatsList();
}

function renderCatsList(){
  document.getElementById('cats-list').innerHTML=taskCats.map((c,i)=>
    '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'+
    '<div style="width:14px;height:14px;border-radius:50%;background:'+c.color+';flex-shrink:0;"></div>'+
    '<span style="flex:1;font-size:13px;">'+c.label+'</span>'+
    (i>=4?'<button onclick="removeCat(\''+c.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-xmark"></i></button>':'<span style="font-size:10px;color:var(--text3);">padrão</span>')+
    '</div>'
  ).join('');
}

function adicionarCat(){
  const label=document.getElementById('new-cat-name').value.trim();
  if(!label){document.getElementById('new-cat-name').focus();return;}
  const colors=['#f472b6','#34d399','#f59e0b','#06b6d4','#8b5cf6','#ec4899','#10b981'];
  const color=colors[taskCats.length%colors.length];
  const id='cat_'+Date.now();
  taskCats.push({id,label,color});
  document.getElementById('new-cat-name').value='';
  renderCatsList();
  renderTaskFilterSel();
  renderTaskCatSelect();
}

function removeCat(id){
  taskCats=taskCats.filter(c=>c.id!==id);
  renderCatsList();
  renderTaskFilterSel();
  renderTaskCatSelect();
  renderTasks();
}

let taskDetalheAtivo=null;

function abrirDetalheTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  taskDetalheAtivo=id;
  if(!t.updates)t.updates=[];
  document.getElementById('td-titulo').textContent=t.text;
  document.getElementById('td-meta').innerHTML=
    '<span style="font-size:10px;padding:1px 8px;border-radius:20px;font-weight:600;background:'+getCatInfo(t.cat).color+'22;color:'+getCatInfo(t.cat).color+';border:1px solid '+getCatInfo(t.cat).color+'44;">'+getCatInfo(t.cat).label+'</span> '+
    (t.due?'<span style="font-size:12px;color:var(--text3);"><i class="fa-regular fa-calendar fa-xs"></i> '+fd(t.due)+'</span>':'')+
    ' <span style="font-size:12px;color:var(--text3);">·</span> '+
    '<span style="font-size:12px;color:'+(t.prio==='high'?'var(--vermelha)':t.prio==='med'?'var(--amarela)':'var(--sage)')+';">'+
    (t.prio==='high'?'Alta':t.prio==='med'?'Média':'Baixa')+'</span>';
  document.getElementById('td-editar').innerHTML=
    '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px;">Prazo</label><input type="date" class="form-input" style="padding:5px 8px;font-size:12.5px;" value="'+(t.due||'')+'" onchange="editarTaskCampo('+t.id+',\'due\',this.value)"></div>'+
    '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px;">Prioridade</label><select class="form-select" style="padding:5px 8px;font-size:12.5px;" onchange="editarTaskCampo('+t.id+',\'prio\',this.value)"><option value="high"'+(t.prio==='high'?' selected':'')+'>Alta</option><option value="med"'+(t.prio==='med'?' selected':'')+'>Média</option><option value="low"'+(t.prio==='low'?' selected':'')+'>Baixa</option></select></div>'+
    '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px;">Categoria</label><select class="form-select" style="padding:5px 8px;font-size:12.5px;" onchange="editarTaskCampo('+t.id+',\'cat\',this.value)">'+taskCats.map(c=>'<option value="'+c.id+'"'+(t.cat===c.id?' selected':'')+'>'+c.label+'</option>').join('')+'</select></div>';
  renderTaskUpdates();
  document.getElementById('modal-task-detalhe').classList.add('open');
  setTimeout(()=>document.getElementById('td-nova-update').focus(),150);
}

function editarTaskCampo(id,campo,valor){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  t[campo]=valor;
  renderTasks();renderKanban();
  document.getElementById('td-meta').innerHTML=
    '<span style="font-size:10px;padding:1px 8px;border-radius:20px;font-weight:600;background:'+getCatInfo(t.cat).color+'22;color:'+getCatInfo(t.cat).color+';border:1px solid '+getCatInfo(t.cat).color+'44;">'+getCatInfo(t.cat).label+'</span> '+
    (t.due?'<span style="font-size:12px;color:var(--text3);"><i class="fa-regular fa-calendar fa-xs"></i> '+fd(t.due)+'</span>':'')+
    ' <span style="font-size:12px;color:var(--text3);">·</span> '+
    '<span style="font-size:12px;color:'+(t.prio==='high'?'var(--vermelha)':t.prio==='med'?'var(--amarela)':'var(--sage)')+';">'+(t.prio==='high'?'Alta':t.prio==='med'?'Média':'Baixa')+'</span>';
}

function renderTaskUpdates(){
  const t=tasks.find(x=>x.id===taskDetalheAtivo);if(!t)return;
  const updates=t.updates||[];
  document.getElementById('td-updates-list').innerHTML=updates.length===0
    ?'<div style="text-align:center;padding:16px;color:var(--text3);font-size:13px;">Nenhuma atualização ainda.</div>'
    :updates.map((u,i)=>
      '<div style="padding:10px 0;border-bottom:1px solid var(--border);">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">'+
      '<span style="font-size:10.5px;color:var(--text3);">'+new Date(u.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span>'+
      '<button onclick="removerUpdate('+i+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Remover"><i class="fa-solid fa-xmark"></i></button>'+
      '</div>'+
      '<div style="font-size:13px;color:var(--text);white-space:pre-wrap;">'+esc(u.texto)+'</div>'+
      '</div>'
    ).reverse().join('');
}

function adicionarUpdate(){
  const t=tasks.find(x=>x.id===taskDetalheAtivo);if(!t)return;
  const texto=document.getElementById('td-nova-update').value.trim();
  if(!texto)return;
  if(!t.updates)t.updates=[];
  t.updates.push({texto,data:new Date().toISOString()});
  document.getElementById('td-nova-update').value='';
  renderTaskUpdates();
  renderTasks();
  showToast('Atualização adicionada!','sage');
}

function removerUpdate(idx){
  const t=tasks.find(x=>x.id===taskDetalheAtivo);if(!t||!t.updates)return;
  t.updates.splice(idx,1);
  renderTaskUpdates();
  renderTasks();
}

function toggleTask(id){
  const t=tasks.find(x=>x.id===id);
  if(!t)return;
  t.done=!t.done;
  if(t.done){ t.completedAt=new Date().toISOString(); } else { t.completedAt=null; }
  t.status=t.done?'done':'todo';
  // Se recorrente e marcada como concluída → criar próxima instância
  if(t.done&&t.recorrente&&t.tipoRecorrencia&&t.due){
    const proximaDue=calcProximaDue(t.due,t.tipoRecorrencia);
    const proxima={
      id:Date.now()+1,
      text:t.text,cat:t.cat,prio:t.prio,
      due:proximaDue,hora:t.hora||'',
      done:false,status:'todo',
      recorrente:true,tipoRecorrencia:t.tipoRecorrencia,
      projetoId:t.projetoId||null,projetoNome:t.projetoNome||null,
    };
    tasks.unshift(proxima);
    showToast('🔁 Próxima recorrência criada: '+fd(proximaDue),'sage');
  }
  renderTasks();renderKanban();fillFocusSel();
  if(typeof renderFocusInsights==='function')renderFocusInsights();
}
function delTask(id){tasks=tasks.filter(t=>t.id!==id);renderTasks();renderKanban();fillFocusSel();}
function filterTasks(v){renderTasks(v);}
function switchView(v,btn){document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.getElementById('task-list-view').style.display=v==='list'?'':'none';document.getElementById('task-kanban-view').style.display=v==='kanban'?'':'none';}

let _kanbanDragId=null;

function kanbanDragStart(e,id){
  _kanbanDragId=id;
  e.dataTransfer.effectAllowed='move';
  e.currentTarget.style.opacity='0.5';
}

function kanbanDragEnd(e){
  e.currentTarget.style.opacity='1';
}

function kanbanDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  e.currentTarget.style.background='var(--bg4)';
  e.currentTarget.style.borderStyle='dashed';
}

function kanbanDragLeave(e){
  e.currentTarget.style.background='var(--bg2)';
  e.currentTarget.style.borderStyle='solid';
}

function kanbanDrop(e,status){
  e.preventDefault();
  e.currentTarget.style.background='var(--bg2)';
  e.currentTarget.style.borderStyle='solid';
  if(_kanbanDragId===null)return;
  const t=tasks.find(x=>x.id===_kanbanDragId);
  if(t){
    t.status=status;
    t.done=status==='done';
  }
  _kanbanDragId=null;
  renderKanban();
  renderTasks();
  fillFocusSel();
}

function renderKanban(){
  const cols=[
    {id:'backlog',label:'Pausado',     c:'var(--text3)'},
    {id:'todo',   label:'A Fazer',     c:'var(--rose)'},
    {id:'doing',  label:'Em Progresso',c:'var(--peach)'},
    {id:'done',   label:'Concluído',   c:'var(--sage)'}
  ];
  let base=tasks;
  const cs=document.getElementById('task-filter-sel');
  if(cs&&cs.value&&cs.value!=='all')base=base.filter(t=>t.cat===cs.value);
  base=filtrarSequenciaProjetos(base);
  base=aplicarFiltroPrazo(base);
  document.getElementById('kanban-board').innerHTML=cols.map(col=>{
    const cards=base.filter(t=>t.status===col.id);
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px;min-height:220px;transition:background 0.15s,border-style 0.15s;" '+
      'ondragover="kanbanDragOver(event)" ondragleave="kanbanDragLeave(event)" ondrop="kanbanDrop(event,\''+col.id+'\')">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'+
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:'+col.c+';">'+col.label+'</div>'+
      '<div style="font-size:11px;background:var(--bg3);padding:1px 7px;border-radius:10px;color:var(--text3);">'+cards.length+'</div></div>'+
      cards.map(t=>{
        const cat=getCatInfo(t.cat);
        return '<div draggable="true" '+
          'ondragstart="kanbanDragStart(event,'+t.id+')" '+
          'ondragend="kanbanDragEnd(event)" '+
          'onclick="abrirDetalheTask('+t.id+')" '+
          'style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px;margin-bottom:7px;cursor:grab;user-select:none;transition:opacity 0.15s;'+((col.id==='done'||t.done)?'opacity:0.6;':'')+'">'+
          '<button onclick="event.stopPropagation();delTask('+t.id+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;float:right;" title="Apagar"><i class="fa-solid fa-xmark"></i></button>'+
          '<div style="font-size:13px;font-weight:500;margin-bottom:5px;">'+esc(t.text)+'</div>'+
          '<div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">'+
          '<span style="font-size:9.5px;padding:1px 6px;border-radius:10px;font-weight:600;background:'+cat.color+'22;color:'+cat.color+';">'+cat.label+'</span>'+
          (t.due?'<span style="font-size:10.5px;color:var(--text3);">'+fd(t.due)+'</span>':'')+
          (t.recorrente?'<span style="font-size:10px;color:var(--lavender);">🔁</span>':'')+
          ((t.updates&&t.updates.length>0)?'<span style="font-size:10px;color:var(--text3);margin-left:4px;"><i class="fa-solid fa-message fa-xs"></i> '+t.updates.length+'</span>':'')+
          '</div></div>';
      }).join('')+
      '</div>';
  }).join('');
}

function toggleRecorrenciaUI(tipo) {
  const det = document.getElementById('t-recorr-detail');
  const prev = document.getElementById('t-recorr-preview');
  if (!tipo) { det.style.display = 'none'; return; }
  det.style.display = '';
  const data = document.getElementById('t-date').value;
  const msgs = {
    diaria: '🔁 Repete todo dia',
    semanal: data ? '🔁 Repete toda ' + ['domingo','segunda','terça','quarta','quinta','sexta','sábado'][new Date(data+'T12:00:00').getDay()] : '🔁 Repete semanalmente',
    quinzenal: '🔁 Repete a cada 2 semanas',
    mensal: data ? '🔁 Repete todo dia ' + data.split('-')[2] + ' de cada mês' : '🔁 Repete mensalmente',
    anual: data ? '🔁 Repete todo ano em ' + new Date(data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}) : '🔁 Repete anualmente',
  };
  prev.textContent = msgs[tipo] || '';
}

function calcProximaDue(due, tipo) {
  if (!due || !tipo) return due;
  const d = new Date(due + 'T12:00:00');
  if (tipo === 'diaria')     d.setDate(d.getDate() + 1);
  else if (tipo === 'semanal')   d.setDate(d.getDate() + 7);
  else if (tipo === 'quinzenal') d.setDate(d.getDate() + 14);
  else if (tipo === 'mensal')  { d.setMonth(d.getMonth() + 1); }
  else if (tipo === 'anual')   { d.setFullYear(d.getFullYear() + 1); }
  return d.toISOString().split('T')[0];
}

function openAddTask(){
  document.getElementById('t-title').value='';
  document.getElementById('t-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('t-hora').value='';
  document.getElementById('t-recorrencia').value='';
  document.getElementById('t-gcal').checked=false;
  document.getElementById('t-recorr-detail').style.display='none';
  renderTaskCatSelect();
  document.getElementById('modal-task').classList.add('open');
  setTimeout(()=>document.getElementById('t-title').focus(),100);
}
function addTask(){
  const text=document.getElementById('t-title').value.trim();if(!text)return;
  const due=document.getElementById('t-date').value;
  const hora=document.getElementById('t-hora').value||'';
  const recorrencia=document.getElementById('t-recorrencia').value;
  const criarGcal=document.getElementById('t-gcal').checked;
  const nova={
    id:Date.now(),text,
    cat:document.getElementById('t-cat').value,
    prio:document.getElementById('t-prio').value,
    due,hora,done:false,status:'todo',
    recorrente:!!recorrencia,
    tipoRecorrencia:recorrencia||null,
    updates:[],
  };
  tasks.unshift(nova);
  closeModal('modal-task');
  renderTasks();renderKanban();fillFocusSel();
  if(criarGcal&&due){
    criarEventoGCal(text,due,hora||'09:00',60,'Tarefa Claire'+(recorrencia?' — Recorrente ('+recorrencia+')':''));
  }
}

// ═══════════════════ TEAM ═══════════════════
function getRespBand(v){v=parseFloat(v);if(v<=3)return{l:'Elite',c:'elite'};if(v<=4)return{l:'Azul',c:'azul'};if(v<=5)return{l:'Verde',c:'verde'};if(v<=6)return{l:'Amarela',c:'amarela'};return{l:'Vermelha',c:'vermelha'};}

function renderTeam(){
  const cu=(typeof getCurrentUser==='function')?getCurrentUser():null;
  const naoAdmin = !(typeof isAdmin==='function' && isAdmin());
  const btnNovo=document.querySelector('#panel-team button[onclick*="adicionarMembro"]'); if(btnNovo) btnNovo.style.display=naoAdmin?'none':'';
  if(naoAdmin){
    const grid=document.getElementById('team-grid');
    const lista=(typeof attsDoUsuario==='function')?attsDoUsuario():[];
    if(lista.length===0){ grid.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3);">Sem membros atribuídos ao seu acesso.</div></div>'; return; }
    const PC2={high:'var(--vermelha)',med:'var(--amarela)',low:'var(--sage)'};
    const PL={high:'Alta',med:'Média',low:'Baixa'};
    grid.innerHTML=lista.map(a=>{
      const media=a.respMes!=null?a.respMes.toFixed(1):'—';
      const pend=a.demands.map((d,i)=>({d,i})).filter(x=>x.d.s!=='done');
      return '<div class="card" style="max-width:560px;">'+
        '<div class="card-header">'+(a.foto?'<img src="'+esc(a.foto)+'" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">':'<div class="avatar '+a.av+'" style="width:34px;height:34px;font-size:14px;">'+a.ini+'</div>')+'<div class="card-title">'+esc(a.name)+'</div></div>'+
        '<div class="card-body" style="padding:14px 16px;">'+
        '<div style="display:flex;gap:18px;margin-bottom:12px;flex-wrap:wrap;font-size:12.5px;">'+
        '<div><span style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;">R$/hora</span>R$ '+a.rate+'</div>'+
        '<div><span style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;">Escala</span>'+esc(a.escala||'12×36')+'</div>'+
        '<div><span style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;">Tempo médio resp.</span>'+media+(media!=='—'?' min':'')+'</div>'+
        '</div>'+
        '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Demandas ('+pend.length+')</div>'+
        '<button class="btn btn-sm btn-rose" style="margin-bottom:8px;font-size:11px;" onclick="openAttModal(\''+a.id+'\')"><i class="fa-solid fa-plus"></i> Nova / Dar baixa</button>'+
        (pend.length===0?'<div style="font-size:12px;color:var(--text3);padding:6px 0;">Nenhuma demanda pendente. 🎉</div>':
        pend.map(({d,i})=>'<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-top:1px solid var(--border);cursor:pointer;" onclick="abrirDemandaModal(\''+a.id+'\','+i+')"><div style="width:3px;height:20px;border-radius:2px;background:'+(PC2[d.prio]||'var(--text3)')+';"></div><span style="font-size:11px;color:var(--text3);min-width:40px;">'+(PL[d.prio]||'')+'</span><span style="font-size:12.5px;flex:1;">'+esc(d.desc)+(d.updates&&d.updates.length?' <span style="font-size:10px;color:var(--text3);">💬'+d.updates.length+'</span>':'')+'</span>'+(d.due?'<span style="font-size:11px;color:var(--text3);">'+fd(d.due)+'</span>':'')+'</div>').join(''))+
        '</div></div>';
    }).join('');
    return;
  }
  const PC2={high:'var(--vermelha)',med:'var(--amarela)',low:'var(--sage)'};
  const PL={high:'Alta',med:'Média',low:'Baixa'};
  document.getElementById('team-grid').innerHTML=ATTS.map(a=>{
    const media=a.respMes!==null&&a.respMes!==undefined?a.respMes.toFixed(1):null;
    return '<div class="card">'+
      '<div class="card-header">'+
      (a.foto ? '<img src="'+esc(a.foto)+'" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">' : '<div class="avatar '+a.av+'" style="width:32px;height:32px;font-size:13px;">'+a.ini+'</div>')+
      '<div style="flex:1;"><input class="editable" style="font-size:14px;font-weight:600;width:140px;" value="'+esc(a.name)+'" onchange="setAttNome(\''+a.id+'\',this.value)"></div>'+
      '<button onclick="removerMembro(\''+a.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;" title="Remover"><i class="fa-solid fa-trash"></i></button>'+
      '</div>'+
      '<div class="card-body" style="padding:12px 16px;">'+
      '<label style="font-size:11px;color:var(--rose);cursor:pointer;display:inline-block;margin-bottom:10px;"><i class="fa-solid fa-camera"></i> '+(a.foto?'Trocar foto':'Adicionar foto')+'<input type="file" accept="image/*" style="display:none;" onchange="uploadAttFoto(\''+a.id+'\',event)"></label>'+
      '<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;">'+
      '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;">R$/hora</label><input type="number" class="editable" style="width:72px;" value="'+a.rate+'" onchange="setAttRate(\''+a.id+'\',this.value)"></div>'+
      '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;">Escala</label><input class="editable" style="width:80px;" value="'+esc(a.escala||'12×36')+'" onchange="setAttEscala(\''+a.id+'\',this.value)"></div>'+
      '</div>'+
      '<div style="background:var(--bg3);border-radius:var(--r-sm);padding:10px;margin-bottom:10px;">'+
      '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">⏱ Tempo de Resposta (min) — Semanal</div>'+
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px;">'+
      [0,1,2,3].map(i=>'<div style="text-align:center;"><div style="font-size:10px;color:var(--text3);">Sem.'+(i+1)+'</div><input type="number" step="0.1" min="0" class="form-input" style="text-align:center;padding:4px;font-size:12px;" value="'+(a.respWeekly&&a.respWeekly[i]!==null&&a.respWeekly[i]!==undefined?a.respWeekly[i]:'')+'" placeholder="—" onchange="setRespWeek(\''+a.id+'\','+i+',this.value)"></div>').join('')+
      '</div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;">'+
      '<div style="font-size:12px;">Média mensal: <strong style="color:'+(media?getRespBand(media).c==='verde'?'var(--sage)':getRespBand(media).c==='amarela'?'var(--amarela)':'var(--vermelha)':'var(--text3)')+'">'+(media?media+' min':'—')+'</strong></div>'+
      '<button class="btn btn-sm" onclick="zerarRespMes(\''+a.id+'\')" style="font-size:10px;padding:3px 8px;"><i class="fa-solid fa-rotate-left"></i> Zerar Mês</button>'+
      '</div></div>'+
      '<div style="margin-bottom:8px;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);">Demandas ('+a.demands.filter(d=>d.s!=='done').length+')</div><button class="btn btn-sm btn-rose" onclick="openAttModal(\''+a.id+'\')" style="font-size:10px;padding:3px 8px;"><i class="fa-solid fa-list"></i> Ver</button></div>'+
      a.demands.map((d,i)=>({d,i})).filter(x=>x.d.s!=='done').slice(0,3).map(({d,i})=>'<div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-top:1px solid var(--border);cursor:pointer;" onclick="abrirDemandaModal(\''+a.id+'\','+i+')"><div style="width:3px;height:20px;border-radius:2px;background:'+(PC2[d.prio]||'var(--text3)')+';flex-shrink:0;"></div><span style="font-size:11px;color:var(--text3);font-weight:600;min-width:36px;">'+(PL[d.prio]||'')+' </span><span style="font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(d.desc)+(d.updates&&d.updates.length?' 💬'+d.updates.length:'')+'</span>'+(d.recorrente?'<span style="font-size:10px;background:var(--lav-light);color:var(--lavender);padding:1px 5px;border-radius:8px;">🔁</span>':'')+'</div>').join('')+
      '</div>'+
      '<textarea class="form-input" rows="2" style="font-size:12px;resize:none;" placeholder="Anotações..." oninput="setNote(\''+a.id+'\',this.value)">'+esc(a.note||'')+'</textarea>'+
      '</div></div>';
  }).join('');
}


function setAttFoto(id,v){const a=ATTS.find(x=>x.id===id);if(a){a.foto=v;renderTeam();renderTeamOv();}}
function _lerImagemReduzida(file, cb){
  const reader=new FileReader();
  reader.onload=function(e){
    const img=new Image();
    img.onload=function(){
      const max=200; let w=img.width,h=img.height;
      if(w>h){ if(w>max){h=h*max/w;w=max;} } else { if(h>max){w=w*max/h;h=max;} }
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      cb(canvas.toDataURL('image/jpeg',0.8));
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function uploadAttFoto(id,event){
  const file=event.target.files[0];if(!file)return;
  _lerImagemReduzida(file,function(dataUrl){
    const a=ATTS.find(x=>x.id===id);
    if(a){a.foto=dataUrl;renderTeam();renderTeamOv();if(typeof saveAll==='function')saveAll();}
  });
}
function uploadHeadFoto(id,event){
  const file=event.target.files[0];if(!file)return;
  _lerImagemReduzida(file,function(dataUrl){headFotos[id]=dataUrl;renderSalary();if(typeof saveAll==='function')saveAll();});
}
function setResp(id,v){const a=ATTS.find(x=>x.id===id);if(a){a.resp=v;renderTeam();renderTeamOv();}}
function setNote(id,v){const a=ATTS.find(x=>x.id===id);if(a)a.note=v;}

function renderTeamOv(){
  document.getElementById('team-ov-tbody').innerHTML=ATTS.map(a=>`
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar ${a.av}" style="width:26px;height:26px;font-size:10px;">${a.ini}</div>${a.name}</div></td>
      <td>${a.respMes!==null&&a.respMes!==undefined?a.respMes.toFixed(1)+' min':'—'}</td>
      <td>${a.demands.length}</td>
      <td>${a.demands.filter(d=>d.s==='done').length}</td>
      <td>${a.respMes!==null&&a.respMes!==undefined?bandHTML(getRespBand(a.respMes).l.toUpperCase()):'<span style="color:var(--text3);font-size:12px;">—</span>'}</td>
    </tr>`).join('');
}

function renderOverview(){
  const cu=(typeof getCurrentUser==='function')?getCurrentUser():null;
  const admin=document.getElementById('overview-admin');
  const aten=document.getElementById('overview-atendente');
  if(!admin||!aten) return;
  if(cu && cu.perfil!=='admin'){
    admin.style.display='none';
    aten.style.display='';
    const lista=(typeof attsDoUsuario==='function')?attsDoUsuario():[];
    const hoje=new Date().toISOString().split('T')[0];
    const mes=hoje.substring(0,7);
    const nome=(cu.nome||'').split(' ')[0];
    const varios=lista.length>1;
    let html='<div style="margin-bottom:22px;"><h1 style="font-family:var(--font-display);font-size:24px;font-weight:700;">Olá, '+esc(nome||'você')+'! 🌸</h1><p style="color:var(--text3);font-size:13.5px;margin-top:3px;">Aqui estão as tarefas e turnos do seu acesso.</p></div>';
    if(lista.length===0){ html+='<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3);">Sem membros atribuídos ao seu acesso. Fale com o admin.</div></div>'; aten.innerHTML=html; return; }
    let totPend=0, totAtr=0;
    lista.forEach(a=>{ const p=a.demands.filter(d=>d.s!=='done'); totPend+=p.length; totAtr+=p.filter(d=>d.due && d.due<hoje).length; });
    html+='<div class="metrics-grid" style="margin-bottom:18px;">'+
      '<div class="metric-card rose"><div class="metric-icon rose"><i class="fa-solid fa-list-check"></i></div><div class="metric-value">'+totPend+'</div><div class="metric-label">Demandas Pendentes</div></div>'+
      '<div class="metric-card peach"><div class="metric-icon peach"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="metric-value">'+totAtr+'</div><div class="metric-label">Atrasadas</div></div>'+
      '</div>';
    const PC2={high:'var(--vermelha)',med:'var(--amarela)',low:'var(--sage)'};
    html+='<div class="card" style="margin-bottom:18px;"><div class="card-header"><div class="card-title">'+(varios?'Demandas da Equipe':'Minhas Demandas')+'</div></div><div class="card-body">';
    let algumaDemanda=false;
    lista.forEach(a=>{
      const pend=a.demands.map((d,i)=>({d,i})).filter(x=>x.d.s!=='done');
      if(pend.length===0) return;
      algumaDemanda=true;
      if(varios) html+='<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin:10px 0 4px;">'+esc(a.name)+'</div>';
      html+=pend.map(({d,i})=>'<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer;" onclick="abrirDemandaModal(\''+a.id+'\','+i+')"><div style="width:3px;height:20px;border-radius:2px;background:'+(PC2[d.prio]||'var(--text3)')+';"></div><span style="flex:1;font-size:13px;">'+esc(d.desc)+(d.updates&&d.updates.length?' <span style="font-size:10px;color:var(--text3);">💬'+d.updates.length+'</span>':'')+'</span>'+(d.due?'<span style="font-size:11px;color:'+(d.due<hoje?'var(--vermelha)':'var(--text3)')+';">'+fd(d.due)+'</span>':'')+'</div>').join('');
    });
    if(!algumaDemanda) html+='<div style="text-align:center;color:var(--text3);font-size:13px;padding:10px;">Tudo em dia! 🎉</div>';
    html+='</div></div>';
    if(typeof turnos!=='undefined'){
      const ids=lista.map(a=>a.id);
      const meusTurnos=turnos.filter(t=>ids.includes(t.attId) && t.data.startsWith(mes)).sort((x,y)=>x.data.localeCompare(y.data));
      const nomeAtt={}; lista.forEach(a=>nomeAtt[a.id]=a.name);
      html+='<div class="card"><div class="card-header"><div class="card-title">Turnos do Mês</div><button class="card-action" onclick="showPanel(\'turnos\',document.querySelector(\'#sidebar .nav-item[onclick*=turnos]\'))">Ver →</button></div><div class="card-body">'+
        (meusTurnos.length===0?'<div style="text-align:center;color:var(--text3);font-size:13px;padding:10px;">Nenhum turno lançado ainda.</div>':
        meusTurnos.slice(0,15).map(t=>'<div style="display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px;"><span style="width:54px;color:var(--text3);">'+t.data.substring(8,10)+'/'+t.data.substring(5,7)+'</span>'+(varios?'<span style="width:70px;color:var(--text3);">'+esc(nomeAtt[t.attId]||'')+'</span>':'')+'<span style="flex:1;">'+(t.turno==='dia'?'☀️ Dia (07-19h)':'🌙 Noite (19-07h)')+'</span>'+(t.confirmado?'<span style="color:var(--sage);"><i class="fa-solid fa-check"></i> ok</span>':'<span style="color:var(--peach);">a confirmar</span>')+'</div>').join(''))+
        '</div></div>';
    }
    aten.innerHTML=html;
  } else {
    admin.style.display='';
    aten.style.display='none';
  }
}

let mostrarDemandasConcluidas=false;
function toggleDemandasConcluidas(id){mostrarDemandasConcluidas=!mostrarDemandasConcluidas;openAttModal(id);}
function openAttModal(id){
  const a=ATTS.find(x=>x.id===id);
  document.getElementById('att-modal-title').textContent=a.name+' — Demandas';
  const visiveis=a.demands.map((d,i)=>({d,i})).filter(x=>mostrarDemandasConcluidas||x.d.s!=='done');
  document.getElementById('att-modal-body').innerHTML=`
    <div style="margin-bottom:12px;"><button class="btn btn-rose btn-sm" onclick="addDemandTo('${id}')"><i class="fa-solid fa-plus"></i> Nova Demanda</button></div>
    `+'<label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:10px;"><input type="checkbox" '+(mostrarDemandasConcluidas?'checked':'')+' onchange="toggleDemandasConcluidas(\''+id+'\')"> Mostrar concluídas</label>'+`
    ${visiveis.length===0?'<p style="color:var(--text3);font-size:13px;text-align:center;padding:14px;">Nenhuma demanda.</p>':
    '<table class="data-table"><thead><tr><th>Demanda</th><th>Prazo</th><th>Status</th><th></th></tr></thead><tbody>'+
    visiveis.map(({d,i})=>`<tr${d.s==='done'?' style="opacity:0.55;"':''}><td style="max-width:200px;cursor:pointer;${d.s==='done'?'text-decoration:line-through;':''}" onclick="abrirDemandaModal('${id}',${i})">${d.desc}${d.updates&&d.updates.length?' <span style="font-size:10px;color:var(--text3);">💬'+d.updates.length+'</span>':''}</td><td>${fd(d.due)}</td><td><select onchange="setDemandStatus('${id}',${i},this.value)" style="font-family:var(--font-body);font-size:12px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg3);color:var(--text);outline:none;"><option value="pending" ${d.s==='pending'?'selected':''}>Pendente</option><option value="done" ${d.s==='done'?'selected':''}>Concluída</option><option value="late" ${d.s==='late'?'selected':''}>Atrasada</option></select></td><td><button onclick="delDemand('${id}',${i})" style="background:none;border:none;color:var(--vermelha);cursor:pointer;font-size:12px;"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('')+
    '</tbody></table>'}`;
  document.getElementById('modal-att').classList.add('open');
}

function addDemandTo(id){closeModal('modal-att');document.getElementById('d-att').value=id;document.getElementById('d-desc').value='';document.getElementById('d-date').value=new Date().toISOString().split('T')[0];document.getElementById('modal-demand').classList.add('open');}
function openAddDemand(){document.getElementById('d-desc').value='';document.getElementById('d-date').value=new Date().toISOString().split('T')[0];document.getElementById('modal-demand').classList.add('open');}
function addDemand(){
  const id=document.getElementById('d-att').value,a=ATTS.find(x=>x.id===id);if(!a)return;
  const desc=document.getElementById('d-desc').value.trim();if(!desc)return;
  const recorrente=document.getElementById('d-recorrente')?document.getElementById('d-recorrente').checked:false;
  const recorrencia=document.getElementById('d-recorrencia')?document.getElementById('d-recorrencia').value.trim():'';
  a.demands.push({desc,due:document.getElementById('d-date').value,prio:document.getElementById('d-prio').value,s:'pending',recorrente,recorrencia});
  closeModal('modal-demand');renderTeam();renderTeamOv();
}
function setDemandStatus(id,i,v){const a=ATTS.find(x=>x.id===id);if(a&&a.demands[i])a.demands[i].s=v;renderTeam();renderTeamOv();openAttModal(id);}
function delDemand(id,i){const a=ATTS.find(x=>x.id===id);if(a){a.demands.splice(i,1);renderTeam();renderTeamOv();openAttModal(id);}}

let _demandaAtiva={attId:null, idx:null};
function abrirDemandaModal(attId, idx){
  const a=ATTS.find(x=>x.id===attId); if(!a||!a.demands[idx]) return;
  _demandaAtiva={attId, idx};
  const d=a.demands[idx];
  if(!d.updates) d.updates=[];
  document.getElementById('dd-titulo').textContent=d.desc;
  const PL={high:'Alta',med:'Média',low:'Baixa'};
  const PC={high:'var(--vermelha)',med:'var(--amarela)',low:'var(--sage)'};
  document.getElementById('dd-meta').innerHTML=
    '<span style="font-size:11px;color:'+(PC[d.prio]||'var(--text3)')+';font-weight:700;">'+(PL[d.prio]||'')+'</span>'+
    (d.due?' <span style="font-size:12px;color:var(--text3);"><i class="fa-regular fa-calendar fa-xs"></i> '+fd(d.due)+'</span>':'')+
    ' <span style="font-size:11px;padding:1px 8px;border-radius:10px;background:'+(d.s==='done'?'var(--sage-light);color:var(--sage)':'var(--bg3);color:var(--text3)')+';">'+(d.s==='done'?'Concluída':'Pendente')+'</span>'+
    (a?' <span style="font-size:11px;color:var(--text3);">· '+esc(a.name)+'</span>':'');
  document.getElementById('dd-editar').innerHTML=
    '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px;">Prazo</label><input type="date" class="form-input" style="padding:5px 8px;font-size:12.5px;" value="'+(d.due||'')+'" onchange="editarDemandaCampo(\'due\',this.value)"></div>'+
    '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px;">Prioridade</label><select class="form-select" style="padding:5px 8px;font-size:12.5px;" onchange="editarDemandaCampo(\'prio\',this.value)"><option value="high"'+(d.prio==='high'?' selected':'')+'>Alta</option><option value="med"'+(d.prio==='med'?' selected':'')+'>Média</option><option value="low"'+(d.prio==='low'?' selected':'')+'>Baixa</option></select></div>'+
    '<div><label style="font-size:10px;color:var(--text3);text-transform:uppercase;display:block;margin-bottom:3px;">Status</label><select class="form-select" style="padding:5px 8px;font-size:12.5px;" onchange="editarDemandaCampo(\'s\',this.value)"><option value="pending"'+(d.s!=='done'?' selected':'')+'>Pendente</option><option value="done"'+(d.s==='done'?' selected':'')+'>Concluída (baixa)</option></select></div>';
  renderDemandaUpdates();
  document.getElementById('modal-demanda-det').classList.add('open');
}
function editarDemandaCampo(campo, valor){
  const a=ATTS.find(x=>x.id===_demandaAtiva.attId); if(!a) return;
  const d=a.demands[_demandaAtiva.idx]; if(!d) return;
  d[campo]=valor;
  abrirDemandaModal(_demandaAtiva.attId,_demandaAtiva.idx); // re-render do meta
  if(typeof renderTeam==='function') renderTeam();
  if(typeof renderTeamOv==='function') renderTeamOv();
  if(typeof saveAll==='function') saveAll();
}
function renderDemandaUpdates(){
  const a=ATTS.find(x=>x.id===_demandaAtiva.attId); if(!a) return;
  const d=a.demands[_demandaAtiva.idx]; if(!d) return;
  const ups=d.updates||[];
  document.getElementById('dd-updates-list').innerHTML=ups.length===0
    ?'<div style="text-align:center;padding:14px;color:var(--text3);font-size:13px;">Nenhuma atualização ainda.</div>'
    :ups.map((u,i)=>'<div style="padding:9px 0;border-bottom:1px solid var(--border);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;"><span style="font-size:10.5px;color:var(--text3);">'+new Date(u.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span><button onclick="removerUpdateDemanda('+i+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;"><i class="fa-solid fa-xmark"></i></button></div><div style="font-size:13px;white-space:pre-wrap;">'+esc(u.texto)+'</div></div>').reverse().join('');
}
function adicionarUpdateDemanda(){
  const a=ATTS.find(x=>x.id===_demandaAtiva.attId); if(!a) return;
  const d=a.demands[_demandaAtiva.idx]; if(!d) return;
  const txt=document.getElementById('dd-nova-update').value.trim(); if(!txt) return;
  if(!d.updates) d.updates=[];
  d.updates.push({texto:txt, data:new Date().toISOString()});
  document.getElementById('dd-nova-update').value='';
  renderDemandaUpdates();
  if(typeof saveAll==='function') saveAll();
}
function removerUpdateDemanda(i){
  const a=ATTS.find(x=>x.id===_demandaAtiva.attId); if(!a) return;
  const d=a.demands[_demandaAtiva.idx]; if(!d||!d.updates) return;
  d.updates.splice(i,1); renderDemandaUpdates(); if(typeof saveAll==='function') saveAll();
}
function _mesAtualSal(){ return new Date().toISOString().substring(0,7); }
function marcarPago(attId){
  const k=attId+'_'+_mesAtualSal();
  salPagos[k]=!salPagos[k];
  if(typeof saveAll==='function') saveAll();
  renderSalary();
  showToast(salPagos[k]?'Marcado como pago!':'Baixa removida.','sage');
}

function renderPerformance(){
  const el=document.getElementById('performance-body');if(!el)return;
  const g=calcGlobal(), band=getBand(g);
  let html='<div class="card" style="margin-bottom:16px;"><div class="card-body" style="padding:20px;display:flex;align-items:center;gap:30px;flex-wrap:wrap;">'+
    '<div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Atingimento Global</div><div style="font-family:var(--font-display);font-size:42px;font-weight:700;color:var(--rose);">'+g+'%</div></div>'+
    '<div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;">Bandeira</div><div style="font-size:18px;font-weight:700;">'+(band?bandHTML(band.name):'—')+'</div></div>'+
    '</div></div>';
  html+='<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:10px;">KPIs do Mês</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px;">';
  KPI_DEFS.forEach(k=>{
    const p=k.calc(kpiVals[k.id]); const ps=p!==null?Math.round(p):null;
    const cor=ps===null?'var(--text3)':ps>=100?'var(--sage)':ps>=80?'var(--amarela)':'var(--vermelha)';
    html+='<div class="card"><div class="card-body" style="padding:14px;">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><div class="metric-icon '+k.color+'" style="width:24px;height:24px;font-size:11px;margin:0;"><i class="fa-solid '+k.icon+'"></i></div><div style="font-size:12px;font-weight:600;flex:1;">'+k.label+'</div></div>'+
      '<div style="font-family:var(--font-display);font-size:26px;font-weight:700;color:'+cor+';">'+(ps!==null?ps+'%':'—')+'</div>'+
      '<div style="font-size:10.5px;color:var(--text3);">Peso '+Math.round(k.peso*100)+'% · Meta '+k.meta+' '+k.unit+'</div>'+
      '<div class="kpi-track" style="margin-top:6px;"><div class="kpi-fill '+k.color+'" style="width:'+(p?Math.min(p,150)+'%':'0%')+'"></div></div>'+
      '</div></div>';
  });
  html+='</div>';
  const andamento=projetos.filter(p=>p.status==='andamento');
  const planejamento=projetos.filter(p=>p.status==='planejamento');
  const concluido=projetos.filter(p=>p.status==='concluido');
  const projCard=(titulo,lista,cor)=>{
    return '<div class="card"><div class="card-header"><div class="card-title" style="color:'+cor+';">'+titulo+' ('+lista.length+')</div></div><div class="card-body" style="padding:12px 16px;">'+
      (lista.length===0?'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;">Nenhum projeto.</div>':
      lista.map(p=>'<div onclick="abrirProjetoModal('+p.id+')" style="padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;">'+
        '<div style="font-size:13px;font-weight:600;">'+esc(p.nome||'(sem nome)')+'</div>'+
        (p.colaboradores?'<div style="font-size:11px;color:var(--text3);">'+esc(p.colaboradores)+'</div>':'')+
        (p.tempoEstimado?'<div style="font-size:11px;color:var(--text3);"><i class="fa-regular fa-clock"></i> '+esc(p.tempoEstimado)+'</div>':'')+
        '</div>').join(''))+
      '</div></div>';
  };
  html+='<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:10px;">Projetos</div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;">'+
    projCard('🚀 Em Andamento',andamento,'var(--peach)')+
    projCard('📋 A Iniciar',planejamento,'var(--sky)')+
    projCard('✅ Concluídos',concluido,'var(--sage)')+
    '</div>';
  el.innerHTML=html;
}

// ═══════════════════ SALARY ═══════════════════
function renderSalary(){
  const ehAdmin = (typeof isAdmin==='function') && isAdmin();
  const attsVis = ehAdmin ? ATTS : (typeof attsDoUsuario==='function'?attsDoUsuario():[]);
  const headsCard=document.getElementById('sal-heads-card'); if(headsCard) headsCard.style.display=ehAdmin?'':'none';
  const folhaCard=document.getElementById('sal-folha-card'); if(folhaCard) folhaCard.style.display=ehAdmin?'':'none';
  // Atendentes
  document.getElementById('sal-att-body').innerHTML=attsVis.map(a=>{
    const d1=workDaysP1[a.id]!==undefined?workDaysP1[a.id]:8;
    const d2=workDaysP2[a.id]!==undefined?workDaysP2[a.id]:7;
    const v1=d1*12*a.rate, v2=d2*12*a.rate, total=v1+v2;
    return '<div class="salary-block">'+
      '<div class="salary-name"><div class="avatar '+a.av+'" style="width:26px;height:26px;font-size:10px;">'+a.ini+'</div>'+esc(a.name)+'<span style="font-size:11px;color:var(--text3);margin-left:auto;">R$ '+a.rate+'/h</span></div>'+
      '<div class="salary-row"><span class="salary-label">1ª parcela (dias 01-15)</span><span class="salary-val"><input type="number" min="0" max="16" class="editable" value="'+d1+'" onchange="setWD1(\''+a.id+'\',this.value)"> plantões = '+brl(v1)+'</span></div>'+
      '<div class="salary-row"><span class="salary-label">2ª parcela (dias 16-31)</span><span class="salary-val"><input type="number" min="0" max="16" class="editable" value="'+d2+'" onchange="setWD2(\''+a.id+'\',this.value)"> plantões = '+brl(v2)+'</span></div>'+
      '<div class="salary-row total"><span class="salary-label">Total do mês</span><span class="salary-val" style="color:var(--sage);">'+brl(total)+'</span></div>'+
      '<div style="margin-top:8px;text-align:right;">'+
      (salPagos[a.id+'_'+_mesAtualSal()]
        ? '<span style="font-size:11px;background:var(--sage-light);color:var(--sage);padding:3px 10px;border-radius:10px;font-weight:700;cursor:pointer;" onclick="marcarPago(\''+a.id+'\')"><i class="fa-solid fa-circle-check"></i> Pago — clique p/ desfazer</span>'
        : '<button class="btn btn-sm" onclick="marcarPago(\''+a.id+'\')" style="font-size:11px;"><i class="fa-solid fa-money-bill-wave"></i> Dar baixa (pago)</button>')+
      '</div>'+
      '</div>';
  }).join('');

  if(!ehAdmin) return;
  // Heads
  const g=calcGlobal(),band=getBand(g),nv=NIVEIS[selNivelIdx],vp=Math.round(nv.variavel*band.mult);
  document.getElementById('sal-heads-body').innerHTML=[
    {id:'nicole', name:'Nicole', cargo:'Head de Operações', av:'av-rose', ini:'N',
     fixo:nv.fixo, comissao:(nicoleComissaoOverride!==null?nicoleComissaoOverride:vp), isNicole:true,
     note:`Bandeira ${band.name} (${Math.round(band.mult*100)}% do variável)`},
    {id:'gabriela',name:'Gabriela',cargo:'Head de RevOps', av:'av-sage', ini:'G', fixo:headFixo.gabriela||6000, comissao:headComissao.gabriela||0, isNicole:false},
    {id:'felipe',  name:'Felipe',  cargo:'Head de AI',     av:'av-sky',  ini:'F', fixo:headFixo.felipe||6000,   comissao:headComissao.felipe||0,   isNicole:false},
  ].map(h=>`
    <div class="salary-block">
      <div class="salary-name">${headFotos[h.id]?'<img src="'+esc(headFotos[h.id])+'" style="width:26px;height:26px;border-radius:50%;object-fit:cover;">':'<div class="avatar '+h.av+'" style="width:26px;height:26px;font-size:10px;">'+h.ini+'</div>'}<div><div style="font-size:13px;font-weight:600;">${h.name}</div><div style="font-size:10.5px;color:var(--text3);">${h.cargo}</div></div></div>
      <div class="salary-row"><span class="salary-label">Foto</span><span class="salary-val"><label style="font-size:11px;color:var(--rose);cursor:pointer;"><i class="fa-solid fa-camera"></i> ${headFotos[h.id]?'Trocar foto':'Adicionar foto'}<input type="file" accept="image/*" style="display:none;" onchange="uploadHeadFoto('${h.id}',event)"></label></span></div>
      <div class="salary-row"><span class="salary-label">Fixo — 1ª parcela (50%)</span><span class="salary-val">${h.isNicole?brl(Math.round(h.fixo/2)):`<input type="number" class="editable editable-wide" value="${h.fixo}" onchange="setHF('${h.id}',this.value)"> ÷2 = ${brl(Math.round(h.fixo/2))}`}</span></div>
      <div class="salary-row"><span class="salary-label">Fixo — 2ª parcela (50%)</span><span class="salary-val">${brl(Math.round(h.fixo/2))}</span></div>
      ${h.isNicole?'<div class="salary-row"><span class="salary-label">Comissão '+(nicoleComissaoOverride!==null?'(manual)':'(auto KPI)')+'</span><span class="salary-val" style="color:var(--rose);"><input type="number" class="editable editable-wide" value="'+(nicoleComissaoOverride!==null?nicoleComissaoOverride:h.comissao)+'" onchange="setNicoleComissao(this.value)"> '+(nicoleComissaoOverride!==null?'<button onclick="resetNicoleComissao()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;" title="Voltar ao cálculo automático"><i class=\'fa-solid fa-rotate-left\'></i></button>':'')+'</span></div>':`<div class="salary-row"><span class="salary-label">Comissão</span><span class="salary-val" style="color:var(--rose);"><input type="number" class="editable editable-wide" value="${h.comissao}" onchange="setHC('${h.id}',this.value)"></span></div>`}
      <div class="salary-row total"><span class="salary-label">Total estimado</span><span class="salary-val" style="color:var(--sage);">${brl(h.fixo+h.comissao)}</span></div>
      ${h.note?`<div style="font-size:11px;color:var(--text3);margin-top:3px;"><i class="fa-solid fa-circle-info"></i> ${h.note}</div>`:''}
    </div>`).join('');

  // Outros Membros (só admin)
  const outrosCard=document.getElementById('sal-outros-card');
  if(outrosCard) outrosCard.style.display = isAdmin() ? '' : 'none';
  const outrosBody=document.getElementById('sal-outros-body');
  if(outrosBody && isAdmin()){
    outrosBody.innerHTML = outrosMembros.length===0
      ? '<div style="font-size:13px;color:var(--text3);text-align:center;padding:10px;">Nenhum outro membro. Clique em "Novo Membro" acima.</div>'
      : outrosMembros.map(m=>{
        const total=(m.fixo||0)+(m.comissao||0);
        const pago=salPagos[m.id+'_'+_mesAtualSal()];
        return '<div class="salary-block">'+
          '<div class="salary-name"><div class="avatar av-peach" style="width:26px;height:26px;font-size:10px;">'+(m.nome||'?').charAt(0).toUpperCase()+'</div>'+
          '<div style="flex:1;"><input class="editable" style="font-size:13px;font-weight:600;width:120px;" value="'+esc(m.nome)+'" onchange="setOutroCampo(\''+m.id+'\',\'nome\',this.value)"><input class="editable" style="font-size:11px;color:var(--text3);width:120px;display:block;" value="'+esc(m.cargo||'')+'" placeholder="cargo" onchange="setOutroCampo(\''+m.id+'\',\'cargo\',this.value)"></div>'+
          '<button onclick="removerOutroMembro(\''+m.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" title="Apagar"><i class="fa-solid fa-trash"></i></button></div>'+
          '<div class="salary-row"><span class="salary-label">Fixo</span><span class="salary-val"><input type="number" class="editable editable-wide" value="'+(m.fixo||0)+'" onchange="setOutroCampo(\''+m.id+'\',\'fixo\',this.value)"></span></div>'+
          '<div class="salary-row"><span class="salary-label">Comissão / Extra</span><span class="salary-val"><input type="number" class="editable editable-wide" value="'+(m.comissao||0)+'" onchange="setOutroCampo(\''+m.id+'\',\'comissao\',this.value)"></span></div>'+
          '<div class="salary-row total"><span class="salary-label">Total</span><span class="salary-val" style="color:var(--sage);">'+brl(total)+'</span></div>'+
          '<div style="margin-top:6px;text-align:right;">'+(pago?'<span style="font-size:11px;background:var(--sage-light);color:var(--sage);padding:3px 10px;border-radius:10px;font-weight:700;cursor:pointer;" onclick="marcarPago(\''+m.id+'\')"><i class="fa-solid fa-circle-check"></i> Pago</span>':'<button class="btn btn-sm" onclick="marcarPago(\''+m.id+'\')" style="font-size:11px;"><i class="fa-solid fa-money-bill-wave"></i> Dar baixa (pago)</button>')+'</div>'+
          '</div>';
      }).join('');
  }

  const tAtt=ATTS.reduce((acc,a)=>{
    const d1=workDaysP1[a.id]!==undefined?workDaysP1[a.id]:8;
    const d2=workDaysP2[a.id]!==undefined?workDaysP2[a.id]:7;
    return acc+(d1+d2)*12*a.rate;
  },0);
  const tNic=nv.fixo+(nicoleComissaoOverride!==null?nicoleComissaoOverride:vp);
  const tGF=(headFixo.gabriela||6000)+(headComissao.gabriela||0)+(headFixo.felipe||6000)+(headComissao.felipe||0);
  const tOutros=outrosMembros.reduce((s,m)=>s+(m.fixo||0)+(m.comissao||0),0);
  document.getElementById('folha-grid').innerHTML=[
    {l:'Atendentes',v:tAtt,c:'sage'},{l:'Nicole',v:tNic,c:'rose'},{l:'Gabriela + Felipe',v:tGF,c:'lav'},{l:'Outros',v:tOutros,c:'peach'},{l:'Total Folha',v:tAtt+tNic+tGF+tOutros,c:'peach'},
  ].map(x=>`<div style="background:var(--bg3);border-radius:var(--r-sm);padding:14px;text-align:center;"><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px;">${x.l}</div><div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--${x.c});">${brl(x.v)}</div></div>`).join('');
}

function setWD1(id,v){workDaysP1[id]=parseInt(v)||0;renderSalary();}
function setWD2(id,v){workDaysP2[id]=parseInt(v)||0;renderSalary();}
function setHF(id,v){headFixo[id]=parseFloat(v)||0;renderSalary();}
function setHeadFoto(id,v){headFotos[id]=v;renderSalary();}
function setHC(id,v){headComissao[id]=parseFloat(v)||0;renderSalary();}
function setNicoleComissao(v){nicoleComissaoOverride=v===''?null:(parseFloat(v)||0);renderSalary();}
function resetNicoleComissao(){nicoleComissaoOverride=null;renderSalary();}

let _outroEditId=null;
function abrirNovoOutroMembro(){
  _outroEditId=null;
  document.getElementById('outro-modal-title').textContent='Novo Membro';
  document.getElementById('om-nome').value='';
  document.getElementById('om-cargo').value='';
  document.getElementById('om-fixo').value='';
  document.getElementById('om-comissao').value='';
  document.getElementById('modal-outro-membro').classList.add('open');
}
function salvarOutroMembro(){
  const nome=document.getElementById('om-nome').value.trim();
  if(!nome){ showToast('Informe o nome.','peach'); return; }
  const obj={
    id:_outroEditId||('om'+Date.now()),
    nome,
    cargo:document.getElementById('om-cargo').value.trim(),
    fixo:parseFloat(document.getElementById('om-fixo').value)||0,
    comissao:parseFloat(document.getElementById('om-comissao').value)||0
  };
  if(_outroEditId){ const i=outrosMembros.findIndex(x=>x.id===_outroEditId); if(i>=0) outrosMembros[i]=obj; }
  else outrosMembros.push(obj);
  closeModal('modal-outro-membro');
  if(typeof saveAll==='function') saveAll();
  renderSalary();
  showToast('Membro salvo!','sage');
}
function setOutroCampo(id,campo,valor){
  const m=outrosMembros.find(x=>x.id===id); if(!m) return;
  m[campo]=(campo==='fixo'||campo==='comissao')?(parseFloat(valor)||0):valor;
  if(typeof saveAll==='function') saveAll();
  renderSalary();
}
function removerOutroMembro(id){
  if(!confirm('Apagar este membro?')) return;
  outrosMembros=outrosMembros.filter(x=>x.id!==id);
  if(typeof saveAll==='function') saveAll();
  renderSalary();
  showToast('Membro removido.','peach');
}

function exportarSalariosPDF(){
  const g=calcGlobal(),band=getBand(g),nv=NIVEIS[selNivelIdx],vp=Math.round(nv.variavel*band.mult);
  const nicComissao=nicoleComissaoOverride!==null?nicoleComissaoOverride:vp;
  const mes=new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  // Atendentes
  let attRows='';
  let totAtt=0;
  ATTS.forEach(a=>{
    const d1=workDaysP1[a.id]!==undefined?workDaysP1[a.id]:8;
    const d2=workDaysP2[a.id]!==undefined?workDaysP2[a.id]:7;
    const v1=d1*12*a.rate,v2=d2*12*a.rate,t=v1+v2;
    totAtt+=t;
    attRows+='<tr><td style="padding:8px;border-bottom:1px solid #eee;">'+a.name+'</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">R$ '+a.rate+'/h</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">'+d1+' / R$ '+v1.toLocaleString('pt-BR')+'</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">'+d2+' / R$ '+v2.toLocaleString('pt-BR')+'</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">R$ '+t.toLocaleString('pt-BR')+'</td></tr>';
  });
  // Heads
  const heads=[
    {nome:'Nicole — Head de Operações',fixo:nv.fixo,com:nicComissao},
    {nome:'Gabriela — Head de RevOps',fixo:headFixo.gabriela||6000,com:headComissao.gabriela||0},
    {nome:'Felipe — Head de AI',fixo:headFixo.felipe||6000,com:headComissao.felipe||0},
  ];
  let headRows='';let totHead=0;
  heads.forEach(h=>{
    const t=h.fixo+h.com;totHead+=t;
    headRows+='<tr><td style="padding:8px;border-bottom:1px solid #eee;">'+h.nome+'</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">R$ '+h.fixo.toLocaleString('pt-BR')+'</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">R$ '+h.com.toLocaleString('pt-BR')+'</td>'+
      '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">R$ '+t.toLocaleString('pt-BR')+'</td></tr>';
  });
  const totalGeral=totAtt+totHead;
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Folha de Pagamento — '+mes+'</title>'+
    '<style>body{font-family:Arial,sans-serif;padding:40px;color:#222}h1{color:#c0616a;font-size:22px}h2{font-size:15px;color:#444;margin-top:24px;border-bottom:2px solid #c0616a;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#f5f5f5;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;color:#666}.tot{background:#c0616a;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;font-size:17px;font-weight:700;margin-top:24px;border-radius:8px}@media print{button{display:none}}</style></head><body>'+
    '<h1>💰 Folha de Pagamento — WeCare</h1>'+
    '<p style="color:#666;font-size:13px;">Período: <strong>'+mes+'</strong> · Gerado em '+new Date().toLocaleString('pt-BR')+'</p>'+
    '<h2>Atendimento (escala 12×36)</h2>'+
    '<table><thead><tr><th>Atendente</th><th style="text-align:center;">Valor/h</th><th style="text-align:center;">1ª parcela (01-15)</th><th style="text-align:center;">2ª parcela (16-31)</th><th style="text-align:right;">Total</th></tr></thead><tbody>'+attRows+'</tbody></table>'+
    '<h2>Heads</h2>'+
    '<table><thead><tr><th>Head</th><th style="text-align:center;">Fixo</th><th style="text-align:center;">Comissão</th><th style="text-align:right;">Total</th></tr></thead><tbody>'+headRows+'</tbody></table>'+
    '<div class="tot"><span>TOTAL DA FOLHA</span><span>R$ '+totalGeral.toLocaleString('pt-BR')+'</span></div>'+
    '<p style="margin-top:24px;font-size:11px;color:#aaa;">Claire · Painel de Gestão WeCare</p>'+
    '<script>window.onload=function(){window.print();}<\/script></body></html>';
  const win=window.open('','_blank');
  if(!win){showToast('Permita pop-ups para gerar o PDF.','peach');return;}
  win.document.write(html);win.document.close();
}

// ═══════════════════ NOTES ═══════════════════
const NCM={rose:{bg:'var(--rose-light)',bd:'var(--rose-mid)',ic:'var(--rose)'},sage:{bg:'var(--sage-light)',bd:'var(--sage-mid)',ic:'var(--sage)'},lav:{bg:'var(--lav-light)',bd:'var(--lav-mid)',ic:'var(--lavender)'},peach:{bg:'var(--peach-light)',bd:'var(--peach-mid)',ic:'var(--peach)'}};
function renderNotes(){
  document.getElementById('notes-grid').innerHTML=notes.map(n=>{const c=NCM[n.color]||NCM.rose;return `<div style="background:${c.bg};border:1px solid ${c.bd};border-radius:var(--r);padding:16px 18px;box-shadow:var(--shadow);"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;"><i class="fa-regular fa-note-sticky" style="color:${c.ic};font-size:14px;"></i><div style="font-size:14px;font-weight:600;">${n.title}</div><button onclick="delNote(${n.id})" style="margin-left:auto;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color='var(--vermelha)'" onmouseout="this.style.color='var(--text3)'"><i class="fa-solid fa-xmark"></i></button></div><div style="font-size:13px;color:var(--text2);white-space:pre-line;line-height:1.7;">${n.content}</div></div>`;}).join('');
}
function selNoteClr(el){document.querySelectorAll('.note-clr').forEach(e=>e.style.border='2px solid transparent');el.style.border='2px solid var(--text)';noteClr=el.dataset.c;}
function openAddNote(){document.getElementById('n-title').value='';document.getElementById('n-content').value='';document.getElementById('modal-note').classList.add('open');}
function addNote(){const t=document.getElementById('n-title').value.trim();if(!t)return;notes.unshift({id:Date.now(),title:t,content:document.getElementById('n-content').value,color:noteClr});closeModal('modal-note');renderNotes();}
function delNote(id){notes=notes.filter(n=>n.id!==id);renderNotes();}

// ═══════════════════ CALENDAR ═══════════════════
const MNS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DNS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
function renderCal(){
  document.getElementById('cal-label').textContent=MNS[calM]+' '+calY;
  const first=new Date(calY,calM,1).getDay(),total=new Date(calY,calM+1,0).getDate(),today=new Date();
  let h=DNS.map(d=>'<div class="cal-day-name">'+d+'</div>').join('');
  for(let i=0;i<first;i++)h+='<div class="cal-day other">'+new Date(calY,calM,-first+i+1).getDate()+'</div>';
  for(let d=1;d<=total;d++){
    const isT=d===today.getDate()&&calM===today.getMonth()&&calY===today.getFullYear();
    const ds=calY+'-'+String(calM+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const hasT=tasks.some(t=>t.due===ds);
    h+='<div class="cal-day'+(isT?' today':'')+(hasT?' has-ev':'')+'" onclick="renderAgenda(\''+ds+'\')">'+d+'</div>';
  }
  document.getElementById('cal-grid').innerHTML=h;
}
function changeMonth(d){calM+=d;if(calM>11){calM=0;calY++;}if(calM<0){calM=11;calY--;}renderCal();}

const EVTS=[
  {date:'2026-05-29',time:'09:00',title:'Daily Team Sync',sub:'Google Meet · 30min',c:'var(--sky)'},
  {date:'2026-05-29',time:'11:00',title:'Revisão de Onboardings',sub:'Sala A · 1h',c:'var(--sage)'},
  {date:'2026-05-29',time:'15:00',title:'Avaliação de Equipe',sub:'1h30',c:'var(--rose)'},
  {date:'2026-05-30',time:'10:00',title:'Reunião Sprint',sub:'Teams · 1h',c:'var(--sky)'},
  {date:'2026-05-31',time:'09:00',title:'Envio KPIs — prazo',sub:'Deadline',c:'var(--peach)'},
];
const ELBL={'2026-05-29':'Hoje, 29 Mai','2026-05-30':'Amanhã, 30 Mai','2026-05-31':'Sábado, 31 Mai'};

function renderAgenda(){
  const gr={};EVTS.forEach(e=>{if(!gr[e.date])gr[e.date]=[];gr[e.date].push(e);});
  let h='';
  Object.entries(gr).forEach(([date,evs])=>{
    h+='<div style="border-bottom:1px solid var(--border);"><div style="padding:8px 14px;background:var(--bg3);font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;">'+(ELBL[date]||date)+'</div>'+
    evs.map(e=>'<div style="display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'transparent\'"><div style="font-size:11px;color:var(--text3);width:38px;flex-shrink:0;">'+e.time+'</div><div style="width:3px;border-radius:2px;background:'+e.c+';flex-shrink:0;"></div><div><div style="font-size:13px;font-weight:500;">'+e.title+'</div><div style="font-size:11px;color:var(--text3);">'+e.sub+'</div></div></div>').join('')+
    '</div>';
  });
  document.getElementById('agenda-list').innerHTML=h||'<p style="padding:18px;color:var(--text3);text-align:center;">Nenhum evento</p>';
}

function connectGCal(){
  const btn=document.getElementById('gcal-btn');btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>';btn.disabled=true;
  setTimeout(()=>{document.getElementById('gcal-sub').textContent='Conectado';document.getElementById('gcal-sub').style.color='var(--sage)';btn.innerHTML='<i class="fa-solid fa-check"></i> Conectado';btn.style.color='var(--sage)';document.getElementById('gcal-body').innerHTML='<p style="font-size:13px;color:var(--text2);">✅ Google Agenda conectado. Eventos sincronizados automaticamente.</p>';},1500);
}

// ═══════════════════ AI CHAT ═══════════════════
function toggleAIProvider(v){
  document.getElementById('s-gemini-group').style.display = v==='gemini' ? '' : 'none';
  document.getElementById('s-anthropic-group').style.display = v==='anthropic' ? '' : 'none';
}

// Chama o provedor de IA configurado. Retorna o texto da resposta ou lança erro.
async function callAI(systemPrompt, messages, maxTokens){
  const provider = ls('nx_ai_provider') || 'gemini';
  maxTokens = maxTokens || 1000;
  if(provider === 'anthropic'){
    const key = ls('nx_apikey');
    if(!key) throw new Error('no_key_anthropic');
    const resp = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:maxTokens,system:systemPrompt,messages:messages})
    });
    const data = await resp.json();
    if(data.content && data.content[0]) return data.content[0].text;
    throw new Error('api_error');
  } else {
    // Gemini
    const key = ls('nx_gemini_key');
    if(!key) throw new Error('no_key_gemini');
    // Converter mensagens para o formato Gemini
    const contents = messages.map(m=>({role: m.role==='assistant'?'model':'user', parts:[{text: m.content}]}));
    const body = {
      contents: contents,
      systemInstruction: systemPrompt ? {parts:[{text: systemPrompt}]} : undefined,
      generationConfig: {maxOutputTokens: maxTokens}
    };
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(body)
    });
    const data = await resp.json();
    if(data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]){
      return data.candidates[0].content.parts[0].text;
    }
    throw new Error(data.error ? data.error.message : 'api_error');
  }
}

async function sendMsg(){
  const inp=document.getElementById('chat-input'),text=inp.value.trim();if(!text)return;
  appendMsg(text,'user');inp.value='';autoResize(inp);
  chatHist.push({role:'user',content:text});
  const btn=document.getElementById('send-btn');btn.disabled=true;
  const typing=showTyping();
  try{
    // Verificar se há chave configurada para o provedor atual
    const provider = ls('nx_ai_provider') || 'gemini';
    const temChave = provider==='anthropic' ? ls('nx_apikey') : ls('nx_gemini_key');
    if(!temChave){
      removeTyping(typing);
      appendMsg('⚙️ Configure sua chave de IA nas configurações. Você pode usar o Gemini gratuitamente (aistudio.google.com).','ai');
      btn.disabled=false;
      return;
    }
    const tc=tasks.filter(t=>!t.done).slice(0,5).map(t=>'- '+t.text+' ['+t.cat+', '+t.prio+']').join('\n');
    const kc=KPI_DEFS.map(k=>'- '+k.label+': '+(kpiVals[k.id]||'não preenchido')+' (peso '+Math.round(k.peso*100)+'%)').join('\n');
    const g=calcGlobal(),band=getBand(g),nv=NIVEIS[selNivelIdx],vp=Math.round(nv.variavel*band.mult);
    const hasGmail=!!ls('nx_gmail');const gmailReady=hasGmail;
    const sys='Você é Claire, assistente pessoal da Nicole, gerente de operações da WeCare. Responda sempre em português brasileiro.\n\nCONTEXTO:\n- KPI Global: '+g+'% — Bandeira '+band.name+'\n- Nível: '+nv.n+' (Fixo: '+brl(nv.fixo)+', Variável meta 100%: '+brl(nv.variavel)+')\n- Salário estimado: '+brl(nv.fixo+vp)+'\n- KPIs:\n'+kc+'\n- Tarefas pendentes:\n'+tc+'\n- Equipe: Patrícia (R$17/h), Sara, Lisarb, Laís (R$14/h)\n'+(hasGmail?'- Gmail conectado: pode redigir e-mails para envio':'- Gmail não configurado')+'\n\nPara calcular salário: Fixo + (Variável × multiplicador da bandeira). Vermelha=0%, Amarela=50%, Verde=100%, Azul=150%, Elite=200%.\nSeja concisa, use markdown.';
    const r = await callAI(sys, chatHist.slice(-12), 1000);
    removeTyping(typing);
    chatHist.push({role:'assistant',content:r});
    appendMsg(r,'ai');
  }catch(e){
    removeTyping(typing);
    appendMsg('Erro: '+(e.message==='no_key_gemini'||e.message==='no_key_anthropic'?'configure a chave de IA nas configurações.':(e.message||'falha na conexão.')),'ai');
  }
  btn.disabled=false;
}

function appendMsg(text,role){
  const w=document.getElementById('chat-messages'),div=document.createElement('div');
  div.className='msg '+role;
  const t=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.innerHTML='<div class="avatar '+(role==='ai'?'av-rose':'av-lav')+'" style="width:28px;height:28px;font-size:11px;flex-shrink:0;">'+(role==='ai'?'N':'U')+'</div><div><div class="msg-bub">'+md(text)+'</div><div class="msg-time">'+t+'</div></div>';
  w.appendChild(div);w.scrollTop=w.scrollHeight;
}

function md(t){return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>').replace(/`(.*?)`/g,'<code style="background:var(--bg4);padding:1px 5px;border-radius:3px;font-size:12px;">$1</code>').replace(/^[-•]\s+(.+)/gm,'<li style="margin-left:14px;margin-bottom:2px;">$1</li>').replace(/\n/g,'<br>');}
function showTyping(){const w=document.getElementById('chat-messages'),d=document.createElement('div');d.className='msg ai';d.id='typing-msg';d.innerHTML='<div class="avatar av-rose" style="width:28px;height:28px;font-size:11px;">N</div><div><div class="typing-ind"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>';w.appendChild(d);w.scrollTop=w.scrollHeight;return d;}
function removeTyping(el){el&&el.remove();}
function clearChat(){chatHist=[];document.getElementById('chat-messages').innerHTML='<div class="msg ai"><div class="avatar av-rose" style="width:28px;height:28px;font-size:11px;">N</div><div><div class="msg-bub">Chat limpo! Como posso ajudar, Nicole? 🌸</div><div class="msg-time">Agora</div></div></div>';}
function sendQuick(t){document.getElementById('chat-input').value=t;sendMsg();}
function handleKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,110)+'px';}

// ═══════════════════ FOCUS ═══════════════════
function updTimer(){const m=String(Math.floor(tLeft/60)).padStart(2,'0'),s=String(tLeft%60).padStart(2,'0');document.getElementById('timer-disp').textContent=m+':'+s;document.getElementById('ring').style.strokeDashoffset=502*(1-tLeft/tTotal);}
function setTimer(m,l){resetTimer();tTotal=tLeft=m*60;document.getElementById('focus-sub').textContent=l;document.getElementById('focus-lbl').textContent=l.toUpperCase();updTimer();}
function toggleTimer(){if(tRun){clearInterval(tInt);tRun=false;document.getElementById('focus-btn').innerHTML='<i class="fa-solid fa-play"></i> Retomar';}else{tRun=true;document.getElementById('focus-btn').innerHTML='<i class="fa-solid fa-pause"></i> Pausar';tInt=setInterval(()=>{tLeft--;updTimer();if(tLeft<=0){clearInterval(tInt);tRun=false;document.getElementById('focus-btn').innerHTML='<i class="fa-solid fa-play"></i> Iniciar';document.getElementById('focus-sub').textContent='✅ Sessão concluída!';pomodoroSessions++;if(typeof renderFocusInsights==='function')renderFocusInsights();}},1000);}}
function resetTimer(){clearInterval(tInt);tRun=false;tLeft=tTotal;updTimer();document.getElementById('focus-btn').innerHTML='<i class="fa-solid fa-play"></i> Iniciar';}
function fillFocusSel(){document.getElementById('focus-sel').innerHTML='<option value="">— Selecionar tarefa —</option>'+tasks.filter(t=>!t.done).map(t=>'<option>'+t.text+'</option>').join('');}

function renderFocusInsights(){
  const el=document.getElementById('focus-insights');
  if(!el)return;
  const concluidas=tasks.filter(t=>t.done&&t.completedAt);
  // Tempo médio de conclusão por categoria (usando id como timestamp de criação quando possível)
  const porCat={};
  concluidas.forEach(t=>{
    const criacao = (typeof t.id==='number'&&t.id>1e12) ? t.id : null;
    if(!criacao)return;
    const dias=(new Date(t.completedAt).getTime()-criacao)/(1000*60*60*24);
    if(dias<0)return;
    const cat=getCatInfo(t.cat);
    if(!porCat[cat.id])porCat[cat.id]={label:cat.label,color:cat.color,total:0,count:0};
    porCat[cat.id].total+=dias; porCat[cat.id].count++;
  });
  const cats=Object.values(porCat);
  // Concluídas no total e pendentes
  const totalConcluidas=tasks.filter(t=>t.done).length;
  const totalPendentes=tasks.filter(t=>!t.done).length;
  let html='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:16px;">'+
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:12px;">📊 Seus Insights</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;text-align:center;">'+
    '<div><div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--sage);">'+totalConcluidas+'</div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;">Concluídas</div></div>'+
    '<div><div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--peach);">'+totalPendentes+'</div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;">Pendentes</div></div>'+
    '<div><div style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--rose);">'+pomodoroSessions+'</div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;">Sessões foco</div></div>'+
    '</div>';
  if(cats.length>0){
    html+='<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Tempo médio de conclusão por categoria</div>';
    cats.forEach(c=>{
      const media=(c.total/c.count).toFixed(1);
      html+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);">'+
        '<span style="width:10px;height:10px;border-radius:50%;background:'+c.color+';flex-shrink:0;"></span>'+
        '<span style="flex:1;font-size:12.5px;">'+c.label+'</span>'+
        '<span style="font-size:12.5px;font-weight:600;">'+media+' dias</span>'+
        '<span style="font-size:10.5px;color:var(--text3);">('+c.count+')</span>'+
        '</div>';
    });
  } else {
    html+='<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;">Conclua tarefas para ver o tempo médio por categoria.</div>';
  }
  html+='</div>';
  el.innerHTML=html;
}

// ═══════════════════ SETTINGS ═══════════════════
function openSettings(){
  document.getElementById('s-name').value=ls('nx_name')||'Nicole';
  document.getElementById('s-api').value=ls('nx_apikey')||'';
  document.getElementById('s-ai-provider').value=ls('nx_ai_provider')||'gemini';
  document.getElementById('s-gemini-key').value=ls('nx_gemini_key')||'';
  toggleAIProvider(ls('nx_ai_provider')||'gemini');
  document.getElementById('s-gclientid').value=ls('nx_gclientid')||'';
  document.getElementById('s-hostaway-url').value=ls('nx_hostaway_url')||'';
  refreshGoogleStatus();
  document.getElementById('modal-settings').classList.add('open');
}
function saveSettings(){
  const name=document.getElementById('s-name').value.trim()||'Nicole';
  localStorage.setItem('nx_name',name);
  localStorage.setItem('nx_apikey',document.getElementById('s-api').value.trim());
  localStorage.setItem('nx_ai_provider',document.getElementById('s-ai-provider').value);
  localStorage.setItem('nx_gemini_key',document.getElementById('s-gemini-key').value.trim());
  localStorage.setItem('nx_gclientid',document.getElementById('s-gclientid').value.trim());
  localStorage.setItem('nx_hostaway_url',document.getElementById('s-hostaway-url').value.trim());
  document.getElementById('sidebar-name').textContent=name;
  document.getElementById('sidebar-avatar').textContent=name.charAt(0).toUpperCase();
  _applyGoogleStatus();
  greet();closeModal('modal-settings');
  showToast('Configurações salvas!','sage');
}
function loadSettings(){
  const n=ls('nx_name')||'Nicole';
  document.getElementById('sidebar-name').textContent=n;
  document.getElementById('sidebar-avatar').textContent=n.charAt(0).toUpperCase();
  _applyGoogleStatus();
}
function _applyGoogleStatus(){
  const connected=!!ls('nx_gdrive');
  if(ls('nx_gmail'))document.getElementById('gmail-ind').innerHTML='<i class="fa-solid fa-envelope-circle-check" style="color:var(--sage);"></i> Gmail ativo';
  const gcalSub=document.getElementById('gcal-sub');
  if(gcalSub)gcalSub.textContent=connected?'Conectado':'Não conectado';
}
function refreshGoogleStatus(){
  const connected=!!ls('nx_gdrive');
  const statusEl=document.getElementById('google-connect-status');
  const btnEl=document.getElementById('google-connect-btn');
  if(!statusEl||!btnEl)return;
  if(connected){
    statusEl.innerHTML='<i class="fa-solid fa-check-circle" style="color:var(--sage);"></i> <span style="color:var(--sage);font-weight:600;">Conectado</span>';
    btnEl.innerHTML='<i class="fa-brands fa-google"></i> Reconectar';
    btnEl.style.background='var(--sage-light)';btnEl.style.color='var(--sage)';btnEl.style.border='1px solid var(--sage-mid)';
  } else {
    statusEl.innerHTML='<span style="color:var(--text3);">Não conectado</span>';
    btnEl.innerHTML='<i class="fa-brands fa-google"></i> Conectar Google';
    btnEl.style.background='';btnEl.style.color='';btnEl.style.border='';
  }
}
function disconnectGoogle(){
  ['nx_gdrive','nx_gcal','nx_gmail'].forEach(k=>localStorage.removeItem(k));
  refreshGoogleStatus();_applyGoogleStatus();
  showToast('Google desconectado.','peach');
}

async function criarEventoGCal(titulo, data, hora, duracaoMin, descricao) {
  let token;
  try { token = await getGoogleToken(); } catch(e) { showToast('Conecte o Google Agenda para criar eventos.','peach'); return false; }
  const horaStr = hora || '09:00';
  const inicio = new Date(data + 'T' + horaStr + ':00');
  if (isNaN(inicio.getTime())) { showToast('Data inválida para o evento.','peach'); return false; }
  const fim = new Date(inicio.getTime() + (duracaoMin||60) * 60000);
  const body = {
    summary: titulo,
    description: descricao || '',
    start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
    end:   { dateTime: fim.toISOString(),    timeZone: 'America/Sao_Paulo' }
  };
  try {
    const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (resp.ok) { showToast('Evento "' + titulo + '" criado no Google Agenda! 📅','sage'); return true; }
    if (resp.status === 401) { silentRefreshGoogle(() => criarEventoGCal(titulo,data,hora,duracaoMin,descricao)); return false; }
    const err = await resp.json();
    showToast('Erro ao criar evento: ' + ((err.error && err.error.message) || resp.status),'vermelha');
    return false;
  } catch(e) { showToast('Erro de conexão ao criar evento.','vermelha'); return false; }
}

// ═══════════════════ GOOGLE OAUTH (GIS) ═══════════════════
const GOOGLE_SCOPES='https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://mail.google.com/';
let _gTokenClient=null; // cliente OAuth reutilizável para renovação silenciosa

function _saveGoogleToken(token, expiresIn){
  const exp=Date.now()+(expiresIn||3600)*1000;
  localStorage.setItem('nx_gdrive',token);
  localStorage.setItem('nx_gcal',token);
  localStorage.setItem('nx_gmail',token);
  localStorage.setItem('nx_gexpiry',String(exp));
}

function _initGTokenClient(clientId, prompt, callback){
  return google.accounts.oauth2.initTokenClient({
    client_id:clientId,scope:GOOGLE_SCOPES,
    callback:(resp)=>{
      if(resp.error){callback(null,resp.error);return;}
      if(resp.access_token){
        _saveGoogleToken(resp.access_token,resp.expires_in);
        callback(resp.access_token,null);
      }
    }
  });
}

function connectGoogle(){
  const clientId=document.getElementById('s-gclientid').value.trim()||ls('nx_gclientid');
  if(!clientId){showToast('Cole seu Google Client ID no campo acima antes de conectar.','vermelha');document.getElementById('s-gclientid').focus();return;}
  localStorage.setItem('nx_gclientid',clientId);
  if(typeof google==='undefined'||!google.accounts){showToast('Biblioteca Google ainda carregando, aguarde 2s e tente de novo.','peach');return;}
  _gTokenClient=_initGTokenClient(clientId,'consent',(token,err)=>{
    if(err){showToast('Erro OAuth: '+err,'vermelha');return;}
    refreshGoogleStatus();_applyGoogleStatus();
    showToast('Google conectado! Token válido por 1 hora — renovação automática ativa.','sage');
    _startTokenWatcher();
  });
  _gTokenClient.requestAccessToken({prompt:'consent'});
}

// Renovação silenciosa — tenta sem popup
function silentRefreshGoogle(onSuccess, onFail){
  const clientId=ls('nx_gclientid');
  if(!clientId||typeof google==='undefined'||!google.accounts){if(onFail)onFail();return;}
  const client=_initGTokenClient(clientId,'',(token,err)=>{
    if(err||!token){
      // falha silenciosa — mostrar aviso na tela
      _showGoogleExpiredBanner();
      if(onFail)onFail();
    } else {
      _hideGoogleExpiredBanner();
      refreshGoogleStatus();_applyGoogleStatus();
      if(onSuccess)onSuccess(token);
    }
  });
  client.requestAccessToken({prompt:''});
}

// Verificar se token ainda é válido (com margem de 5 min)
function googleTokenValido(){
  const exp=parseInt(ls('nx_gexpiry')||'0');
  return ls('nx_gdrive')&&exp>Date.now()+5*60*1000;
}

// Obter token válido — renova silenciosamente se necessário
function getGoogleToken(){
  return new Promise((resolve,reject)=>{
    if(googleTokenValido()){resolve(ls('nx_gdrive'));return;}
    silentRefreshGoogle(resolve,()=>reject('token_expired'));
  });
}

// Watcher: verifica a cada 10min e renova quando faltar menos de 10min
let _tokenWatcherInterval=null;
function _startTokenWatcher(){
  if(_tokenWatcherInterval)clearInterval(_tokenWatcherInterval);
  _tokenWatcherInterval=setInterval(()=>{
    const exp=parseInt(ls('nx_gexpiry')||'0');
    if(!exp||!ls('nx_gdrive'))return;
    const restante=exp-Date.now();
    if(restante<10*60*1000&&restante>0){
      // Faltam menos de 10 min — renovar silenciosamente
      silentRefreshGoogle(()=>console.log('Token Google renovado automaticamente.'),null);
    }
  },10*60*1000); // verifica a cada 10 min
}

// Banner de token expirado (barra no topo)
function _showGoogleExpiredBanner(){
  if(document.getElementById('google-expired-banner'))return;
  const b=document.createElement('div');
  b.id='google-expired-banner';
  b.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;background:#f57c00;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-family:var(--font-body);';
  b.innerHTML='<span><i class="fa-solid fa-triangle-exclamation"></i> Conexão Google expirada — algumas funções podem não funcionar.</span>'+
    '<button onclick="connectGoogle()" style="background:#fff;color:#f57c00;border:none;padding:5px 14px;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px;">Reconectar Google</button>';
  document.body.prepend(b);
  // Empurra o conteúdo para baixo
  document.getElementById('main').style.marginTop='46px';
}
function _hideGoogleExpiredBanner(){
  const b=document.getElementById('google-expired-banner');
  if(b){b.remove();document.getElementById('main').style.marginTop='';}
}

// Iniciar watcher se já tinha token salvo
document.addEventListener('DOMContentLoaded',()=>{
  if(ls('nx_gdrive')&&ls('nx_gclientid'))_startTokenWatcher();
});

// ═══════════════════ UTILS ═══════════════════
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));
function brl(v){return 'R$ '+Math.round(v||0).toLocaleString('pt-BR');}
function fd(s){if(!s)return'';const[,m,d]=s.split('-');return d+'/'+m;}
function ls(k){return localStorage.getItem(k);}
// ═══════════════════ GOOGLE CALENDAR (DIRECT API — ZERO CUSTO) ═══════════════════
// Usa Google Calendar REST API com OAuth token — sem chamada à API Anthropic

async function loadCalendarEvents() {
  const evList = document.getElementById('gcal-events-list');
  const token = ls('nx_gcal');

  if (!token) {
    if (evList) evList.innerHTML = '<div style="text-align:center;padding:12px 8px;">' +
      '<p style="color:var(--text3);font-size:13px;margin-bottom:8px;">Configure o token do Google nas configurações para sincronizar sua agenda.</p>' +
      '<button class="btn btn-sm btn-rose" onclick="openSettings()"><i class="fa-solid fa-gear"></i> Configurar</button></div>';
    return;
  }

  if (evList) evList.innerHTML = '<div style="text-align:center;padding:10px;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin"></i> Carregando...</div>';

  const now = new Date().toISOString();
  const endDate = new Date(); endDate.setDate(endDate.getDate() + 14);

  try {
    const resp = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
      '?timeMin=' + encodeURIComponent(now) +
      '&timeMax=' + encodeURIComponent(endDate.toISOString()) +
      '&singleEvents=true&orderBy=startTime&maxResults=30',
      { headers: { 'Authorization': 'Bearer ' + token } }
    );
    if (!resp.ok) {
      const status = resp.status;
      if(status===401){
        silentRefreshGoogle(()=>{showToast('Token renovado! Recarregando agenda...','sage');setTimeout(loadCalendarEvents,800);},()=>_showGoogleExpiredBanner());
        return;
      }
      const errMsg = status === 403 ? 'Permissão negada. Verifique os escopos (calendar.readonly).' : 'Erro ' + status;
      if (evList) evList.innerHTML = '<div style="padding:10px;text-align:center;"><p style="color:var(--vermelha);font-size:12.5px;">' + errMsg + '</p></div>';
      return;
    }
    const data = await resp.json();
    const events = data.items || [];
    renderCalendarEvents(events);
    renderAgendaFromGCal(events);
    markCalendarDays(events);
  } catch(e) {
    if (evList) evList.innerHTML = '<p style="color:var(--vermelha);font-size:13px;padding:10px;text-align:center;">Erro de conexão. Verifique o token.</p>';
  }
}

function setCalView(mode,btn){
  calViewMode=mode;
  document.querySelectorAll('#calview-mes,#calview-semana').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.getElementById('cal-mes-view').style.display=mode==='mes'?'':'none';
  document.getElementById('cal-semana-view').style.display=mode==='semana'?'':'none';
  if(mode==='semana')renderSemana();
}

function renderSemana(){
  const el=document.getElementById('cal-semana-view');if(!el)return;
  const hoje=new Date();
  const diaSemana=hoje.getDay();
  const inicio=new Date(hoje); inicio.setDate(hoje.getDate()-diaSemana); // domingo
  const dias=[];
  for(let i=0;i<7;i++){const d=new Date(inicio);d.setDate(inicio.getDate()+i);dias.push(d);}
  const nomes=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const cores=['var(--sky)','var(--sage)','var(--rose)','var(--lavender)','var(--peach)','var(--gold)','var(--sky)'];
  el.innerHTML='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;">'+dias.map((d,idx)=>{
    const ds=d.toISOString().split('T')[0];
    const ehHoje=ds===hoje.toISOString().split('T')[0];
    const evs=(_gcalTodosEventos||[]).filter(ev=>{const s=ev.start&&(ev.start.dateTime||ev.start.date);return s&&s.startsWith(ds);});
    const tks=tasks.filter(t=>!t.done&&t.due===ds);
    return '<div style="background:var(--bg2);border:1px solid '+(ehHoje?'var(--rose)':'var(--border)')+';border-radius:var(--r-sm);padding:8px;min-height:160px;">'+
      '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;">'+nomes[idx]+'</div>'+
      '<div style="font-size:16px;font-weight:700;margin-bottom:6px;'+(ehHoje?'color:var(--rose);':'')+'">'+d.getDate()+'</div>'+
      evs.map(ev=>{const s=ev.start&&(ev.start.dateTime||ev.start.date);const h=s&&ev.start.dateTime?new Date(s).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';return '<div style="background:'+cores[idx]+'22;border-left:2px solid '+cores[idx]+';border-radius:3px;padding:3px 5px;margin-bottom:3px;font-size:10.5px;">'+(h?'<b>'+h+'</b> ':'')+esc(ev.summary||'Evento')+'</div>';}).join('')+
      tks.map(t=>'<div style="background:var(--bg3);border-left:2px solid var(--text3);border-radius:3px;padding:3px 5px;margin-bottom:3px;font-size:10.5px;">✓ '+esc(t.text)+'</div>').join('')+
      '</div>';
  }).join('')+'</div>';
}

function renderCalendarEvents(events) {
  _gcalTodosEventos = events || [];
  if (calViewMode === 'semana') renderSemana();
  const evList = document.getElementById('gcal-events-list');
  if (!evList) return;
  if (!events || events.length === 0) {
    evList.innerHTML = '<p style="color:var(--text3);font-size:13px;text-align:center;padding:8px;">Nenhum evento nos próximos 7 dias.</p>';
    return;
  }
  const colors = ['var(--rose)','var(--sky)','var(--sage)','var(--lavender)','var(--peach)'];
  evList.innerHTML = events.map((ev, i) => {
    const start = ev.start && (ev.start.dateTime || ev.start.date);
    const d = start ? new Date(start) : null;
    const dayLabel = d ? d.toLocaleDateString('pt-BR', {weekday:'short', day:'2-digit', month:'short'}) : '';
    const timeLabel = d && ev.start.dateTime ? d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : 'Dia todo';
    return '<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
      '<div style="width:3px;border-radius:2px;background:' + colors[i % colors.length] + ';flex-shrink:0;"></div>' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(ev.summary || 'Sem título') + '</div>' +
      '<div style="font-size:11px;color:var(--text3);margin-top:2px;">' + dayLabel + ' · ' + timeLabel + (ev.location ? ' · ' + esc(ev.location) : '') + '</div>' +
      '</div></div>';
  }).join('');
  // Guardar eventos de hoje para o overview
  const hoje = new Date().toISOString().split('T')[0];
  _gcalEventosHoje = (events || []).filter(function(ev){
    const start = ev.start && (ev.start.dateTime || ev.start.date);
    return start && start.startsWith(hoje);
  });
  renderOvAgenda();
}

function renderAgendaFromGCal(events) {
  const agEl = document.getElementById('agenda-list');
  if (!agEl || !events || events.length === 0) return;
  const colors = ['var(--sky)','var(--sage)','var(--rose)','var(--lavender)','var(--peach)'];
  // Group by date
  const groups = {};
  events.forEach((ev, i) => {
    const start = ev.start && (ev.start.dateTime || ev.start.date);
    if (!start) return;
    const d = new Date(start);
    const key = d.toISOString().split('T')[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push({...ev, _color: colors[i % colors.length]});
  });

  let html = '';
  Object.entries(groups).slice(0, 5).forEach(([date, evs]) => {
    const d = new Date(date + 'T12:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.round((d - today) / 86400000);
    const lbl = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : d.toLocaleDateString('pt-BR', {weekday:'long', day:'2-digit', month:'short'});
    html += '<div style="border-bottom:1px solid var(--border);">' +
      '<div style="padding:8px 14px;background:var(--bg3);font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;">' + lbl + '</div>' +
      evs.map(ev => {
        const start = ev.start && (ev.start.dateTime || ev.start.date);
        const t = start && ev.start.dateTime ? new Date(start).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : 'Dia todo';
        return '<div style="display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:default;">' +
          '<div style="font-size:11px;color:var(--text3);width:40px;flex-shrink:0;">' + t + '</div>' +
          '<div style="width:3px;border-radius:2px;background:' + ev._color + ';flex-shrink:0;"></div>' +
          '<div><div style="font-size:13px;font-weight:500;">' + esc(ev.summary || 'Sem título') + '</div>' +
          (ev.location ? '<div style="font-size:11px;color:var(--text3);">' + esc(ev.location) + '</div>' : '') +
          '</div></div>';
      }).join('') + '</div>';
  });
  agEl.innerHTML = html || '<p style="padding:18px;color:var(--text3);text-align:center;">Nenhum evento</p>';
}

function markCalendarDays(events) {
  // Mark days with real events on the mini calendar
  if (!events) return;
  events.forEach(ev => {
    const start = ev.start && (ev.start.dateTime || ev.start.date);
    if (!start) return;
    const d = new Date(start);
    const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    document.querySelectorAll('.cal-day').forEach(el => {
      if (el.onclick && el.onclick.toString().includes(ds)) el.classList.add('has-ev');
    });
  });
}

// Auto-load calendar/gmail handled inside showPanel above

// ═══════════════════ GMAIL — MANUAL ONLY (no AI cost) ═══════════════════
// Override aiDraftEmail to do nothing (removed from UI but stub kept for safety)
function aiDraftEmail() { return; }
function draftReplyWithAI() { return; }

// ═══════════════════ DRIVE EDIT WITH AI ═══════════════════
function openEditModal() {
  if (!currentFileContent) { showToast('Abra um arquivo primeiro para editar.', 'peach'); return; }
  const name = document.getElementById('doc-view-title').textContent;
  document.getElementById('edit-doc-name').textContent = name;
  document.getElementById('edit-save-name').value = name.replace(/\.txt$/, '') + '_editado.txt';
  document.getElementById('edit-instruction').value = '';
  document.getElementById('modal-edit-doc').classList.add('open');
  setTimeout(() => document.getElementById('edit-instruction').focus(), 100);
}

async function editDocWithAI() {
  const instruction = document.getElementById('edit-instruction').value.trim();
  if (!instruction) { document.getElementById('edit-instruction').focus(); return; }
  const saveName = document.getElementById('edit-save-name').value.trim() || 'documento_editado.txt';

  const btn = document.getElementById('edit-doc-btn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Editando...';
  btn.disabled = true;

  // Step 1: Ask AI to apply the edit
  let editedContent;
  try{
    editedContent = await callAI(
      'Voce e um editor de documentos. Recebe um documento e uma instrucao de edicao. Retorne APENAS o documento completo editado, sem explicacoes, sem markdown, sem comentarios extras.',
      [{role:'user', content:'DOCUMENTO ATUAL:\n\n'+currentFileContent+'\n\n---\nINSTRUCAO DE EDICAO: '+instruction+'\n\nRetorne o documento completo com a edicao aplicada.'}],
      2000
    );
  }catch(e){
    showToast('Erro ao processar a edicao: '+(e.message||'verifique a chave de IA'),'vermelha');
    btn.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i> Aplicar e Salvar no Drive'; btn.disabled=false; return;
  }
  if(!editedContent){ showToast('Erro ao processar a edicao. Tente novamente.','vermelha'); btn.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i> Aplicar e Salvar no Drive'; btn.disabled=false; return; }

  try {
    // Step 2: Save via direct Drive API (zero cost)
    const driveToken = ls('nx_gdrive');
    if (!driveToken) { showToast('Configure o token do Google Drive nas configurações.', 'vermelha'); btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Aplicar e Salvar no Drive'; btn.disabled = false; return; }
    const bnd = 'claire_edit_' + Date.now();
    const metaE = JSON.stringify({ name: saveName, mimeType: 'text/plain' });
    const bodyE = '--' + bnd + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + metaE
      + '\r\n--' + bnd + '\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n' + editedContent + '\r\n--' + bnd + '--';
    const saveResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      { method: 'POST', headers: { 'Authorization': 'Bearer ' + driveToken, 'Content-Type': 'multipart/related; boundary=' + bnd }, body: bodyE });

    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Aplicar e Salvar no Drive';
    btn.disabled = false;

    if (!saveResp.ok) { showToast('Erro ao salvar no Drive. Verifique o token.', 'vermelha'); return; }
    closeModal('modal-edit-doc');

    // Show edited content in viewer
    currentFileContent = editedContent;
    document.getElementById('doc-view-title').textContent = saveName;
    document.getElementById('doc-view-sub').textContent = 'Editado com IA';
    document.getElementById('doc-view-body').innerHTML = '<div style="background:var(--sage-light);border-radius:var(--r-sm);padding:8px 12px;font-size:12px;color:var(--sage);margin-bottom:12px;"><i class="fa-solid fa-check-circle"></i> Documento editado e salvo no Drive como "' + saveName + '"</div><div style="font-size:13px;line-height:1.8;color:var(--text);white-space:pre-wrap;">' + esc(editedContent) + '</div>';
    showToast('Documento editado e salvo no Drive!', 'sage');
    setTimeout(() => loadDriveFiles(), 1500);
  } catch(e) {
    console.error(e);
    showToast('Erro ao salvar. Verifique sua conexao.', 'vermelha');
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Aplicar e Salvar no Drive';
    btn.disabled = false;
  }
}

// ═══════════════════ GMAIL ═══════════════════
let currentEmail = null;
let gmailTab = 'inbox';

function checkGmailConfig() {
  const token = ls('nx_gmail');
  if (!token) {
    document.getElementById('gmail-not-configured').style.display = 'block';
    document.getElementById('gmail-main').style.display = 'none';
    return false;
  }
  document.getElementById('gmail-not-configured').style.display = 'none';
  document.getElementById('gmail-main').style.display = 'block';
  return true;
}

async function loadEmails() {
  if (!checkGmailConfig()) return;
  document.getElementById('email-list').innerHTML = '<div style="padding:28px;text-align:center;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin" style="font-size:18px;"></i><div style="margin-top:8px;font-size:13px;">Carregando e-mails...</div></div>';

  const token = ls('nx_gmail');
  const query = gmailTab === 'sent' ? 'in:sent' : 'in:inbox';
  try {
    const listResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent(query) + '&maxResults=20', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!listResp.ok) { handleGmailError(listResp.status); return; }
    const listData = await listResp.json();
    if (!listData.messages || listData.messages.length === 0) {
      document.getElementById('email-list').innerHTML = '<div style="padding:28px;text-align:center;color:var(--text3);font-size:13px;">Nenhum e-mail encontrado.</div>';
      return;
    }
    // Fetch first 10 message headers in parallel
    const msgs = await Promise.all(listData.messages.slice(0, 15).map(m =>
      fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date', {
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(r => r.json())
    ));
    renderEmailList(msgs);
    const unread = msgs.filter(m => m.labelIds && m.labelIds.includes('UNREAD')).length;
    const badge = document.getElementById('gmail-badge');
    if (unread > 0) { badge.textContent = unread; badge.style.display = ''; } else { badge.style.display = 'none'; }
  } catch(e) {
    document.getElementById('email-list').innerHTML = '<div style="padding:24px;text-align:center;color:var(--vermelha);font-size:13px;"><i class="fa-solid fa-circle-exclamation"></i> Erro ao carregar e-mails. Verifique seu token Gmail nas configuracoes.</div>';
  }
}

function handleGmailError(status) {
  if(status===401){
    silentRefreshGoogle(()=>{showToast('Token renovado! Recarregando Gmail...','sage');setTimeout(loadEmails,800);},()=>_showGoogleExpiredBanner());
    return;
  }
  const msgs = { 403:'Permissão negada. Verifique os escopos do token.', 429:'Muitas requisições. Aguarde um momento.' };
  document.getElementById('email-list').innerHTML = '<div style="padding:24px;text-align:center;color:var(--vermelha);font-size:13px;"><i class="fa-solid fa-circle-exclamation"></i> ' + (msgs[status] || 'Erro ' + status) + '</div>';
}

function renderEmailList(msgs) {
  document.getElementById('email-list').innerHTML = msgs.map(m => {
    const headers = {};
    (m.payload && m.payload.headers || []).forEach(h => headers[h.name] = h.value);
    const from = headers['From'] || 'Desconhecido';
    const fromName = from.replace(/<.*>/, '').trim() || from;
    const subject = headers['Subject'] || '(sem assunto)';
    const date = headers['Date'] ? new Date(headers['Date']).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
    const isUnread = m.labelIds && m.labelIds.includes('UNREAD');
    const bgNormal = isUnread ? 'var(--rose-light)' : 'transparent';
    return '<div onclick="viewEmail(\'' + m.id + '\')" style="display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;' + (isUnread ? 'background:var(--rose-light);' : '') + '" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'' + bgNormal + '\'">'
      + '<div style="width:6px;border-radius:3px;background:' + (isUnread ? 'var(--rose)' : 'transparent') + ';flex-shrink:0;margin:2px 0;"></div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div style="display:flex;justify-content:space-between;gap:8px;"><div style="font-size:13px;font-weight:' + (isUnread ? '700' : '500') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(fromName) + '</div><div style="font-size:11px;color:var(--text3);white-space:nowrap;">' + date + '</div></div>'
      + '<div style="font-size:12.5px;color:' + (isUnread ? 'var(--text)' : 'var(--text2)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">' + esc(subject) + '</div>'
      + '</div></div>';
  }).join('');
}

async function viewEmail(id) {
  currentEmail = { id };
  document.getElementById('email-view-from').textContent = 'Carregando...';
  document.getElementById('email-view-sub').textContent = '';
  document.getElementById('email-actions').style.display = 'none';
  document.getElementById('email-view-body').innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin" style="font-size:18px;"></i></div>';

  const token = ls('nx_gmail');
  try {
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + id + '?format=full', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const msg = await resp.json();
    const headers = {};
    (msg.payload && msg.payload.headers || []).forEach(h => headers[h.name] = h.value);

    currentEmail = { id, from: headers['From']||'', subject: headers['Subject']||'', date: headers['Date']||'' };

    document.getElementById('email-view-from').textContent = headers['From'] || 'Desconhecido';
    document.getElementById('email-view-sub').textContent = headers['Subject'] || '(sem assunto)';
    document.getElementById('email-actions').style.display = 'flex';

    // Extract body
    const body = extractEmailBody(msg.payload);
    document.getElementById('email-view-body').innerHTML =
      '<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);">' +
      '<div style="font-size:12px;color:var(--text3);">De: ' + esc(headers['From']||'') + '</div>' +
      '<div style="font-size:12px;color:var(--text3);">Assunto: <strong>' + esc(headers['Subject']||'') + '</strong></div>' +
      '<div style="font-size:12px;color:var(--text3);">Data: ' + (headers['Date'] ? new Date(headers['Date']).toLocaleString('pt-BR') : '') + '</div></div>' +
      '<div style="font-size:13.5px;line-height:1.8;color:var(--text);white-space:pre-wrap;">' + esc(body) + '</div>';

    // Mark as read
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + id + '/modify', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
    });
  } catch(e) {
    document.getElementById('email-view-body').innerHTML = '<p style="color:var(--vermelha);padding:16px;">Erro ao carregar e-mail.</p>';
  }
}

function extractEmailBody(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) return atob(payload.body.data.replace(/-/g,'+').replace(/_/g,'/'));
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) return atob(part.body.data.replace(/-/g,'+').replace(/_/g,'/'));
    }
    for (const part of payload.parts) {
      const nested = extractEmailBody(part);
      if (nested) return nested;
    }
  }
  return '(conteudo nao disponivel)';
}

function switchEmailTab(tab, btn) {
  gmailTab = tab;
  document.querySelectorAll('#gmail-tab-inbox,#gmail-tab-sent').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadEmails();
}

async function searchEmails(query) {
  if (!query.trim()) { loadEmails(); return; }
  document.getElementById('email-list').innerHTML = '<div style="padding:28px;text-align:center;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin" style="font-size:18px;"></i></div>';
  const token = ls('nx_gmail');
  try {
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=' + encodeURIComponent(query) + '&maxResults=15', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await resp.json();
    if (!data.messages || data.messages.length === 0) { document.getElementById('email-list').innerHTML = '<div style="padding:28px;text-align:center;color:var(--text3);font-size:13px;">Nenhum resultado para "' + esc(query) + '"</div>'; return; }
    const msgs = await Promise.all(data.messages.slice(0,12).map(m =>
      fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + m.id + '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date', {
        headers: { 'Authorization': 'Bearer ' + token }
      }).then(r => r.json())
    ));
    renderEmailList(msgs);
  } catch(e) { document.getElementById('email-list').innerHTML = '<div style="padding:20px;text-align:center;color:var(--vermelha);font-size:13px;">Erro na busca.</div>'; }
}

function openComposeModal(to, subject, body) {
  document.getElementById('compose-to').value = to || '';
  document.getElementById('compose-subject').value = subject || '';
  document.getElementById('compose-body').value = body || '';
  document.getElementById('compose-title').textContent = 'Novo E-mail';
  document.getElementById('modal-compose').classList.add('open');
  setTimeout(() => document.getElementById(to ? 'compose-body' : 'compose-to').focus(), 100);
}

function replyEmail() {
  if (!currentEmail) return;
  const replyTo = currentEmail.from;
  const subject = currentEmail.subject.startsWith('Re:') ? currentEmail.subject : 'Re: ' + currentEmail.subject;
  openComposeModal(replyTo, subject, '');
  document.getElementById('compose-title').textContent = 'Responder E-mail';
}

async function draftReplyWithAI() { return; }

async function aiDraftEmail() { return; }

async function sendEmail() {
  const to = document.getElementById('compose-to').value.trim();
  const subject = document.getElementById('compose-subject').value.trim();
  const body = document.getElementById('compose-body').value.trim();
  if (!to || !subject || !body) { showToast('Preencha destinatario, assunto e mensagem.', 'peach'); return; }

  const token = ls('nx_gmail');
  if (!token) { showToast('Configure seu token Gmail nas configuracoes.', 'vermelha'); return; }

  const btn = document.getElementById('send-email-btn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
  btn.disabled = true;

  try {
    // Build RFC 2822 email
    const emailLines = [
      'To: ' + to,
      'Subject: =?UTF-8?B?' + btoa(unescape(encodeURIComponent(subject))) + '?=',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(unescape(encodeURIComponent(body)))
    ];
    const raw = btoa(unescape(encodeURIComponent(emailLines.join('\r\n')))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw })
    });

    if (resp.ok) {
      closeModal('modal-compose');
      showToast('E-mail enviado com sucesso!', 'sage');
      setTimeout(() => { if (gmailTab === 'sent') loadEmails(); }, 1000);
    } else {
      const err = await resp.json();
      if (resp.status === 401) showToast('Token expirado. Gere um novo token OAuth.', 'vermelha');
      else showToast('Erro ao enviar: ' + (err.error && err.error.message || resp.status), 'vermelha');
    }
  } catch(e) { showToast('Erro de conexao ao enviar e-mail.', 'vermelha'); }
  btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar';
  btn.disabled = false;
}

// showPanel override handled in GCAL section below

// ═══════════════════ GOOGLE DRIVE ═══════════════════
// ═══════════════════ GOOGLE DRIVE (DIRECT API — ZERO CUSTO) ═══════════════════
let currentFileId = null;
let currentFileUrl = null;
let currentFileContent = null;
let currentFileName = null;

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

function getDriveToken() { return ls('nx_gdrive'); }

function checkDriveToken() {
  if (!getDriveToken()) {
    showDriveError('not_configured');
    return false;
  }
  return true;
}

async function driveGet(path, params) {
  const token = getDriveToken();
  const url = DRIVE_API + path + (params ? '?' + new URLSearchParams(params) : '');
  const resp = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
  if (!resp.ok) { handleDriveError(resp.status); throw new Error('Drive API ' + resp.status); }
  return resp.json();
}

async function loadDriveFiles() {
  if (!checkDriveToken()) return;
  const el = document.getElementById('drive-file-list');
  el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin" style="font-size:20px;"></i><div style="margin-top:8px;font-size:13px;">Carregando arquivos...</div></div>';
  document.getElementById('drive-list-title').textContent = 'Arquivos Recentes';
  try {
    const data = await driveGet('/files', {
      pageSize: 20,
      orderBy: 'modifiedTime desc',
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
      q: "trashed=false"
    });
    renderFileList(data.files || []);
  } catch(e) {}
}

async function searchDrive(query) {
  if (!query.trim()) { loadDriveFiles(); return; }
  if (!checkDriveToken()) return;
  const el = document.getElementById('drive-file-list');
  el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin" style="font-size:20px;"></i><div style="margin-top:8px;font-size:13px;">Buscando...</div></div>';
  document.getElementById('drive-list-title').textContent = 'Resultados: "' + query + '"';
  try {
    const data = await driveGet('/files', {
      pageSize: 15,
      fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
      q: "name contains '" + query.replace(/'/g,"\\'") + "' and trashed=false"
    });
    renderFileList(data.files || []);
  } catch(e) {}
}

function renderFileList(files) {
  const el = document.getElementById('drive-file-list');
  if (!files || files.length === 0) {
    el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text3);"><i class="fa-solid fa-folder-open" style="font-size:28px;opacity:0.4;margin-bottom:8px;display:block;"></i><div style="font-size:13px;">Nenhum arquivo encontrado.</div></div>';
    return;
  }
  el.innerHTML = files.map(f => {
    const icon = getFileIcon(f.mimeType || '');
    const date = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString('pt-BR') : '';
    const nm = (f.name||'Sem nome').replace(/'/g,'&apos;');
    const url = (f.webViewLink||'').replace(/'/g,'&apos;');
    const mime = (f.mimeType||'').replace(/'/g,'&apos;');
    return '<div onclick="viewFile(\'' + f.id + '\',\'' + nm + '\',\'' + url + '\',\'' + mime + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'transparent\'">'
      + '<div style="font-size:18px;flex-shrink:0;">' + icon + '</div>'
      + '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(f.name||'Sem nome') + '</div>'
      + '<div style="font-size:11px;color:var(--text3);margin-top:1px;">' + getFileTypeName(f.mimeType||'') + (date ? ' · ' + date : '') + '</div></div>'
      + '<i class="fa-solid fa-chevron-right" style="color:var(--text3);font-size:11px;flex-shrink:0;"></i></div>';
  }).join('');
}

async function viewFile(id, name, url, mimeType) {
  currentFileId = id;
  currentFileUrl = url;
  currentFileName = name;
  document.getElementById('doc-view-title').textContent = name;
  document.getElementById('doc-view-sub').textContent = getFileTypeName(mimeType);
  document.getElementById('doc-actions').style.display = 'flex';

  const body = document.getElementById('doc-view-body');
  // Google Docs/Sheets/Slides: export as plain text
  const isGDoc = mimeType && mimeType.includes('google-apps');
  const isText = mimeType && (mimeType.includes('text') || mimeType === 'application/json');

  if (!isGDoc && !isText) {
    body.innerHTML = '<div style="text-align:center;padding:30px;"><div style="font-size:36px;margin-bottom:12px;">' + getFileIcon(mimeType) + '</div>'
      + '<div style="font-size:13px;color:var(--text2);margin-bottom:14px;">Este tipo de arquivo não pode ser visualizado aqui.</div>'
      + '<a href="' + url + '" target="_blank" class="btn btn-rose" style="text-decoration:none;"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir no Drive</a></div>';
    currentFileContent = null;
    return;
  }

  body.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3);"><i class="fa-solid fa-spinner fa-spin" style="font-size:18px;"></i><div style="margin-top:8px;font-size:13px;">Lendo conteúdo...</div></div>';

  try {
    const token = getDriveToken();
    let text = '';
    if (isGDoc) {
      // Export Google Docs as plain text
      const exportMime = mimeType.includes('spreadsheet') ? 'text/csv'
        : mimeType.includes('presentation') ? 'text/plain'
        : 'text/plain';
      const resp = await fetch(DRIVE_API + '/files/' + id + '/export?mimeType=' + encodeURIComponent(exportMime),
        { headers: { 'Authorization': 'Bearer ' + token } });
      if (!resp.ok) throw new Error(resp.status);
      text = await resp.text();
    } else {
      // Download plain text / json file content
      const resp = await fetch(DRIVE_API + '/files/' + id + '?alt=media',
        { headers: { 'Authorization': 'Bearer ' + token } });
      if (!resp.ok) throw new Error(resp.status);
      text = await resp.text();
    }
    currentFileContent = text;
    if (!text.trim()) {
      body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);font-size:13px;">Arquivo vazio.<br><a href="' + url + '" target="_blank" style="color:var(--rose);">Abrir no Drive</a></div>';
      return;
    }
    body.innerHTML = '<div style="font-size:13px;line-height:1.8;color:var(--text);white-space:pre-wrap;">' + esc(text) + '</div>';
  } catch(e) {
    body.innerHTML = '<p style="color:var(--vermelha);padding:16px;font-size:13px;">Erro ao ler o arquivo. Verifique o token do Drive.</p>';
  }
}

async function createDriveDoc() {
  const name = document.getElementById('new-doc-name').value.trim();
  if (!name) { document.getElementById('new-doc-name').focus(); return; }
  if (!checkDriveToken()) { closeModal('modal-create-doc'); openSettings(); return; }
  const docContent = document.getElementById('new-doc-content').value || '';

  const btn = document.getElementById('create-doc-btn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando...';
  btn.disabled = true;

  try {
    const token = getDriveToken();
    const fname = name.endsWith('.txt') ? name : name + '.txt';
    // Multipart upload: metadata + content
    const boundary = 'claire_boundary_' + Date.now();
    const meta = JSON.stringify({ name: fname, mimeType: 'text/plain' });
    const body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'
      + meta + '\r\n--' + boundary + '\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n'
      + docContent + '\r\n--' + boundary + '--';

    const resp = await fetch(DRIVE_UPLOAD + '/files?uploadType=multipart',
      { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'multipart/related; boundary=' + boundary }, body });

    btn.innerHTML = '<i class="fa-brands fa-google-drive"></i> Criar no Drive';
    btn.disabled = false;

    if (resp.ok) {
      closeModal('modal-create-doc');
      showToast('Documento "' + fname + '" criado no Drive!', 'sage');
      setTimeout(() => loadDriveFiles(), 800);
    } else {
      const err = await resp.json();
      showToast('Erro ao criar: ' + (err.error && err.error.message || resp.status), 'vermelha');
    }
  } catch(e) {
    document.getElementById('create-doc-btn').innerHTML = '<i class="fa-brands fa-google-drive"></i> Criar no Drive';
    document.getElementById('create-doc-btn').disabled = false;
    showToast('Erro de conexão ao criar arquivo.', 'vermelha');
  }
}

function handleDriveError(status) {
  if(status===401){
    silentRefreshGoogle(()=>{showToast('Token renovado! Recarregando Drive...','sage');setTimeout(loadDriveFiles,800);},()=>_showGoogleExpiredBanner());
    return;
  }
  const msgs = { 403:'Permissão negada. Verifique os escopos do token.' };
  showDriveError(msgs[status] || 'Erro ' + status);
}

function showDriveError(msg) {
  const el = document.getElementById('drive-file-list');
  if (!el) return;
  if (msg === 'not_configured') {
    el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text3);"><i class="fa-brands fa-google-drive" style="font-size:32px;opacity:0.35;margin-bottom:10px;display:block;"></i>'
      + '<div style="font-size:13px;margin-bottom:10px;">Configure o token do Google Drive nas configurações.</div>'
      + '<button class="btn btn-rose btn-sm" onclick="openSettings()"><i class="fa-solid fa-gear"></i> Configurar</button></div>';
  } else {
    el.innerHTML = '<div style="padding:28px;text-align:center;"><p style="color:var(--vermelha);font-size:13px;margin-bottom:8px;"><i class="fa-solid fa-triangle-exclamation"></i> ' + (msg||'Erro no Drive') + '</p>'
      + '<button class="btn btn-sm" onclick="openSettings()">Reconfigurar token</button></div>';
  }
}

async function summarizeWithAI() {
  if (!currentFileContent) return;
  const aiNavBtn = Array.from(document.querySelectorAll('.nav-item')).find(b => b.textContent.trim().startsWith('Assistente')); showPanel('ai', aiNavBtn);
  const summary = 'Resuma o seguinte documento de forma clara e objetiva, destacando os pontos principais:\n\n' + currentFileContent.substring(0, 3000);
  document.getElementById('chat-input').value = summary;
  sendMsg();
}

function openInDrive() {
  if (currentFileUrl) window.open(currentFileUrl, '_blank');
}

function openCreateDoc() {
  document.getElementById('new-doc-name').value = '';
  document.getElementById('new-doc-content').value = '';
  document.getElementById('modal-create-doc').classList.add('open');
  setTimeout(() => document.getElementById('new-doc-name').focus(), 100);
}



// ═══════════════════ EQUIPE — NOVAS FUNÇÕES ═══════════════════
function adicionarMembro(){
  const nome=prompt('Nome do novo membro:');
  if(!nome||!nome.trim())return;
  const cores=['av-lav','av-sky','av-sage','av-peach','av-gold'];
  ATTS.push({
    id:'att'+nextAttId,name:nome.trim(),
    av:cores[nextAttId%cores.length],
    ini:nome.trim().charAt(0).toUpperCase(),
    rate:14,escala:'12×36',note:'',resp:'',
    respWeekly:[null,null,null,null],respMes:null,demands:[]
  });
  nextAttId++;
  renderTeam();renderTeamOv();renderSalary();
}

function removerMembro(id){
  if(!confirm('Remover este membro da equipe?'))return;
  ATTS=ATTS.filter(a=>a.id!==id);
  renderTeam();renderTeamOv();renderSalary();
}

function setAttNome(id,v){const a=ATTS.find(x=>x.id===id);if(a){a.name=v;a.ini=v.charAt(0).toUpperCase();renderTeamOv();renderSalary();}}
function setAttRate(id,v){const a=ATTS.find(x=>x.id===id);if(a){a.rate=parseFloat(v)||0;renderSalary();}}
function setAttEscala(id,v){const a=ATTS.find(x=>x.id===id);if(a)a.escala=v;}

function setRespWeek(id,week,v){
  const a=ATTS.find(x=>x.id===id);if(!a)return;
  a.respWeekly[week]=v===''?null:parseFloat(v);
  const vals=a.respWeekly.filter(x=>x!==null&&x!=='');
  a.respMes=vals.length>0?(vals.reduce((s,x)=>s+x,0)/vals.length):null;
  if(!kpiSubVals.tr)kpiSubVals.tr={};
  kpiSubVals.tr[id]=a.respMes!==null?a.respMes.toFixed(1):'';
  const trVals=ATTS.map(att=>kpiSubVals.tr&&kpiSubVals.tr[att.id]?parseFloat(kpiSubVals.tr[att.id]):null).filter(x=>x!==null);
  kpiVals.tr=trVals.length>0?(trVals.reduce((s,x)=>s+x,0)/trVals.length).toFixed(2):null;
  renderTeam();renderKPIs();
}

function zerarRespMes(id){
  const a=ATTS.find(x=>x.id===id);if(!a)return;
  a.respWeekly=[null,null,null,null];a.respMes=null;
  if(kpiSubVals.tr)delete kpiSubVals.tr[id];
  const trVals=ATTS.map(att=>kpiSubVals.tr&&kpiSubVals.tr[att.id]?parseFloat(kpiSubVals.tr[att.id]):null).filter(x=>x!==null);
  kpiVals.tr=trVals.length>0?(trVals.reduce((s,x)=>s+x,0)/trVals.length).toFixed(2):null;
  renderTeam();renderKPIs();
  showToast('Tempo de resposta zerado para '+a.name,'sage');
}

// ═══════════════════ KPI EXPORT / RESET ═══════════════════
function exportarKPIPDF(){
  const g=calcGlobal(),band=getBand(g),nv=NIVEIS[selNivelIdx],vp=Math.round(nv.variavel*band.mult);
  const mes=new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const linhasKPI=KPI_DEFS.map(k=>{
    const p=k.calc(kpiVals[k.id]),ps=p!==null?Math.round(p):null;
    const sub=kpiSubVals[k.id]||{};
    let detalhe='';
    if(k.id==='av'&&(sub.airbnb||sub.booking))detalhe=' (Airbnb: '+(sub.airbnb||'—')+' | Booking: '+(sub.booking||'—')+' | Média: '+(kpiVals.av||'—')+')';
    if(k.id==='cv'&&(sub.reviews||sub.checkouts))detalhe=' ('+(sub.reviews||0)+' reviews / '+(sub.checkouts||0)+' checkouts)';
    if(k.id==='tr'){const atts=['patricia','sara','lisarb','lais'];const vals=atts.filter(a=>sub[a]).map(a=>sub[a]+'min');if(vals.length)detalhe=' ('+vals.join(' | ')+')'}
    return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">'+k.label+'</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">'+Math.round(k.peso*100)+'%</td><td style="padding:8px;border-bottom:1px solid #eee;">'+(kpiVals[k.id]||'—')+' '+k.unit+detalhe+'</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;font-weight:600;color:'+(ps===null?'#999':ps>=100?'#2e7d32':ps>=80?'#f57c00':'#c62828')+'">'+(ps!==null?ps+'%':'—')+'</td></tr>';
  }).join('');
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório KPI — '+mes+'</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#222}h1{color:#c0616a;font-size:22px}h2{font-size:16px;color:#444;margin-top:24px}table{width:100%;border-collapse:collapse}th{background:#f5f5f5;padding:8px;text-align:left;border-bottom:2px solid #ddd;font-size:12px}td{font-size:13px}.band{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:700;font-size:14px}.verde{background:#e8f5e9;color:#2e7d32}.amarela{background:#fff8e1;color:#f57c00}.vermelha{background:#ffebee;color:#c62828}.azul{background:#e3f2fd;color:#1565c0}.elite{background:#f3e5f5;color:#6a1b9a}.footer{margin-top:32px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}@media print{button{display:none}}</style></head><body>'+
    '<h1>📊 Relatório de KPIs — WeCare</h1>'+
    '<p style="color:#666;font-size:13px;">Período: <strong>'+mes+'</strong> · Gerado em: '+new Date().toLocaleString('pt-BR')+'</p>'+
    '<div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;display:flex;gap:24px;align-items:center;">'+
    '<div><div style="font-size:12px;color:#666;text-transform:uppercase;">Atingimento Global</div><div style="font-size:36px;font-weight:700;color:#c0616a;">'+g+'%</div></div>'+
    '<div><div style="font-size:12px;color:#666;margin-bottom:4px;">Bandeira</div><span class="band '+band.cls+'">'+band.name+'</span></div>'+
    '<div><div style="font-size:12px;color:#666;">Nível</div><div style="font-weight:600;">'+nv.n+' — Fixo '+brl(nv.fixo)+'</div></div>'+
    '<div><div style="font-size:12px;color:#666;">Variável</div><div style="font-weight:600;color:#2e7d32;">'+brl(vp)+'</div></div>'+
    '<div><div style="font-size:12px;color:#666;">Total Estimado</div><div style="font-weight:700;font-size:18px;">'+brl(nv.fixo+vp)+'</div></div>'+
    '</div>'+
    '<h2>Detalhamento por KPI</h2>'+
    '<table><thead><tr><th>KPI</th><th>Peso</th><th>Valor</th><th>Atingimento</th></tr></thead><tbody>'+linhasKPI+'</tbody></table>'+
    '<div class="footer">Claire · Painel de Gestão WeCare · '+new Date().getFullYear()+'</div>'+
    '<script>window.onload=function(){window.print();}<\/script></body></html>';
  const win=window.open('','_blank');
  if(!win){showToast('Permita pop-ups no browser para gerar o PDF.','peach');return;}
  win.document.write(html);win.document.close();
}

function zerarKPIs(){
  if(!confirm('Zerar todos os KPIs para o próximo mês? Esta ação não pode ser desfeita.'))return;
  kpiVals={};kpiSubVals={};
  renderKPIs();
  showToast('KPIs zerados para o próximo mês!','sage');
}

// ═══════════════════ ONBOARDING ═══════════════════
const OB_COLS=[
  {id:'contrato',   label:'Contrato Assinado', color:'var(--peach)'},
  {id:'compras',    label:'Compras',           color:'var(--sky)'},
  {id:'definicoes', label:'Definições',        color:'var(--lavender)'},
  {id:'producao',   label:'Produção',          color:'var(--rose)'},
  {id:'auditoria',  label:'Auditoria',         color:'var(--gold)'},
  {id:'ativo',      label:'Ativo ✓',           color:'var(--sage)'},
];

let ITENS_OBRIGATORIOS={
  'Cama':['Jogo de Cama Basic Percalle','Cobertor Aspen II','Edredom Premier Hotel','Capa p/ Edredom Hotel','Fronha Basic Percalle','Protetor de Colchão','Travesseiro Sanomed','Travesseiro Toque de Pluma','Protetor de Travesseiro'],
  'Banheiro':['Toalha de Banho Lory Hotel','Toalha de Rosto Lory Hotel','Piso Luxor Hotel','Lixeira de Banheiro','Dispenser de Sabonete','Secador de Cabelo'],
  'Lavanderia':['Ferro de Passar','Tábua de Passar'],
  'Cozinha':['Xícaras','Copos','Pratos Tradicionais','Pratos de Sobremesa','Taças','Talheres (24 peças)','Abridor de Vinho e Cerveja','Balde para Gelo','Panelas (kit completo)','Colheres para Cozinhar','Escorredor de Pratos','Baixelas','Potes com Tampa','Facas para Cozinha','Liquidificador','Sanduicheira','Cafeteira Nespresso','Microondas','Purificador de Água','Chaleira Elétrica','Air Fryer','Panos de Prato','Lixeira de Pia'],
  'Quarto':['Berço Portátil','Banheira Portátil','Persianas Blackout'],
  'Limpeza':['Pano de Chão','Escada','Balde','Vassoura','Rodo','Pá de Lixo','Pano Multiuso'],
  'Outros':['Detector de Fumaça']
};

let PRECOS_ITENS = {
  'Fronha Basic Percalle': 43,
  'Travesseiro Sanomed': 285,
  'Travesseiro Toque de Pluma': 99,
  'Protetor de Travesseiro': 52,
  'Toalha de Banho Lory Hotel': 64,
  'Toalha de Rosto Lory Hotel': 30,
  'Piso Luxor Hotel': 42,
  'Lixeira de Banheiro': 38.99,
  'Dispenser de Sabonete': 23.90,
  'Secador de Cabelo': 102.00,
  'Ferro de Passar': 58.99,
  'Tábua de Passar': 53.89,
  'Xícaras': 62.40,
  'Copos': 27.90,
  'Pratos Tradicionais': 54.89,
  'Pratos de Sobremesa': 44.07,
  'Taças': 64.89,
  'Talheres (24 peças)': 72.99,
  'Abridor de Vinho e Cerveja': 34.76,
  'Balde para Gelo': 47.90,
  'Panelas (kit completo)': 425.90,
  'Colheres para Cozinhar': 37.54,
  'Escorredor de Pratos': 67.18,
  'Baixelas': 130.00,
  'Potes com Tampa': 78.90,
  'Facas para Cozinha': 89.90,
  'Liquidificador': 96.90,
  'Sanduicheira': 109.90,
  'Cafeteira Nespresso': 539.00,
  'Microondas': 509.55,
  'Purificador de Água': 132.05,
  'Chaleira Elétrica': 122.00,
  'Air Fryer': 537.52,
  'Panos de Prato': 30.89,
  'Lixeira de Pia': 23.90,
  'Berço Portátil': 398.90,
  'Banheira Portátil': 182.92,
  'Persianas Blackout': 0,
  'Pano de Chão': 35.90,
  'Escada': 119.65,
  'Balde': 37.29,
  'Vassoura': 78.89,
  'Rodo': 0,
  'Pá de Lixo': 0,
  'Pano Multiuso': 59.00,
  'Detector de Fumaça': 59.90,
};

// ═══════════════════ PERSISTÊNCIA ═══════════════════
const _PERSIST_KEYS = {
  nx_tasks:()=>tasks, nx_imoveis:()=>imoveis, nx_notes:()=>notes,
  nx_compras:()=>comprasList, nx_projetos:()=>projetos, nx_atts:()=>ATTS,
  nx_workP1:()=>workDaysP1, nx_workP2:()=>workDaysP2,
  nx_headfixo:()=>headFixo, nx_headcom:()=>headComissao, nx_headfotos:()=>headFotos,
  nx_kpivals:()=>kpiVals, nx_kpisub:()=>kpiSubVals,
  nx_taskcats:()=>taskCats, nx_catalog:()=>imovelsCatalog,
  nx_precos:()=>PRECOS_ITENS, nx_niveldx:()=>selNivelIdx,
  nx_nicolecom:()=>nicoleComissaoOverride, nx_nextatt:()=>nextAttId,
  nx_transcricoes:()=>transcricoes, nx_precoenx:()=>PRECOS_ENXOVAL,
  nx_avaliacoes:()=>avaliacoes, nx_turnos:()=>turnos,
  nx_salpagos:()=>salPagos,
  nx_outros:()=>outrosMembros
};

function saveAll(){
  try{
    for(const k in _PERSIST_KEYS){
      localStorage.setItem(k, JSON.stringify(_PERSIST_KEYS[k]()));
    }
  }catch(e){ console.warn('saveAll falhou', e); }
  _kvPushDebounced();
}

// ─── Sincronização com o backend KV (compartilhado entre dispositivos) ───
// Chaves que sincronizam (dados de equipe/operação). Credenciais e a lista
// pesada de avaliações ficam SEMPRE locais.
const SYNC_KEYS=['nx_users','nx_tasks','nx_imoveis','nx_notes','nx_compras','nx_projetos','nx_atts','nx_workP1','nx_workP2','nx_headfixo','nx_headcom','nx_headfotos','nx_kpivals','nx_kpisub','nx_taskcats','nx_catalog','nx_precos','nx_precoenx','nx_niveldx','nx_nicolecom','nx_nextatt','nx_transcricoes','nx_turnos','nx_salpagos','nx_outros','nx_name'];
let _kvTimer=null;
function _kvPushDebounced(){
  const s=window.CLAIRE_SYNC||{};
  if(!s.url) return;
  if(_kvTimer) clearTimeout(_kvTimer);
  _kvTimer=setTimeout(_kvPushNow, 2500);
}
async function _kvPushNow(){
  const s=window.CLAIRE_SYNC||{};
  if(!s.url) return;
  try{
    const blob={};
    SYNC_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(v!==null){ try{ blob[k]=JSON.parse(v); }catch(e){} } });
    await fetch(s.url.replace(/\/$/,'')+'/save?token='+encodeURIComponent(s.token||''),{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(blob)
    });
  }catch(e){ /* offline: tenta na próxima */ }
}
// Recarrega o estado compartilhado do KV e aplica (usado para ver mudanças de outros usuários)
async function kvPull(){
  const s=window.CLAIRE_SYNC||{};
  if(!s.url) return false;
  try{
    const r=await fetch(s.url.replace(/\/$/,'')+'/load?token='+encodeURIComponent(s.token||''));
    const j=await r.json();
    if(j&&j.data){
      for(const k in j.data){ try{ localStorage.setItem(k, JSON.stringify(j.data[k])); }catch(e){} }
      loadAll();
      return true;
    }
  }catch(e){}
  return false;
}

function loadAll(){
  try{
    const g=(k)=>{ const v=localStorage.getItem(k); return v===null?undefined:JSON.parse(v); };
    let v;
    v=g('nx_tasks');      if(Array.isArray(v)) tasks=v;
    v=g('nx_imoveis');    if(Array.isArray(v)) imoveis=v;
    v=g('nx_notes');      if(Array.isArray(v)) notes=v;
    v=g('nx_compras');    if(Array.isArray(v)) comprasList=v;
    v=g('nx_projetos');   if(Array.isArray(v)) projetos=v;
    v=g('nx_atts');       if(Array.isArray(v)&&v.length) ATTS=v;
    v=g('nx_workP1');     if(v&&typeof v==='object') workDaysP1=v;
    v=g('nx_workP2');     if(v&&typeof v==='object') workDaysP2=v;
    v=g('nx_headfixo');   if(v&&typeof v==='object') headFixo=v;
    v=g('nx_headcom');    if(v&&typeof v==='object') headComissao=v;
    v=g('nx_headfotos');  if(v&&typeof v==='object') headFotos=v;
    v=g('nx_kpivals');    if(v&&typeof v==='object') kpiVals=v;
    v=g('nx_kpisub');     if(v&&typeof v==='object') kpiSubVals=v;
    v=g('nx_taskcats');   if(Array.isArray(v)&&v.length) taskCats=v;
    v=g('nx_catalog');    if(Array.isArray(v)&&v.length) imovelsCatalog=v;
    v=g('nx_precos');     if(v&&typeof v==='object') PRECOS_ITENS=v;
    v=g('nx_precoenx');   if(v&&typeof v==='object') PRECOS_ENXOVAL=v;
    v=g('nx_niveldx');    if(typeof v==='number') selNivelIdx=v;
    v=g('nx_nicolecom');  if(v!==undefined) nicoleComissaoOverride=v;
    v=g('nx_nextatt');    if(typeof v==='number') nextAttId=v;
    v=g('nx_transcricoes'); if(Array.isArray(v)) transcricoes=v;
    v=g('nx_avaliacoes'); if(Array.isArray(v)) avaliacoes=v;
    v=g('nx_turnos');     if(Array.isArray(v)) turnos=v;
    v=g('nx_salpagos');   if(v&&typeof v==='object') salPagos=v;
    v=g('nx_outros');     if(Array.isArray(v)) outrosMembros=v;
  }catch(e){ console.warn('loadAll falhou', e); }
}

// ═══════════════════ TURNOS (ESCALA 12×36) ═══════════════════
function parcelaDoDia(dataStr){ const d=parseInt((dataStr||'').substring(8,10))||1; return d<=15?'P1':'P2'; }
function recalcularDiasDosTurnos(){
  const mes = turnosMesSel || new Date().toISOString().substring(0,7);
  ATTS.forEach(a=>{
    const p1=turnos.filter(t=>t.attId===a.id && t.confirmado && t.data.startsWith(mes) && parcelaDoDia(t.data)==='P1').length;
    const p2=turnos.filter(t=>t.attId===a.id && t.confirmado && t.data.startsWith(mes) && parcelaDoDia(t.data)==='P2').length;
    if(p1>0) workDaysP1[a.id]=p1;
    if(p2>0) workDaysP2[a.id]=p2;
  });
  if(typeof renderSalary==='function') renderSalary();
}
function abrirAddTurno(){
  document.getElementById('t-turno-data').value=new Date().toISOString().split('T')[0];
  document.getElementById('t-turno-tipo').value='dia';
  document.getElementById('t-turno-att').innerHTML=ATTS.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');
  document.getElementById('modal-turno').classList.add('open');
}
function salvarTurno(){
  const data=document.getElementById('t-turno-data').value;
  if(!data){ showToast('Escolha a data.','peach'); return; }
  const turno=document.getElementById('t-turno-tipo').value;
  const attId=document.getElementById('t-turno-att').value;
  turnos.push({id:Date.now(),data,turno,attId,confirmado:false});
  closeModal('modal-turno');
  renderTurnos();
  showToast('Turno lançado!','sage');
}
function removerTurno(id){
  turnos=turnos.filter(t=>t.id!==id);
  recalcularDiasDosTurnos();
  renderTurnos();
}
function abrirGerarEscala(){
  const mes=turnosMesSel||new Date().toISOString().substring(0,7);
  document.getElementById('ge-de').value=mes+'-01';
  const partes=mes.split('-').map(Number); const y=partes[0], m=partes[1];
  const ult=new Date(y,m,0).getDate();
  document.getElementById('ge-ate').value=mes+'-'+String(ult).padStart(2,'0');
  document.getElementById('ge-turno').value='dia';
  document.getElementById('ge-modo').value='todos';
  const opts=ATTS.map(a=>'<option value="'+a.id+'">'+esc(a.name)+'</option>').join('');
  document.getElementById('ge-attA').innerHTML=opts;
  document.getElementById('ge-attB').innerHTML=opts;
  geAtualizarModo('todos');
  document.getElementById('modal-gerar-escala').classList.add('open');
}
function geAtualizarModo(modo){
  document.getElementById('ge-attB-group').style.display = modo==='alterna2' ? '' : 'none';
}
function gerarEscala(){
  const de=document.getElementById('ge-de').value, ate=document.getElementById('ge-ate').value;
  if(!de||!ate||de>ate){ showToast('Defina um período válido.','peach'); return; }
  const turno=document.getElementById('ge-turno').value;
  const modo=document.getElementById('ge-modo').value;
  const attA=document.getElementById('ge-attA').value;
  const attB=document.getElementById('ge-attB').value;
  let d=new Date(de+'T12:00:00'); const fim=new Date(ate+'T12:00:00');
  let i=0, criados=0;
  while(d<=fim){
    const ds=d.toISOString().split('T')[0];
    let att=null;
    if(modo==='todos') att=attA;
    else if(modo==='alterna1'){ if(i%2===0) att=attA; }
    else if(modo==='alterna2'){ att = (i%2===0)?attA:attB; }
    if(att){
      const existe=turnos.some(t=>t.data===ds&&t.turno===turno&&t.attId===att);
      if(!existe){ turnos.push({id:Date.now()+i, data:ds, turno:turno, attId:att, confirmado:false}); criados++; }
    }
    d.setDate(d.getDate()+1); i++;
  }
  closeModal('modal-gerar-escala');
  renderTurnos();
  showToast(criados+' turnos gerados!','sage');
}
function solicitarConfirmacaoTurnos(){
  const mes=turnosMesSel||new Date().toISOString().substring(0,7);
  const n=turnos.filter(t=>t.data.startsWith(mes)).length;
  if(n===0){ showToast('Não há turnos lançados neste mês.','peach'); return; }
  turnos.forEach(t=>{ if(t.data.startsWith(mes)) t.solicitado=true; });
  renderTurnos();
  showToast('Confirmação solicitada! As atendentes verão o pedido ao acessar a Claire.','sage');
}
function zerarTurnosMes(){
  const mes=turnosMesSel||new Date().toISOString().substring(0,7);
  if(!confirm('Apagar todos os turnos de '+mes+'? Esta ação não pode ser desfeita.')) return;
  turnos=turnos.filter(t=>!t.data.startsWith(mes));
  if(typeof recalcularDiasDosTurnos==='function') recalcularDiasDosTurnos();
  renderTurnos();
  showToast('Turnos de '+mes+' zerados.','peach');
}
function exportarTurnosPDF(){
  const mes=turnosMesSel||new Date().toISOString().substring(0,7);
  const doMes=turnos.filter(t=>t.data.startsWith(mes)).sort((a,b)=>a.data.localeCompare(b.data)||a.turno.localeCompare(b.turno));
  if(doMes.length===0){ showToast('Não há turnos neste mês.','peach'); return; }
  const nome=id=>{const a=ATTS.find(x=>x.id===id);return a?a.name:id;};
  let linhas=doMes.map(t=>'<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;">'+t.data.split('-').reverse().join('/')+'</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">'+(t.turno==='dia'?'Dia (07-19h)':'Noite (19-07h)')+'</td><td style="padding:6px 10px;border-bottom:1px solid #eee;">'+nome(t.attId)+'</td><td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">'+(t.confirmado?'✓ Confirmado':'—')+'</td></tr>').join('');
  const resumo=ATTS.map(a=>{const c=doMes.filter(t=>t.attId===a.id).length;return c>0?'<li>'+a.name+': '+c+' turnos</li>':'';}).join('');
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Escala '+mes+'</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#222}h1{color:#c0616a;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th{background:#c0616a;color:#fff;padding:8px 10px;text-align:left;font-size:12px}@media print{button{display:none}}</style></head><body>'+
    '<h1>📅 Escala de Turnos — '+mes+'</h1>'+
    '<ul style="font-size:13px;color:#555;">'+resumo+'</ul>'+
    '<table><thead><tr><th>Data</th><th>Turno</th><th>Atendente</th><th style="text-align:center;">Status</th></tr></thead><tbody>'+linhas+'</tbody></table>'+
    '<p style="margin-top:24px;font-size:11px;color:#aaa;">Claire · WeCare · gerado em '+new Date().toLocaleString('pt-BR')+'</p>'+
    '<script>window.onload=function(){window.print();}<\/script></body></html>';
  const win=window.open('','_blank'); if(!win){ showToast('Permita pop-ups para gerar o PDF.','peach'); return; }
  win.document.write(html); win.document.close();
}
function confirmarQuinzena(attId, parcela){
  const mes = turnosMesSel || new Date().toISOString().substring(0,7);
  turnos.forEach(t=>{ if(t.attId===attId && t.data.startsWith(mes) && parcelaDoDia(t.data)===parcela){ t.confirmado=true; } });
  recalcularDiasDosTurnos();
  renderTurnos();
  showToast('Turnos confirmados! Já refletido nos salários.','sage');
}
function renderTurnos(){
  const el=document.getElementById('turnos-body'); if(!el) return;
  const mesInput=document.getElementById('turnos-mes');
  if(mesInput && !mesInput.value){ mesInput.value=new Date().toISOString().substring(0,7); turnosMesSel=mesInput.value; }
  const mes=turnosMesSel||new Date().toISOString().substring(0,7);
  const cu=(typeof getCurrentUser==='function')?getCurrentUser():null;
  const ehAdmin=(typeof isAdmin==='function') && isAdmin();
  const naoAdmin=!ehAdmin;
  const attsVisiveis = ehAdmin ? ATTS : (typeof attsDoUsuario==='function'?attsDoUsuario():[]);
  const addBtn=document.getElementById('turnos-add-btn'); if(addBtn) addBtn.style.display=naoAdmin?'none':'';
  ['turnos-gerar-btn','turnos-solicitar-btn','turnos-pdf-btn','turnos-zerar-btn'].forEach(bid=>{ const b=document.getElementById(bid); if(b) b.style.display=naoAdmin?'none':''; });
  let bannerHtml='';
  if(naoAdmin){
    const pend=attsVisiveis.some(a=>cu && a.id===cu.attId && turnos.some(t=>t.attId===a.id && t.data.startsWith(mes) && t.solicitado && !t.confirmado));
    if(pend) bannerHtml='<div style="background:var(--peach-light);color:var(--peach);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:14px;font-size:13px;font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Você tem turnos aguardando sua confirmação.</div>';
  }
  el.innerHTML=bannerHtml+attsVisiveis.map(a=>{
    const ehProprio = true; // quem enxerga o card (admin ou escopo) pode confirmar os turnos
    const tDia=['P1','P2'].map(parc=>{
      const lista=turnos.filter(t=>t.attId===a.id && t.data.startsWith(mes) && parcelaDoDia(t.data)===parc).sort((x,y)=>x.data.localeCompare(y.data));
      const confirmados=lista.filter(t=>t.confirmado).length;
      const todosConf=lista.length>0 && confirmados===lista.length;
      return '<div style="background:var(--bg3);border-radius:var(--r-sm);padding:12px;flex:1;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);">'+(parc==='P1'?'1ª Quinzena (1-15)':'2ª Quinzena (16-31)')+'</div>'+
        (todosConf?'<span style="font-size:10px;background:var(--sage-light);color:var(--sage);padding:1px 7px;border-radius:8px;font-weight:700;"><i class="fa-solid fa-check"></i> Confirmada</span>':(lista.length?'<span style="font-size:10px;background:var(--peach-light);color:var(--peach);padding:1px 7px;border-radius:8px;">'+confirmados+'/'+lista.length+'</span>':''))+
        '</div>'+
        (lista.length===0?'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;">Sem turnos.</div>':
        lista.map(t=>'<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;border-bottom:1px solid var(--border);"><span style="width:46px;">'+t.data.substring(8,10)+'/'+t.data.substring(5,7)+'</span><span style="flex:1;">'+(t.turno==='dia'?'☀️ Dia':'🌙 Noite')+'</span>'+(t.confirmado?'<i class="fa-solid fa-check" style="color:var(--sage);"></i>':'')+(ehAdmin?'<button onclick="removerTurno('+t.id+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;"><i class="fa-solid fa-xmark"></i></button>':'')+'</div>').join(''))+
        (lista.length>0 && !todosConf && ehProprio ? '<button class="btn btn-sm btn-rose" style="margin-top:8px;width:100%;font-size:11px;" onclick="confirmarQuinzena(\''+a.id+'\',\''+parc+'\')"><i class="fa-solid fa-check"></i> Confirmar '+(ehAdmin?'turnos':'meus turnos')+'</button>':'')+
        '</div>';
    }).join('');
    return '<div class="card" style="margin-bottom:14px;"><div class="card-header"><div class="avatar '+a.av+'" style="width:30px;height:30px;font-size:12px;">'+a.ini+'</div><div class="card-title">'+esc(a.name)+'</div><div style="margin-left:auto;font-size:11px;color:var(--text3);">'+mes+'</div></div><div class="card-body" style="padding:14px;display:flex;gap:12px;flex-wrap:wrap;">'+tDia+'</div></div>';
  }).join('');
  if(attsVisiveis.length===0) el.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:30px;color:var(--text3);">Nenhum membro vinculado ao seu login. Fale com o admin.</div></div>';
}

// ═══════════════════ AVALIAÇÕES (HOSTAWAY) ═══════════════════
// Palavras que indicam elogio à WeCare / equipe / atendimento
const WECARE_KEYWORDS = ['wecare','we care','we-care','atendimento','equipe','suporte','anfitri','host','resposta rápida','super atencioso','muito atencioso','prestativ','solícit','solicit'];

function mencionaWecare(texto){
  if(!texto) return false;
  const t=texto.toLowerCase();
  return WECARE_KEYWORDS.some(k=>t.includes(k));
}

async function sincronizarAvaliacoes(){
  let url=ls('nx_hostaway_url');
  if(!url){ showToast('Configure a URL do Worker do Hostaway nas Configurações.','peach'); return; }
  url=url.trim();
  if(!/^https?:\/\//i.test(url)) url='https://'+url; // adiciona https:// se faltar
  showToast('Sincronizando avaliações...','sage');
  try{
    const resp=await fetch(url.replace(/\/$/,'')+'/reviews');
    const data=await resp.json();
    if(data.error){ showToast('Erro do Worker: '+data.error,'vermelha'); return; }
    // Só avaliações PUBLICADAS PELO HÓSPEDE: tipo guest-to-host COM nota ou texto.
    // O resto são reservas onde o hóspede não avaliou (pendente/expirada) — ignoradas.
    const todas=(data.reviews||[]);
    avaliacoes=todas.filter(r=>r.tipo==='guest-to-host' && (r.rating!=null||(r.texto&&r.texto.trim()))).map(r=>({...r, wecare:mencionaWecare(r.texto)}));
    renderAvaliacoes();
    carregarReservasPeriodo();
    const vazias=todas.length-avaliacoes.length;
    showToast('✅ '+avaliacoes.length+' avaliações de hóspedes carregadas'+(vazias>0?' ('+vazias+' reservas sem avaliação ignoradas)':'')+'.','sage');
  }catch(e){
    showToast('Não foi possível conectar ao Worker. Verifique a URL e se o TI publicou.','vermelha');
  }
}

function logoCanal(canal){
  if(canal==='Airbnb') return '<i class="fa-brands fa-airbnb" style="color:#FF5A5F;"></i>';
  if((canal||'').indexOf('Booking')>=0) return '<i class="fa-solid fa-b" style="color:#003580;background:#fff;border-radius:3px;padding:0 3px;"></i>';
  if(canal==='Expedia') return '<i class="fa-solid fa-plane" style="color:#FFC72C;"></i>';
  if(canal==='Vrbo') return '<i class="fa-solid fa-house" style="color:#1668e3;"></i>';
  return '<i class="fa-solid fa-globe" style="color:var(--text3);"></i>';
}

function _avFiltradas(){
  let r=avaliacoes.slice();
  if(avFiltroCanal) r=r.filter(a=>a.canal===avFiltroCanal);
  if(avFiltroMinEstrelas>0) r=r.filter(a=>(a.rating||0)>=avFiltroMinEstrelas);
  if(avSoWecare) r=r.filter(a=>a.wecare);
  if(avFiltroPublicada==='sim') r=r.filter(a=>a.publicada);
  else if(avFiltroPublicada==='nao') r=r.filter(a=>!a.publicada);
  if(avFiltroOrigem) r=r.filter(a=>a.tipo===avFiltroOrigem);
  if(avBusca){ const b=avBusca.toLowerCase(); r=r.filter(a=>(a.hospede||'').toLowerCase().includes(b)); }
  const refData=(a)=>(a.checkout||a.submittedAt||a.data||'').substring(0,10);
  if(avDe) r=r.filter(a=>refData(a)>=avDe);
  if(avAte) r=r.filter(a=>refData(a)<=avAte);
  if(avOrdenar==='estrelas-desc') r.sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if(avOrdenar==='estrelas-asc') r.sort((a,b)=>(a.rating||0)-(b.rating||0));
  else r.sort((a,b)=>String(b.data||'').localeCompare(String(a.data||'')));
  return r;
}

function renderAvaliacoes(){
  // popular filtro de canais
  const selC=document.getElementById('av-f-canal');
  if(selC){ const canais=[...new Set(avaliacoes.map(a=>a.canal).filter(Boolean))]; const val=avFiltroCanal; selC.innerHTML='<option value="">Todos</option>'+canais.map(c=>'<option value="'+esc(c)+'"'+(c===val?' selected':'')+'>'+esc(c)+'</option>').join(''); }
  // resumo — reflete a lista FILTRADA (acompanha os filtros aplicados)
  const filtradas=_avFiltradas();
  const resumoEl=document.getElementById('avaliacoes-resumo');
  if(resumoEl){
    const comNota=filtradas.filter(a=>a.rating!=null);
    // Hostaway entrega 0-10 → exibe em 0-5
    const media=comNota.length?((comNota.reduce((s,a)=>s+a.rating,0)/comNota.length)/2).toFixed(2):'—';
    const wecareCount=filtradas.filter(a=>a.wecare).length;
    const temFiltro=avFiltroCanal||avFiltroMinEstrelas>0||avSoWecare||avFiltroPublicada||avFiltroOrigem||avBusca||avDe||avAte;
    resumoEl.innerHTML=[
      {l:temFiltro?'Avaliações (filtro)':'Total de Avaliações',v:filtradas.length,c:'sky',i:'fa-star'},
      {l:'Média (filtro)',v:media+(media!=='—'?'★':''),c:'gold',i:'fa-star-half-stroke'},
      {l:'Elogios à WeCare',v:wecareCount,c:'rose',i:'fa-heart'},
      {l:'Reservas no período (KPI)',v:'<span id="av-reservas-num">—</span>',c:'sage',i:'fa-calendar-check'},
    ].map(x=>'<div class="metric-card '+x.c+'"><div class="metric-icon '+x.c+'"><i class="fa-solid '+x.i+'"></i></div><div class="metric-value" style="font-size:24px;">'+x.v+'</div><div class="metric-label">'+x.l+'</div></div>').join('');
  }
  if(avaliacoes.length>0) carregarReservasPeriodo();
  // lista
  const el=document.getElementById('avaliacoes-lista');if(!el)return;
  const lista=_avFiltradas();
  if(avaliacoes.length===0){ el.innerHTML='<div class="card"><div class="card-body" style="text-align:center;padding:40px;color:var(--text3);"><i class="fa-solid fa-star" style="font-size:32px;opacity:0.35;margin-bottom:10px;display:block;"></i><div style="font-size:13px;margin-bottom:10px;">Nenhuma avaliação carregada.</div><button class="btn btn-sm btn-rose" onclick="sincronizarAvaliacoes()"><i class="fa-solid fa-rotate"></i> Sincronizar com Hostaway</button><div style="font-size:11px;color:var(--text3);margin-top:10px;">Requer a URL do Worker configurada (veja Configurações).</div></div></div>'; return; }
  if(avView==='tabela'){
    const origemLabel=t=>t==='guest-to-host'?'Hóspede':t==='host-to-guest'?'Anfitrião':(t||'—');
    const trunc=(s,n)=>{s=s||'';return s.length>n?esc(s.substring(0,n))+'…':esc(s);};
    el.innerHTML='<div class="card"><div style="overflow-x:auto;"><table class="data-table" style="font-size:12px;"><thead><tr>'+
      '<th>Hóspede</th><th>Imóvel</th><th>Canal</th><th>Origem</th><th>Check-in</th><th>Check-out</th><th style="text-align:center;">Estrelas</th><th>Aval. Pública</th><th>Aval. Privada</th>'+
      '</tr></thead><tbody>'+
      lista.map(a=>{
        const estrelas=a.rating!=null?(a.rating/2).toFixed(1)+'★':'—';
        return '<tr onclick="abrirAvaliacaoModal(\''+a.id+'\')" style="cursor:pointer;'+(a.wecare?'background:var(--rose-light);':'')+'">'+
          '<td style="white-space:nowrap;">'+esc(a.hospede||'—')+'</td>'+
          '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(a.imovel||'—')+'</td>'+
          '<td style="white-space:nowrap;">'+logoCanal(a.canal)+' '+esc(a.canal||'—')+'</td>'+
          '<td>'+origemLabel(a.tipo)+'</td>'+
          '<td style="white-space:nowrap;">'+(a.checkin?new Date(a.checkin).toLocaleDateString('pt-BR'):'—')+'</td>'+
          '<td style="white-space:nowrap;">'+(a.checkout?new Date(a.checkout).toLocaleDateString('pt-BR'):'—')+'</td>'+
          '<td style="text-align:center;font-weight:600;color:var(--gold);white-space:nowrap;">'+estrelas+'</td>'+
          '<td style="max-width:200px;">'+trunc(a.texto,80)+'</td>'+
          '<td style="max-width:200px;color:var(--text3);">'+trunc(a.comentarioInterno,80)+'</td>'+
          '</tr>';
      }).join('')+
      '</tbody></table></div></div>';
    return;
  }
  el.innerHTML=lista.map(a=>{
    const estrelas=a.rating!=null?'★'.repeat(Math.round(a.rating))+'☆'.repeat(Math.max(0,5-Math.round(a.rating))):'';
    return '<div class="card" onclick="abrirAvaliacaoModal(\''+a.id+'\')" style="margin-bottom:8px;cursor:pointer;'+(a.wecare?'border-left:3px solid var(--rose);':'')+'"><div class="card-body" style="padding:12px 16px;">'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px;flex-wrap:wrap;">'+
      '<span style="color:var(--gold);font-size:14px;letter-spacing:1px;">'+estrelas+'</span>'+
      (a.rating!=null?'<span style="font-size:12px;font-weight:700;">'+a.rating+'</span>':'')+
      '<span style="font-size:10.5px;background:var(--bg3);padding:1px 7px;border-radius:8px;">'+logoCanal(a.canal)+' '+esc(a.canal||'—')+'</span>'+
      (a.wecare?'<span style="font-size:10px;background:var(--rose-light);color:var(--rose);padding:1px 7px;border-radius:8px;font-weight:700;"><i class="fa-solid fa-heart"></i> Elogio WeCare</span>':'')+
      '<span style="margin-left:auto;font-size:11px;color:var(--text3);">'+(a.data?new Date(a.data).toLocaleDateString('pt-BR'):'')+'</span>'+
      '</div>'+
      '<div style="font-size:13px;color:var(--text);line-height:1.6;'+(a.wecare?'background:var(--rose-light);border-radius:6px;padding:8px 10px;':'')+'">'+_destacarWecare(esc(a.texto||'(sem comentário)'))+'</div>'+
      '<div style="font-size:11px;color:var(--text3);margin-top:5px;">'+esc(a.hospede||'')+(a.imovel?' · '+esc(a.imovel):'')+'</div>'+
      '</div></div>';
  }).join('');
}

function _destacarWecare(textoEscapado){
  let t=textoEscapado;
  WECARE_KEYWORDS.forEach(k=>{
    try{ const re=new RegExp('('+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'); t=t.replace(re,'<mark style="background:var(--gold);color:#3a2e00;padding:0 2px;border-radius:3px;">$1</mark>'); }catch(e){}
  });
  return t;
}

// Abre modal de detalhe de uma avaliação
function abrirAvaliacaoModal(id){
  const a=avaliacoes.find(x=>String(x.id)===String(id));if(!a)return;
  const estrelas=a.rating!=null?'★'.repeat(Math.round(a.rating))+'☆'.repeat(Math.max(0,5-Math.round(a.rating))):'—';
  const origemLabel=a.tipo==='guest-to-host'?'Avaliação do hóspede':a.tipo==='host-to-guest'?'Avaliação do anfitrião':a.tipo;
  document.getElementById('avaliacao-detalhe').innerHTML=
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap;">'+
    '<span style="font-size:20px;">'+logoCanal(a.canal)+'</span>'+
    '<span style="color:var(--gold);font-size:18px;letter-spacing:2px;">'+estrelas+'</span>'+
    (a.rating!=null?'<span style="font-size:16px;font-weight:700;">'+a.rating+'</span>':'')+
    (a.publicada?'<span style="font-size:10px;background:var(--sage-light);color:var(--sage);padding:2px 8px;border-radius:8px;font-weight:600;">Publicada</span>':'<span style="font-size:10px;background:var(--bg3);color:var(--text3);padding:2px 8px;border-radius:8px;">Não publicada</span>')+
    '</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;background:var(--bg3);border-radius:var(--r-sm);padding:12px;margin-bottom:14px;font-size:12.5px;">'+
    '<div><span style="color:var(--text3);font-size:10px;text-transform:uppercase;display:block;">Hóspede</span>'+esc(a.hospede||'—')+'</div>'+
    '<div><span style="color:var(--text3);font-size:10px;text-transform:uppercase;display:block;">Imóvel</span>'+esc(a.imovel||'—')+'</div>'+
    '<div><span style="color:var(--text3);font-size:10px;text-transform:uppercase;display:block;">Canal</span>'+esc(a.canal||'—')+'</div>'+
    '<div><span style="color:var(--text3);font-size:10px;text-transform:uppercase;display:block;">Origem</span>'+esc(origemLabel||'—')+'</div>'+
    '<div><span style="color:var(--text3);font-size:10px;text-transform:uppercase;display:block;">Período da reserva</span>'+(a.checkin?new Date(a.checkin).toLocaleDateString('pt-BR'):'—')+' → '+(a.checkout?new Date(a.checkout).toLocaleDateString('pt-BR'):'—')+'</div>'+
    '<div><span style="color:var(--text3);font-size:10px;text-transform:uppercase;display:block;">Enviada em</span>'+(a.submittedAt?new Date(a.submittedAt).toLocaleDateString('pt-BR'):'—')+'</div>'+
    '</div>'+
    '<div style="margin-bottom:12px;"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:5px;">Comentário externo (público)</div><div style="font-size:13px;line-height:1.6;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;">'+_destacarWecare(esc(a.texto||'(sem comentário)'))+'</div></div>'+
    '<div><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:5px;">Comentário interno (privado)</div><div style="font-size:13px;line-height:1.6;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-sm);padding:10px 12px;">'+esc(a.comentarioInterno||'(sem comentário interno)')+'</div></div>';
  document.getElementById('modal-avaliacao').classList.add('open');
}

// Período do KPI: 26 de (mês-2) a 25 de (mês-1)
function periodoKPIAvaliacoes(ref){
  const base = ref ? new Date(ref) : new Date();
  const ano=base.getFullYear(), mes=base.getMonth(); // 0-11
  const ini=new Date(ano, mes-2, 26);
  const fim=new Date(ano, mes-1, 25);
  const fmt=d=>d.toISOString().split('T')[0];
  return {de:fmt(ini), ate:fmt(fim)};
}

// Busca contagem de reservas do Worker para o período do KPI
async function carregarReservasPeriodo(){
  const url=ls('nx_hostaway_url'); if(!url) return;
  let u=url.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u;
  const per=periodoKPIAvaliacoes();
  try{
    const resp=await fetch(u.replace(/\/$/,'')+'/reservations?from='+per.de+'&to='+per.ate);
    const data=await resp.json();
    const el=document.getElementById('av-reservas-num');
    if(el) el.textContent = data.total!=null ? data.total : '—';
  }catch(e){}
}

// Calcula média por canal (período KPI, escalas corretas) e joga nos KPIs de avaliações (av) e conversão (cv)
async function aplicarAvaliacoesNoKPI(){
  if(avaliacoes.length===0){ showToast('Sincronize as avaliações primeiro.','peach'); return; }
  const per=periodoKPIAvaliacoes();
  const refData=a=>(a.checkout||a.submittedAt||a.data||'').substring(0,10);
  const noPeriodo=avaliacoes.filter(a=>a.tipo==='guest-to-host'&&a.rating!=null&&refData(a)>=per.de&&refData(a)<=per.ate);
  // IMPORTANTE: o Hostaway entrega TODAS as notas na escala 0-10 (Airbnb e Booking).
  const medCanal=nomes=>{const arr=noPeriodo.filter(a=>nomes.includes(a.canal));return arr.length?arr.reduce((s,a)=>s+a.rating,0)/arr.length:null;};
  const mAir10=medCanal(['Airbnb']);          // média Airbnb em 0-10
  const mBook10=medCanal(['Booking.com','Booking']); // média Booking em 0-10
  if(!kpiSubVals.av) kpiSubVals.av={};
  // Exibição: Airbnb na escala real 0-5 (Hostaway/2); Booking na escala 0-10
  if(mAir10!=null) kpiSubVals.av.airbnb=(mAir10/2).toFixed(2);
  if(mBook10!=null) kpiSubVals.av.booking=mBook10.toFixed(2);
  // KPI combinado em 0-5: cada canal normalizado para 0-5 (dividir o valor 0-10 por 2)
  const partes=[];
  if(mAir10!=null) partes.push(mAir10/2);
  if(mBook10!=null) partes.push(mBook10/2);
  kpiVals.av = partes.length ? (partes.reduce((a,b)=>a+b,0)/partes.length).toFixed(2) : null;

  // ── KPI de Conversão (cv) = avaliações ÷ reservas (check-outs) no período ──
  // Conta TODAS as avaliações de hóspede no período (com ou sem nota — qualquer review conta como "avaliou")
  const avNoPeriodo=avaliacoes.filter(a=>a.tipo==='guest-to-host'&&refData(a)>=per.de&&refData(a)<=per.ate).length;
  let reservas=null;
  const url=ls('nx_hostaway_url');
  if(url){
    let u=url.trim(); if(!/^https?:\/\//i.test(u)) u='https://'+u;
    try{
      const resp=await fetch(u.replace(/\/$/,'')+'/reservations?from='+per.de+'&to='+per.ate);
      const data=await resp.json();
      reservas = data.total!=null ? data.total : null;
    }catch(e){}
  }
  if(reservas!=null && reservas>0){
    if(!kpiSubVals.cv) kpiSubVals.cv={};
    kpiSubVals.cv.reviews=avNoPeriodo;
    kpiSubVals.cv.checkouts=reservas;
    kpiVals.cv=((avNoPeriodo/reservas)*100).toFixed(1);
  }

  if(typeof renderKPIs==='function') renderKPIs();
  showToast('KPIs atualizados: Aval. Airbnb '+(mAir10!=null?(mAir10/2).toFixed(2)+'★':'—')+' · Booking '+(mBook10!=null?mBook10.toFixed(2)+'/10':'—')+(reservas!=null?' · Conversão '+avNoPeriodo+'/'+reservas:'')+' ('+per.de+' a '+per.ate+').','sage');
}

let PRECOS_ENXOVAL = {
  'Jogo de Cama Basic Percalle': {solteiro:259, casal:309, queen:319, king:379},
  'Cobertor Aspen II':           {solteiro:98,  casal:144, queen:158, king:192},
  'Edredom Premier Hotel':       {solteiro:429, casal:499, queen:779, king:899},
  'Capa p/ Edredom Hotel':       {solteiro:259, casal:305, queen:345, king:409},
  'Protetor de Colchão':         {solteiro:188, casal:238, queen:148, king:178},
};
function tierEnxoval(tipoCama){
  if(['Solteiro','Bicama','Sofá-cama Solteiro','Beliche'].includes(tipoCama)) return 'solteiro';
  if(['Casal','Viúva','Sofá-cama Casal'].includes(tipoCama)) return 'casal';
  if(tipoCama==='Queen') return 'queen';
  if(tipoCama==='King') return 'king';
  return 'solteiro';
}
const TIER_LABELS = {solteiro:'Solteiro', casal:'Casal/Viúva', queen:'Queen', king:'King'};
function colchoesDaCama(c){
  const q=parseInt(c.qtd)||1;
  if(c.tipo==='Beliche'||c.tipo==='Bicama') return q*2;
  return q;
}
const ITENS_ENXOVAL_VARIAVEL = ['Jogo de Cama Basic Percalle','Cobertor Aspen II','Edredom Premier Hotel','Capa p/ Edredom Hotel','Protetor de Colchão'];
const QTD_POR_COLCHAO = {'Jogo de Cama Basic Percalle':3,'Cobertor Aspen II':2,'Edredom Premier Hotel':1,'Capa p/ Edredom Hotel':2,'Protetor de Colchão':1};

let obAbaAtiva='dados';

const OB_STATUS_COLORS={
  contrato:'var(--peach)',compras:'var(--sky)',definicoes:'var(--lavender)',
  producao:'var(--rose)',auditoria:'var(--gold)',ativo:'var(--sage)'
};

function abrirNovoImovel(){
  const im={
    id:Date.now(),nome:'',endereco:'',status:'contrato',dataCriacao:new Date().toISOString(),
    proprietarioNome:'',proprietarioTel:'',comissaoWecare:20,comissaoBase:'liquida',linkRelatorio:'',plataformas:[],
    quartos:'',banheiros:'',camas:[],
    seguroEasyCover:false,kitAmenities:false,internetClaro:false,ecohost:false,fechaduraEletronica:false,
    ops:{fotos:{data:'',responsavel:'',hora:''},limpeza:{data:'',responsavel:'',hora:''},vistoria:{data:'',responsavel:'',hora:''}},
    custos:[],margemWecare:15,compras:{},comentarios:{},
    defLimpeza:{responsavel:''},
    defEnxoval:{tipo:'',fornecedor:'',valorAluguelMensal:'',valorSetupAluguel:''},
    linkFotos:'',responsavelCriacao:'',valorMinNoite:'',valorBaseNoite:'',
    taxaHospedeExtra:'',taxaHospedeExtraAcimaDe:'',taxaLimpeza:'',observacoes:'',valorSetup:0,
    prazoAtivacaoHoras:24,dataEnvioParaCriacao:null,
    descontoTipo:'reais', // 'reais' | 'percent'
    descontoValor:0,
    formasPagamento:'' // texto livre
  };
  imoveis.push(im);
  abrirImovelModal(im.id);
  renderOnboardingKanban();
}

function abrirImovelModal(id){
  imovelAtivo=id;
  obAbaAtiva='dados';
  const im=imoveis.find(x=>x.id===id);
  if(!im)return;
  document.getElementById('ob-imovel-nome').value=im.nome||'';
  const sc=OB_STATUS_COLORS[im.status]||'var(--text3)';
  document.getElementById('ob-status-badge').textContent=OB_COLS.find(c=>c.id===im.status)?OB_COLS.find(c=>c.id===im.status).label:im.status;
  document.getElementById('ob-status-badge').style.cssText='padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;background:'+sc+'22;color:'+sc+';border:1px solid '+sc+';';
  document.getElementById('ob-btn-baixa').style.display=im.status==='auditoria'?'':'none';
  document.getElementById('ob-btn-avancar').style.display=im.status==='ativo'?'none':'';
  document.querySelectorAll('#ob-tabs .tab-btn').forEach((b,i)=>{b.classList.toggle('active',i===0);});
  obRenderAba(im);
  document.getElementById('modal-imovel').classList.add('open');
}

function obMudarAba(aba,btn){
  obAbaAtiva=aba;
  document.querySelectorAll('#ob-tabs .tab-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const im=imoveis.find(x=>x.id===imovelAtivo);
  if(im)obRenderAba(im);
}

function obRenderComentarios(im, fase){
  const comentarios=(im.comentarios&&im.comentarios[fase])||[];
  return '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px;">'+
    '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:8px;">&#x1F4AC; Comentários desta fase</div>'+
    (comentarios.length>0?
      '<div style="max-height:150px;overflow-y:auto;margin-bottom:8px;">'+
      comentarios.map((c,i)=>
        '<div style="padding:7px 10px;background:var(--bg3);border-radius:var(--r-sm);margin-bottom:5px;position:relative;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">'+
        '<span style="font-size:10px;color:var(--text3);">'+new Date(c.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span>'+
        '<button onclick="obRemoverComentario('+im.id+',\''+fase+'\','+i+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:10px;" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-xmark"></i></button>'+
        '</div>'+
        '<div style="font-size:12.5px;color:var(--text);white-space:pre-wrap;">'+esc(c.texto)+'</div>'+
        '</div>'
      ).join('')+
      '</div>':'<div style="font-size:12px;color:var(--text3);margin-bottom:8px;">Nenhum comentário ainda.</div>'
    )+
    '<div style="display:flex;gap:8px;">'+
    '<textarea id="ob-comment-input-'+fase+'" class="form-input" rows="2" style="flex:1;font-size:12px;resize:none;" placeholder="Adicionar comentário sobre esta fase..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();obAdicionarComentario('+im.id+',\''+fase+'\');}"></textarea>'+
    '<button class="btn btn-sm" onclick="obAdicionarComentario('+im.id+',\''+fase+'\')" style="align-self:flex-end;"><i class="fa-solid fa-paper-plane"></i></button>'+
    '</div></div>';
}

function obAdicionarComentario(id, fase){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  const inputId='ob-comment-input-'+fase;
  const el=document.getElementById(inputId);if(!el)return;
  const texto=el.value.trim();if(!texto)return;
  if(!im.comentarios)im.comentarios={};
  if(!im.comentarios[fase])im.comentarios[fase]=[];
  im.comentarios[fase].push({texto,data:new Date().toISOString()});
  el.value='';
  obRenderAba(im);
  showToast('Comentário adicionado!','sage');
}

function obRemoverComentario(id, fase, idx){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(im.comentarios&&im.comentarios[fase])im.comentarios[fase].splice(idx,1);
  obRenderAba(im);
}

function obRenderAba(im){
  const el=document.getElementById('ob-aba-content');
  if(obAbaAtiva==='dados')el.innerHTML=obAbaDados(im);
  else if(obAbaAtiva==='definicoes')el.innerHTML=obAbaDefinicoes(im);
  else if(obAbaAtiva==='operacional')el.innerHTML=obAbaOperacional(im);
  else if(obAbaAtiva==='custos')el.innerHTML=obAbaCustos(im);
  else if(obAbaAtiva==='compras')el.innerHTML=obAbaCompras(im);
  else if(obAbaAtiva==='final')el.innerHTML=obAbaFinal(im);
}

function obAbaDados(im){
  const plats=['airbnb','booking','expedia','siteproprio'];
  const platLabels={airbnb:'Airbnb',booking:'Booking',expedia:'Expedia',siteproprio:'Site Próprio'};
  return '<div style="display:grid;gap:12px;">'+
    '<div class="form-group"><label class="form-label">Endereço</label><input type="text" class="form-input" value="'+esc(im.endereco)+'" placeholder="Endereço completo..." oninput="salvarCampoImovel('+im.id+',\'endereco\',this.value)"></div>'+
    '<div class="form-row"><div class="form-group"><label class="form-label">Nome do Proprietário</label><input type="text" class="form-input" value="'+esc(im.proprietarioNome)+'" placeholder="Nome..." oninput="salvarCampoImovel('+im.id+',\'proprietarioNome\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Telefone</label><input type="text" class="form-input" value="'+esc(im.proprietarioTel)+'" placeholder="(00) 00000-0000" oninput="salvarCampoImovel('+im.id+',\'proprietarioTel\',this.value)"></div></div>'+
    '<div class="form-group"><label class="form-label">Comissão WeCare</label><div style="display:flex;align-items:center;gap:8px;"><input type="number" class="form-input" style="width:90px;" value="'+(im.comissaoWecare||20)+'" oninput="salvarCampoImovel('+im.id+',\'comissaoWecare\',this.value)"><span style="font-size:13px;color:var(--text3);">%</span><select class="form-select" style="width:auto;" onchange="salvarCampoImovel('+im.id+',\'comissaoBase\',this.value)"><option value="liquida"'+((im.comissaoBase||'liquida')==='liquida'?' selected':'')+'>da Receita Líquida</option><option value="bruta"'+(im.comissaoBase==='bruta'?' selected':'')+'>da Receita Bruta</option></select></div></div>'+
    '<div class="form-group"><label class="form-label">Plataformas</label><div style="display:flex;gap:10px;flex-wrap:wrap;">'+
    plats.map(p=>'<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;"><input type="checkbox" '+(im.plataformas&&im.plataformas.includes(p)?'checked':'')+' onchange="obTogglePlat('+im.id+',\''+p+'\',this.checked)"> '+platLabels[p]+'</label>').join('')+
    '</div></div>'+
    '<div class="form-row"><div class="form-group"><label class="form-label">Quartos</label><input type="number" class="form-input" value="'+(im.quartos||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'quartos\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Banheiros</label><input type="number" class="form-input" value="'+(im.banheiros||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'banheiros\',this.value)"></div></div>'+
    '<div class="form-group"><label class="form-label">Camas</label>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;" id="ob-camas-list">'+
    (im.camas||[]).map((c,i)=>'<span style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:3px 10px;font-size:12px;display:flex;align-items:center;gap:6px;">'+c.qtd+'x '+c.tipo+' <button onclick="obRemoverCama('+im.id+','+i+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;">&#10005;</button></span>').join('')+
    '</div>'+
    '<div style="display:flex;gap:6px;align-items:center;">'+
    '<select id="ob-cama-tipo" class="form-select" style="width:150px;"><option value="Solteiro">Solteiro</option><option value="Casal">Casal</option><option value="Queen">Queen</option><option value="King">King</option><option value="Sofá-cama Solteiro">Sofá-cama Solteiro</option><option value="Sofá-cama Casal">Sofá-cama Casal</option><option value="Beliche">Beliche</option><option value="Bicama">Bicama</option><option value="Viúva">Viúva</option></select>'+
    '<input type="number" id="ob-cama-qtd" class="form-input" style="width:60px;" value="1" min="1">'+
    '<button class="btn btn-sm" onclick="obAdicionarCama('+im.id+')"><i class="fa-solid fa-plus"></i> Adicionar cama</button></div></div>'+
    obRenderComentarios(im,'dados')+
    '</div>';
}

function obAbaDefinicoes(im){
  const defs=[
    {key:'seguroEasyCover',label:'Seguro EasyCover',sub:'R$ 117,85/mês',icon:'fa-shield-halved'},
    {key:'kitAmenities',label:'Kit Amenities',sub:'Produtos de boas-vindas',icon:'fa-gift'},
    {key:'internetClaro',label:'Internet Claro',sub:'Fibra óptica',icon:'fa-wifi'},
    {key:'ecohost',label:'Ecohost',sub:'Gestão sustentável',icon:'fa-leaf'},
    {key:'fechaduraEletronica',label:'Fechadura Eletrônica',sub:'Acesso sem chave',icon:'fa-lock'},
  ];
  const tipoEnxoval = (im.defEnxoval && im.defEnxoval.tipo) || '';
  let html = '<div style="display:grid;gap:10px;">' +
    defs.map(d=>'<div onclick="obToggleDef('+im.id+',\''+d.key+'\')" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border:1.5px solid '+(im[d.key]?'var(--sage)':'var(--border)')+';border-radius:var(--r);background:'+(im[d.key]?'var(--sage-light)':'var(--bg3)')+';cursor:pointer;transition:all 0.15s;">'+
    '<div class="metric-icon sage" style="width:32px;height:32px;font-size:14px;margin-bottom:0;flex-shrink:0;opacity:'+(im[d.key]?'1':'0.4')+'"><i class="fa-solid '+d.icon+'"></i></div>'+
    '<div style="flex:1;"><div style="font-size:13.5px;font-weight:600;color:'+(im[d.key]?'var(--sage)':'var(--text)')+'">'+d.label+'</div><div style="font-size:12px;color:var(--text3);">'+d.sub+'</div></div>'+
    '<div style="width:20px;height:20px;border-radius:50%;border:1.5px solid '+(im[d.key]?'var(--sage)':'var(--border2)')+';background:'+(im[d.key]?'var(--sage)':'transparent')+';display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;flex-shrink:0;">'+(im[d.key]?'<i class="fa-solid fa-check"></i>':'')+
    '</div></div>').join('') +
    // --- SEÇÃO: LIMPEZA ---
    '<div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px;">' +
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:8px;">Limpeza</div>' +
    '<div class="form-group"><label class="form-label">Responsável pela Limpeza</label>' +
    '<input type="text" class="form-input" value="'+esc((im.defLimpeza && im.defLimpeza.responsavel) || '')+'" placeholder="Nome ou empresa..." oninput="salvarCampoImovelNested('+im.id+',\'defLimpeza\',\'responsavel\',this.value)">' +
    '</div></div>' +
    // --- SEÇÃO: ENXOVAL ---
    '<div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px;">' +
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:8px;">Enxoval</div>' +
    '<div class="form-group"><label class="form-label">Tipo de Enxoval</label>' +
    '<div style="display:flex;gap:8px;">' +
    '<button class="btn btn-sm' + (tipoEnxoval === '' ? ' btn-rose' : '') + '" onclick="salvarCampoImovelNested('+im.id+',\'defEnxoval\',\'tipo\',\'\')">Sem Enxoval</button>' +
    '<button class="btn btn-sm' + (tipoEnxoval === 'comprado' ? ' btn-rose' : '') + '" onclick="salvarCampoImovelNested('+im.id+',\'defEnxoval\',\'tipo\',\'comprado\')">Comprado</button>' +
    '<button class="btn btn-sm' + (tipoEnxoval === 'alugado' ? ' btn-rose' : '') + '" onclick="salvarCampoImovelNested('+im.id+',\'defEnxoval\',\'tipo\',\'alugado\')">Alugado</button>' +
    '</div></div>';
  if (tipoEnxoval === 'comprado' || tipoEnxoval === 'alugado') {
    html += '<div class="form-group"><label class="form-label">Fornecedor</label>' +
      '<input type="text" class="form-input" value="'+esc((im.defEnxoval && im.defEnxoval.fornecedor) || '')+'" placeholder="Ex: Buddemeyer, Flashee..." oninput="salvarCampoImovelNested('+im.id+',\'defEnxoval\',\'fornecedor\',this.value)">' +
      '</div>';
  }
  if (tipoEnxoval === 'alugado') {
    html += '<div class="form-group"><label class="form-label">Valor Mensal do Aluguel (R$)</label>' +
      '<input type="number" class="form-input" value="'+((im.defEnxoval && im.defEnxoval.valorAluguelMensal) || '')+'" placeholder="0,00" oninput="salvarCampoImovelNested('+im.id+',\'defEnxoval\',\'valorAluguelMensal\',this.value)">' +
      '</div>' +
      '<div class="form-group"><label class="form-label">Valor de Setup da Terceirizada (R$)</label>' +
      '<input type="number" class="form-input" value="'+((im.defEnxoval && im.defEnxoval.valorSetupAluguel) || '')+'" placeholder="0,00" oninput="obSalvarSetupAluguel('+im.id+',this.value)">' +
      '<div style="font-size:11px;color:var(--text3);margin-top:4px;">(Este valor será adicionado automaticamente aos Custos)</div>' +
      '</div>';
  }
  html += obRenderComentarios(im,'definicoes')+'</div></div>';
  return html;
}

function obAbaOperacional(im){
  const blocos=[
    {key:'fotos',label:'Sessão de Fotos',icon:'fa-camera'},
    {key:'limpeza',label:'Primeira Limpeza',icon:'fa-broom'},
    {key:'vistoria',label:'Vistoria',icon:'fa-clipboard-check'},
  ];
  return '<div style="display:grid;gap:14px;">'+
    blocos.map(b=>{
      const op=im.ops&&im.ops[b.key]||{data:'',responsavel:'',hora:'',custo:''};
      return '<div class="card"><div class="card-header"><div class="metric-icon sage" style="width:26px;height:26px;font-size:12px;margin-bottom:0;flex-shrink:0;"><i class="fa-solid '+b.icon+'"></i></div><div class="card-title">'+b.label+'</div></div>'+
        '<div class="card-body"><div class="form-row">'+
        '<div class="form-group"><label class="form-label">Data</label><input type="date" class="form-input" value="'+(op.data||'')+'" onchange="obSalvarOps('+im.id+',\''+b.key+'\',\'data\',this.value)"></div>'+
        '<div class="form-group"><label class="form-label">Responsável</label><input type="text" class="form-input" value="'+esc(op.responsavel||'')+'" placeholder="Nome..." oninput="obSalvarOps('+im.id+',\''+b.key+'\',\'responsavel\',this.value)"></div>'+
        '<div class="form-group"><label class="form-label">Hora</label><input type="time" class="form-input" value="'+(op.hora||'')+'" onchange="obSalvarOps('+im.id+',\''+b.key+'\',\'hora\',this.value)"></div>'+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;">'+
        '<label style="font-size:11px;color:var(--text3);min-width:90px;">Custo (R$):</label>'+
        '<input type="number" class="form-input" style="width:100px;padding:5px 8px;font-size:12px;" placeholder="0,00" value="'+(op.custo||'')+'" oninput="obSalvarOpsCusto('+im.id+',\''+b.key+'\',this.value)">'+
        '</div>'+
        '<button class="btn btn-sm" style="margin-top:8px;" onclick="obAdicionarTarefa('+im.id+',\''+b.label+'\',\''+b.key+'\')"><i class="fa-solid fa-plus"></i> Adicionar à agenda</button>'+
        '<button class="btn btn-sm" onclick="obCriarEventoGCal('+im.id+',\''+b.key+'\')" style="font-size:10px;padding:3px 8px;margin-top:4px;"><i class="fa-brands fa-google"></i> Google Agenda</button>'+
        '</div></div>';
    }).join('')+
    obRenderComentarios(im,'operacional')+
    '</div>';
}

function obCriarEventoGCal(id, bloco) {
  const im = imoveis.find(x => x.id === id); if (!im) return;
  const op = im.ops && im.ops[bloco] || {};
  if (!op.data) { showToast('Preencha a data antes de criar o evento.', 'peach'); return; }
  const labels = { fotos: 'Sessão de Fotos', limpeza: 'Primeira Limpeza', vistoria: 'Vistoria' };
  const titulo = (labels[bloco] || bloco) + ' — ' + (im.nome || 'Imóvel');
  const desc = 'Responsável: ' + (op.responsavel || '—') + '\nImóvel: ' + (im.endereco || '—');
  criarEventoGCal(titulo, op.data, op.hora || '09:00', 90, desc);
}

function obAbaCustos(im){
  const custos=im.custos||[];
  const margem=im.margemWecare||15;
  const subtotal=custos.reduce((a,c)=>a+(+c.valor||0),0);
  const margemVal=subtotal*(margem/100);
  const total=subtotal+margemVal;
  return '<div style="display:grid;gap:12px;">'+
    '<div><table class="data-table" style="width:100%;"><thead><tr><th>Descrição</th><th>Valor (R$)</th><th></th></tr></thead><tbody>'+
    custos.map((c,i)=>'<tr><td><input type="text" class="form-input" style="padding:4px 8px;font-size:12.5px;" value="'+esc(c.desc||'')+'" placeholder="Item..." oninput="obEditarCusto('+im.id+','+i+',\'desc\',this.value)"></td>'+
    '<td><input type="number" class="form-input" style="padding:4px 8px;font-size:12.5px;width:100px;" value="'+(c.valor||'')+'" placeholder="0" oninput="obEditarCusto('+im.id+','+i+',\'valor\',this.value)"></td>'+
    '<td><button onclick="obRemoverCusto('+im.id+','+i+')" style="background:none;border:none;color:var(--vermelha);cursor:pointer;"><i class="fa-solid fa-trash"></i></button></td></tr>').join('')+
    '</tbody></table>'+
    '<button class="btn btn-sm" style="margin-top:8px;" onclick="obAdicionarCusto('+im.id+')"><i class="fa-solid fa-plus"></i> Adicionar item</button></div>'+
    '<div class="form-group"><label class="form-label">Margem WeCare (%)</label><input type="number" class="form-input" style="width:100px;" value="'+(margem)+'" oninput="salvarCampoImovel('+im.id+',\'margemWecare\',this.value)"></div>'+
    '<div style="background:var(--bg3);border-radius:var(--r);padding:14px;display:grid;gap:6px;">'+
    '<div style="display:flex;justify-content:space-between;font-size:13px;"><span>Subtotal dos itens</span><span>R$ '+subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:13px;"><span>Margem WeCare ('+margem+'%)</span><span>R$ '+margemVal.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--rose);border-top:1px solid var(--border);padding-top:6px;margin-top:4px;"><span>Total Setup</span><span>R$ '+total.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</span></div>'+
    '</div>'+
    '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">'+
    '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">Desconto</div>'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">'+
    '<select class="form-select" style="width:90px;" onchange="salvarCampoImovel('+im.id+',\'descontoTipo\',this.value)">'+
    '<option value="reais"'+((im.descontoTipo||'reais')==='reais'?' selected':'')+'>R$</option>'+
    '<option value="percent"'+(im.descontoTipo==='percent'?' selected':'')+'>%</option>'+
    '</select>'+
    '<input type="number" step="0.01" class="form-input" style="width:120px;" placeholder="0" value="'+(im.descontoValor||'')+'" oninput="salvarCampoImovel('+im.id+',\'descontoValor\',parseFloat(this.value)||0)">'+
    '<span style="font-size:12px;color:var(--text3);">de desconto</span>'+
    '</div>'+
    '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">Formas de Pagamento</div>'+
    '<input type="text" class="form-input" placeholder="Ex: PIX à vista, ou 3x no cartão..." value="'+esc(im.formasPagamento||'')+'" oninput="salvarCampoImovel('+im.id+',\'formasPagamento\',this.value)">'+
    '</div>'+
    obRenderComentarios(im,'custos')+
    '</div>';
}

function obAbaCompras(im){
  const tipoEnxoval = im.defEnxoval && im.defEnxoval.tipo;
  const categorias = Object.keys(ITENS_OBRIGATORIOS);
  const ENXOVAL_CATS = ['Cama', 'Banheiro'];
  let html = '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">' +
    '<div style="font-size:12px;color:var(--text3);">Marque a quantidade que já possui. O necessário é calculado pela composição do imóvel.</div>' +
    '<button class="btn btn-rose btn-sm" onclick="obGerarOrcamentoPDF('+im.id+')"><i class="fa-solid fa-file-pdf"></i> Gerar Orçamento</button>' +
    '</div>';
  categorias.forEach(cat => {
    if (ENXOVAL_CATS.includes(cat) && tipoEnxoval !== 'comprado') {
      if (tipoEnxoval === 'alugado') {
        html += '<div style="background:var(--lav-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--lavender);"><i class="fa-solid fa-info-circle"></i> Enxoval por aluguel (' + esc(im.defEnxoval.fornecedor || 'terceirizada') + ') — itens de cama/banheiro não entram na lista de compras.</div>';
        return;
      }
      if (!tipoEnxoval) {
        html += '<div style="background:var(--peach-light);border-radius:var(--r-sm);padding:10px 12px;margin-bottom:10px;font-size:12px;color:var(--peach);"><i class="fa-solid fa-triangle-exclamation"></i> Defina o tipo de enxoval nas <strong>Definições</strong> para ver os itens de cama e banheiro.</div>';
        return;
      }
    }
    const itens = ITENS_OBRIGATORIOS[cat];
    html += '<div style="margin-bottom:14px;">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;padding:6px 0;border-bottom:2px solid var(--border);margin-bottom:6px;">' + cat + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 70px 70px 80px 80px;gap:4px;padding:3px 0;margin-bottom:4px;">' +
      '<div style="font-size:10px;font-weight:700;color:var(--text3);">Item</div>' +
      '<div style="font-size:10px;font-weight:700;color:var(--text3);text-align:center;">Necessário</div>' +
      '<div style="font-size:10px;font-weight:700;color:var(--text3);text-align:center;">Tem</div>' +
      '<div style="font-size:10px;font-weight:700;color:var(--text3);text-align:center;">Falta</div>' +
      '<div style="font-size:10px;font-weight:700;color:var(--text3);text-align:center;">R$/un</div>' +
      '</div>';
    let camasPorTier = {};
    if (cat === 'Cama') {
      (im.camas||[]).forEach(c=>{const t=tierEnxoval(c.tipo);camasPorTier[t]=(camasPorTier[t]||0)+colchoesDaCama(c);});
    }
    itens.forEach(item => {
      if (!im.compras) im.compras = {};
      if (cat === 'Cama' && ITENS_ENXOVAL_VARIAVEL.includes(item)) {
        if (Object.keys(camasPorTier).length === 0) {
          html += '<div style="display:grid;grid-template-columns:1fr 70px 70px 80px 80px;gap:4px;padding:5px 0;border-bottom:1px solid var(--border);align-items:center;">' +
            '<div style="font-size:12.5px;">' + esc(item) + '</div>' +
            '<div style="grid-column:2 / 6;font-size:11.5px;color:var(--text3);font-style:italic;">Cadastre as camas na aba Dados para calcular.</div>' +
            '</div>';
          return;
        }
        Object.keys(camasPorTier).forEach(tier => {
          const key = 'Cama__' + item + '__' + tier;
          const label = item + ' (' + TIER_LABELS[tier] + ')';
          const necessario = QTD_POR_COLCHAO[item] * camasPorTier[tier];
          if (!im.compras[key] || typeof im.compras[key] !== 'object') {
            im.compras[key] = { tem: 0, valorUnit: (PRECOS_ENXOVAL[item][tier]||0) };
          }
          const data = im.compras[key];
          const tem = parseInt(data.tem) || 0;
          const falta = Math.max(0, necessario - tem);
          const faltaColor = falta > 0 ? 'color:var(--vermelha);font-weight:700;' : 'color:var(--sage);font-weight:700;';
          html += '<div style="display:grid;grid-template-columns:1fr 70px 70px 80px 80px;gap:4px;padding:5px 0;border-bottom:1px solid var(--border);align-items:center;">' +
            '<div style="font-size:12.5px;">' + esc(label) + '</div>' +
            '<div style="text-align:center;font-size:12.5px;color:var(--text2);">' + necessario + '</div>' +
            '<input type="number" min="0" class="form-input" style="padding:3px;text-align:center;font-size:12px;" value="' + tem + '" oninput="obSalvarCompra('+im.id+',\''+key.replace(/'/g,"\\'")+ '\',\'tem\',this.value)">' +
            '<div style="text-align:center;font-size:13px;' + faltaColor + '">' + (falta > 0 ? falta : '&#10003;') + '</div>' +
            '<input type="number" min="0" step="0.01" class="form-input" style="padding:3px;text-align:center;font-size:12px;" placeholder="0,00" value="' + (data.valorUnit || PRECOS_ENXOVAL[item][tier] || '') + '" oninput="obSalvarCompra('+im.id+',\''+key.replace(/'/g,"\\'")+ '\',\'valorUnit\',this.value)">' +
            '</div>';
        });
        return;
      }
      const key = cat + '__' + item;
      if (!im.compras[key] || typeof im.compras[key] !== 'object') {
        im.compras[key] = { tem: 0, valorUnit: (PRECOS_ITENS[item]||0) };
      }
      const data = im.compras[key];
      const necessario = calcQtdNecessaria(item, cat, im);
      const tem = parseInt(data.tem) || 0;
      const falta = Math.max(0, necessario - tem);
      const faltaColor = falta > 0 ? 'color:var(--vermelha);font-weight:700;' : 'color:var(--sage);font-weight:700;';
      html += '<div style="display:grid;grid-template-columns:1fr 70px 70px 80px 80px;gap:4px;padding:5px 0;border-bottom:1px solid var(--border);align-items:center;">' +
        '<div style="font-size:12.5px;">' + esc(item) + '</div>' +
        '<div style="text-align:center;font-size:12.5px;color:var(--text2);">' + necessario + '</div>' +
        '<input type="number" min="0" class="form-input" style="padding:3px;text-align:center;font-size:12px;" value="' + tem + '" oninput="obSalvarCompra('+im.id+',\''+key.replace(/'/g,"\\'")+ '\',\'tem\',this.value)">' +
        '<div style="text-align:center;font-size:13px;' + faltaColor + '">' + (falta > 0 ? falta : '&#10003;') + '</div>' +
        '<input type="number" min="0" step="0.01" class="form-input" style="padding:3px;text-align:center;font-size:12px;" placeholder="0,00" value="' + (data.valorUnit || PRECOS_ITENS[item] || '') + '" oninput="obSalvarCompra('+im.id+',\''+key.replace(/'/g,"\\'")+ '\',\'valorUnit\',this.value)">' +
        '</div>';
    });
    html += '</div>';
  });
  html += obRenderComentarios(im,'compras');
  return html;
}

function obAbaFinal(im){
  // Calcular status do prazo de ativação do anúncio
  const enviado=im.dataEnvioParaCriacao;
  const prazoH=im.prazoAtivacaoHoras||24;
  let statusAnuncio='';
  if(enviado&&im.status!=='ativo'){
    const deadline=new Date(enviado).getTime()+prazoH*3600*1000;
    const agora=Date.now();
    const restanteMs=deadline-agora;
    if(restanteMs<0){
      const atrasoH=Math.round(-restanteMs/3600000);
      statusAnuncio='<div style="background:var(--rose-light);border:1px solid var(--rose);border-radius:var(--r-sm);padding:10px 12px;display:flex;align-items:center;gap:8px;">'+
        '<i class="fa-solid fa-triangle-exclamation" style="color:var(--vermelha);font-size:16px;"></i>'+
        '<div><div style="font-size:13px;font-weight:700;color:var(--vermelha);">ATRASADO '+atrasoH+'h</div>'+
        '<div style="font-size:11.5px;color:var(--text2);">Prazo de '+prazoH+'h para '+esc(im.responsavelCriacao||'responsável')+'</div></div></div>';
    } else {
      const restanteH=Math.floor(restanteMs/3600000),restanteMin=Math.floor((restanteMs%3600000)/60000);
      statusAnuncio='<div style="background:var(--sage-light);border:1px solid var(--sage-mid);border-radius:var(--r-sm);padding:10px 12px;display:flex;align-items:center;gap:8px;">'+
        '<i class="fa-solid fa-clock" style="color:var(--sage);font-size:16px;"></i>'+
        '<div><div style="font-size:13px;font-weight:700;color:var(--sage);">Em produção — restam '+restanteH+'h '+restanteMin+'min</div>'+
        '<div style="font-size:11.5px;color:var(--text2);">Enviado em '+new Date(enviado).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</div></div></div>';
    }
  } else if(im.status==='ativo'){
    statusAnuncio='<div style="background:var(--sage-light);border-radius:var(--r-sm);padding:8px 12px;font-size:13px;color:var(--sage);font-weight:600;"><i class="fa-solid fa-check-circle"></i> Anúncio ativado! '+
      (im.dataAtivacao&&im.dataCriacao?Math.round((new Date(im.dataAtivacao)-new Date(im.dataCriacao))/(1000*60*60*24))+' dias no total':'')+
      '</div>';
  }
  return '<div style="display:grid;gap:12px;">'+
    // Bloco de controle do anúncio
    '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:14px;">'+
    '<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:10px;letter-spacing:0.5px;">📢 Controle de Ativação do Anúncio</div>'+
    '<div class="form-row" style="margin-bottom:10px;">'+
    '<div class="form-group" style="margin-bottom:0;"><label class="form-label">Responsável pela Criação</label>'+
    '<select class="form-select" onchange="salvarCampoImovel('+im.id+',\'responsavelCriacao\',this.value)">'+
    '<option value="">— Selecionar membro da equipe —</option>'+
    ATTS.map(a=>'<option value="'+esc(a.name)+'"'+(im.responsavelCriacao===a.name?' selected':'')+'>'+esc(a.name)+'</option>').join('')+
    '</select></div>'+
    '<div class="form-group" style="margin-bottom:0;"><label class="form-label">Prazo para ativação (horas)</label>'+
    '<input type="number" min="1" class="form-input" value="'+(im.prazoAtivacaoHoras||24)+'" placeholder="24" oninput="salvarCampoImovel('+im.id+',\'prazoAtivacaoHoras\',parseFloat(this.value)||24)">'+
    '</div></div>'+
    (!enviado&&im.status!=='ativo'
      ?'<button class="btn btn-rose" onclick="obEnviarParaCriacao('+im.id+')" style="width:100%;padding:10px;font-size:13.5px;"><i class="fa-solid fa-paper-plane"></i> Anúncio enviado para criação</button>'
      :statusAnuncio
    )+
    '</div>'+
    '<div class="form-group"><label class="form-label">Link Fotos Drive</label><input type="text" class="form-input" value="'+esc(im.linkFotos||'')+'" placeholder="https://drive.google.com/..." oninput="salvarCampoImovel('+im.id+',\'linkFotos\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Link do Relatório (Drive)</label><input type="text" class="form-input" value="'+esc(im.linkRelatorio||'')+'" placeholder="https://drive.google.com/..." oninput="salvarCampoImovel('+im.id+',\'linkRelatorio\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Formulário do Imóvel</label><div style="font-size:13px;color:var(--text3);padding:8px 12px;background:var(--bg3);border-radius:var(--r-sm);border:1px solid var(--border);">Subir manualmente no Drive</div></div>'+
    '<div class="form-row">'+
    '<div class="form-row">'+
    '<div class="form-group"><label class="form-label">Valor Mínimo da Noite (R$)</label><input type="number" class="form-input" value="'+(im.valorMinNoite||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'valorMinNoite\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Valor Base da Noite (R$)</label><input type="number" class="form-input" value="'+(im.valorBaseNoite||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'valorBaseNoite\',this.value)"></div></div>'+
    '<div class="form-row">'+
    '<div class="form-group"><label class="form-label">Taxa Hóspede Extra (R$)</label><input type="number" class="form-input" value="'+(im.taxaHospedeExtra||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'taxaHospedeExtra\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Acima de X hóspedes</label><input type="number" class="form-input" value="'+(im.taxaHospedeExtraAcimaDe||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'taxaHospedeExtraAcimaDe\',this.value)"></div></div>'+
    '<div class="form-group"><label class="form-label">Taxa de Limpeza (R$)</label><input type="number" class="form-input" value="'+(im.taxaLimpeza||'')+'" placeholder="0" oninput="salvarCampoImovel('+im.id+',\'taxaLimpeza\',this.value)"></div>'+
    '<div class="form-group"><label class="form-label">Observações Relevantes</label><textarea class="form-input" rows="4" placeholder="Observações..." oninput="salvarCampoImovel('+im.id+',\'observacoes\',this.value)">'+esc(im.observacoes||'')+'</textarea></div>'+
    obRenderComentarios(im,'final')+
    '</div>';
}

function salvarCampoImovel(id,campo,valor){
  const im=imoveis.find(x=>x.id===id);
  if(!im)return;
  im[campo]=valor;
  if(campo==='nome'&&document.getElementById('ob-imovel-nome')){}
  renderOnboardingKanban();
}

function obTogglePlat(id,plat,checked){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.plataformas)im.plataformas=[];
  if(checked){if(!im.plataformas.includes(plat))im.plataformas.push(plat);}
  else{im.plataformas=im.plataformas.filter(p=>p!==plat);}
  renderOnboardingKanban();
}

function obToggleDef(id,key){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  im[key]=!im[key];
  obRenderAba(im);
  renderOnboardingKanban();
}

function obAdicionarCama(id){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  const tipo=document.getElementById('ob-cama-tipo').value;
  const qtd=parseInt(document.getElementById('ob-cama-qtd').value)||1;
  if(!im.camas)im.camas=[];
  im.camas.push({tipo,qtd});
  obRenderAba(im);renderOnboardingKanban();
}

function obRemoverCama(id,idx){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  im.camas.splice(idx,1);
  obRenderAba(im);renderOnboardingKanban();
}

function obSalvarOps(id,bloco,campo,valor){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.ops)im.ops={};
  if(!im.ops[bloco])im.ops[bloco]={data:'',responsavel:'',hora:'',custo:''};
  im.ops[bloco][campo]=valor;
  renderOnboardingKanban();
}

function obSalvarOpsCusto(id,bloco,valor){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.ops)im.ops={};
  if(!im.ops[bloco])im.ops[bloco]={data:'',responsavel:'',hora:'',custo:''};
  im.ops[bloco].custo=valor;
  const labels={fotos:'Sessão de Fotos',limpeza:'Primeira Limpeza',vistoria:'Vistoria'};
  if(!im.custos)im.custos=[];
  const existente=im.custos.find(c=>c._blocoRef===bloco);
  if(existente){
    existente.valor=parseFloat(valor)||0;
  } else {
    im.custos.push({desc:labels[bloco]||bloco,valor:parseFloat(valor)||0,_blocoRef:bloco});
  }
  const margem=im.margemWecare||15;
  const subtotal=im.custos.reduce((a,c)=>a+(+c.valor||0),0);
  im.valorSetup=subtotal*(1+margem/100);
  renderOnboardingKanban();
}

function obAdicionarTarefa(id,label,bloco){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  const op=im.ops&&im.ops[bloco]||{};
  const txt=label+(im.nome?' — '+im.nome:'')+(op.data?' em '+op.data:'');
  tasks.unshift({id:Date.now(),text:txt,cat:'work',prio:'med',due:op.data||'',done:false,status:'todo'});
  renderTasks();renderKanban();fillFocusSel();
  showToast('Tarefa adicionada: '+txt,'sage');
}

function obAdicionarCusto(id){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.custos)im.custos=[];
  im.custos.push({desc:'',valor:0});
  obRenderAba(im);
}

function obEditarCusto(id,idx,campo,valor){
  const im=imoveis.find(x=>x.id===id);if(!im||!im.custos[idx])return;
  im.custos[idx][campo]=campo==='valor'?parseFloat(valor)||0:valor;
  const custos=im.custos||[];const margem=im.margemWecare||15;
  const subtotal=custos.reduce((a,c)=>a+(+c.valor||0),0);
  im.valorSetup=subtotal*(1+margem/100);
  renderOnboardingKanban();
}

function obRemoverCusto(id,idx){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  im.custos.splice(idx,1);
  obRenderAba(im);
}

function obMarcarCompra(id,key,value){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.compras)im.compras={};
  im.compras[key]=value;
  renderOnboardingKanban();
}

function salvarCampoImovelNested(id,obj,campo,valor){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im[obj])im[obj]={};
  im[obj][campo]=valor;
  if(obj==='defEnxoval'&&campo==='tipo'){
    obRenderAba(im);
  }
  renderOnboardingKanban();
}

function obSalvarSetupAluguel(id,valor){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.defEnxoval)im.defEnxoval={};
  im.defEnxoval.valorSetupAluguel=valor;
  if(!im.custos)im.custos=[];
  const existente=im.custos.find(c=>c._blocoRef==='_setupAluguel');
  const v=parseFloat(valor)||0;
  if(existente){existente.valor=v;}
  else if(v>0){im.custos.push({desc:'Setup Enxoval ('+(im.defEnxoval.fornecedor||'Terceirizada')+')',valor:v,_blocoRef:'_setupAluguel'});}
  const margem=im.margemWecare||15;
  im.valorSetup=im.custos.reduce((a,c)=>a+(+c.valor||0),0)*(1+margem/100);
  renderOnboardingKanban();
}

function obSalvarCompra(id,key,campo,valor){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.compras)im.compras={};
  if(!im.compras[key]||typeof im.compras[key]!=='object')im.compras[key]={tem:0,valorUnit:0};
  im.compras[key][campo]=campo==='tem'?(parseInt(valor)||0):(parseFloat(valor)||0);
}

function calcQtdNecessaria(itemName,categoria,im){
  const camas=im.camas||[];
  let totalColchoes = camas.reduce((s,c)=>{
    const q=parseInt(c.qtd)||1;
    if(c.tipo==='Beliche'||c.tipo==='Bicama') return s+q*2;
    return s+q;
  },0);
  let totalLeitos = camas.reduce((s,c)=>{
    const q=parseInt(c.qtd)||1;
    if(['Solteiro','Sofá-cama Solteiro','Viúva'].includes(c.tipo)) return s+q;
    if(c.tipo==='Beliche'||c.tipo==='Bicama') return s+q*2;
    return s+q*2; // Casal, Queen, King, Sofá-cama Casal
  },0);
  const banheiros=parseInt(im.banheiros)||1;
  const qtdMap={
    'Jogo de Cama Basic Percalle':totalColchoes*3,
    'Cobertor Aspen II':totalColchoes*2,
    'Edredom Premier Hotel':totalColchoes,
    'Capa p/ Edredom Hotel':totalColchoes*2,
    'Fronha Basic Percalle':totalLeitos*2,
    'Protetor de Colchão':totalColchoes,
    'Travesseiro Sanomed':totalLeitos,
    'Travesseiro Toque de Pluma':totalLeitos,
    'Protetor de Travesseiro':totalLeitos,
    'Toalha de Banho Lory Hotel':totalLeitos*3,
    'Toalha de Rosto Lory Hotel':banheiros*3,
    'Piso Luxor Hotel':banheiros*3,
    'Lixeira de Banheiro':banheiros,
    'Dispenser de Sabonete':banheiros,
    'Secador de Cabelo':banheiros,
    'Talheres (24 peças)':1,
    'Persianas Blackout':Math.max(totalColchoes,1),
  };
  return qtdMap[itemName]||1;
}

function obGerarOrcamento(id){ obGerarOrcamentoPDF(id); }

function obGerarOrcamentoPDF(id){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  const tipoEnxoval=im.defEnxoval&&im.defEnxoval.tipo;
  const ENXOVAL_CATS=['Cama','Banheiro'];
  const compras=im.compras||{};
  let categoriasOrc=[];
  Object.entries(ITENS_OBRIGATORIOS).forEach(([cat,itens])=>{
    if(ENXOVAL_CATS.includes(cat)&&tipoEnxoval!=='comprado')return;
    const linhas=[];
    let camasPorTier={};
    if(cat==='Cama'){
      (im.camas||[]).forEach(c=>{const t=tierEnxoval(c.tipo);camasPorTier[t]=(camasPorTier[t]||0)+colchoesDaCama(c);});
    }
    itens.forEach(item=>{
      if(cat==='Cama'&&ITENS_ENXOVAL_VARIAVEL.includes(item)){
        Object.keys(camasPorTier).forEach(tier=>{
          const key='Cama__'+item+'__'+tier;
          const data=compras[key]||{tem:0,valorUnit:0};
          const necessario=QTD_POR_COLCHAO[item]*camasPorTier[tier];
          const tem=parseInt(data.tem)||0;
          const falta=Math.max(0,necessario-tem);
          if(falta>0){
            const valorUnit=parseFloat(data.valorUnit)||0;
            linhas.push({item:item+' ('+TIER_LABELS[tier]+')',qtd:falta,valorUnit,total:falta*valorUnit});
          }
        });
        return;
      }
      const key=cat+'__'+item;
      const data=compras[key]||{tem:0,valorUnit:0};
      const necessario=calcQtdNecessaria(item,cat,im);
      const tem=parseInt(data.tem)||0;
      const falta=Math.max(0,necessario-tem);
      if(falta>0){
        const valorUnit=parseFloat(data.valorUnit)||0;
        linhas.push({item,qtd:falta,valorUnit,total:falta*valorUnit});
      }
    });
    if(linhas.length>0)categoriasOrc.push({cat,linhas});
  });
  const grupoMap={'Cama':'Enxoval','Banheiro':'Enxoval','Cozinha':'Imóvel','Lavanderia':'Imóvel','Quarto':'Imóvel','Limpeza':'Outros','Outros':'Outros'};
  const grupos={};
  categoriasOrc.forEach(c=>{
    const g=grupoMap[c.cat]||'Outros';
    if(!grupos[g])grupos[g]={cats:[],total:0};
    grupos[g].cats.push(c);
    grupos[g].total+=c.linhas.reduce((s,l)=>s+l.total,0);
  });
  const totalGeral=Object.values(grupos).reduce((s,g)=>s+g.total,0);
  let descontoAplicado = 0;
  if(im.descontoValor>0){
    if(im.descontoTipo==='percent') descontoAplicado = totalGeral * (im.descontoValor/100);
    else descontoAplicado = im.descontoValor;
  }
  const totalComDesconto = Math.max(0, totalGeral - descontoAplicado);
  const dataHoje=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  let tabelaHtml='';
  Object.entries(grupos).forEach(([grupo,g])=>{
    tabelaHtml+='<tr><td colspan="4" style="background:#f0f0f0;font-weight:700;font-size:13px;padding:10px 12px;color:#333;border-top:2px solid #c0616a;">'+grupo+'</td></tr>';
    g.cats.forEach(c=>{
      c.linhas.forEach(l=>{
        tabelaHtml+='<tr><td style="padding:7px 12px;font-size:12px;border-bottom:1px solid #f5f5f5;">'+l.item+'</td>'+
          '<td style="padding:7px 12px;text-align:center;font-size:12px;border-bottom:1px solid #f5f5f5;">'+l.qtd+'</td>'+
          '<td style="padding:7px 12px;text-align:right;font-size:12px;border-bottom:1px solid #f5f5f5;">'+(l.valorUnit>0?'R$ '+l.valorUnit.toFixed(2).replace('.',','):'—')+'</td>'+
          '<td style="padding:7px 12px;text-align:right;font-size:12px;border-bottom:1px solid #f5f5f5;font-weight:'+(l.total>0?'600':'400')+';">'+(l.total>0?'R$ '+l.total.toFixed(2).replace('.',','):'—')+'</td></tr>';
      });
      tabelaHtml+='<tr><td colspan="3" style="padding:5px 12px;text-align:right;font-size:11.5px;color:#666;">Total '+c.cat+'</td><td style="padding:5px 12px;text-align:right;font-size:12px;font-weight:600;color:#c0616a;">R$ '+c.linhas.reduce((s,l)=>s+l.total,0).toFixed(2).replace('.',',')+'</td></tr>';
    });
    tabelaHtml+='<tr><td colspan="3" style="padding:8px 12px;text-align:right;font-size:13px;font-weight:700;background:#fdf5f5;">Total '+grupo+'</td><td style="padding:8px 12px;text-align:right;font-size:14px;font-weight:700;color:#c0616a;background:#fdf5f5;">R$ '+g.total.toFixed(2).replace('.',',')+'</td></tr>';
  });
  const enxovalInfo=(im.defEnxoval&&im.defEnxoval.tipo)?'<div class="info-item"><label>Enxoval</label><span>'+(im.defEnxoval.tipo==='comprado'?'Compra — ':'Aluguel — ')+(im.defEnxoval.fornecedor||'—')+'</span></div>':'';
  const htmlDoc='<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orçamento — '+(im.nome||'Imóvel')+'</title>'+
    '<style>body{font-family:Arial,sans-serif;padding:0;margin:0;color:#222;}.header{background:#c0616a;color:white;padding:28px 40px;display:flex;justify-content:space-between;align-items:center;}.logo{font-size:28px;font-weight:700;letter-spacing:1px;}.logo span{opacity:0.7;font-size:13px;display:block;font-weight:400;letter-spacing:0;}.content{padding:32px 40px;}h2{color:#c0616a;font-size:18px;margin:0 0 4px;}.meta{font-size:12px;color:#888;margin-bottom:24px;}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;}.info-item label{font-size:10px;text-transform:uppercase;color:#999;display:block;}.info-item span{font-size:13px;font-weight:600;}table{width:100%;border-collapse:collapse;margin-bottom:24px;}th{background:#c0616a;color:white;padding:10px 12px;text-align:left;font-size:12px;}th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:center;}th:nth-child(3),th:nth-child(4){text-align:right;}.total-geral{background:#c0616a;color:white;padding:14px 40px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;}.footer{padding:20px 40px;font-size:11px;color:#aaa;border-top:1px solid #eee;margin-top:8px;}@media print{button{display:none;}body{margin:0;}}</style></head><body>'+
    '<div class="header"><div class="logo">WeCare<br><span>Hosting &amp; Management</span></div><div style="text-align:right;font-size:12px;opacity:0.85;">'+dataHoje+'</div></div>'+
    '<div class="content"><h2>Orçamento de Compras</h2><div class="meta">Documento gerado pelo sistema Claire</div>'+
    '<div class="info-grid">'+
    '<div class="info-item"><label>Imóvel</label><span>'+(im.nome||'—')+'</span></div>'+
    '<div class="info-item"><label>Proprietário</label><span>'+(im.proprietarioNome||'—')+'</span></div>'+
    '<div class="info-item"><label>Endereço</label><span>'+(im.endereco||'—')+'</span></div>'+
    '<div class="info-item"><label>Contato</label><span>'+(im.proprietarioTel||'—')+'</span></div>'+
    enxovalInfo+
    '</div>'+
    '<table><thead><tr><th>Item</th><th style="text-align:center;">Qtd.</th><th style="text-align:right;">Valor Unit.</th><th style="text-align:right;">Total</th></tr></thead>'+
    '<tbody>'+tabelaHtml+'</tbody></table></div>'+
    (descontoAplicado>0
      ? '<div style="padding:10px 40px;display:flex;justify-content:space-between;font-size:13px;color:#666;"><span>Subtotal</span><span>R$ '+totalGeral.toFixed(2).replace(".",",")+'</span></div>'+
        '<div style="padding:6px 40px;display:flex;justify-content:space-between;font-size:13px;color:#2e7d32;"><span>Desconto'+(im.descontoTipo==="percent"?" ("+im.descontoValor+"%)":"")+'</span><span>- R$ '+descontoAplicado.toFixed(2).replace(".",",")+'</span></div>'
      : '')+
    '<div class="total-geral"><span>TOTAL '+(descontoAplicado>0?'FINAL':'GERAL')+'</span><span>R$ '+totalComDesconto.toFixed(2).replace(".",",")+'</span></div>'+
    (im.formasPagamento?'<div style="padding:14px 40px;font-size:12.5px;color:#444;"><strong>Formas de pagamento:</strong> '+esc(im.formasPagamento)+'</div>':'')+
    '<div class="footer">WeCare Hosting &amp; Management · Claire Sistema de Gestão · Documento gerado em '+dataHoje+'</div>'+
    '<script>window.onload=function(){window.print();};<\/script>'+
    '</body></html>';
  const win=window.open('','_blank');
  if(!win){showToast('Permita pop-ups no browser para gerar o PDF.','peach');return;}
  win.document.write(htmlDoc);
  win.document.close();
}

function obAvancarFase(){
  const im=imoveis.find(x=>x.id===imovelAtivo);if(!im)return;
  const order=['contrato','compras','definicoes','producao','auditoria','ativo'];
  const idx=order.indexOf(im.status);
  if(idx<order.length-1){im.status=order[idx+1];abrirImovelModal(im.id);renderOnboardingKanban();}
}

function obEnviarParaCriacao(id){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  if(!im.responsavelCriacao){showToast('Selecione o responsável pela criação antes de enviar.','peach');return;}
  im.dataEnvioParaCriacao=new Date().toISOString();
  const prazoH=im.prazoAtivacaoHoras||24;

  // Calcular prazo em data
  const dataPrazo=new Date(Date.now()+prazoH*3600*1000);
  const dataPrazoStr=dataPrazo.toISOString().split('T')[0];

  // Criar demanda automaticamente para o membro da equipe
  const membro=ATTS.find(a=>a.name===im.responsavelCriacao);
  if(membro){
    if(!membro.demands)membro.demands=[];
    membro.demands.push({
      desc:'Criar anúncio — '+( im.nome||'Novo imóvel'),
      due:dataPrazoStr,
      prio:'high',
      s:'pending',
      recorrente:false,
      recorrencia:'',
      _imId:im.id // referência ao imóvel
    });
    renderTeam();renderTeamOv();
    showToast('Demanda criada para '+im.responsavelCriacao+' com prazo de '+prazoH+'h!','sage');
  }

  obRenderAba(im);
  renderOnboardingKanban();
  _iniciarMonitorPrazo(id);
}

let _prazoTimers={};
function _iniciarMonitorPrazo(id){
  if(_prazoTimers[id])clearInterval(_prazoTimers[id]);
  _prazoTimers[id]=setInterval(()=>{
    const im=imoveis.find(x=>x.id===id);
    if(!im||im.status==='ativo'){clearInterval(_prazoTimers[id]);return;}
    if(!im.dataEnvioParaCriacao)return;
    const deadline=new Date(im.dataEnvioParaCriacao).getTime()+(im.prazoAtivacaoHoras||24)*3600*1000;
    const agora=Date.now();
    if(agora>deadline&&!im._alertadoAtraso){
      im._alertadoAtraso=true;
      const atrasoH=Math.round((agora-deadline)/3600000);
      showToast('⚠️ ATRASADO: '+esc(im.responsavelCriacao||'Responsável')+' está '+atrasoH+'h atrasado no anúncio de "'+esc(im.nome||'imóvel')+'"','vermelha');
      renderOnboardingKanban();
      // Repetir aviso a cada 2h de atraso
      im._alertadoAtraso=false;
      clearInterval(_prazoTimers[id]);
      _prazoTimers[id]=setInterval(()=>_iniciarMonitorPrazo(id),2*3600*1000);
    }
  },60*1000); // verifica a cada 1 minuto
}

function obDarBaixa(){
  const im=imoveis.find(x=>x.id===imovelAtivo);if(!im)return;
  if(_prazoTimers[im.id]){clearInterval(_prazoTimers[im.id]);delete _prazoTimers[im.id];}
  im.status='ativo';
  im.dataAtivacao=new Date().toISOString(); // registra data de ativação do anúncio
  abrirImovelModal(im.id);renderOnboardingKanban();
  renderKPIs(); // atualiza KPI de tempo de ativação
  showToast('Imóvel ativado! Tempo de ativação registrado automaticamente.','sage');
}

function obApagarImovel(){
  const im=imoveis.find(x=>x.id===imovelAtivo);if(!im)return;
  const nome=im.nome||'este imóvel';
  if(!confirm('Apagar "'+nome+'"? Esta ação não pode ser desfeita.'))return;
  imoveis=imoveis.filter(x=>x.id!==imovelAtivo);
  imovelAtivo=null;
  closeModal('modal-imovel');
  renderOnboardingKanban();
  showToast('Imóvel "'+nome+'" apagado.','peach');
}

function abrirObConfig(){
  renderObConfigBody();
  document.getElementById('modal-ob-config').classList.add('open');
}

function renderObConfigBody(){
  const el=document.getElementById('ob-config-body');if(!el)return;
  let html=Object.entries(ITENS_OBRIGATORIOS).map(([cat,itens])=>
    '<div style="margin-bottom:14px;background:var(--bg3);border-radius:var(--r-sm);padding:12px;">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'+
    '<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;">'+cat+'</div>'+
    '<button onclick="obRemoverCategoria(\''+cat+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Remover categoria" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-trash"></i> Remover categoria</button>'+
    '</div>'+
    itens.map((item,i)=>
      '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);">'+
      '<span style="flex:1;font-size:12.5px;">'+esc(item)+'</span>'+
      '<button onclick="obRemoverItem(\''+cat+'\','+i+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-xmark"></i></button>'+
      '</div>'
    ).join('')+
    '<div style="display:flex;gap:8px;margin-top:8px;">'+
    '<input type="text" class="form-input" id="ob-new-item-'+cat.replace(/\s/g,'_')+'" placeholder="Novo item em '+cat+'..." style="flex:1;font-size:12px;padding:5px 8px;" onkeydown="if(event.key===\'Enter\')obAdicionarItem(\''+cat+'\')">'+
    '<button class="btn btn-sm" onclick="obAdicionarItem(\''+cat+'\')"><i class="fa-solid fa-plus"></i></button>'+
    '</div>'+
    '</div>'
  ).join('');
  html += '<div style="margin-top:18px;border-top:2px solid var(--border);padding-top:14px;">'+
    '<div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text3);letter-spacing:0.5px;margin-bottom:10px;">💲 Tabela de Preços (valor unitário)</div>'+
    '<div style="font-size:11px;color:var(--text3);margin-bottom:10px;">Estes valores preenchem automaticamente as compras. Edite conforme sua tabela atual.</div>';
  Object.entries(ITENS_OBRIGATORIOS).forEach(([cat,itens])=>{
    html += '<div style="font-size:10.5px;font-weight:700;color:var(--text3);margin:8px 0 4px;">'+cat+'</div>';
    itens.forEach(item=>{
      if(ITENS_ENXOVAL_VARIAVEL.includes(item))return;
      const preco = PRECOS_ITENS[item]||'';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;">'+
        '<span style="flex:1;font-size:12px;">'+esc(item)+'</span>'+
        '<span style="font-size:11px;color:var(--text3);">R$</span>'+
        '<input type="number" step="0.01" class="form-input" style="width:90px;padding:4px 6px;font-size:12px;text-align:right;" value="'+preco+'" placeholder="0,00" oninput="setPrecoItem(\''+item.replace(/'/g,"\\'")+'\',this.value)">'+
        '</div>';
    });
  });
  html += '<div style="margin-top:16px;"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:8px;">🛏️ Enxoval por tipo de cama (R$)</div>';
  html += '<div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;font-size:9.5px;font-weight:700;color:var(--text3);text-transform:uppercase;padding:4px 0;"><div>Item</div><div style="text-align:center;">Solteiro</div><div style="text-align:center;">Casal</div><div style="text-align:center;">Queen</div><div style="text-align:center;">King</div></div>';
  Object.keys(PRECOS_ENXOVAL).forEach(item=>{
    const p=PRECOS_ENXOVAL[item];
    html += '<div style="display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr 1fr;gap:4px;padding:3px 0;align-items:center;border-bottom:1px solid var(--border);">'+
      '<div style="font-size:11px;">'+esc(item)+'</div>'+
      ['solteiro','casal','queen','king'].map(tier=>'<input type="number" step="0.01" class="form-input" style="padding:3px;font-size:11px;text-align:center;" value="'+(p[tier]||'')+'" oninput="setPrecoEnxoval(\''+item.replace(/'/g,"\\'")+'\',\''+tier+'\',this.value)">').join('')+
      '</div>';
  });
  html += '</div>';
  html += '</div>';
  el.innerHTML=html;
}

function setPrecoItem(item, valor){
  PRECOS_ITENS[item] = parseFloat(valor)||0;
}

function setPrecoEnxoval(item, tier, valor){
  if(!PRECOS_ENXOVAL[item]) PRECOS_ENXOVAL[item]={};
  PRECOS_ENXOVAL[item][tier]=parseFloat(valor)||0;
}

function obAdicionarItem(cat){
  const inputId='ob-new-item-'+cat.replace(/\s/g,'_');
  const el=document.getElementById(inputId);if(!el)return;
  const nome=el.value.trim();if(!nome)return;
  if(!ITENS_OBRIGATORIOS[cat])ITENS_OBRIGATORIOS[cat]=[];
  ITENS_OBRIGATORIOS[cat].push(nome);
  el.value='';
  renderObConfigBody();
  showToast('"'+nome+'" adicionado a '+cat+'!','sage');
}

function obRemoverItem(cat,idx){
  if(!confirm('Remover "'+ITENS_OBRIGATORIOS[cat][idx]+'"?'))return;
  ITENS_OBRIGATORIOS[cat].splice(idx,1);
  renderObConfigBody();
}

function obAdicionarCategoria(){
  const el=document.getElementById('ob-new-cat');if(!el)return;
  const nome=el.value.trim();if(!nome)return;
  if(ITENS_OBRIGATORIOS[nome]){showToast('Categoria "'+nome+'" já existe.','peach');return;}
  ITENS_OBRIGATORIOS[nome]=[];
  el.value='';
  renderObConfigBody();
  showToast('Categoria "'+nome+'" criada!','sage');
}

function obRemoverCategoria(cat){
  if(!confirm('Remover a categoria "'+cat+'" e todos os seus itens?'))return;
  delete ITENS_OBRIGATORIOS[cat];
  renderObConfigBody();
  showToast('Categoria "'+cat+'" removida.','peach');
}

function obMarcarPerdido(){
  const im=imoveis.find(x=>x.id===imovelAtivo);if(!im)return;
  if(!confirm('Marcar "'+( im.nome||'este imóvel')+'" como Perdido? Ele sairá do kanban principal mas ficará salvo.'))return;
  im.statusAnterior=im.status;
  im.status='perdido';
  closeModal('modal-imovel');
  renderOnboardingKanban();
  showToast('"'+(im.nome||'Imóvel')+'" marcado como perdido.','peach');
}

function obVoltarOperacao(id){
  const im=imoveis.find(x=>x.id===id);if(!im)return;
  im.status=im.statusAnterior||'contrato';
  delete im.statusAnterior;
  renderOnboardingKanban();
  showToast('"'+(im.nome||'Imóvel')+'" voltou ao fluxo!','sage');
}

function renderOnboardingKanban(){
  const el=document.getElementById('onboarding-kanban');if(!el)return;
  const ativos=imoveis.filter(im=>im.status!=='perdido');
  el.innerHTML=OB_COLS.map(col=>{
    const cards=ativos.filter(im=>im.status===col.id);
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:8px;min-height:140px;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'+
      '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:'+col.color+';">'+col.label+'</div>'+
      '<div style="font-size:11px;background:var(--bg3);padding:1px 6px;border-radius:10px;color:var(--text3);">'+cards.length+'</div></div>'+
      cards.map(im=>{
        const defs=['seguroEasyCover','kitAmenities','internetClaro','ecohost','fechaduraEletronica'];
        const defLabels={seguroEasyCover:'Seguro',kitAmenities:'Kit',internetClaro:'Internet',ecohost:'Eco',fechaduraEletronica:'Fechadura'};
        const ativadas=defs.filter(d=>im[d]);
        // Calcular status do prazo de ativação do anúncio para o card
        let badgePrazo='';
        if(im.dataEnvioParaCriacao&&im.status!=='ativo'){
          const deadline=new Date(im.dataEnvioParaCriacao).getTime()+(im.prazoAtivacaoHoras||24)*3600*1000;
          const diff=deadline-Date.now();
          if(diff<0){
            const atrasoH=Math.round(-diff/3600000);
            badgePrazo='<div style="background:var(--vermelha);color:#fff;border-radius:var(--r-sm);padding:3px 8px;font-size:10px;font-weight:700;margin-bottom:5px;"><i class="fa-solid fa-triangle-exclamation"></i> ATRASADO '+atrasoH+'h — '+esc(im.responsavelCriacao||'criação')+'</div>';
          } else {
            const restH=Math.floor(diff/3600000);
            badgePrazo='<div style="background:var(--sage-light);color:var(--sage);border-radius:var(--r-sm);padding:3px 8px;font-size:10px;font-weight:600;margin-bottom:5px;"><i class="fa-solid fa-clock"></i> Em produção — '+restH+'h restantes</div>';
          }
        }
        const borderColor=im.dataEnvioParaCriacao&&im.status!=='ativo'&&(new Date(im.dataEnvioParaCriacao).getTime()+(im.prazoAtivacaoHoras||24)*3600*1000)<Date.now()?'2px solid var(--vermelha)':'1px solid var(--border)';
        const cardOpacity=im.status==='ativo'?'opacity:0.6;':'';
        return '<div onclick="abrirImovelModal('+im.id+')" style="background:var(--bg3);border:'+borderColor+';border-radius:var(--r-sm);padding:9px;margin-bottom:6px;cursor:pointer;'+cardOpacity+'transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'var(--bg3)\'">'+
          badgePrazo+
          '<div style="font-size:13px;font-weight:600;margin-bottom:3px;">'+esc(im.nome||'(sem nome)')+'</div>'+
          '<div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:5px;">'+esc(im.endereco||'Endereço não informado')+'</div>'+
          '<div style="font-size:10.5px;color:var(--text3);margin-bottom:5px;">'+new Date(im.dataCriacao).toLocaleDateString('pt-BR')+'</div>'+
          (ativadas.length>0?'<div style="display:flex;flex-wrap:wrap;gap:3px;">'+ativadas.map(d=>'<span style="font-size:9.5px;padding:1px 5px;border-radius:8px;background:var(--sage-light);color:var(--sage);font-weight:600;">'+defLabels[d]+'</span>').join('')+'</div>':'')+'</div>';
      }).join('')+
      '</div>';
  }).join('');

  // Seção de perdidos (discreta, no final)
  const perdidos=imoveis.filter(im=>im.status==='perdido');
  let perdidosEl=document.getElementById('onboarding-perdidos-section');
  if(!perdidosEl){
    perdidosEl=document.createElement('div');
    perdidosEl.id='onboarding-perdidos-section';
    perdidosEl.style.marginTop='24px';
    el.parentElement.appendChild(perdidosEl);
  }
  if(perdidos.length===0){perdidosEl.innerHTML='';return;}
  perdidosEl.innerHTML='<details style="margin-top:8px;">'+
    '<summary style="cursor:pointer;font-size:11px;color:var(--text3);font-weight:600;padding:6px 0;user-select:none;">'+
    '<i class="fa-solid fa-user-slash"></i> Imóveis Perdidos ('+perdidos.length+')</summary>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:10px;">'+
    perdidos.map(im=>
      '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px;opacity:0.7;">'+
      '<div style="font-size:12.5px;font-weight:600;margin-bottom:4px;color:var(--text2);">'+esc(im.nome||'Sem nome')+'</div>'+
      '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;">'+esc(im.endereco||'—')+'</div>'+
      '<div style="display:flex;gap:6px;">'+
      '<button class="btn btn-sm" onclick="obVoltarOperacao('+im.id+')" style="font-size:10px;padding:3px 8px;"><i class="fa-solid fa-rotate-left"></i> Voltar à operação</button>'+
      '<button onclick="abrirImovelModal('+im.id+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;" title="Ver detalhes"><i class="fa-solid fa-eye"></i></button>'+
      '</div></div>'
    ).join('')+
    '</div></details>';
}

// ═══════════════════ PROJETOS ═══════════════════
const PROJ_STATUS=[
  {id:'planejamento',label:'Planejamento',color:'var(--sky)'},
  {id:'andamento',   label:'Em Andamento', color:'var(--peach)'},
  {id:'concluido',   label:'Concluído',    color:'var(--sage)'},
];

function abrirNovoProjeto(){
  const p={
    id:Date.now(),nome:'',status:'planejamento',
    tempoEstimado:'',colaboradores:'',objetivos:'',
    notas:'',tarefas:[],dataCriacao:new Date().toISOString()
  };
  projetos.push(p);
  projetoAtivo=p.id;
  renderProjetosKanban();
  abrirProjetoModal(p.id);
}

function abrirProjetoModal(id){
  const p=projetos.find(x=>x.id===id);if(!p)return;
  projetoAtivo=id;
  document.getElementById('proj-nome-input').value=p.nome||'';
  document.getElementById('proj-nome-input').oninput=function(){const pr=projetos.find(x=>x.id===projetoAtivo);if(pr){pr.nome=this.value;renderProjetosKanban();}};
  const sc=PROJ_STATUS.find(s=>s.id===p.status)||PROJ_STATUS[0];
  document.getElementById('proj-status-badge').textContent=sc.label;
  document.getElementById('proj-status-badge').style.color=sc.color;
  projMudarAba(projetoAbaAtiva,document.getElementById('ptab-'+projetoAbaAtiva));
  document.getElementById('modal-projeto').classList.add('open');
}

function projMudarAba(aba,btn){
  projetoAbaAtiva=aba;
  document.querySelectorAll('#modal-projeto .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const p=projetos.find(x=>x.id===projetoAtivo);if(!p)return;
  const el=document.getElementById('proj-aba-content');
  if(aba==='info'){
    el.innerHTML=
      '<div class="form-row">'+
      '<div class="form-group"><label class="form-label">Status</label><select class="form-select" onchange="const pr=projetos.find(x=>x.id===projetoAtivo);if(pr){pr.status=this.value;const sc=PROJ_STATUS.find(s=>s.id===this.value);document.getElementById(\'proj-status-badge\').textContent=sc.label;document.getElementById(\'proj-status-badge\').style.color=sc.color;renderProjetosKanban();}">'+
      PROJ_STATUS.map(s=>'<option value="'+s.id+'"'+(p.status===s.id?' selected':'')+'>'+s.label+'</option>').join('')+
      '</select></div>'+
      '<div class="form-group"><label class="form-label">Tempo Estimado</label><input class="form-input" value="'+esc(p.tempoEstimado||'')+'" placeholder="Ex: 2 semanas" onchange="const pr=projetos.find(x=>x.id===projetoAtivo);if(pr)pr.tempoEstimado=this.value;"></div>'+
      '</div>'+
      '<div class="form-group"><label class="form-label">Colaboradores</label><input class="form-input" value="'+esc(p.colaboradores||'')+'" placeholder="Ex: Gabriela, Felipe, Nicole" onchange="const pr=projetos.find(x=>x.id===projetoAtivo);if(pr)pr.colaboradores=this.value;"></div>'+
      '<div class="form-group"><label class="form-label">Objetivos</label><textarea class="form-input" rows="5" placeholder="Descreva os objetivos do projeto..." onchange="const pr=projetos.find(x=>x.id===projetoAtivo);if(pr)pr.objetivos=this.value;">'+esc(p.objetivos||'')+'</textarea></div>';
    const reuVinc=transcricoes.filter(r=>String(r.projetoId)===String(p.id));
    if(reuVinc.length){
      el.innerHTML+='<div class="form-group" style="border-top:1px solid var(--border);padding-top:12px;"><label class="form-label">Reuniões vinculadas</label>'+
        reuVinc.map(r=>'<div onclick="closeModal(\'modal-projeto\');abrirReuniaoModal('+r.id+')" style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px;"><i class="fa-solid fa-microphone-lines" style="color:var(--rose);"></i>'+esc(r.titulo||'(sem título)')+(r.data?'<span style="font-size:11px;color:var(--text3);margin-left:auto;">'+fd(r.data)+'</span>':'')+'</div>').join('')+
        '</div>';
    }
  } else if(aba==='notas'){
    el.innerHTML='<div class="form-group"><label class="form-label" style="font-size:11px;color:var(--text3);">Espaço livre para anotações — funciona como um documento</label>'+
      '<textarea class="form-input" rows="18" style="font-size:13.5px;line-height:1.8;font-family:var(--font-body);resize:vertical;" placeholder="Escreva aqui suas anotações, ideias, atas de reunião..." oninput="const pr=projetos.find(x=>x.id===projetoAtivo);if(pr)pr.notas=this.value;">'+esc(p.notas||'')+'</textarea></div>';
  } else if(aba==='tarefas'){
    const tarefasProj=tasks.filter(t=>t.projetoId===p.id);
    el.innerHTML='<div style="margin-bottom:12px;"><button class="btn btn-rose btn-sm" onclick="adicionarTarefaProjeto()"><i class="fa-solid fa-plus"></i> Nova Tarefa do Projeto</button></div>'+
      (tarefasProj.length===0?'<p style="color:var(--text3);font-size:13px;text-align:center;padding:20px;">Nenhuma tarefa ainda.</p>':
      tarefasProj.map(t=>'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">'+
        '<div onclick="toggleTask('+t.id+')" style="width:18px;height:18px;border-radius:50%;border:1.5px solid '+(t.done?'var(--sage)':'var(--border2)')+';background:'+(t.done?'var(--sage)':'transparent')+';cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;">'+(t.done?'<i class="fa-solid fa-check"></i>':'')+
        '</div><div style="flex:1;font-size:13px;'+(t.done?'text-decoration:line-through;color:var(--text3);':'')+'">'+esc(t.text)+'</div>'+
        '<button onclick="delTask('+t.id+');projMudarAba(\'tarefas\',document.getElementById(\'ptab-tarefas\'))" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;"><i class="fa-solid fa-xmark"></i></button></div>').join(''));
  }
}

function adicionarTarefaProjeto(){
  const p=projetos.find(x=>x.id===projetoAtivo);if(!p)return;
  const texto=prompt('Descrição da tarefa:');
  if(!texto||!texto.trim())return;
  const nova={id:Date.now(),text:texto.trim(),cat:'work',prio:'med',due:'',done:false,status:'todo',projetoId:p.id,projetoNome:p.nome};
  tasks.unshift(nova);
  renderTasks();renderKanban();fillFocusSel();
  projMudarAba('tarefas',document.getElementById('ptab-tarefas'));
}

function salvarProjeto(){
  renderProjetosKanban();
  showToast('Projeto salvo!','sage');
  closeModal('modal-projeto');
}

// ═══════════════════ REUNIÕES ═══════════════════
function abrirNovaReuniao(){
  const r={id:Date.now(),titulo:'',data:new Date().toISOString().split('T')[0],link:'',texto:'',resumo:'',projetoId:'',taskId:'',updates:[]};
  transcricoes.unshift(r);
  transcricaoAtiva=r.id;
  abrirReuniaoModal(r.id);
  renderReunioes();
}

function abrirReuniaoModal(id){
  const r=transcricoes.find(x=>x.id===id);if(!r)return;
  transcricaoAtiva=id;
  document.getElementById('r-titulo').value=r.titulo||'';
  document.getElementById('r-data').value=r.data||'';
  document.getElementById('r-link').value=r.link||'';
  document.getElementById('r-texto').value=r.texto||'';
  document.getElementById('r-resumo').value=r.resumo||'';
  const selP=document.getElementById('r-projeto');
  selP.innerHTML='<option value="">— Nenhum —</option>'+projetos.map(p=>'<option value="'+p.id+'"'+(String(r.projetoId)===String(p.id)?' selected':'')+'>'+esc(p.nome||'Projeto')+'</option>').join('');
  const selT=document.getElementById('r-tarefa');
  selT.innerHTML='<option value="">— Nenhuma —</option>'+tasks.filter(t=>!t.done).map(t=>'<option value="'+t.id+'"'+(String(r.taskId)===String(t.id)?' selected':'')+'>'+esc(t.text)+'</option>').join('');
  renderReuniaoUpdates();
  document.getElementById('modal-reuniao').classList.add('open');
}

function lerArquivoTranscricao(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){ document.getElementById('r-texto').value=e.target.result; };
  reader.readAsText(file);
}

async function gerarResumoReuniao(){
  const texto=document.getElementById('r-texto').value.trim();
  if(!texto){showToast('Cole a transcrição ou anotações primeiro.','peach');return;}
  showToast('Gerando resumo...','sage');
  try{
    const resumo=await callAI(
      'Você é um assistente que resume reuniões de forma clara e objetiva em português. Produza: 1) um resumo breve, 2) principais decisões, 3) próximos passos/tarefas. Use markdown simples.',
      [{role:'user',content:'Resuma esta reunião:\n\n'+texto.substring(0,12000)}],
      1500
    );
    document.getElementById('r-resumo').value=resumo;
    showToast('Resumo gerado!','sage');
  }catch(e){
    showToast('Erro ao gerar resumo: configure a chave de IA nas configurações.','vermelha');
  }
}

function salvarReuniao(){
  const r=transcricoes.find(x=>x.id===transcricaoAtiva);if(!r)return;
  r.titulo=document.getElementById('r-titulo').value.trim();
  r.data=document.getElementById('r-data').value;
  r.link=document.getElementById('r-link').value.trim();
  r.texto=document.getElementById('r-texto').value;
  r.resumo=document.getElementById('r-resumo').value;
  r.projetoId=document.getElementById('r-projeto').value;
  r.taskId=document.getElementById('r-tarefa').value;
  renderReunioes();
  showToast('Reunião salva!','sage');
  closeModal('modal-reuniao');
}

function apagarReuniao(){
  const r=transcricoes.find(x=>x.id===transcricaoAtiva);if(!r)return;
  if(!confirm('Apagar "'+(r.titulo||'esta reunião')+'"?'))return;
  transcricoes=transcricoes.filter(x=>x.id!==transcricaoAtiva);
  closeModal('modal-reuniao');
  renderReunioes();
  showToast('Reunião apagada.','peach');
}

function adicionarUpdateReuniao(){
  const r=transcricoes.find(x=>x.id===transcricaoAtiva);if(!r)return;
  const txt=document.getElementById('r-nova-update').value.trim();if(!txt)return;
  if(!r.updates)r.updates=[];
  r.updates.push({texto:txt,data:new Date().toISOString()});
  document.getElementById('r-nova-update').value='';
  renderReuniaoUpdates();
}

function renderReuniaoUpdates(){
  const r=transcricoes.find(x=>x.id===transcricaoAtiva);if(!r)return;
  const ups=r.updates||[];
  document.getElementById('r-updates-list').innerHTML=ups.length===0
    ?'<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;">Nenhuma atualização.</div>'
    :ups.map((u,i)=>'<div style="padding:7px 0;border-bottom:1px solid var(--border);"><div style="display:flex;justify-content:space-between;"><span style="font-size:10px;color:var(--text3);">'+new Date(u.data).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'</span><button onclick="removerUpdateReuniao('+i+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;"><i class="fa-solid fa-xmark"></i></button></div><div style="font-size:12.5px;white-space:pre-wrap;">'+esc(u.texto)+'</div></div>').reverse().join('');
}

function removerUpdateReuniao(idx){
  const r=transcricoes.find(x=>x.id===transcricaoAtiva);if(!r||!r.updates)return;
  r.updates.splice(idx,1);renderReuniaoUpdates();
}

function renderReunioes(){
  const el=document.getElementById('reunioes-grid');if(!el)return;
  if(transcricoes.length===0){el.innerHTML='<div style="grid-column:1/-1;text-align:center;color:var(--text3);font-size:13px;padding:30px;">Nenhuma reunião registrada. Clique em "Nova Reunião".</div>';return;}
  el.innerHTML=transcricoes.map(r=>{
    const proj=r.projetoId?projetos.find(p=>String(p.id)===String(r.projetoId)):null;
    const tk=r.taskId?tasks.find(t=>String(t.id)===String(r.taskId)):null;
    return '<div onclick="abrirReuniaoModal('+r.id+')" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\'var(--bg2)\'">'+
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><i class="fa-solid fa-microphone-lines" style="color:var(--rose);"></i><div style="font-size:14px;font-weight:600;flex:1;">'+esc(r.titulo||'(sem título)')+'</div></div>'+
      (r.data?'<div style="font-size:11px;color:var(--text3);margin-bottom:6px;"><i class="fa-regular fa-calendar"></i> '+fd(r.data)+'</div>':'')+
      (r.resumo?'<div style="font-size:12px;color:var(--text2);max-height:60px;overflow:hidden;margin-bottom:8px;">'+esc(r.resumo.substring(0,140))+'...</div>':'<div style="font-size:12px;color:var(--text3);margin-bottom:8px;">Sem resumo ainda.</div>')+
      '<div style="display:flex;gap:5px;flex-wrap:wrap;">'+
      (r.link?'<span style="font-size:9.5px;background:var(--sky-light);color:var(--sky);padding:1px 6px;border-radius:8px;"><i class="fa-solid fa-paperclip"></i> arquivo</span>':'')+
      (proj?'<span style="font-size:9.5px;background:var(--lav-light);color:var(--lavender);padding:1px 6px;border-radius:8px;">'+esc(proj.nome||'projeto')+'</span>':'')+
      (tk?'<span style="font-size:9.5px;background:var(--sage-light);color:var(--sage);padding:1px 6px;border-radius:8px;">✓ tarefa</span>':'')+
      ((r.updates&&r.updates.length)?'<span style="font-size:9.5px;color:var(--text3);"><i class="fa-solid fa-message"></i> '+r.updates.length+'</span>':'')+
      '</div></div>';
  }).join('');
}

function renderProjetosKanban(){
  const el=document.getElementById('projetos-kanban');if(!el)return;
  el.innerHTML=PROJ_STATUS.map(st=>{
    const cards=projetos.filter(p=>p.status===st.id);
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px;min-height:160px;">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'+
      '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:'+st.color+';">'+st.label+'</div>'+
      '<div style="font-size:11px;background:var(--bg3);padding:1px 6px;border-radius:10px;color:var(--text3);">'+cards.length+'</div></div>'+
      cards.map(p=>{
        const tarefasTotal=tasks.filter(t=>t.projetoId===p.id).length;
        const tarefasDone=tasks.filter(t=>t.projetoId===p.id&&t.done).length;
        return '<div onclick="abrirProjetoModal('+p.id+')" style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);padding:12px;cursor:pointer;margin-bottom:8px;transition:background 0.15s;" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'var(--bg3)\'">'+
          '<div style="font-size:13px;font-weight:600;margin-bottom:4px;">'+esc(p.nome||'(sem nome)')+'</div>'+
          (p.tempoEstimado?'<div style="font-size:11px;color:var(--text3);margin-bottom:3px;"><i class="fa-regular fa-clock"></i> '+esc(p.tempoEstimado)+'</div>':'')+
          (p.colaboradores?'<div style="font-size:11px;color:var(--text3);margin-bottom:3px;"><i class="fa-solid fa-users" style="font-size:10px;"></i> '+esc(p.colaboradores)+'</div>':'')+
          (tarefasTotal>0?'<div style="font-size:11px;color:var(--sage);">✅ '+tarefasDone+'/'+tarefasTotal+' tarefas</div>':'')+
          '</div>';
      }).join('')+
      '</div>';
  }).join('');
}

// ═══════════════════ COMPRAS ═══════════════════
let _compraEditId = null;

function abrirNovaCompra(){
  _compraEditId = null;
  document.getElementById('modal-compra-title').textContent = 'Nova Compra';
  const hoje = new Date().toISOString().split('T')[0];
  const mes = hoje.substring(0,7);
  document.getElementById('c-mes').value = mes;
  document.getElementById('c-datacompra').value = hoje;
  document.getElementById('c-datapag').value = '';
  document.getElementById('c-item').value = '';
  document.getElementById('c-fornecedor').value = '';
  document.getElementById('c-forma').value = '';
  document.getElementById('c-valor').value = '';
  document.getElementById('c-repassar').value = 'nao';
  document.getElementById('c-valorrepasse').value = '';
  document.getElementById('c-obs').value = '';
  document.getElementById('c-repasse-group').style.display = 'none';
  document.getElementById('c-margem').checked=false;
  _preencherSelectImoveisCompra();
  document.getElementById('modal-compra').classList.add('open');
  setTimeout(()=>document.getElementById('c-item').focus(), 100);
}

function abrirEditarCompra(id){
  const c = comprasList.find(x=>x.id===id); if(!c) return;
  _compraEditId = id;
  document.getElementById('modal-compra-title').textContent = 'Editar Compra';
  document.getElementById('c-mes').value = c.mesVigente||'';
  document.getElementById('c-datacompra').value = c.dataCompra||'';
  document.getElementById('c-datapag').value = c.dataPagamento||'';
  document.getElementById('c-item').value = c.item||'';
  document.getElementById('c-fornecedor').value = c.fornecedor||'';
  document.getElementById('c-forma').value = c.formaPagamento||'';
  document.getElementById('c-valor').value = c.valor||'';
  document.getElementById('c-repassar').value = c.repassar?'sim':'nao';
  document.getElementById('c-valorrepasse').value = c.valorRepassar||'';
  document.getElementById('c-obs').value = c.observacoes||'';
  document.getElementById('c-repasse-group').style.display = c.repassar?'':'none';
  document.getElementById('c-margem').checked=!!c.margemOperacional;
  _preencherSelectImoveisCompra();
  document.getElementById('c-imovel').value = c.imovelId||'';
  document.getElementById('modal-compra').classList.add('open');
}

function _preencherSelectImoveisCompra(){
  const sel = document.getElementById('c-imovel');
  if(!sel) return;
  const val = sel.value;
  const todos = [
    ...imovelsCatalog.map(im=>({id:'cat_'+im.id, nome:im.nome})),
    ...imoveis.filter(im=>im.status!=='perdido').map(im=>({id:'ob_'+im.id, nome:(im.nome||'Sem nome')+' (Onboarding)'}))
  ];
  sel.innerHTML = '<option value="">Nenhum / Geral</option>' +
    todos.map(im=>'<option value="'+im.id+'"'+(im.id===val?' selected':'')+'>'+esc(im.nome)+'</option>').join('');
}

function toggleRepasse(v){
  document.getElementById('c-repasse-group').style.display = v==='sim' ? '' : 'none';
}

function salvarCompraItem(){
  const item = document.getElementById('c-item').value.trim();
  if(!item){ document.getElementById('c-item').focus(); return; }
  const imovelId = document.getElementById('c-imovel').value;
  let imovelNome = '';
  if(imovelId.startsWith('cat_')){
    const catId = imovelId.replace('cat_','');
    const found = imovelsCatalog.find(x=>x.id===catId);
    imovelNome = found ? found.nome : '';
  } else if(imovelId.startsWith('ob_')){
    const obId = parseInt(imovelId.replace('ob_',''));
    const found = imoveis.find(x=>x.id===obId);
    imovelNome = found ? (found.nome||'Sem nome') : '';
  }
  const repassar = document.getElementById('c-repassar').value === 'sim';
  const compra = {
    id: _compraEditId || Date.now(),
    mesVigente: document.getElementById('c-mes').value,
    dataCompra: document.getElementById('c-datacompra').value,
    dataPagamento: document.getElementById('c-datapag').value,
    item,
    imovelId,
    imovelNome,
    formaPagamento: document.getElementById('c-forma').value,
    valor: parseFloat(document.getElementById('c-valor').value)||0,
    repassar,
    valorRepassar: repassar ? (parseFloat(document.getElementById('c-valorrepasse').value)||0) : 0,
    observacoes: document.getElementById('c-obs').value.trim(),
    fornecedor: document.getElementById('c-fornecedor').value.trim(),
    margemOperacional: document.getElementById('c-margem').checked,
  };
  if(_compraEditId){
    const idx = comprasList.findIndex(x=>x.id===_compraEditId);
    if(idx>=0) comprasList[idx] = compra;
  } else {
    comprasList.unshift(compra);
  }
  closeModal('modal-compra');
  renderCompras();
  sincronizarMargemKPI();
  showToast(_compraEditId ? 'Compra atualizada!' : 'Compra registrada!', 'sage');
  _compraEditId = null;
}

function deletarCompra(id){
  if(!confirm('Apagar esta compra?')) return;
  comprasList = comprasList.filter(x=>x.id!==id);
  renderCompras();
  showToast('Compra apagada.','peach');
}

function renderCompras(){
  sincronizarMargemKPI();
  const filtroImovel = document.getElementById('compras-filtro-imovel');
  if(filtroImovel){
    const val = filtroImovel.value;
    const todos = [
      ...imovelsCatalog.map(im=>({id:'cat_'+im.id, nome:im.nome})),
      ...imoveis.filter(im=>im.status!=='perdido').map(im=>({id:'ob_'+im.id, nome:(im.nome||'Sem nome')+' (OB)'}))
    ];
    filtroImovel.innerHTML = '<option value="">Todos os imóveis</option>' +
      todos.map(im=>'<option value="'+im.id+'"'+(im.id===val?' selected':'')+'>'+esc(im.nome)+'</option>').join('');
  }
  const filtroMes = document.getElementById('compras-filtro-mes');
  if(filtroMes && !filtroMes.value) filtroMes.value = new Date().toISOString().substring(0,7);
  const mes = filtroMes ? filtroMes.value : '';
  const imovelF = filtroImovel ? filtroImovel.value : '';
  const repassarF = document.getElementById('compras-filtro-repassar') ? document.getElementById('compras-filtro-repassar').value : '';
  let lista = comprasList.filter(c=>{
    if(mes && c.mesVigente !== mes) return false;
    if(imovelF && c.imovelId !== imovelF) return false;
    if(repassarF === 'sim' && !c.repassar) return false;
    if(repassarF === 'nao' && c.repassar) return false;
    return true;
  });
  const totalGasto = lista.reduce((s,c)=>s+c.valor,0);
  const totalRepasse = lista.filter(c=>c.repassar).reduce((s,c)=>s+c.valorRepassar,0);
  const pendPagamento = lista.filter(c=>!c.dataPagamento).length;
  const resumoEl = document.getElementById('compras-resumo');
  if(resumoEl){
    resumoEl.innerHTML = [
      {label:'Total Gasto',     val:brl(totalGasto),   c:'rose',  icon:'fa-receipt'},
      {label:'Total a Repassar',val:brl(totalRepasse), c:'sage',  icon:'fa-arrow-right-arrow-left'},
      {label:'Nº de Compras',   val:lista.length,      c:'sky',   icon:'fa-cart-shopping'},
      {label:'Sem Data Pag.',   val:pendPagamento,     c:'peach', icon:'fa-calendar-xmark'},
    ].map(x=>
      '<div class="metric-card '+x.c+'">'+
      '<div class="metric-icon '+x.c+'"><i class="fa-solid '+x.icon+'"></i></div>'+
      '<div class="metric-value" style="font-size:22px;">'+x.val+'</div>'+
      '<div class="metric-label">'+x.label+'</div>'+
      '</div>'
    ).join('');
  }
  const tbody = document.getElementById('compras-tbody');
  if(!tbody) return;
  const FORMA_LABELS = {pix:'PIX',credito:'Crédito',debito:'Débito',boleto:'Boleto',dinheiro:'Dinheiro',transferencia:'Transf.'};
  if(lista.length===0){
    tbody.innerHTML='<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--text3);font-size:13px;">Nenhuma compra encontrada com os filtros atuais.</td></tr>';
    return;
  }
  tbody.innerHTML = lista.map(c=>
    '<tr>'+
    '<td style="white-space:nowrap;font-size:12px;">'+(c.mesVigente||'—')+'</td>'+
    '<td style="white-space:nowrap;font-size:12px;">'+(c.dataCompra?fd(c.dataCompra):'—')+'</td>'+
    '<td style="white-space:nowrap;font-size:12px;">'+(c.dataPagamento?fd(c.dataPagamento):'<span style="color:var(--peach);">Pendente</span>')+'</td>'+
    '<td style="font-size:12.5px;font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(c.item)+(c.margemOperacional?' <span style="font-size:9px;background:var(--peach-light);color:var(--peach);padding:1px 5px;border-radius:8px;font-weight:600;">margem op.</span>':'')+'</td>'+
    '<td style="font-size:12px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(c.imovelNome||'—')+'</td>'+
    '<td style="font-size:12px;">'+esc(c.fornecedor||'—')+'</td>'+
    '<td style="font-size:12px;"><span style="background:var(--bg3);padding:1px 7px;border-radius:8px;font-size:11px;">'+(FORMA_LABELS[c.formaPagamento]||c.formaPagamento)+'</span></td>'+
    '<td style="font-size:13px;font-weight:600;color:var(--vermelha);white-space:nowrap;">'+brl(c.valor)+'</td>'+
    '<td style="text-align:center;">'+(c.repassar?'<span style="color:var(--sage);font-weight:700;font-size:12px;">Sim</span>':'<span style="color:var(--text3);font-size:12px;">Não</span>')+'</td>'+
    '<td style="font-size:13px;font-weight:600;color:var(--sage);white-space:nowrap;">'+(c.repassar?brl(c.valorRepassar):'—')+'</td>'+
    '<td style="font-size:12px;color:var(--text3);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+esc(c.observacoes||'')+'">'+esc(c.observacoes||'—')+'</td>'+
    '<td style="white-space:nowrap;">'+
    '<button onclick="abrirEditarCompra('+c.id+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 5px;" title="Editar"><i class="fa-solid fa-pen"></i></button>'+
    '<button onclick="deletarCompra('+c.id+')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 5px;" title="Apagar" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-trash"></i></button>'+
    '</td>'+
    '</tr>'
  ).join('');
}

function exportarComprasCSV(){
  const mes = document.getElementById('compras-filtro-mes').value;
  const lista = mes ? comprasList.filter(c=>c.mesVigente===mes) : comprasList;
  const FORMA_LABELS = {pix:'PIX',credito:'Crédito',debito:'Débito',boleto:'Boleto',dinheiro:'Dinheiro',transferencia:'Transferência'};
  const header = 'Mês Vigente,Data Compra,Data Pagamento,Item,Imóvel,Fornecedor,Forma Pagamento,Valor,Repassar,Valor Repasse,Observações';
  const rows = lista.map(c=>[
    c.mesVigente||'',c.dataCompra||'',c.dataPagamento||'',
    '"'+(c.item||'').replace(/"/g,'""')+'"',
    '"'+(c.imovelNome||'').replace(/"/g,'""')+'"',
    '"'+(c.fornecedor||'').replace(/"/g,'""')+'"',
    FORMA_LABELS[c.formaPagamento]||c.formaPagamento,
    c.valor.toFixed(2).replace('.',','),
    c.repassar?'Sim':'Não',
    c.valorRepassar.toFixed(2).replace('.',','),
    '"'+(c.observacoes||'').replace(/"/g,'""')+'"'
  ].join(','));
  const csv = [header,...rows].join('\n');
  const blob = new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download='compras_'+(mes||'todas')+'.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV exportado!','sage');
}

function abrirGerenciarImoveisCatalog(){
  renderCatalogImoveisList();
  document.getElementById('modal-catalog-imoveis').classList.add('open');
}

function renderCatalogImoveisList(){
  const el=document.getElementById('catalog-imoveis-list');if(!el)return;
  el.innerHTML=imovelsCatalog.map((im,i)=>
    '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);">'+
    '<span style="flex:1;font-size:12.5px;">'+esc(im.nome)+'</span>'+
    '<button onclick="removerCatalogImovel(\''+im.id+'\')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;" onmouseover="this.style.color=\'var(--vermelha)\'" onmouseout="this.style.color=\'var(--text3)\'"><i class="fa-solid fa-xmark"></i></button>'+
    '</div>'
  ).join('')||'<div style="color:var(--text3);font-size:13px;text-align:center;padding:12px;">Nenhum imóvel no catálogo.</div>';
}

function adicionarCatalogImovel(){
  const el=document.getElementById('new-catalog-imovel');if(!el)return;
  const nome=el.value.trim();if(!nome)return;
  const id='c-'+Date.now();
  imovelsCatalog.push({id,code:'',nome});
  el.value='';
  renderCatalogImoveisList();
  showToast('"'+nome+'" adicionado ao catálogo!','sage');
}

function removerCatalogImovel(id){
  imovelsCatalog=imovelsCatalog.filter(x=>x.id!==id);
  renderCatalogImoveisList();
}

function showToast(msg, color) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--'+color+');border-radius:var(--r-sm);padding:12px 16px;font-size:13px;box-shadow:var(--shadow-md);z-index:999;max-width:320px;animation:toastIn 0.2s ease;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function getFileIcon(mimeOrName) {
  const m = (mimeOrName || '').toLowerCase();
  if (m.includes('spreadsheet') || m.endsWith('.xlsx') || m.endsWith('.csv')) return '📊';
  if (m.includes('presentation') || m.endsWith('.pptx')) return '📑';
  if (m.includes('pdf')) return '📄';
  if (m.includes('image') || m.endsWith('.png') || m.endsWith('.jpg')) return '🖼️';
  if (m.includes('folder')) return '📁';
  if (m.includes('video')) return '🎬';
  if (m.includes('audio')) return '🎵';
  if (m.includes('zip') || m.includes('archive')) return '📦';
  return '📝';
}

function getFileTypeName(mime) {
  if (!mime) return 'Arquivo';
  if (mime.includes('spreadsheet')) return 'Planilha';
  if (mime.includes('document')) return 'Documento';
  if (mime.includes('presentation')) return 'Apresentação';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('image')) return 'Imagem';
  if (mime.includes('folder')) return 'Pasta';
  if (mime.includes('text/plain')) return 'Texto';
  return 'Arquivo';
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escQ(s) { return String(s).replace(/'/g,"\'").replace(/"/g,'&quot;'); }

// Toast animation
const toastStyle = document.createElement('style');
toastStyle.textContent = '@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
document.head.appendChild(toastStyle);

// ═══════════════════ AUTOSAVE ═══════════════════
setInterval(saveAll, 4000);
window.addEventListener('beforeunload', saveAll);
window.addEventListener('visibilitychange', function(){ if(document.visibilityState==='hidden') saveAll(); });