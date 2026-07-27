/**
 * Imprime a DATABASE_URL montada a partir das variaveis MYSQL_*.
 *
 * POR QUE ISTO EXISTE
 * -------------------
 * A aplicacao monta a URL sozinha em `src/config/configuration.ts` (loadSettings).
 * A CLI do Prisma (`db pull`, `migrate diff`, `migrate resolve`, `generate`)
 * NAO executa o codigo da aplicacao: ela le `DATABASE_URL` do ambiente ou do
 * `.env`. Sem essa variavel, todo comando do Prisma aborta com
 * "Environment variable not found: DATABASE_URL".
 *
 * O `setup.sh` usa este script para gravar a DATABASE_URL no `.env` uma unica
 * vez. O escape de usuario/senha e IDENTICO ao `quotePlus` do
 * `configuration.ts` (que por sua vez espelha o `quote_plus` do Python) — se
 * mudar la, mude aqui.
 *
 *   node backend/scripts/database-url.mjs
 */

/** encodeURIComponent + os caracteres que o quote_plus do Python tambem escapa. */
function quotePlus(value) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

const host = process.env.MYSQL_HOST || 'localhost';
const port = process.env.MYSQL_PORT || '3306';
const database = process.env.MYSQL_DATABASE || 'financeiro';
const user = process.env.MYSQL_USER || 'root';
const password = process.env.MYSQL_PASSWORD || '';

process.stdout.write(
  `mysql://${quotePlus(user)}:${quotePlus(password)}@${host}:${port}/${database}?charset=utf8mb4\n`,
);
