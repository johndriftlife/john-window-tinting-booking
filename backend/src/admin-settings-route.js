// backend/src/admin-settings-route.js
// Admin Settings page (protected) with Shades toggle UI (mark in/out of stock).
// Uses the same admin middleware as your other admin routes.

export default function adminSettingsRoute(app, requireAdmin) {
  // Optional probe
  app.get('/admin-settings.test', (req, res) => res.json({ ok: true }));

  app.get('/admin-settings', requireAdmin, async (req, res) => {
    try {
      const servicesUrl = '/api/services';
      const pricingUrl = '/api/windows/pricing';
      const bookingsUrl = '/api/bookings';
      const bookingsCsvUrl = '/api/bookings.csv';

      let businessHours = {};
      try {
        businessHours = JSON.parse(process.env.BUSINESS_HOURS_JSON ?? '{}');
      } catch (_) { businessHours = {}; }

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
    :root{ --bg:#0b0f12; --card:#11161a; --line:#1b2329; --text:#e6ebef; --muted:#94a8b3; --accent:#7cc4ff; }
    *{ box-sizing:border-box }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin:0; padding:24px; background:var(--bg); color:var(--text); }
    .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:20px; margin:0 0 16px; }
    h1 { margin:0 0 12px; font-size:26px; }
    h2 { font-size:18px; margin: 16px 0 8px; color:#b7ccd9; }
    a { color:var(--accent); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .grid { display:grid; grid-template-columns:1fr; gap:16px; }
    @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
    .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .btn { display:inline-block; padding:10px 14px; border-radius:10px; border:1px solid #2a3944; background:#0e1418; color:var(--text); cursor:pointer; }
    .btn:hover { background:#142027; }
    .muted { color:var(--muted); font-size:13px; }
    .tbl { width:100%; border-collapse: collapse; border:1px solid var(--line); }
    .tbl th, .tbl td { padding:8px 10px; border-top:1px solid var(--line); text-align:left; }
    .select { padding:10px 12px; border-radius:10px; border:1px solid #2a3944; background:#0e1418; color:var(--text); }
    .pill { display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid var(--line); font-size:12px; }
    .ok { color:#3ddc97; border-color:#264f42; background:#0f1815; }
    .bad { color:#ff9b9b; border-color:#4f2626; background:#181010; }
    .kbd{ background:#0e1418; border:1px solid var(--line); border-radius:8px; padding:2px 6px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Admin Settings</h1>
    <p class="muted">Protected by your admin key. Replace or extend as you like.</p>

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
        <p class="muted">Set <span class="kbd">BUSINESS_HOURS_JSON</span> in Render → Environment to show your live hours here.</p>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Shades availability</h2>
    <p class="muted">Toggle individual window tint shades as <span class="pill ok">In stock</span> or <span class="pill bad">Out of stock</span>.</p>
    <div class="row" style="margin: 8px 0 16px;">
      <label for="svcSel">Service:</label>
      <select id="svcSel" class="select"></select>
      <button id="refreshBtn" class="btn">Refresh</button>
    </div>
    <div id="shadesArea"></div>
  </div>

<script>
(function(){
  const qs = new URLSearchParams(window.location.search);
  const adminKey = qs.get('key') || '';

  const svcSel = document.getElementById('svcSel');
  const shadesArea = document.getElementById('shadesArea');
  const refreshBtn = document.getElementById('refreshBtn');

  async function fetchJSON(url, opts={}) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  async function loadServices() {
    const list = await fetchJSON('/api/services');
    svcSel.innerHTML = list.map(s => '<option value="'+s.id+'">'+s.name+'</option>').join('');
  }

  function renderShadesTable(rows, serviceId) {
    const tbl = document.createElement('table');
    tbl.className = 'tbl';
    tbl.innerHTML = '<thead><tr><th>Shade</th><th>Status</th><th></th></tr></thead>';
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>'+r.label+'</td>'
        + '<td>' + (r.enabled ? '<span class="pill ok">In stock</span>' : '<span class="pill bad">Out of stock</span>') + '</td>';
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = r.enabled ? 'Mark out of stock' : 'Mark in stock';
      btn.onclick = async () => {
        btn.disabled = true; btn.textContent = 'Saving...';
        try {
          await fetch('/api/shades/toggle', {
            method: 'POST',
            headers: {
              'Content-Type':'application/json',
              'X-Admin-Key': adminKey
            },
            body: JSON.stringify({ serviceId: Number(serviceId), label: r.label, enabled: !r.enabled })
          });
          await loadShades(serviceId);
        } catch(e) {
          alert('Failed: ' + e.message);
        } finally {
          btn.disabled = false;
        }
      };
      const tdBtn = document.createElement('td');
      tdBtn.appendChild(btn);
      tr.appendChild(tdBtn);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    shadesArea.innerHTML = '';
    shadesArea.appendChild(tbl);
  }

  async function loadShades(serviceId) {
    const rows = await fetchJSON('/api/shades/list?serviceId='+serviceId);
    renderShadesTable(rows, serviceId);
  }

  refreshBtn.addEventListener('click', async ()=> {
    await loadShades(svcSel.value);
  });

  (async function init(){
    try {
      await loadServices();
      await loadShades(svcSel.value);
    } catch(e) {
      shadesArea.innerHTML = '<p class="muted">Failed to load shades. Make sure you opened this page with your key: <span class="kbd">?key=YOUR_ADMIN_KEY</span>.</p>';
      console.error(e);
    }
  })();
})();
</script>

</body>
</html>
      `);
    } catch (e) {
      console.error('admin-settings error', e);
      res.status(500).send('Internal error on /admin-settings');
    }
  });
}
