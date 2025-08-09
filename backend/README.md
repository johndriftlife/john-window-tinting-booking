# Backend Package.json — Quick Fix

This adds a working `package.json` for your API service.

## Files
- `package.json` — dependencies + scripts for your current `src/index.js`
- `.nvmrc` — pins Node 20 (stable for Prisma/Express)

## Render settings (API service)
- **Root Directory:** (leave blank if package.json is at repo root; if you keep it in `backend/`, set Root Directory=`backend`)
- **Build Command:**
  ```
  npm install && npm run db:push && npm run seed
  ```
  (This runs `prisma db push` and `node prisma/seed.js` after installing.)
- **Start Command:**
  ```
  npm start
  ```
- **Environment:**
  - `NODE_VERSION = 20`
  - `ADMIN_KEY = 260687` (or your preferred value)
  - Your Stripe/Twilio/Sendgrid vars as before

## Stripe webhook ordering (optional but recommended)
Move the webhook route **before** `app.use(express.json())` so Stripe can read the raw body. Example:
```js
app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), handler);
// then later:
app.use(express.json({ limit: '1mb' }));
```

## After deploy
- Health: `https://john-window-tinting-booking.onrender.com/api/health` → `{"ok":true}`
- Admin: `https://john-window-tinting-booking.onrender.com/admin-settings?key=260687`
