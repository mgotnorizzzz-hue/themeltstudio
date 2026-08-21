import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '200kb' }));

// Allow the Netlify frontend to call this backend. Set NETLIFY_ORIGIN in Render.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.NETLIFY_ORIGIN;
  if (origin && allowed && origin === allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'CHANGE_THIS_SESSION_SECRET',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(express.static(__dirname));

const DATA = path.join(__dirname, 'orders.json');
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, '[]');
function readOrders() {
  try { return JSON.parse(fs.readFileSync(DATA, 'utf8') || '[]'); }
  catch { return []; }
}
function writeOrders(x) { fs.writeFileSync(DATA, JSON.stringify(x, null, 2)); }

const PICKUP = { lat: 19.1998211, lng: 72.842594 };
const DELIVERY_FEE = 25;
function normalizeAddress(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function isKandivaliWest(address) {
  const text = normalizeAddress(address);
  return text.includes('kandivali west') && !text.includes('kandivali east');
}
function nextOrderId(orders, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now).reduce((a, p) => (a[p.type] = p.value, a), {});
  const prefix = `TMS-${parts.year}${parts.month}${parts.day}-`;
  let max = 0;
  for (const o of orders) {
    const id = String(o.orderId || '');
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n)) max = Math.max(max, n);
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

app.get('/health', (req, res) => res.json({ ok: true, service: 'The Melt Studio backend' }));

app.post('/api/admin/login', async (req, res) => {
  const password = String(req.body?.password || '');
  const configured = process.env.ADMIN_PASSWORD || '';
  if (!configured) return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
  const ok = await bcrypt.compare(password, configured).catch(() => false) || password === configured;
  if (!ok) return res.status(401).json({ error: 'Incorrect owner password.' });
  req.session.isAdmin = true;
  res.json({ authenticated: true });
});

app.get('/api/admin/me', (req, res) => res.json({ authenticated: !!req.session?.isAdmin }));
app.post('/api/admin/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/admin/orders', requireAdmin, (req, res) => res.json(readOrders().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))));
app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const allowed = new Set(['Pending', 'Completed', 'Delivery enquiry']);
  const status = String(req.body?.status || '');
  if (!allowed.has(status)) return res.status(400).json({ error: 'Invalid status' });
  const orders = readOrders();
  const order = orders.find(o => o.orderId === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.status = status;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json(order);
});

app.get('/api/delivery-quote-address', (req, res) => {
  const address = String(req.query.address || '').trim();
  if (!address) return res.status(400).json({ error: 'Address is required' });
  if (!isKandivaliWest(address)) return res.status(422).json({ manualConfirmation: true, error: 'This address is outside Kandivali West. Please contact us on WhatsApp to confirm the delivery charge.' });
  res.json({ location: PICKUP, distanceKm: 0, fee: DELIVERY_FEE, partner: false, matchedArea: 'Kandivali West' });
});

function validateOrderBody(b) {
  return b?.customer?.name && b?.customer?.phone && b?.customer?.address && Array.isArray(b.items) && b.items.length;
}

app.post('/api/order-enquiry', (req, res) => {
  const b = req.body || {};
  if (!validateOrderBody(b)) return res.status(400).json({ error: 'Missing enquiry details' });
  const subtotal = Number(b.subtotal) || b.items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
  const orders = readOrders();
  const order = { orderId: nextOrderId(orders), createdAt: new Date().toISOString(), status: 'Delivery enquiry', customer: b.customer, items: b.items, delivery: { distanceKm: null, fee: null, partner: false, manualConfirmation: true }, subtotal, total: null };
  orders.push(order); writeOrders(orders);
  res.status(201).json({ orderId: order.orderId, status: order.status, subtotal: order.subtotal });
});

app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  if (!validateOrderBody(b)) return res.status(400).json({ error: 'Missing order details' });
  if (!isKandivaliWest(b.customer.address)) return res.status(422).json({ error: 'Outside Kandivali West. Please confirm delivery on WhatsApp.' });
  const lat = Number(b.location?.lat ?? PICKUP.lat), lng = Number(b.location?.lng ?? PICKUP.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ error: 'Invalid location' });
  const subtotal = b.items.reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 0), 0);
  const total = subtotal + DELIVERY_FEE;
  const orders = readOrders();
  const order = { orderId: nextOrderId(orders), createdAt: new Date().toISOString(), status: 'Pending', customer: b.customer, location: { lat, lng }, items: b.items, delivery: { distanceKm: 0, fee: DELIVERY_FEE, partner: false }, subtotal, total };
  orders.push(order); writeOrders(orders);
  res.status(201).json({ orderId: order.orderId, status: order.status, total: order.total });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => console.log(`The Melt Studio running on port ${PORT}`));
