import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { loadSettings } from '../config/configuration';

/**
 * Prisma 7 exige driver adapter. Usamos o adapter mariadb (compativel com
 * MySQL 8), com as MESMAS credenciais do backend Python.
 *
 * `pool_pre_ping=True` do SQLAlchemy nao tem equivalente direto; o pool do
 * mariadb ja faz reconexao. O `SELECT 1` do onModuleInit cobre o smoke test
 * exigido pela Fase 0.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const s = loadSettings();
    super({
      adapter: new PrismaMariaDb({
        host: s.mysqlHost,
        port: s.mysqlPort,
        user: s.mysqlUser,
        password: s.mysqlPassword,
        database: s.mysqlDatabase,
        // utf8mb4 para bater com ?charset=utf8mb4 do SQLAlchemy.
        charset: 'utf8mb4',
        connectionLimit: 10,
        // Datas: o banco guarda DATETIME sem timezone e o Python grava UTC.
        // Forcamos UTC para nao deslocar included_at/paid_at/deleted_at.
        timezone: 'Z',
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.$queryRaw`SELECT 1`;
    this.logger.log('MySQL conectado.');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
