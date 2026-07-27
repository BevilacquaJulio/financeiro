import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Porte de `security.get_current_user`. Mensagens e status IDENTICOS.
 *
 * O 401 devolve o header WWW-Authenticate como o OAuth2PasswordBearer fazia.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private unauthorized(): HttpException {
    return new HttpException(
      { detail: 'Credenciais invalidas ou sessao expirada.' },
      HttpStatus.UNAUTHORIZED,
    );
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    res(ctx).setHeader('WWW-Authenticate', 'Bearer');

    const header = req.headers.authorization;
    const token =
      header && header.toLowerCase().startsWith('bearer ')
        ? header.slice(7).trim()
        : null;
    if (!token) throw this.unauthorized();

    let sub: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
      if (!payload?.sub) throw this.unauthorized();
      sub = String(payload.sub);
    } catch {
      throw this.unauthorized();
    }

    const id = Number.parseInt(sub, 10);
    if (Number.isNaN(id)) throw this.unauthorized();

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw this.unauthorized();

    if (user.status === 'suspended') {
      throw new ForbiddenException({
        detail: 'Conta suspensa. Contate o administrador.',
      });
    }
    if (user.status === 'pending') {
      throw new ForbiddenException({ detail: 'Conta pendente de aprovacao.' });
    }

    (req as Request & { user: unknown }).user = user;
    return true;
  }
}

function res(ctx: ExecutionContext) {
  return ctx.switchToHttp().getResponse<{ setHeader: (k: string, v: string) => void }>();
}
