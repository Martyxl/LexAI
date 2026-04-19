import { getIP, checkRateLimit } from './_security.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // KV uvnitř handleru
  let kv = null;
  try { const m = await import('@vercel/kv'); kv = m.kv; } catch (_) {}

  const ip      = getIP(req);
  const allowed = await checkRateLimit(kv, `contact:${ip}`, { window: 3600, max: 5 });
  if (!allowed) return res.status(429).json({ error: 'Příliš mnoho registrací z této adresy.' });

  const { sessionId, name, email, company, volume } = req.body || {};

  if (!email?.includes('@') || email.length > 200) {
    return res.status(400).json({ error: 'Neplatný email.' });
  }

  const contact = {
    id:        typeof sessionId === 'string' ? sessionId.slice(0, 64) : 'unknown',
    name:      String(name    || '').trim().slice(0, 100),
    email:     String(email   || '').trim().toLowerCase().slice(0, 200),
    company:   String(company || '').trim().slice(0, 100),
    volume:    String(volume  || '').trim().slice(0, 50),
    timestamp: new Date().toISOString(),
    source:    'trial',
  };

  if (kv) {
    try {
      await kv.lpush('contacts', JSON.stringify(contact));
      await kv.set(`contact:${contact.email}`, JSON.stringify(contact), { ex: 86400 * 365 });
      const session = await kv.get(`s:${contact.id}`) ?? { c: 0, u: false };
      session.u = true;
      await kv.set(`s:${contact.id}`, session, { ex: 86400 * 7 });
    } catch (e) {
      console.error('[contact] KV error:', e.constructor?.name);
    }
  }

  return res.json({ success: true });
}
