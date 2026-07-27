#!/usr/bin/env bash
# Backup OBRIGATORIO antes de qualquer passo de escrita (plano, secao 4.5).
# Guarde o dump FORA do repositorio.
set -euo pipefail

cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

DEST="${1:-$HOME/backups/financeiro}"
mkdir -p "$DEST"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DEST/financeiro_${STAMP}.sql"

echo ">> mysqldump ${MYSQL_DATABASE} @ ${MYSQL_HOST}:${MYSQL_PORT} -> ${OUT}"
mysqldump \
  --host="$MYSQL_HOST" --port="$MYSQL_PORT" \
  --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" \
  --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 \
  "$MYSQL_DATABASE" > "$OUT"

gzip -f "$OUT"
echo ">> OK: ${OUT}.gz"

echo ">> Contagens de referencia (guarde para conferir depois da migracao):"
mysql --host="$MYSQL_HOST" --port="$MYSQL_PORT" \
      --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" \
      --default-character-set=utf8mb4 -t "$MYSQL_DATABASE" <<'SQL'
SELECT 'users' AS tabela, COUNT(*) AS linhas FROM users
UNION ALL SELECT 'access_logs', COUNT(*) FROM access_logs
UNION ALL SELECT 'password_reset_requests', COUNT(*) FROM password_reset_requests
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'items', COUNT(*) FROM items;
SELECT state, COUNT(*) AS itens, ROUND(SUM(estimated_price),2) AS soma_estimado,
       ROUND(SUM(paid_value),2) AS soma_pago
FROM items GROUP BY state;
SQL
