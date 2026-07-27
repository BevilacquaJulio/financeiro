import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './iam/auth/auth.module';
import { UsersModule } from './iam/users/users.module';
import { AdminModule } from './iam/admin/admin.module';
import { ItemsModule } from './finance/items/items.module';
import { ExpensesModule } from './finance/expenses/expenses.module';
import { TrashModule } from './finance/trash/trash.module';
import { CategoriesModule } from './finance/categories/categories.module';
import { DashboardModule } from './finance/dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { SeedService } from './seed/seed.service';

/**
 * SPA (plano, secao 6.12): o Vite gera `frontend/dist`. O ServeStatic serve os
 * assets E devolve `index.html` para rotas do cliente (/dashboard, /admin...),
 * senao um F5 nessas rotas daria 404. `/api/*` fica EXCLUIDO do static.
 */
const SPA_DIST = join(__dirname, '..', '..', 'frontend', 'dist');

@Module({
  imports: [
    /**
     * O `.env` e UNICO e mora na RAIZ do projeto (o compose le de la via
     * `env_file`). O Nest resolve `envFilePath` a partir do diretorio de
     * execucao, e em desenvolvimento o processo sobe de dentro de `backend/`
     * (`npm run start:dev`) — por isso as duas entradas: a primeira serve para
     * quando o processo roda da raiz, a segunda para quando roda de `backend/`.
     * Nao recrie um `backend/.env`: duas fontes de verdade divergem.
     */
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    ItemsModule,
    ExpensesModule,
    TrashModule,
    CategoriesModule,
    DashboardModule,
    ...(existsSync(SPA_DIST)
      ? [
          ServeStaticModule.forRoot({
            rootPath: SPA_DIST,
            exclude: ['/api/{*path}'],
            serveStaticOptions: { index: ['index.html'] },
          }),
        ]
      : []),
  ],
  controllers: [HealthController],
  providers: [SeedService],
})
export class AppModule {}
