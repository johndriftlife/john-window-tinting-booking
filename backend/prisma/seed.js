
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // Services
  const services = [
    { name: "Carbon Tint", description: "Quality heat rejection and sleek look.", basePrice: 15000 },
    { name: "Ceramic Tint", description: "Premium heat rejection and UV protection.", basePrice: 25000 }
  ]
  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: { description: s.description, basePrice: s.basePrice },
      create: s
    })
  }

  const carbon = await prisma.service.findUnique({ where: { name: "Carbon Tint" } })
  const ceramic = await prisma.service.findUnique({ where: { name: "Ceramic Tint" } })

  const carbonShades = ["1%","5%","20%","35%","50%"]
  const ceramicShades = ["5%","20%"]
  for (const label of carbonShades) {
    await prisma.serviceShade.upsert({
      where: { serviceId_label: { serviceId: carbon.id, label } },
      update: {},
      create: { serviceId: carbon.id, label, enabled: true }
    })
  }
  for (const label of ceramicShades) {
    await prisma.serviceShade.upsert({
      where: { serviceId_label: { serviceId: ceramic.id, label } },
      update: {},
      create: { serviceId: ceramic.id, label, enabled: true }
    })
  }

  const defaultConfig = {
    closedDays: [1],
    weekdaySlots: ["14:00"],
    saturdaySlots: ["09:00","10:00","11:00","12:00","13:00","14:00"],
    sundaySlots: ["10:00","11:00"],
    saturdayTwoHourSpacing: true
  }
  await prisma.config.upsert({
    where: { id: 1 },
    update: { data: JSON.stringify(defaultConfig) },
    create: { id: 1, data: JSON.stringify(defaultConfig) }
  })

  // Seed admin key hash from env ADMIN_KEY
  const plain = process.env.ADMIN_KEY || 'changeme'
  const hash = bcrypt.hashSync(plain, 10)
  await prisma.adminSecret.upsert({
    where: { id: 1 },
    update: { keyHash: hash },
    create: { id: 1, keyHash: hash }
  })

  console.log("Seed complete")
}

main().then(()=>process.exit(0)).catch(e=>{console.error(e); process.exit(1)})
