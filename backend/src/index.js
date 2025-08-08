import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { addMinutes, formatISO, isAfter, setHours, setMinutes, setSeconds } from 'date-fns'
import { z } from 'zod'

const app = express()
const prisma = new PrismaClient()

const PORT = process.env.PORT || 4000
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme'
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

app.use(cors({ origin: CORS_ORIGIN, credentials: true }))
app.use(express.json())

// Business hours (local time, assume server runs with correct TZ; otherwise treat as UTC offset if needed)
const HOURS = {
  0: null, // Sunday? (We'll map Sun=0 in JS, but listed special below)
  1: null, // Monday closed
  2: { start: '14:00', end: '17:00' }, // Tuesday
  3: { start: '14:00', end: '17:00' }, // Wednesday
  4: { start: '14:00', end: '17:00' }, // Thursday
  5: { start: '14:00', end: '17:00' }, // Friday
  6: { start: '09:00', end: '17:00' }, // Saturday
}
// Override Sunday
const SUNDAY = { start: '10:00', end: '12:00' }

function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number)
  return { h, m }
}

function generateSlots(dateStr, slotMinutes = 60) {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.getDay() // 0=Sun
  let range = HOURS[weekday]
  if (weekday === 0) range = SUNDAY
  if (!range) return []

  const { h: sh, m: sm } = parseHM(range.start)
  const { h: eh, m: em } = parseHM(range.end)

  let start = setSeconds(setMinutes(setHours(d, sh), sm), 0)
  let end = setSeconds(setMinutes(setHours(d, eh), em), 0)

  const slots = []
  for (let t = new Date(start); !isAfter(t, addMinutes(end, -slotMinutes)); t = addMinutes(t, slotMinutes)) {
    slots.push(new Date(t))
  }
  return slots
}

async function getUnavailableTimes(dateStr) {
  const start = new Date(dateStr + 'T00:00:00Z')
  const end = new Date(dateStr + 'T23:59:59Z')
  const bookings = await prisma.booking.findMany({
    where: { date: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
    select: { date: true }
  })
  return new Set(bookings.map(b => new Date(b.date).toISOString()))
}

app.get('/api/health', async (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/services', async (_req, res) => {
  const services = await prisma.service.findMany()
  res.json(services)
})

app.get('/api/availability', async (req, res) => {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(req.query.date)
  if (!date.success) return res.status(400).json({ error: 'Invalid or missing date (YYYY-MM-DD)' })

  const slots = generateSlots(date.data)
  const unavailable = await getUnavailableTimes(date.data)
  const available = slots
    .map(d => ({ iso: d.toISOString(), label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }))
    .filter(s => !unavailable.has(s.iso))

  res.json({ date: date.data, slots: available })
})

const BookSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().optional(),
  vehicle: z.string().min(1),
  windows: z.string().min(1),
  notes: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeIso: z.string().optional(), // if front-end sends exact ISO
  time: z.string().optional(), // "HH:MM"
  serviceId: z.number()
})

app.post('/api/book', async (req, res) => {
  const parsed = BookSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  const { name, phone, email, vehicle, windows, notes, date, time, timeIso, serviceId } = parsed.data

  let slotDate
  if (timeIso) {
    slotDate = new Date(timeIso)
  } else if (time) {
    const [h, m] = time.split(':').map(Number)
    const base = new Date(date + 'T00:00:00')
    slotDate = setSeconds(setMinutes(setHours(base, h), m), 0)
  } else {
    return res.status(400).json({ error: 'time or timeIso required' })
  }

  // Prevent double booking on exact slot
  const existing = await prisma.booking.findFirst({
    where: { date: slotDate, status: { not: 'CANCELLED' } }
  })
  if (existing) return res.status(409).json({ error: 'Slot already booked' })

  // Minimal price lookup
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) return res.status(400).json({ error: 'Invalid serviceId' })

  const booking = await prisma.booking.create({
    data: {
      name, phone, email, vehicle, windows, notes,
      date: slotDate,
      serviceId: serviceId,
      status: 'PENDING'
    }
  })
  res.json({ ok: true, booking })
})

// Admin endpoints
function admin(req, res, next) {
  const key = req.header('X-Admin-Key') || req.query.key
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

app.get('/api/bookings', admin, async (_req, res) => {
  const bookings = await prisma.booking.findMany({
    orderBy: { date: 'desc' },
    include: { service: true }
  })
  res.json(bookings)
})

app.post('/api/bookings/:id/cancel', admin, async (req, res) => {
  const id = Number(req.params.id)
  const b = await prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } })
  res.json(b)
})

app.listen(PORT, async () => {
  // Ensure client is generated (in case running locally)
  console.log(`Backend running on http://localhost:${PORT}`)
})
