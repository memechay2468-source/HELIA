const { supabase, send } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Método no permitido.' });
  try {
    const code = String(req.query?.reservationCode || '').trim();
    if (!code) return send(res, 400, { error: 'Ingresa tu código de reserva.' });
    const rows = await supabase(`orders?reservation_code=eq.${encodeURIComponent(code)}&select=reservation_code,customer_name,delivery_date,delivery_time,quantity,status,paid_at,created_at&limit=1`, { prefer: 'return=minimal' });
    if (!rows?.length) return send(res, 404, { error: 'No encontramos esa reserva.' });
    const o = rows[0];
    return send(res, 200, {
      reservationCode: o.reservation_code,
      name: o.customer_name,
      deliveryDate: o.delivery_date,
      deliveryTime: String(o.delivery_time || '').slice(0,5),
      quantity: o.quantity,
      status: o.status,
      paidAt: o.paid_at,
      createdAt: o.created_at
    });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'No se pudo consultar la reserva.' });
  }
};
