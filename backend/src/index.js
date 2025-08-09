import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import Stripe from 'stripe'
dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 10000
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const ADMIN_ENV = process.env.ADMIN_KEY || 'changeme'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const DEPOSIT_AMOUNT_CENTS = parseInt(process.env.DEPOSIT_AMOUNT_CENTS || '5000', 10)
const DEPOSIT_CURRENCY = (process.env.DEPOSIT_CURRENCY || 'usd').toLowerCase()

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(s=>s.trim()), credentials: true }))
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('tiny'))

async function checkAdminKey(key){
  if (!key) return false
  const row = await prisma.adminSecret.findUnique({ where: { id: 1 }})
  if (row && row.keyHash && bcrypt.compareSync(key, row.keyHash)) return true
  if (key === ADMIN_ENV) return true
  return false
}
async function requireAdmin(req,res,next){
  const key = req.header('X-Admin-Key') || req.query.key
  if (!(await checkAdminKey(key))) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// Health
app.get('/api/health', (req,res)=>res.json({ ok:true }))

// Services
app.get('/api/services', async (req,res) => {
  res.json(await prisma.service.findMany({ orderBy: { id: 'asc' } }))
})

// Config
app.get('/api/config', async (req,res) => {
  const cfg = await prisma.config.findUnique({ where: { id: 1 }})
  res.json(JSON.parse(cfg.data))
})
app.put('/api/config', requireAdmin, async (req,res) => {
  await prisma.config.update({ where:{ id:1 }, data:{ data: JSON.stringify(req.body) } })
  res.json({ ok:true })
})

// Shades
app.get('/api/shades', async (req,res) => {
  const serviceId = Number(req.query.serviceId)
  if (!serviceId) return res.status(400).json({ error: 'serviceId required'})
  const rows = await prisma.serviceShade.findMany({ where: { serviceId, enabled: true }, orderBy: { label: 'asc' } })
  res.json(rows.map(r=>r.label))
})
app.get('/api/shades/list', async (req,res) => {
  const serviceId = Number(req.query.serviceId)
  if (!serviceId) return res.status(400).json({ error: 'serviceId required'})
  const rows = await prisma.serviceShade.findMany({ where: { serviceId }, orderBy: { label: 'asc' } })
  res.json(rows.map(r=>({ label: r.label, enabled: r.enabled })))
})
app.post('/api/shades/toggle', requireAdmin, async (req,res) => {
  const { serviceId, label, enabled } = req.body
  if (typeof serviceId!=='number' || !label || typeof enabled!=='boolean')
    return res.status(400).json({ error: 'serviceId number, label string, enabled boolean required'})
  await prisma.serviceShade.updateMany({ where:{ serviceId, label }, data:{ enabled } })
  res.json({ ok:true })
})

// Availability
function to12h(hhmm){
  const [H,M] = hhmm.split(':').map(Number)
  const ampm = H>=12 ? 'PM':'AM'
  const h = ((H+11)%12)+1
  return `${h}:${String(M).padStart(2,'0')} ${ampm}`
}

app.get('/api/availability', async (req,res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date (YYYY-MM-DD) required' })
  const cfg = JSON.parse((await prisma.config.findUnique({ where: { id: 1 }})).data)
  const d = new Date(date + 'T00:00:00Z')
  const dow = d.getUTCDay()
  if (cfg.closedDays.includes(dow)) return res.json({ slots: [] })
  let base = []
  if (dow >= 2 && dow <= 5) base = cfg.weekdaySlots
  else if (dow === 6)        base = cfg.saturdaySlots
  else if (dow === 0)        base = cfg.sundaySlots

  const bookings = await prisma.booking.findMany({ where: { date } })
  const booked = new Set(bookings.map(b => b.time))
  let slots = base.filter(t => !booked.has(t))

  if (dow === 6 && cfg.saturdayTwoHourSpacing) {
    const blockNext = new Set()
    for (const t of booked) {
      const [h,m] = t.split(':').map(Number)
      blockNext.add(`${String(h+1).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    }
    slots = slots.filter(t => !blockNext.has(t))
  }

  res.json({ slots: slots.map(t => ({ label: to12h(t), iso: `${date}T${t}:00Z`, time: t })) })
})

// ---- Deposit (Stripe) ----
app.get('/api/deposit/config', (req,res) => {
  res.json({ amountCents: DEPOSIT_AMOUNT_CENTS, currency: DEPOSIT_CURRENCY })
})

app.post('/api/deposit/session', async (req,res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' })
    const b = req.body || {}
    const required = ['name','phone','serviceId','shades','date','time']
    for (const k of required) {
      if (b[k] === undefined || b[k] === null || (typeof b[k]==='string' && !b[k].trim())) {
        return res.status(400).json({ error: `Missing ${k}` })
      }
    }
    if (!Array.isArray(b.shades) || !b.shades.length) {
      return res.status(400).json({ error: 'Pick at least one shade' })
    }

    // Create draft booking
    const booking = await prisma.booking.create({
      data: {
        name: b.name, phone: b.phone,
        brand: b.brand || null, model: b.model || null,
        serviceId: Number(b.serviceId),
        shades: b.shades.join(','),
        date: b.date, time: b.time,
        status: 'AWAITING_DEPOSIT'
      }
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: DEPOSIT_CURRENCY,
          product_data: { name: 'Window Tinting Deposit' },
          unit_amount: DEPOSIT_AMOUNT_CENTS
        },
        quantity: 1
      }],
      success_url: `${FRONTEND_URL}/success?booking=${booking.id}`,
      cancel_url: `${FRONTEND_URL}/?cancelled=1`,
      metadata: { bookingId: String(booking.id) }
    })

    res.json({ url: session.url })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// Raw body for Stripe webhook verification
import bodyParser from 'body-parser'
app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), async (req,res) => {
  try {
    if (!stripe) return res.status(500).end()
    const sig = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const bookingId = session.metadata?.bookingId
      if (bookingId) {
        await prisma.booking.update({
          where: { id: Number(bookingId) },
          data: { status: 'DEPOSIT_PAID' }
        })
      }
    }
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

// Booking endpoint (kept for non-deposit fallbacks if needed)
app.post('/api/book', async (req,res) => {
  try {
    const { name, phone, brand, model, serviceId, shades, windowArea, date, time } = req.body
    if (!name || !phone || !serviceId || !date || !time) return res.status(400).json({ error: 'name, phone, serviceId, date, time required' })
    if (!Array.isArray(shades) || !shades.length) return res.status(400).json({ error: 'Pick at least one tint shade' })

    const booking = await prisma.booking.create({
      data: { name, phone, brand: brand||null, model: model||null, serviceId, shades: shades.join(','), windowArea: windowArea||null, date, time }
    })
    res.json({ ok:true, booking })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin key change
app.post('/api/admin/key', async (req,res) => {
  try {
    const { oldKey, newKey } = req.body || {}
    if (!oldKey || !newKey) return res.status(400).json({ error: 'oldKey and newKey required' })
    const row = await prisma.adminSecret.findUnique({ where: { id: 1 }})
    const dbOk = row && row.keyHash && bcrypt.compareSync(oldKey, row.keyHash)
    const envOk = oldKey === ADMIN_ENV
    if (!dbOk && !envOk) return res.status(401).json({ error: 'Old key is incorrect' })
    const hash = bcrypt.hashSync(newKey, 10)
    await prisma.adminSecret.upsert({ where: { id: 1 }, update: { keyHash: hash }, create: { id: 1, keyHash: hash } })
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(PORT, ()=> console.log(`API listening on :${PORT}`))
