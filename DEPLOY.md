# LexAI — Nasazení na Vercel (krok za krokem)

## Co potřebuješ

- Účet na [vercel.com](https://vercel.com) (Hobby = zdarma)
- Účet na [console.anthropic.com](https://console.anthropic.com) (Claude API)
- Git repozitář (GitHub / GitLab / Bitbucket)
- Cca 15 minut

---

## 1. Příprava Git repozitáře

```bash
git init
git add .
git commit -m "Initial LexAI deploy"
```

Nahraj na GitHub:
```bash
gh repo create lexai-trial --public --push
# nebo ručně na github.com → New repository
```

---

## 2. Import do Vercel

1. Jdi na [vercel.com/new](https://vercel.com/new)
2. Klikni **Import Git Repository**
3. Vyber svůj `lexai-trial` repozitář
4. Framework: **Other** (není Next.js ani nic jiného)
5. Klikni **Deploy** (první build selže kvůli chybějícím env vars — to je OK)

---

## 3. Přidání environment variables

V Vercel Dashboardu → Settings → **Environment Variables**:

| Proměnná | Hodnota |
|---|---|
| `ANTHROPIC_API_KEY` | Tvůj API klíč z [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `ADMIN_TOKEN` | Vymysli silné heslo, např. `lexai-admin-2025-xyz` |

---

## 4. Vytvoření Vercel KV databáze (pro ukládání kontaktů)

1. V Vercel Dashboardu přejdi na záložku **Storage**
2. Klikni **Create Database** → vyber **KV (Redis)**
3. Pojmenuj např. `lexai-kv`, region `Frankfurt (fra1)`
4. Klikni **Create**
5. Na stránce databáze klikni **Connect to Project** → vyber svůj projekt
6. Potvrď — Vercel automaticky přidá `KV_REST_API_URL` a `KV_REST_API_TOKEN` do env vars

---

## 5. Redeploy

Po přidání všech env vars:

```bash
# buď push nového commitu
git commit --allow-empty -m "trigger redeploy"
git push

# nebo v Vercel Dashboardu → Deployments → klikni ⋯ → Redeploy
```

---

## 6. Ověření

| URL | Co by mělo fungovat |
|---|---|
| `https://tvoj-projekt.vercel.app/` | Landing page |
| `https://tvoj-projekt.vercel.app/trial` | Trial aplikace |
| `https://tvoj-projekt.vercel.app/api/health` | `{"ok":true}` |
| `https://tvoj-projekt.vercel.app/admin?token=<ADMIN_TOKEN>` | Seznam kontaktů |

---

## 7. Vlastní doména (volitelné)

1. Vercel Dashboard → Settings → **Domains**
2. Přidej doménu (např. `lexai.cz`)
3. Nastav DNS záznamy dle instrukce Vercel

---

## Časté problémy

**`Error: API klíč není nakonfigurován`**
→ Zkontroluj env var `ANTHROPIC_API_KEY` v Vercel Settings

**`Kontakt se neuložil`**  
→ Zkontroluj, že KV databáze je propojena s projektem (Storage záložka v Dashboardu)

**`PDF se nenačte / 0 stran`**
→ Stránky PDF jsou obrázky (sken bez textu). PDF.js extrahuje pouze digitální text. Pro OCR podporu je potřeba serverové řešení (viz legal-assistant projekt).

**`Function timeout`**
→ Claude API může trvat 10–25 s pro složité dokumenty. Nastavení `maxDuration: 30` v `vercel.json` je dostatečné pro Hobby plán.

---

## Náklady

| Položka | Cena |
|---|---|
| Vercel Hobby | **Zdarma** |
| Vercel KV | **Zdarma** (30K operací/den) |
| Claude Sonnet API | ~$3 / 1M input tokens · ~$15 / 1M output tokens |
| Typický trial dotaz | ~0,03–0,08 Kč |
| 100 trial uživatelů × 5 dotazů | ~15–40 Kč |

---

## Struktura projektu

```
lexai-vercel/
├── api/
│   ├── ask.js        ← Claude API handler
│   ├── contact.js    ← Uložení kontaktů
│   └── admin.js      ← Admin přehled kontaktů
├── index.html        ← Landing page (/)
├── trial.html        ← Trial aplikace (/trial)
├── package.json
├── vercel.json
└── .env.example
```
