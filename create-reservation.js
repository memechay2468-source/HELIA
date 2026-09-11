const { UNIT_PRICE, supabase, reservationCode, send } = require('./_lib');

const VALID_DATES = new Set(['2026-09-19','2026-09-20','2026-09-21']);
const VALID_TIMES = new Set(['09:00','12:00','14:00','16:00']);
const VALID_METHODS = new Set(['Yape','Plin']);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });
  try {
    const { name, phone, address, deliveryDate, deliveryTime, quantity, paymentMethod } = req.body || {};
    const qty = Number(quantity);
    if (!name || !phone || !address) return send(res, 400, { error: 'Completa nombre, WhatsApp y dirección.' });
    if (!VALID_DATES.has(deliveryDate) || !VALID_TIMES.has(deliveryTime)) return send(res, 400, { error: 'Fecha u hora inválida.' });
    if (!VALID_METHODS.has(paymentMethod)) return send(res, 400, { error: 'Selecciona Yape o Plin.' });
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return send(res, 400, { error: 'Cantidad inválida.' });

    const code = reservationCode();
    const rows = await supabase('orders', {
      method: 'POST',
      body: JSON.stringify({
        reservation_code: code,
        customer_name: String(name).trim(),
        phone: String(phone).trim(),
        address: String(address).trim(),
        delivery_date: deliveryDate,
        delivery_time: `${deliveryTime}:00`,
        payment_method: paymentMethod,
        quantity: qty,
        unit_price: UNIT_PRICE,
        status: 'pending'
      })
    });

    return send(res, 200, {
      reservationCode: code,
      status: 'pending',
      amount: Number((qty * UNIT_PRICE).toFixed(2)),
      createdAt: rows?.[0]?.created_at || new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'No se pudo registrar la reserva.' });
  }
};
