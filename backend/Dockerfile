# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ARG DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ARG DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT:-8000}/api/health" || exit 1'
CMD ["node", "dist/main.js"]
