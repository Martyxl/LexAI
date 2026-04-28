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
    const { kv } = require('@vercel/kv');
    await kv.set('health_ping', '1', { ex: 10 });
    result.kv = 'ok';
  } catch (e) {
    result.kv = 'error: ' + (e?.message || e?.constructor?.name);
  }

  // Test Anthropic SDK import + instantiation
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = require('@anthropic-ai/sdk');
      // Log what we actually get from require
      result.sdk_type = typeof Anthropic;
      result.sdk_keys = Object.keys(Anthropic).slice(0, 10).join(', ');

      // Try to find the right constructor
      const Client = Anthropic.default || Anthropic.Anthropic || Anthropic;
      result.client_type = typeof Client;

      const client = new Client({ apiKey: process.env.ANTHROPIC_API_KEY });
      result.client_created = 'ok';

      // Actually call the API with minimal request
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say OK' }],
      });
      result.anthropic_test = 'ok: ' + (response.content[0]?.text || '?');
    } catch (e) {
      result.anthropic_test = 'error: ' + (e?.message || e?.constructor?.name || String(e));
      result.anthropic_status = e?.status;
    }
  }

  return res.status(200).json(result);
};
