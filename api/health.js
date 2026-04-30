export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  const result = {
    anthropic_key: key ? 'set' : 'MISSING',
    anthropic_test: 'not tested',
    node: process.version,
    ts: new Date().toISOString(),
  };

  if (key) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say OK' }],
        }),
      });
      const data = await r.json();
      result.http_status = r.status;
      result.anthropic_test = r.ok
        ? 'ok: ' + (data.content?.[0]?.text || '?')
        : 'error ' + r.status + ': ' + JSON.stringify(data.error || data);
    } catch (e) {
      result.anthropic_test = 'fetch error: ' + e.message;
    }
  }

  return res.status(200).json(result);
}
