const { supabase, send, adminAuthorized } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Método no permitido.' });
  if (!adminAuthorized(req)) return send(res, 401, { error: 'Clave de administrador incorrecta.' });
  try {
    const status = String(req.query?.status || 'pending');
    const filter = ['pending','paid','cancelled','all'].includes(status) ? status : 'pending';
    const where = filter === 'all' ? '' : `status=eq.${filter}&`;
    const rows = await supabase(`orders?${where}select=id,reservation_code,customer_name,phone,address,delivery_date,delivery_time,payment_method,quantity,unit_price,status,paid_at,created_at&order=created_at.desc`, { prefer: 'return=minimal' });
    return send(res, 200, { orders: rows || [] });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'No se pudieron cargar las reservas.' });
  }
};
