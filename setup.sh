#!/usr/bin/env bash
# =============================================================================
# Setup completo — um comando só.
#
#   bash setup.sh
#
# Faz, nesta ordem:
#   1. monta o .env a partir do .env do sistema Python (se existir)
#   2. BACKUP do MySQL  <- única etapa que aborta tudo se falhar
#   3. instala dependências (backend e frontend)
#   4. introspecta o banco real: o BANCO é a verdade, não o schema escrito à mão
#   5. confere sozinho se a introspecção não quebrou nada crítico
#   6. faz o baseline do Prisma (sem shadow database, sem tocar nos dados)
#   7. builda os dois projetos
#
# Flags:
#   --skip-backup   pula a etapa 2 (use só se você JÁ tem o dump guardado)
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$PWD"
SKIP_BACKUP=0
[ "${1:-}" = "--skip-backup" ] && SKIP_BACKUP=1

ok()   { printf '\033[32m  ✓\033[0m %s\n' "$1"; }
info() { printf '\033[36m::\033[0m %s\n' "$1"; }
warn() { printf '\033[33m  !\033[0m %s\n' "$1"; }
die()  { printf '\033[31m\n✗ %s\033[0m\n' "$1" >&2; exit 1; }

# --- 1. .env -----------------------------------------------------------------
info "1/7  Configuração"

# O .env é ÚNICO e mora na raiz: o Nest lê via envFilePath ['.env','../.env'],
# a CLI do Prisma via `dotenv -e ../.env` nos scripts npm, e o compose via
# env_file. Não recrie um backend/.env — duas fontes de verdade divergem.
if [ ! -f .env ]; then
  cp .env.example .env
  die ".env foi criado na raiz a partir do exemplo. Preencha MYSQL_* e JWT_SECRET
  com os MESMOS valores do sistema que está no ar e rode de novo.

  O JWT_SECRET precisa ser idêntico, senão todo mundo é deslogado à força."
fi
ok ".env encontrado na raiz"

# CRLF quebra o docker compose: ele injeta um \r no fim de cada valor, e aí o
# JWT_SECRET e a senha do MySQL param de bater. Normaliza antes de ler.
if grep -q $'\r' .env; then
  cp .env .env.crlf.bak
  sed -i 's/\r$//' .env
  warn ".env estava com quebra de linha CRLF — convertido para LF (cópia em .env.crlf.bak)"
fi

