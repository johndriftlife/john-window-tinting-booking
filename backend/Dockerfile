FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src

ENV PORT=4000
EXPOSE 4000

# Ensure DB dir exists
RUN mkdir -p /app/prisma

CMD ["sh", "-c", "node prisma/seed.js || true; node src/index.js"]
