import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { loadSettings } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityService } from '../iam/auth/security.service';

/**
 * Porte de `seed.seed_admin`: cria o administrador unico se ainda nao existir
 * NENHUM usuario com role=admin. Idempotente.
 *
 * NOTA: o Python tambem roda `Base.metadata.create_all()` e
 * `ensure_schema_upgrades()` no startup. No Node isso NAO acontece de
 * proposito: quem cria/altera schema e o Prisma Migrate, executado
 * explicitamente (o baseline fica no `setup.sh`, passo 6; depois disso,
 * `npm run prisma:deploy`).
 * Criar schema no boot de um app com dados reais e como o plano perde dados.
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  private readonly settings = loadSettings();

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const admin = await this.prisma.user.findFirst({ where: { role: 'admin' } });
    if (admin) return;

    await this.prisma.user.create({
      data: {
        name: this.settings.adminName,
        email: this.settings.adminEmail.toLowerCase(),
        password_hash: this.security.hashPassword(this.settings.adminPassword),
        role: 'admin',
        status: 'active',
      },
    });
    this.logger.log(`Administrador criado: ${this.settings.adminEmail}`);
  }
}
