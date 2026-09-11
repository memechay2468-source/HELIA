const API = '/api';
const BETA_MODE = location.protocol === 'file:' || new URLSearchParams(location.search).get('beta') === '1';
const BETA_KEY = 'ha_beta_orders_v1';
const $ = s => document.querySelector(s);
const els = { key: $('#adminKey'), login: $('#loginBtn'), logout: $('#logoutBtn'), panel: $('#adminPanel'), loginBox: $('#loginBox'), list: $('#ordersList'), filter: $('#statusFilter'), refresh: $('#refreshBtn'), status: $('#adminStatus'), total: $('#adminCount') };

function adminKey(){ return sessionStorage.getItem('ha_admin_key') || ''; }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function fmtDate(v){ return ({'2026-09-19':'19/09','2026-09-20':'20/09','2026-09-21':'21/09'})[v] || v; }
function fmtTime(v){ const t=String(v||'').slice(0,5); return ({'09:00':'9:00 a. m.','12:00':'12:00 p. m.','14:00':'2:00 p. m.','16:00':'4:00 p. m.'})[t]||t; }
function betaRows(){ try{return JSON.parse(localStorage.getItem(BETA_KEY)||'[]')}catch{return[]} }
function betaSave(rows){ localStorage.setItem(BETA_KEY,JSON.stringify(rows)); }
function betaRequest(path, options={}){
  if(path.startsWith('/admin-orders')){
    if(adminKey()!=='demo') throw new Error('En modo beta usa la clave: demo');
    const status=new URLSearchParams((path.split('?')[1]||'')).get('status')||'pending';
    let rows=betaRows(); if(status!=='all') rows=rows.filter(o=>o.status===status); return {orders:rows};
  }
  if(path==='/admin-update-order' && String(options.method||'GET').toUpperCase()==='POST'){
    if(adminKey()!=='demo') throw new Error('En modo beta usa la clave: demo');
    const {reservationCode,action}=JSON.parse(options.body||'{}'); const rows=betaRows(); const o=rows.find(x=>x.reservation_code===reservationCode); if(!o) throw new Error('Reserva no encontrada.');
    if(action==='confirm'){o.status='paid';o.paid_at=new Date().toISOString();} else if(action==='cancel'){o.status='cancelled';o.paid_at=null;} else if(action==='restore'){o.status='pending';o.paid_at=null;} else throw new Error('Acción inválida.');
    betaSave(rows); return {ok:true};
  }
  throw new Error('Acción beta no soportada.');
}
async function request(path, options={}){
  if(BETA_MODE) return betaRequest(path,options);
  try{
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type':'application/json', 'X-Admin-Key': adminKey(), ...(options.headers||{}) } });
    const data = await res.json().catch(()=>({})); if(!res.ok) throw new Error(data.error||'Error'); return data;
  }catch(err){ if(err instanceof TypeError || /fetch/i.test(String(err.message||''))) throw new Error('Backend no disponible. Para beta local abre admin.html?beta=1.'); throw err; }
}
function statusBadge(s){ return `<span class="admin-badge ${s}">${s==='paid'?'Pagado':s==='cancelled'?'Cancelado':'Pendiente'}</span>`; }
function render(orders){
  els.total.textContent = `${orders.length} reservas`;
  if(!orders.length){ els.list.innerHTML='<div class="admin-empty">No hay reservas en este estado.</div>'; return; }
  els.list.innerHTML = orders.map(o => `
    <article class="admin-order">
      <div class="admin-order-head"><div><strong>${escapeHtml(o.customer_name)}</strong><small>${escapeHtml(o.reservation_code)}</small></div>${statusBadge(o.status)}</div>
      <div class="admin-grid">
        <div><small>WhatsApp</small><a href="https://wa.me/51${escapeHtml(String(o.phone).replace(/\D/g,'').slice(-9))}" target="_blank">${escapeHtml(o.phone)}</a></div>
        <div><small>Pago</small><strong>${escapeHtml(o.payment_method)} · S/${(Number(o.quantity)*Number(o.unit_price)).toFixed(2)}</strong></div>
        <div><small>Entrega</small><strong>${fmtDate(o.delivery_date)} · ${fmtTime(o.delivery_time)}</strong></div>
        <div><small>Cantidad</small><strong>${o.quantity} ramo${o.quantity>1?'s':''}</strong></div>
        <div class="wide"><small>Dirección</small><strong>${escapeHtml(o.address)}</strong></div>
      </div>
      <div class="admin-actions">
        ${o.status!=='paid'?`<button data-action="confirm" data-code="${escapeHtml(o.reservation_code)}" class="admin-confirm">✓ Confirmar pago</button>`:''}
        ${o.status!=='cancelled'?`<button data-action="cancel" data-code="${escapeHtml(o.reservation_code)}" class="admin-cancel">Cancelar</button>`:''}
        ${o.status!=='pending'?`<button data-action="restore" data-code="${escapeHtml(o.reservation_code)}" class="admin-restore">Volver a pendiente</button>`:''}
      </div>
    </article>`).join('');
}
async function load(){
  els.status.textContent='Cargando…';
  try{ const data=await request(`/admin-orders?status=${encodeURIComponent(els.filter.value)}`); render(data.orders||[]); els.status.textContent=''; els.loginBox.hidden=true; els.panel.hidden=false; }
  catch(err){ els.status.textContent=err.message; if(err.message.toLowerCase().includes('clave')){ sessionStorage.removeItem('ha_admin_key'); els.loginBox.hidden=false; els.panel.hidden=true; } }
}
els.login.addEventListener('click',()=>{ if(!els.key.value.trim()) return; sessionStorage.setItem('ha_admin_key',els.key.value.trim()); load(); });
els.logout.addEventListener('click',()=>{sessionStorage.removeItem('ha_admin_key'); location.reload();});
els.refresh.addEventListener('click',load); els.filter.addEventListener('change',load);
els.list.addEventListener('click',async e=>{ const btn=e.target.closest('button[data-action]'); if(!btn)return; const action=btn.dataset.action, code=btn.dataset.code; if(action==='confirm'&&!confirm(`¿Confirmar pago de ${code}? Esto aumentará el contador público.`))return; if(action==='cancel'&&!confirm(`¿Cancelar ${code}?`))return; btn.disabled=true; try{ await request('/admin-update-order',{method:'POST',body:JSON.stringify({reservationCode:code,action})}); await load(); }catch(err){ alert(err.message); btn.disabled=false; } });
if(adminKey()) load();

if(BETA_MODE){ const b=document.createElement('div'); b.className='beta-banner'; b.textContent='🧪 MODO BETA LOCAL — usa clave demo. Los datos viven solo en este navegador.'; document.body.prepend(b); }
