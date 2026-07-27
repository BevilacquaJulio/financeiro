import { defineConfig } from 'prisma/config';

/**
 * Prisma 7: a URL do banco sai do schema.prisma e mora aqui.
 * Os scripts npm carregam ../.env via dotenv-cli antes de chamar a CLI.
 * DATABASE_URL pode ser informada explicitamente, mas normalmente e derivada
 * das MYSQL_* para evitar duas fontes de verdade no .env.
 */
function quotePlus(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) =>
      '%' + character.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function setting(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  `mysql://${quotePlus(setting('MYSQL_USER', 'root'))}:` +
    `${quotePlus(setting('MYSQL_PASSWORD', ''))}` +
    `@${setting('MYSQL_HOST', 'localhost')}:` +
    `${setting('MYSQL_PORT', '3306')}/` +
    `${setting('MYSQL_DATABASE', 'financeiro')}?charset=utf8mb4`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
