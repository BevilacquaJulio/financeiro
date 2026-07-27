import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7: a URL do banco sai do schema.prisma e mora aqui.
 * Os scripts npm carregam ../.env via dotenv-cli antes de chamar a CLI.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
