import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import Stripe from 'stripe'
import bodyParser from 'body-parser'
import sgMail from '@sendgrid/mail'
import twilio from 'twilio'
import { stringify } from 'csv-stringify'
dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 10000
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const ADMIN_ENV = process.env.ADMIN_KEY || 'changeme'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const DEPOSIT_PERCENT = parseFloat(process.env.DEPOSIT_PERCENT || '50')
const CURRENCY = (process.env.CURRENCY || 'eur').toLowerCase()

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null

// Email
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@example.com'

// SMS
const smsClient = (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null
const TWILIO_FROM = process.env.TWILIO_FROM || ''

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

// Pricing
const PRICING = {
  carbon: {
    'Front doors': 4000,
    'Rear doors': 4000,
    'Front windshield': 8000,
    'Rear windshield': 8000,
  },
  ceramic: {
    'Front doors': 6000,
    'Rear doors': 6000,
    'Front windshield': 10000,
    'Rear windshield': 10000,
  }
}

function calcTotals(serviceName, windows){
  const tier = serviceName.toLowerCase().includes('ceramic') ? 'ceramic' : 'carbon'
  const table = PRICING[tier]
  let total = 0
  for (const w of windows||[]) if (table[w] != null) total += table[w]
  const deposit = Math.round(total * (DEPOSIT_PERCENT/100))
  return { total, deposit, currency: CURRENCY }
}
app.get('/api/windows/pricing', async (req,res) => {
  res.json({ pricing: PRICING, percent: DEPOSIT_PERCENT, currency: CURRENCY })
})

// Notifications
async function notify(booking, subject, text){
  try{
    if (process.env.SENDGRID_API_KEY && booking.email) {
      await sgMail.send({ to: booking.email, from: process.env.FROM_EMAIL || 'no-reply@example.com', subject, text })
    }
    if (smsClient && booking.phone && TWILIO_FROM) {
      await smsClient.messages.create({ from: TWILIO_FROM, to: booking.phone, body: text })
    }
  }catch(e){ console.error('Notify error', e.message) }
}

// Deposit session
app.post('/api/deposit/session', async (req,res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' })
    const b = req.body || {}
    const required = ['name','email','phone','serviceId','shades','date','time','windowAreas']
    for (const k of required) {
      if (b[k] === undefined || b[k] === null || (typeof b[k]==='string' && !b[k].trim())) {
        return res.status(400).json({ error: `Missing ${k}` })
      }
    }
    if (!Array.isArray(b.shades) || !b.shades.length) return res.status(400).json({ error: 'Pick at least one shade' })
    if (!Array.isArray(b.windowAreas) || !b.windowAreas.length) return res.status(400).json({ error: 'Pick at least one window area' })

    const service = await prisma.service.findUnique({ where: { id: Number(b.serviceId) } })
    if (!service) return res.status(400).json({ error: 'Invalid service' })
    const { total, deposit, currency } = calcTotals(service.name, b.windowAreas)

    const booking = await prisma.booking.create({
      data: {
        name: b.name, email: b.email, phone: b.phone,
        brand: b.brand || null, model: b.model || null,
        serviceId: Number(b.serviceId),
        shades: b.shades.join(','),
        windowArea: b.windowAreas.join(','),
        date: b.date, time: b.time,
        status: 'AWAITING_DEPOSIT',
        totalCents: total, depositCents: deposit, currency
      }
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: currency,
          product_data: { name: `Deposit (${DEPOSIT_PERCENT}%)` },
          unit_amount: deposit
        },
        quantity: 1
      }],
      success_url: `${FRONTEND_URL}/success?booking=${booking.id}`,
      cancel_url: `${FRONTEND_URL}/?cancelled=1`,
      metadata: { bookingId: String(booking.id), kind: 'deposit' }
    })

    res.json({ url: session.url, totalCents: total, depositCents: deposit, currency })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// Final payment session
app.post('/api/bookings/:id/final-session', requireAdmin, async (req,res) => {
  try{
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' })
    const id = Number(req.params.id)
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking || !booking.totalCents || !booking.depositCents) return res.status(400).json({ error: 'Booking totals not found' })
    const remaining = booking.totalCents - booking.depositCents
    if (remaining <= 0) return res.status(400).json({ error: 'Nothing remaining to pay' })
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: booking.currency || CURRENCY,
          product_data: { name: 'Final payment (remaining)' },
          unit_amount: remaining
        },
        quantity: 1
      }],
      success_url: `${FRONTEND_URL}/success?booking=${booking.id}`,
      cancel_url: `${FRONTEND_URL}/?cancelled=1`,
      metadata: { bookingId: String(booking.id), kind: 'final' }
    })
    const text = `Payment link for remaining balance: ${session.url}`
    await notify(booking, 'Your final payment link', text)
    res.json({ url: session.url })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'Failed to create final session' })
  }
})

