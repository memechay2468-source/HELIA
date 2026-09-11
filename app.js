/* Huellas Amarillas — reserva pública + validación manual del pago */
const CONFIG = {
  goal: 200,
  unitPrice: 69.90,
  payPhoneDisplay: '954 863 571',
  payPhoneDigits: '954863571',
  whatsappDigits: '51954863571',
  apiBase: '/api',
  betaMode: location.protocol === 'file:' || new URLSearchParams(location.search).get('beta') === '1'
};

const $ = s => document.querySelector(s);
const els = {
  count: $('#ordersCount'), fill: $('#progressFill'), progress: $('.progress'), pct: $('#progressPct'), remaining: $('#remainingText'),
  form: $('#orderForm'), status: $('#formStatus'), qty: $('select[name="quantity"]'), summaryQty: $('#summaryQty'), summaryTotal: $('#summaryTotal'),
  submit: $('#orderForm button[type="submit"]'), post: $('#postReserveActions'), reserveCode: $('#reservationCode'), whatsappProof: $('#whatsappProof'),
  copyPayment: $('#copyPayment'), paymentNumber: $('#paymentNumber'), lookupForm: $('#lookupForm'), lookupCode: $('#lookupCode'), lookupStatus: $('#lookupStatus'),
  downloadCertificate: $('#downloadCertificate'), certificateCanvas: $('#certificateCanvas')
};

const money = value => `S/${Number(value).toFixed(2)}`;
let currentReservation = null;
let lastCertificate = null;

function renderCounter(value) {
  const count = Math.max(0, Number(value) || 0);
  const percent = Math.min(100, (count / CONFIG.goal) * 100);
  const remaining = Math.max(0, CONFIG.goal - count);
  els.count.textContent = count.toLocaleString('es-PE');
  els.fill.style.width = `${percent}%`;
  els.pct.textContent = `${Math.round(percent)}%`;
  els.progress.setAttribute('aria-valuenow', String(Math.min(CONFIG.goal, count)));
  els.remaining.textContent = count >= CONFIG.goal ? '🐾 ¡Meta alcanzada! Ya se activó la donación.' : `Faltan ${remaining} ${remaining === 1 ? 'preventa' : 'preventas'} para activar la donación.`;
}

function updateSummary() {
  const qty = Number(els.qty.value || 1);
  els.summaryQty.textContent = `${qty} × ${money(CONFIG.unitPrice)}`;
  els.summaryTotal.textContent = money(qty * CONFIG.unitPrice);
  els.submit.textContent = `Registrar reserva · ${money(qty * CONFIG.unitPrice)} 🌻🐾`;
}

