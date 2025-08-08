import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Seed Services
  const services = [
    {
      name: 'Carbon Tint',
      description: 'Quality heat rejection and sleek look.',
      basePrice: 15000,
      options: { percents: [5, 15, 20, 35, 50] }
    },
    {
      name: 'Ceramic Tint',
      description: 'Premium heat rejection and UV protection.',
      basePrice: 25000,
      options: { percents: [5, 15, 20, 35, 50] }
    }
  ]

  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: s,
      create: s
    })
  }
  console.log('Seeded services.')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
