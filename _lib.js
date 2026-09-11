const crypto = require('crypto');

const UNIT_PRICE = 69.90;
const GOAL = 200;

function send(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(payload));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
}

async function supabase(path, options = {}) {
  const base = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = requiredEnv('SUPABASE_SECRET_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const detail = typeof data === 'object' ? (data.message || data.hint || JSON.stringify(data)) : String(data || '');
    throw new Error(`Supabase: ${detail}`);
  }
  return data;
}

function reservationCode() {
  return `HA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function adminAuthorized(req) {
  const expected = process.env.ADMIN_KEY || '';
  const provided = String(req.headers['x-admin-key'] || '');
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { UNIT_PRICE, GOAL, send, supabase, reservationCode, adminAuthorized };
