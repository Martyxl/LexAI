function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).send('Unauthorized.');
  }

  let kv = null;
  try { kv = (await import('@vercel/kv')).kv; } catch (_) {}
  if (!kv) return res.status(503).send('KV není nakonfigurováno.');

  try {
    const raw = await kv.lrange('contacts', 0, -1);
    const contacts = raw.map(r => { try { return JSON.parse(r); } catch { return {}; } });
    const rows = contacts.map(c => `<tr>
      <td>${esc(c.timestamp?.slice(0,16)||'')}</td>
      <td><strong>${esc(c.name||'')}</strong></td>
      <td><a href="mailto:${esc(c.email||'')}">${esc(c.email||'')}</a></td>
      <td>${esc(c.company||'')}</td>
      <td>${esc(c.volume||'')}</td>
    </tr>`).join('');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html><html lang="cs"><head><meta charset="UTF-8">
<title>LexAI Kontakty (${contacts.length})</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;background:#f9fafb}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)}
th{background:#1e3248;color:#fff;padding:11px 16px;text-align:left;font-size:12px;text-transform:uppercase}
td{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:14px}
tr:hover td{background:#f0f9ff}a{color:#2563eb}</style></head><body>
<h1 style="margin-bottom:16px">LexAI — Kontakty (${contacts.length})</h1>
<table><thead><tr><th>Datum</th><th>Jméno</th><th>Email</th><th>Firma</th><th>Objem</th></tr></thead>
<tbody>${rows||'<tr><td colspan="5" style="text-align:center;padding:24px;color:#6b7280">Zatím žádné kontakty.</td></tr>'}</tbody>
</table></body></html>`);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
