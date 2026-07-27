import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { User } from '@prisma/client';

/** Porte de `security.require_admin`. Use SEMPRE apos o JwtAuthGuard. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user as User | undefined;
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException({
        detail: 'Acesso restrito ao administrador.',
      });
    }
    return true;
  }
}
