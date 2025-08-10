// Lightweight Express server serving API + static frontend
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuid } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// --- Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

// --- In-memory store (Replace with a DB in production) ---
// NOTE: Render's filesystem is ephemeral; this is for demo/testing only.
const store = {
  bookings: [],
  settings: {
    services: [
      { id: 'carbon', name: 'Carbon Tint', price: 120 },
      { id: 'ceramic', name: 'Ceramic Tint', price: 180 }
    ],
    shades: [
      { id: '05', label: '5%' },
      { id: '15', label: '15%' },
      { id: '20', label: '20%' },
      { id: '35', label: '35%' }
    ],
    businessHours: {
      // 0=Sun..6=Sat
      0: [{ start: '10:00', end: '12:00' }], // Sun
      1: [], // Mon closed
      2: [{ start: '14:00', end: '17:00' }], // Tue
      3: [{ start: '14:00', end: '17:00' }], // Wed
      4: [{ start: '14:00', end: '17:00' }], // Thu
      5: [{ start: '14:00', end: '17:00' }], // Fri
      6: [{ start: '09:00', end: '17:00' }], // Sat
    },
    slotIntervalMinutes: 60
  }
};

// --- Admin key guard ---
function requireAdminKey(req, res, next) {
  const provided = (req.query.key || req.headers['x-admin-key'] || '').trim();
  const expected = (process.env.ADMIN_KEY || '').trim();
  if (!expected) return res.status(500).json({ error: 'ADMIN_KEY not set on server' });
  if (provided !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// --- API: Public bookings ---
app.get('/api/bookings', (req, res) => {
  res.json({ bookings: store.bookings });
});

app.post('/api/bookings', (req, res) => {
  const { name, email, phone, vehicle, serviceId, shadeId, date, time, notes } = req.body || {};
  if (!name || !phone || !serviceId || !date || !time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = uuid();
  const booking = {
    id, name, email, phone, vehicle, serviceId, shadeId, date, time, notes: notes || '',
    status: 'PENDING'
  };
  store.bookings.push(booking);
  res.json({ ok: true, booking });
});

// --- API: Admin (protected) ---
app.get('/api/admin/settings', requireAdminKey, (req, res) => {
  res.json(store.settings);
});

app.post('/api/admin/settings', requireAdminKey, (req, res) => {
  const { services, shades, businessHours, slotIntervalMinutes } = req.body || {};
  if (services) store.settings.services = services;
  if (shades) store.settings.shades = shades;
  if (businessHours) store.settings.businessHours = businessHours;
  if (slotIntervalMinutes) store.settings.slotIntervalMinutes = slotIntervalMinutes;
  res.json({ ok: true, settings: store.settings });
});

app.get('/api/admin/bookings', requireAdminKey, (req, res) => {
  res.json({ bookings: store.bookings });
});

// --- Static serving (frontend/public) ---
const staticDir = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(staticDir));

// Serve admin pages explicitly to avoid route issues
app.get('/admin-settings', (req, res) => {
  res.sendFile(path.join(staticDir, 'admin-settings.html'));
});

app.get('/admin-bookings', (req, res) => {
  res.sendFile(path.join(staticDir, 'admin-bookings.html'));
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
