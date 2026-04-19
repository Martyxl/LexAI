export default async function handler(req, res) {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  let kvStatus = 'not configured';

  try {
    const { kv } = await import('@vercel/kv');
    await kv.set('health_ping', '1', { ex: 10 });
    kvStatus = 'ok';
  } catch (e) {
    kvStatus = 'error: ' + e?.constructor?.name;
  }

  return res.json({
    ok: hasKey,
    anthropic_key: hasKey ? 'set' : 'MISSING',
    kv: kvStatus,
    node: process.version,
    ts: new Date().toISOString(),
  });
}
