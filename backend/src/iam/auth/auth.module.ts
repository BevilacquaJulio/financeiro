import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { loadSettings } from '../../config/configuration';
import { AdminGuard } from '../../common/admin.guard';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { MailerService } from '../mailer/mailer.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityService } from './security.service';

/**
 * ORDEM DE CARGA — NAO volte para `JwtModule.register(...)` com um
 * `loadSettings()` no topo do arquivo.
 *
 * Codigo no topo de um modulo roda no momento do IMPORT. O `app.module.ts`
 * importa o AuthModule ANTES de o decorator `@Module({...})` ser avaliado, e e
 * so na avaliacao do decorator que o `ConfigModule.forRoot()` le o `.env`.
 * Resultado do jeito antigo: `process.env.JWT_SECRET` ainda era `undefined`
 * aqui, o `loadSettings()` caia no default `dev-secret-change-me`, e a
 * aplicacao assinava tudo com o segredo errado — silenciosamente, porque
 * assinar e verificar usavam o mesmo valor errado. Os tokens ja emitidos pelo
 * Python parariam de valer e todo mundo seria deslogado no deploy, que e
 * exatamente o que a secao 3.2 do plano existe para evitar.
 *
 * `registerAsync` adia a leitura para a resolucao de dependencias, que
 * acontece depois do `.env` carregado.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const settings = loadSettings();
        return {
          secret: settings.jwtSecret,
          signOptions: { algorithm: settings.jwtAlgorithm as 'HS256' },
          verifyOptions: { algorithms: [settings.jwtAlgorithm as 'HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SecurityService,
    MailerService,
    JwtAuthGuard,
    AdminGuard,
  ],
  exports: [AuthService, SecurityService, MailerService, JwtModule],
})
export class AuthModule {}