const BETA_KEY = 'ha_beta_orders_v1';
function betaOrders(){ try { return JSON.parse(localStorage.getItem(BETA_KEY) || '[]'); } catch { return []; } }
function saveBetaOrders(rows){ localStorage.setItem(BETA_KEY, JSON.stringify(rows)); }
function betaCode(){ return `HA-BETA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
function betaApi(path, options = {}) {
  const rows = betaOrders();
  if (path === '/campaign-stats') return { paidOrders: rows.filter(o=>o.status==='paid').reduce((a,o)=>a+Number(o.quantity||0),0) };
  if (path === '/create-reservation' && String(options.method||'GET').toUpperCase()==='POST') {
    const o = JSON.parse(options.body || '{}');
    const code = betaCode();
    const row = { reservation_code:code, customer_name:o.name, phone:o.phone, address:o.address, delivery_date:o.deliveryDate, delivery_time:o.deliveryTime, payment_method:o.paymentMethod, quantity:Number(o.quantity||1), unit_price:CONFIG.unitPrice, status:'pending', created_at:new Date().toISOString(), paid_at:null };
    rows.unshift(row); saveBetaOrders(rows);
    return { reservationCode:code, status:'pending', amount:Number((row.quantity*CONFIG.unitPrice).toFixed(2)), createdAt:row.created_at, beta:true };
  }
  if (path.startsWith('/payment-status?')) {
    const code = new URLSearchParams(path.split('?')[1]||'').get('reservationCode');
    const o = rows.find(x=>x.reservation_code===code); if(!o) throw new Error('No encontramos esa reserva de prueba.');
    return { reservationCode:o.reservation_code, name:o.customer_name, deliveryDate:o.delivery_date, deliveryTime:o.delivery_time, quantity:o.quantity, status:o.status, paidAt:o.paid_at, createdAt:o.created_at, beta:true };
  }
  throw new Error('Esta acción no está disponible en modo beta local.');
}

async function api(path, options = {}) {
  if (CONFIG.betaMode) return betaApi(path, options);
  try {
    const res = await fetch(`${CONFIG.apiBase}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Servidor respondió ${res.status}.`);
    return data;
  } catch (err) {
    if (err instanceof TypeError || /fetch/i.test(String(err.message||''))) {
      throw new Error('El servidor de reservas no está disponible. Para probar sin backend abre la web con ?beta=1. Para una prueba real entre varios celulares, despliega en Vercel y configura Supabase.');
    }
    throw err;
  }
}

async function loadCounter() {
  try { const data = await api('/campaign-stats'); renderCounter(data.paidOrders || 0); }
  catch (err) { console.warn(err); renderCounter(0); }
}

function formatDeliveryDate(v) {
  return ({'2026-09-19':'19 de septiembre de 2026','2026-09-20':'20 de septiembre de 2026','2026-09-21':'21 de septiembre de 2026'})[v] || v;
}
function formatDeliveryTime(v) {
  return ({'09:00':'9:00 a. m.','12:00':'12:00 p. m.','14:00':'2:00 p. m.','16:00':'4:00 p. m.'})[String(v).slice(0,5)] || v;
}
function paidDate(v) {
  const d = v ? new Date(v) : new Date();
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(d);
}

function drawCertificate(cert) {
  const c = els.certificateCanvas, ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fffaf0'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#e0aa0a'; ctx.lineWidth = 18; ctx.strokeRect(42, 42, c.width - 84, c.height - 84);
  ctx.strokeStyle = '#5c3b28'; ctx.lineWidth = 3; ctx.strokeRect(70, 70, c.width - 140, c.height - 140);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0aa0a'; ctx.font = '700 34px Georgia'; ctx.fillText('HUELLAS AMARILLAS', 800, 145);
  ctx.fillStyle = '#2b251f'; ctx.font = '800 76px Georgia'; ctx.fillText('Constancia de participación solidaria', 800, 250);
  ctx.font = '32px Arial'; ctx.fillStyle = '#71685e'; ctx.fillText('Regala amor. Deja huella.', 800, 310);
  ctx.fillStyle = '#f8c51c'; ctx.beginPath(); ctx.arc(800, 405, 58, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5c3b28'; ctx.font = '68px Arial'; ctx.fillText('🐾', 800, 428);
  ctx.fillStyle = '#2b251f'; ctx.font = '30px Arial'; ctx.fillText('Se deja constancia de que', 800, 535);
  ctx.font = '700 62px Georgia'; ctx.fillStyle = '#5c3b28'; ctx.fillText(cert.name, 800, 615);
  ctx.font = '30px Arial'; ctx.fillStyle = '#2b251f';
  ctx.fillText('realizó una compra confirmada en la campaña Huellas Amarillas,', 800, 680);
  ctx.fillText('sumando su preventa a la meta solidaria que destinará el 50%', 800, 724);
  ctx.fillText('de la utilidad neta a albergues de animales al alcanzar 200 preventas.', 800, 768);
  ctx.font = '26px Arial'; ctx.fillStyle = '#71685e';
  ctx.fillText(`Reserva: ${cert.code}  ·  Pago confirmado: ${paidDate(cert.paidAt)}`, 800, 860);
  ctx.fillText(`Entrega: ${formatDeliveryDate(cert.deliveryDate)} · ${formatDeliveryTime(cert.deliveryTime)}`, 800, 905);
  ctx.fillText(`Cantidad: ${cert.quantity} ${cert.quantity === 1 ? 'ramo' : 'ramos'}`, 800, 950);
  ctx.font = '22px Arial';
  ctx.fillText('Esta constancia reconoce la participación en la campaña y no constituye un comprobante tributario.', 800, 1022);
}

function enableCertificate(data) {
  lastCertificate = { name: data.name, code: data.reservationCode, deliveryDate: data.deliveryDate, deliveryTime: data.deliveryTime, quantity: data.quantity, paidAt: data.paidAt };
  drawCertificate(lastCertificate);
  els.downloadCertificate.disabled = false;
}

function downloadCertificate() {
  if (!lastCertificate) return;
  drawCertificate(lastCertificate);
  const a = document.createElement('a');
  a.download = `constancia-huellas-amarillas-${lastCertificate.code}.png`;
  a.href = els.certificateCanvas.toDataURL('image/png');
  a.click();
}

function proofMessage(r) {
  return `Hola, acabo de registrar mi reserva de Huellas Amarillas.%0A%0ACódigo: ${encodeURIComponent(r.reservationCode)}%0ANombre: ${encodeURIComponent(r.name)}%0ACantidad: ${r.quantity}%0ATotal: ${encodeURIComponent(money(r.amount))}%0AEntrega: ${encodeURIComponent(formatDeliveryDate(r.deliveryDate))} - ${encodeURIComponent(formatDeliveryTime(r.deliveryTime))}%0AMétodo: ${encodeURIComponent(r.paymentMethod)}%0A%0AAdjunto mi comprobante de pago para que puedan confirmarlo.`;
}

els.form.addEventListener('submit', async event => {
  event.preventDefault();
  els.status.className = 'form-status';
  els.status.textContent = 'Registrando tu reserva…';
  els.post.hidden = true;
  const data = new FormData(els.form);
  const order = {
    name: String(data.get('name') || '').trim(), phone: String(data.get('phone') || '').trim(), address: String(data.get('address') || '').trim(),
    deliveryDate: String(data.get('deliveryDate') || ''), deliveryTime: String(data.get('deliveryTime') || ''), quantity: Number(data.get('quantity') || 1),
    paymentMethod: String(data.get('paymentMethod') || '')
  };
  try {
    const r = await api('/create-reservation', { method: 'POST', body: JSON.stringify(order) });
    currentReservation = { ...order, ...r };
    els.reserveCode.textContent = r.reservationCode;
    els.lookupCode.value = r.reservationCode;
    els.whatsappProof.href = `https://wa.me/${CONFIG.whatsappDigits}?text=${proofMessage(currentReservation)}`;
    els.post.hidden = false;
    els.status.className = 'form-status success';
    els.status.textContent = r.beta ? '🧪 Reserva de prueba registrada en este navegador. No es una reserva real y no se comparte con otros dispositivos.' : '✅ Reserva registrada. Ahora realiza el pago y envía tu comprobante por WhatsApp. El contador solo subirá cuando validemos el pago.';
    els.post.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    els.status.className = 'form-status error'; els.status.textContent = err.message;
  }
});

