module.exports = async function handler(req, res) {
  const result = {
    anthropic_key: !!process.env.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
    kv: 'not configured',
    anthropic_test: 'not tested',
    node: process.version,
    ts: new Date().toISOString(),
  };

  // Test KV
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set('health_ping', '1', { ex: 10 });
    result.kv = 'ok';
  } catch (e) {
    result.kv = 'error: ' + (e?.message?.slice(0, 100) || String(e));
  }

  // Test Anthropic — dynamic import (ESM-only package)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
      });
      result.anthropic_test = 'ok: ' + (response.content[0]?.text || '?');
    } catch (e) {
      result.anthropic_test = 'error: ' + (e?.message?.slice(0, 150) || String(e));
      result.anthropic_status = e?.status;
    }
  }

  return res.status(200).json(result);
};
