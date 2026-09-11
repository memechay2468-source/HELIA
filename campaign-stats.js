const { supabase, send } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Método no permitido.' });
  try {
    const rows = await supabase('public_campaign_stats?select=paid_orders&limit=1', { prefer: 'return=minimal' });
    return send(res, 200, { paidOrders: Number(rows?.[0]?.paid_orders || 0) });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'No se pudo cargar el contador.' });
  }
};
