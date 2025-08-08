# John Window Tinting — Booking App (MVP)

**Stack:** Next.js (pages) + Express + Prisma + SQLite + Docker.

## Quick Start (Docker)
```bash
docker compose build
docker compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```
Default admin key: `changeme` — change this in your environment.

## Quick Start (Local Dev without Docker)
### Backend
```bash
cd backend
cp .env.example .env
npm i
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```
### Frontend
```bash
cd frontend
cp .env.local.example .env.local
npm i
npm run dev
# visit http://localhost:3000
```

## Environment
- `ADMIN_KEY` for accessing admin endpoints (simple header-based auth).
- `NEXT_PUBLIC_API_BASE_URL` in frontend to point to backend (defaults to `http://localhost:4000`).

## Features
- Service picker (Carbon/Ceramic), tint %, dynamic pricing.
- Timeslots based on business hours:
  - Tue–Fri: 14:00–17:00
  - Sat: 09:00–17:00
  - Sun: 10:00–12:00
  - Mon: Closed
- Prevent double booking.
- Admin page to list/cancel bookings.
