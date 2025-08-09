// admin-settings-route.js
// Drop-in route to serve a simple Admin Settings page without any template engine.
// How to use:
//   1) Put this file in your project (e.g., at the repo root or in src/)
//   2) In your src/index.js (after you create `app`), add:
//        const adminSettingsRoute = require('./admin-settings-route'); // adjust path if needed
//        adminSettingsRoute(app);
//   3) Deploy, then visit: https://<your-domain>/admin-settings

module.exports = function adminSettingsRoute(app) {
  // Quick health check route (optional)
  app.get('/admin-settings.test', (req, res) => res.json({ ok: true }));

  app.get('/admin-settings', async (req, res) => {
    try {
      // Read optional env data for display (safe defaults)
      const servicesUrl = '/api/services';
      const pricingUrl = '/api/windows/pricing';
      const bookingsUrl = '/api/bookings';
      const bookingsCsvUrl = '/api/bookings.csv';

      let businessHours = {};
      try {
        businessHours = JSON.parse(process.env.BUSINESS_HOURS_JSON ?? '{}');
      } catch (_) {
        businessHours = {};
      }

      const renderHours = (hoursObj) => {
        const entries = Object.entries(hoursObj || {});
        if (!entries.length) return '<p><em>No business hours configured.</em></p>';
        const rows = entries.map(([day, val]) => `<tr><td>${day}</td><td>${val}</td></tr>`).join('');
        return `<table class="tbl"><thead><tr><th>Day</th><th>Hours</th></tr></thead><tbody>${rows}</tbody></table>`;
      };

      res.status(200).send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin Settings</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; background:#0b0f12; color:#e6ebef; }
    .card { background:#11161a; border:1px solid #1b2329; border-radius:16px; padding:20px; margin:0 0 16px; box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset; }
    h1 { margin: 0 0 12px; font-size: 22px; }
    h2 { font-size: 16px; margin: 16px 0 8px; color:#b7ccd9; }
    a { color:#7cc4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
    .tbl { width:100%; border-collapse: collapse; border:1px solid #1b2329; }
    .tbl th, .tbl td { padding:8px 10px; border-top:1px solid #1b2329; text-align:left; }
    .muted { color:#94a8b3; font-size: 12px; }
    .row { display:flex; gap:8px; flex-wrap:wrap; }
    .btn { display:inline-block; padding:10px 14px; border-radius:10px; border:1px solid #2a3944; background:#0e1418; color:#e6ebef; }
    .btn:hover { background:#142027; }
    code { background:#0e1418; border:1px solid #1b2329; border-radius:8px; padding:2px 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Settings</h1>
    <p class="muted">This page is served directly by your API (no templates needed). Replace or extend as you like.</p>
    <div class="grid">
      <div class="card">
        <h2>Quick links</h2>
        <div class="row">
          <a class="btn" href="${servicesUrl}" target="_blank">View services (JSON)</a>
          <a class="btn" href="${pricingUrl}" target="_blank">View pricing (JSON)</a>
          <a class="btn" href="${bookingsUrl}" target="_blank">View bookings (JSON)</a>
          <a class="btn" href="${bookingsCsvUrl}" target="_blank">Download bookings CSV</a>
        </div>
      </div>
      <div class="card">
        <h2>Business hours</h2>
        ${renderHours(businessHours)}
        <p class="muted">Set <code>BUSINESS_HOURS_JSON</code> in Render → Environment to show your live hours here.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `);
    } catch (e) {
      console.error('admin-settings error', e);
      res.status(500).send('Internal error on /admin-settings');
    }
  });
};
const adminSettingsRoute = require('./admin-settings-route'); // adjust path if placed in src/
adminSettingsRoute(app);
