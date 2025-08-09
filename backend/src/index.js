
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 10000
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme'

app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(helmet())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('tiny'))

function requireAdmin(req,res,next){
  const key = req.header('X-Admin-Key') || req.query.key
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

// Health
app.get('/api/health', (req,res)=>res.json({ ok:true }))

// Services
app.get('/api/services', async (req,res) => {
  const rows = await prisma.service.findMany({ orderBy: { id: 'asc' } })
  res.json(rows)
})

// Config (GET/PUT)
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
app.post('/api/shades/toggle', requireAdmin, async (req,res) => {
  const { serviceId, label, enabled } = req.body
  if (typeof serviceId!=='number' || !label || typeof enabled!=='boolean')
    return res.status(400).json({ error: 'serviceId number, label string, enabled boolean required'})
  await prisma.serviceShade.updateMany({ where:{ serviceId, label }, data:{ enabled } })
  res.json({ ok:true })
})

// Availability with Saturday 2-hour spacing
app.get('/api/availability', async (req,res) => {
  const { date } = req.query  // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'date (YYYY-MM-DD) required' })

  const cfg = JSON.parse((await prisma.config.findUnique({ where: { id: 1 }})).data)

  const d = new Date(date + 'T00:00:00Z') // UTC midnight
  const dow = d.getUTCDay() // 0 Sun ... 6 Sat
  if (cfg.closedDays.includes(dow)) return res.json({ slots: [] })

  let base = []
  if (dow >= 2 && dow <= 5) base = cfg.weekdaySlots       // Tue–Fri
  else if (dow === 6)        base = cfg.saturdaySlots     // Sat
  else if (dow === 0)        base = cfg.sundaySlots       // Sun morning
  else                       base = []

  const bookings = await prisma.booking.findMany({ where: { date } })
  const booked = new Set(bookings.map(b => b.time))
  let slots = base.filter(t => !booked.has(t))

  if (dow === 6 && cfg.saturdayTwoHourSpacing) {
    const blockNext = new Set()
    for (const t of booked) {
      const [h,m] = t.split(':').map(Number)
      const hh = String(h+1).padStart(2,'0')
      const mm = String(m).padStart(2,'0')
      blockNext.add(`${hh}:${mm}`)
    }
    slots = slots.filter(t => !blockNext.has(t))
  }

  res.json({ slots: slots.map(t => ({ label: to12h(t), iso: `${date}T${t}:00Z`, time: t })) })
})

function to12h(hhmm){
  const [H,M] = hhmm.split(':').map(Number)
  const ampm = H>=12 ? 'PM':'AM'
  const h = ((H+11)%12)+1
  return `${h}:${String(M).padStart(2,'0')} ${ampm}`
}

// Create booking
app.post('/api/book', async (req,res) => {
  try {
    const { name, phone, brand, model, serviceId, shade, date, time } = req.body
    if (!name || !phone || !serviceId || !date || !time) return res.status(400).json({ error: 'name, phone, serviceId, date, time required' })

    const cfg = JSON.parse((await prisma.config.findUnique({ where: { id: 1 }})).data)
    const d = new Date(date + 'T00:00:00Z')
    const dow = d.getUTCDay()

    let base = []
    if (cfg.closedDays.includes(dow)) base = []
    else if (dow >=2 && dow<=5) base = cfg.weekdaySlots
    else if (dow===6) base = cfg.saturdaySlots
    else if (dow===0) base = cfg.sundaySlots

    const todays = await prisma.booking.findMany({ where: { date } })
    const isBooked = todays.some(b => b.time === time)
    if (!base.includes(time) || isBooked) return res.status(400).json({ error: 'Time not available' })

    if (dow===6 && cfg.saturdayTwoHourSpacing) {
      const blocked = todays.some(b => {
        const [h,m] = b.time.split(':').map(Number)
        const next = `${String(h+1).padStart(2,'0')}:${String(m).padStart(2,'0')}`
        return next === time
      })
      if (blocked) return res.status(400).json({ error: 'Time blocked due to spacing rule' })
    }

    const booking = await prisma.booking.create({
      data: { name, phone, brand: brand||null, model: model||null, serviceId, shade: shade||null, date, time }
    })
    res.json({ ok:true, booking })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

app.listen(PORT, ()=> console.log(`API listening on :${PORT}`))
