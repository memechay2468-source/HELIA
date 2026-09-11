const { supabase, send, adminAuthorized } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Método no permitido.' });
  if (!adminAuthorized(req)) return send(res, 401, { error: 'Clave de administrador incorrecta.' });
  try {
    const { reservationCode, action } = req.body || {};
    if (!reservationCode || !['confirm','cancel','restore'].includes(action)) return send(res, 400, { error: 'Solicitud inválida.' });

    let patch;
    if (action === 'confirm') patch = { status: 'paid', paid_at: new Date().toISOString() };
    if (action === 'cancel') patch = { status: 'cancelled', paid_at: null };
    if (action === 'restore') patch = { status: 'pending', paid_at: null };

    const rows = await supabase(`orders?reservation_code=eq.${encodeURIComponent(reservationCode)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    if (!rows?.length) return send(res, 404, { error: 'Reserva no encontrada.' });
    return send(res, 200, { ok: true, order: rows[0] });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'No se pudo actualizar la reserva.' });
  }
};