els.copyPayment?.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(CONFIG.payPhoneDigits); els.copyPayment.textContent = 'Copiado ✓'; setTimeout(() => els.copyPayment.textContent = 'Copiar número', 1600); }
  catch { /* no-op */ }
});
els.qty.addEventListener('change', updateSummary);
els.downloadCertificate.addEventListener('click', downloadCertificate);

els.lookupForm.addEventListener('submit', async event => {
  event.preventDefault();
  const code = String(els.lookupCode.value || '').trim();
  if (!code) return;
  els.lookupStatus.className = 'form-status'; els.lookupStatus.textContent = 'Consultando…';
  els.downloadCertificate.disabled = true; lastCertificate = null;
  try {
    const data = await api(`/payment-status?reservationCode=${encodeURIComponent(code)}`);
    if (data.status === 'paid') {
      els.lookupStatus.className = 'form-status success';
      els.lookupStatus.textContent = '✅ Pago confirmado. Tu preventa ya suma al contador y tu constancia está lista.';
      enableCertificate(data); loadCounter();
    } else if (data.status === 'cancelled') {
      els.lookupStatus.className = 'form-status error'; els.lookupStatus.textContent = 'Esta reserva fue cancelada.';
    } else {
      els.lookupStatus.textContent = '⏳ Tu reserva sigue pendiente de validación. Si ya enviaste el comprobante, revisaremos el pago antes de sumarlo al contador.';
    }
  } catch (err) { els.lookupStatus.className = 'form-status error'; els.lookupStatus.textContent = err.message; }
});

if (els.paymentNumber) els.paymentNumber.textContent = CONFIG.payPhoneDisplay;
updateSummary(); loadCounter(); setInterval(loadCounter, 30000);

if (CONFIG.betaMode) { document.documentElement.dataset.beta='true'; const b=document.createElement('div'); b.className='beta-banner'; b.textContent='🧪 MODO BETA LOCAL — las reservas se guardan solo en este navegador y no son reales.'; document.body.prepend(b); }