# Valor sem aspas contendo `#`: o dotenv do Node corta ali (trata como comentário
# inline), o python-dotenv NÃO corta. Um JWT_SECRET assim é lido com tamanhos
# diferentes por Python e Node — os tokens já emitidos param de valer e todo
# mundo é deslogado no deploy. Aspas simples resolvem nos dois (e no bash).
CRUS=$(grep -nP '^[A-Za-z_]+=[^"'\''#]*#' .env | cut -d: -f2 | cut -d= -f1 | tr '\n' ' ' || true)
if [ -n "$CRUS" ]; then
  die "estas variáveis têm '#' no valor e estão SEM aspas: ${CRUS}

  O dotenv do Node corta o valor no '#'; o python-dotenv não corta. Se isso
  atingir o JWT_SECRET, todos os tokens ativos morrem no deploy.

  Envolva o valor em aspas simples no .env, ex.:  JWT_SECRET='va#lor'"
fi

set -a; . ./.env; set +a
: "${MYSQL_DATABASE:?falta MYSQL_DATABASE no .env}"
: "${JWT_SECRET:?falta JWT_SECRET no .env}"
[ "$JWT_SECRET" = "troque-este-valor-por-uma-chave-aleatoria-longa" ] &&
  die "JWT_SECRET ainda é o valor de exemplo. Use o segredo real do sistema antigo."

# Variáveis que só existem no Node/compose e podem faltar num .env herdado.
grep -q '^NODE_ENV='     .env || echo 'NODE_ENV=development' >> .env
grep -q '^PORT='         .env || echo 'PORT=8000' >> .env
grep -q '^CORS_ORIGINS=' .env || echo 'CORS_ORIGINS=http://localhost:5173' >> .env
grep -q '^DOMAIN='       .env || echo 'DOMAIN=' >> .env
grep -q '^TRAEFIK_ENTRYPOINT=' .env || echo 'TRAEFIK_ENTRYPOINT=websecure' >> .env
grep -q '^TRAEFIK_CERT_RESOLVER=' .env || echo 'TRAEFIK_CERT_RESOLVER=letsencrypt' >> .env

# DATABASE_URL é calculada das MYSQL_* para evitar que o usuário tenha de
# manter a mesma conexão em dois formatos. O prisma.config.ts também sabe
# derivá-la; gravamos aqui para facilitar diagnóstico e ferramentas externas.
if ! grep -Eq '^DATABASE_URL=.+$' .env; then
  DATABASE_URL_VALUE=$(node backend/scripts/database-url.mjs)
  if grep -q '^DATABASE_URL=' .env; then
    sed -i "s|^DATABASE_URL=.*$|DATABASE_URL=${DATABASE_URL_VALUE}|" .env
  else
    printf 'DATABASE_URL=%s\n' "$DATABASE_URL_VALUE" >> .env
  fi
  ok "DATABASE_URL gravada no .env (derivada das MYSQL_*)"
fi
set -a; . ./.env; set +a

ok "banco: ${MYSQL_DATABASE} @ ${MYSQL_HOST}:${MYSQL_PORT}"
[ -z "${DOMAIN:-}" ] && warn "DOMAIN vazio: ok para rodar local, mas o docker compose sobe com Host(\`\`) e o Traefik não roteia"

# --- 2. Backup ---------------------------------------------------------------
info "2/7  Backup do banco"

if [ "$SKIP_BACKUP" = "1" ]; then
  warn "pulado por --skip-backup (espero que você tenha o dump)"
else
  command -v mysqldump >/dev/null 2>&1 || die "mysqldump não encontrado.

  Instale o cliente MySQL, ou faça o dump por outro meio (phpMyAdmin, DBeaver,
  Workbench) e rode:  bash setup.sh --skip-backup

  Esta é a única etapa em que insisto: bug de comportamento se conserta depois,
  perda de dado não."
  bash backend/scripts/00-backup.sh || die "o backup falhou. Nada foi alterado no banco."
  ok "backup concluído"
fi

# --- 3. Dependências ---------------------------------------------------------
info "3/7  Instalando dependências (pode demorar alguns minutos)"
# `npm ci` quando há lock: instala exatamente o que o lock diz, igual ao
# Dockerfile. Sem lock, cai no install (que cria o lock) — mas o certo é
# versionar o package-lock.json, senão o `npm ci` da imagem falha.
inst() {
  if [ -f "$1/package-lock.json" ]; then
    ( cd "$1" && npm ci --no-audit --no-fund >/dev/null )
  else
    warn "$1/package-lock.json não existe — usando npm install (o docker build exige o lock)"
    ( cd "$1" && npm install --no-audit --no-fund >/dev/null )
  fi
}
inst backend  ; ok "backend"
inst frontend ; ok "frontend"

# --- 4. Introspecção: o banco é a verdade ------------------------------------
info "4/7  Lendo a estrutura real do banco"
cd backend
cp prisma/schema.prisma prisma/schema.handwritten.prisma.bak

# `db pull` é somente leitura. A re-introspecção do Prisma preserva os nomes de
# model, os @@map e os atributos manuais (@updatedAt) — por isso sobrescrever é
# seguro e elimina a necessidade de você conferir um diff à mão.
#
# Usamos os scripts npm (e não `npx prisma` direto) porque eles carregam o .env
# da raiz via dotenv-cli. A CLI do Prisma não executa o configuration.ts, então
# sem isso ela não enxerga a DATABASE_URL.
npm run --silent prisma:pull >/dev/null
ok "schema.prisma atualizado com a estrutura real"

if ! diff -q prisma/schema.handwritten.prisma.bak prisma/schema.prisma >/dev/null 2>&1; then
  warn "o banco divergia do schema escrito à mão — o banco venceu (correto)"
  warn "diff guardado em prisma/schema.handwritten.prisma.bak, se você quiser olhar depois"
fi

# --- 5. Auto-verificação -----------------------------------------------------
info "5/7  Conferindo se a introspecção manteve o que o código precisa"
S=prisma/schema.prisma
FALHAS=0
check() {
  if grep -q "$1" "$S"; then ok "$2"; else warn "FALTOU: $2"; FALHAS=$((FALHAS+1)); fi
}
check "model User"        "model User"
check "model Item"        "model Item"
check "model Category"    "model Category"
check "model AccessLog"   "model AccessLog"
check "model PasswordResetRequest" "model PasswordResetRequest"
check "@updatedAt"        "@updatedAt em items.updated_at"
check "enum item_state"   "enum item_state"
check "enum user_role"    "enum user_role"

if [ "$FALHAS" -gt 0 ]; then
  cp prisma/schema.handwritten.prisma.bak prisma/schema.prisma
  die "a introspecção perdeu $FALHAS item(ns) que o código usa.
  Restaurei o schema escrito à mão. NADA foi alterado no banco.
  Me mostre a saída acima que eu reconcilio."
fi

# --- 6. Baseline -------------------------------------------------------------
info "6/7  Baseline do Prisma"

# O baseline é a PRIMEIRA migração do diretório, seja qual for o nome dela.
# Procurar por "0_init" fixo era uma armadilha: quem rodou `prisma migrate dev`
# uma vez tem uma pasta com timestamp (ex.: 20260727184137_init), o teste dava
# falso negativo, um SEGUNDO baseline nascia aqui e só ele era marcado como
# aplicado — deixando a migração real pendente. No próximo `migrate deploy` o
# container tentaria rodar CREATE TABLE em cima de um banco que já tem tudo.
BASELINE=$(ls -1 prisma/migrations 2>/dev/null | grep -v '^migration_lock.toml$' | sort | head -1 || true)

if [ -z "$BASELINE" ]; then
  BASELINE=0_init
  mkdir -p "prisma/migrations/$BASELINE"
  # `migrate diff` gera o SQL SEM tocar no banco e SEM shadow database
  # (importante: o usuário do MySQL de produção normalmente não pode criar DB).
  npm run --silent prisma -- migrate diff \
      --from-empty \
      --to-schema-datamodel prisma/schema.prisma \
      --script > "prisma/migrations/$BASELINE/migration.sql"
  ok "baseline $BASELINE gerado a partir do schema (nenhum DDL foi executado)"
else
  ok "baseline encontrado: $BASELINE"
fi

# Diz ao Prisma "essa migração já está aplicada". Não executa DDL nenhum.
# Rodar de novo num banco que já tem o registro devolve P3008 — isso é sucesso,
# não erro. Qualquer OUTRA falha (banco fora do ar, credencial errada) precisa
# aparecer, senão o setup mente e o problema só reaparece no deploy.
if RESOLVE_OUT=$(npm run --silent prisma -- migrate resolve --applied "$BASELINE" 2>&1); then
  ok "baseline registrado neste banco (nenhum DDL foi executado)"
else
  case "$RESOLVE_OUT" in
    *P3008*|*"already recorded as applied"*)
      ok "baseline já estava registrado neste banco" ;;
    *)
      printf '%s\n' "$RESOLVE_OUT" >&2
      die "não consegui registrar o baseline ($BASELINE) neste banco.
  Nenhum DDL foi executado. A saída do Prisma está acima." ;;
  esac
fi

npm run --silent prisma:generate >/dev/null
ok "client do Prisma gerado"

# --- 7. Build ----------------------------------------------------------------
info "7/7  Build"
npm run build >/dev/null           ; ok "backend"
cd "$ROOT/frontend"
npm run build >/dev/null           ; ok "frontend"
cd "$ROOT"

cat <<EOF

  Pronto.

  Rodar em desenvolvimento (dois terminais):
      cd backend  && npm run start:dev      # http://localhost:${PORT:-8000}
      cd frontend && npm run dev            # http://localhost:5173

  Aplicar migrations pendentes (serviço one-off, nunca roda no startup):
      docker compose run --rm --build migrate

  Subir API e frontend:
      docker compose up -d --build

  Swagger: http://localhost:${PORT:-8000}/api/docs

  Primeira coisa a testar: logar com um usuário real. Se a senha funcionar,
  a parte irreversível deu certo.

EOF