// Refund deposit
app.post('/api/bookings/:id/refund-deposit', requireAdmin, async (req,res) => {
  try{
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' })
    const id = Number(req.params.id)
    const booking = await prisma.booking.findUnique({ where: { id } })
    if (!booking || !booking.depositCents) return res.status(400).json({ error: 'No deposit to refund' })
    if (!booking.depositPi) return res.status(400).json({ error: 'Deposit payment reference missing' })
    const refund = await stripe.refunds.create({ payment_intent: booking.depositPi })
    await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED_REFUNDED' } })
    await notify(booking, 'Your deposit was refunded', 'Your booking was cancelled and your deposit has been refunded.')
    res.json({ ok:true, refund })
  }catch(e){
    console.error(e)
    res.status(500).json({ error: 'Refund failed' })
  }
})

// Admin: list/search
app.get('/api/bookings', requireAdmin, async (req,res) => {
  const { q = '', status = '', page = '1', pageSize = '50' } = req.query
  const p = Math.max(1, parseInt(page)); const ps = Math.min(200, Math.max(1, parseInt(pageSize)))
  const where = {}
  if (status) where.status = String(status)
  if (q) where.OR = [
    { name: { contains: String(q), mode: 'insensitive' } },
    { email: { contains: String(q), mode: 'insensitive' } },
    { phone: { contains: String(q), mode: 'insensitive' } },
    { date: { contains: String(q), mode: 'insensitive' } },
  ]
  const [items, total] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: { id: 'desc' } }),
    prisma.booking.count({ where })
  ])
  res.json({ items, total, page: p, pageSize: ps })
})

// CSV export
app.get('/api/bookings.csv', requireAdmin, async (req,res) => {
  const rows = await prisma.booking.findMany({ orderBy: { id: 'desc' } })
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"')
  const stringifier = stringify({ header: true, columns: ['id','name','email','phone','brand','model','serviceId','shades','windowArea','date','time','status','totalCents','depositCents','currency','createdAt'] })
  for (const r of rows) {
    stringifier.write([r.id,r.name,r.email,r.phone,r.brand||'',r.model||'',r.serviceId,r.shades,r.windowArea||'',r.date,r.time,r.status,r.totalCents||'',r.depositCents||'',r.currency||'',r.createdAt.toISOString()])
  }
  stringifier.end()
  stringifier.pipe(res)
})

// Webhook
app.post('/api/stripe/webhook', bodyParser.raw({ type: 'application/json' }), async (req,res) => {
  try {
    if (!stripe) return res.status(500).end()
    const sig = req.headers['stripe-signature']
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const bookingId = session.metadata?.bookingId
      if (bookingId) {
        const kind = session.metadata?.kind || 'deposit'
        if (kind === 'deposit') {
          await prisma.booking.update({
            where: { id: Number(bookingId) },
            data: { status: 'DEPOSIT_PAID', depositPi: session.payment_intent || null }
          })
          const b = await prisma.booking.findUnique({ where: { id: Number(bookingId) } })
          await notify(b, 'Deposit received', 'We received your deposit. Your booking is confirmed.')
        } else if (kind === 'final') {
          await prisma.booking.update({
            where: { id: Number(bookingId) },
            data: { status: 'FINAL_PAID', finalPi: session.payment_intent || null }
          })
          const b = await prisma.booking.findUnique({ where: { id: Number(bookingId) } })
          await notify(b, 'Final payment received', 'We received your final payment. See you at your appointment!')
        }
      }
    }
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error', err.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})
app.get("/admin-settings", (req, res) => {
  res.status(200).send(`
    <html>
      <head><title>Admin Settings</title></head>
      <body style="font-family: system-ui; padding: 24px;">
        <h1>Admin Settings</h1>
        <p>This is a simple placeholder page served by the API.</p>
        <ul>
          <li><a href="/api/services" target="_blank">View services (JSON)</a></li>
          <li><a href="/api/windows/pricing" target="_blank">View pricing (JSON)</a></li>
          <li><a href="/api/bookings" target="_blank">View bookings (JSON)</a></li>
          <li><a href="/api/bookings.csv" target="_blank">Download bookings CSV</a></li>
        </ul>
      </body>
    </html>
  `);
});

app.listen(PORT, ()=> console.log(`API listening on :${PORT}`))
