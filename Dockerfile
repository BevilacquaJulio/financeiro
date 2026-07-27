# =============================================================================
# Imagem unica: Nest serve a API em /api E o SPA buildado em /
# (equivalente ao que o FastAPI fazia com StaticFiles).
# =============================================================================

# --- 1) build do SPA ---------------------------------------------------------
FROM node:22-alpine AS web-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- 2) build da API ---------------------------------------------------------
FROM node:22-alpine AS api-build
WORKDIR /build/backend
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci
COPY backend/ ./

# `prisma generate` NAO conecta no banco, mas exige que a variavel do bloco
# `datasource` seja resolvivel, senao aborta com "Environment variable not
# found: DATABASE_URL". Em tempo de build nao existe .env — dai o placeholder.
# A URL real chega em runtime, pelo env_file do compose.
ARG DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npx prisma generate && npm run build

# --- 3) runtime --------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Dependencias de producao + client do Prisma
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma

# `prisma.config.ts` NAO e opcional aqui. No Prisma 7 a URL do banco saiu do
# bloco `datasource` do schema e passou a morar neste arquivo — o schema so
# declara o provider. Sem ele, `prisma generate` ate passa (nao conecta), mas o
# `migrate deploy` do CMD morre com "The datasource.url property is required in
# your Prisma config file" e o container entra em loop de restart.
COPY backend/prisma.config.ts ./backend/

ARG DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN cd backend && npm ci --omit=dev && npx prisma generate

COPY --from=api-build /build/backend/dist ./backend/dist
COPY --from=web-build /build/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 8000

# ATENCAO: `migrate deploy` aplica apenas migracoes JA CRIADAS e revisadas.
# O baseline sobre o banco existente e feito UMA VEZ, pelo `setup.sh` (passo 6),
# na maquina que tem acesso ao banco. Nunca coloque `migrate dev` aqui.
#
# Se o banco ja tem dados mas o baseline NAO foi registrado nele, o Prisma
# recusa com P3005 ("database schema is not empty") em vez de aplicar o
# 0_init por cima — protecao dele, nao nossa. O container nao sobe, e a
# mensagem abaixo diz o que fazer, em vez de deixar um P3005 cru no log.
CMD ["sh", "-c", "npx prisma migrate deploy || { echo; echo '>> migrate deploy falhou. Se o erro for P3005, este banco tem dados mas nunca recebeu o baseline: rode `bash setup.sh` apontando para ele antes de subir o container.'; exit 1; }; node dist/main.js"]
