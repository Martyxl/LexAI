export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  let kv = null;
  try { kv = (await import('@vercel/kv')).kv; } catch (_) {}

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
      const sess = (await kv.get(`s:${contact.id}`)) || { c: 0, u: false };
      await kv.set(`s:${contact.id}`, { ...sess, u: true }, { ex: 86400 * 7 });
    } catch (e) { console.error('[contact] KV:', e?.message); }
  }

  return res.json({ success: true });
}
