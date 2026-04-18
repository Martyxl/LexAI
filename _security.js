/**
 * Sdílené bezpečnostní helpery
 * Importuj: import { checkRateLimit, sanitizeInput, bindSession, ERRORS } from './_security.js'
 */

// ── Konstanty ──────────────────────────────────────────────────────────────
export const ERRORS = {
  RATE_LIMIT:   { status: 429, error: 'Příliš mnoho požadavků. Zkuste to za chvíli.' },
  BAD_INPUT:    { status: 400, error: 'Neplatný vstup.'   },
  SESSION_MISMATCH: { status: 403, error: 'Neplatná relace. Obnovte stránku.' },
  NO_API_KEY:   { status: 503, error: 'Služba není dostupná.' },
};

// ── IP extrakce ────────────────────────────────────────────────────────────
export function getIP(req) {
  return (
    req.headers['x-real-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  );
}

// ── Rate limiting (IP-based, přes Vercel KV) ────────────────────────────────
// Vrátí true pokud je přístup povolen, false pokud je překročen limit.
export async function checkRateLimit(kv, ip, { window = 60, max = 20 } = {}) {
  if (!kv || ip === 'unknown') return true; // fallback: povolíme

  const key = `rl:${ip}`;
  try {
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, window);
    return count <= max;
  } catch {
    return true; // KV výpadek = neblokujeme
  }
}

// ── Prompt injection guard ─────────────────────────────────────────────────
// Patterns, které se pokoušejí přepsat chování modelu.
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /forget\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+(a\s+)?(?:different|new|another)/i,
  /act\s+as\s+(?:if\s+you\s+(?:have\s+no|are)\s+|a\s+)(?:jailbreak|unrestricted|DAN)/i,
  /system\s*:\s*you/i,
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/,
  /\bDAN\b.*\bdo\s+anything/i,
  /pretend\s+(you\s+have\s+no\s+restrictions|to\s+be)/i,
];

export function detectInjection(text) {
  return INJECTION_PATTERNS.some(p => p.test(text));
}

// ── Sanitizace vstupu ─────────────────────────────────────────────────────
export function sanitizeQuestion(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .slice(0, 800)                     // max délka dotazu
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\0/g, '')                // null bytes
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, ''); // control chars
}

export function sanitizeText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .trim()
    .slice(0, 16000)
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

// ── Session-to-document binding ────────────────────────────────────────────
// Uloží hash textu pro danou session. Pokud session già má jiný hash →
// uživatel se snaží podstrčit jiný dokument do existující session.
export async function bindSessionToDoc(kv, sessionId, textHash) {
  if (!kv) return true; // bez KV neověřujeme
  const key = `dh:${sessionId}`;
  try {
    const stored = await kv.get(key);
    if (!stored) {
      await kv.set(key, textHash, { ex: 86400 * 2 });
      return true;
    }
    return stored === textHash;
  } catch {
    return true;
  }
}

// ── Jednoduchý FNV-1a hash textu (bez crypto API) ─────────────────────────
export function hashText(text) {
  const sample = text.slice(0, 2000); // hash z prvních 2000 znaků
  let h = 2166136261;
  for (let i = 0; i < sample.length; i++) {
    h ^= sample.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h.toString(16);
}
