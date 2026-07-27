import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { PasswordResetRequest } from '@prisma/client';
import { loadSettings } from '../../config/configuration';
import { userToOut } from '../../common/serializers';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '../mailer/mailer.service';
import {
  normalizeEmail,
  validateEmailDomain,
  validatePassword,
} from './auth.rules';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './auth.dto';
import { SecurityService } from './security.service';
import { randomTokenUrlsafe } from '../../common/tokens';

/** Porte de `routers/auth.py`. Status e mensagens IDENTICOS. */
@Injectable()
export class AuthService {
  private readonly settings = loadSettings();

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
    private readonly mailer: MailerService,
  ) {}

  async register(payload: RegisterDto) {
    const email = validateEmailDomain(payload.email);
    validatePassword(payload.password);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpException(
        { detail: 'E-mail ja cadastrado no sistema.' },
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.user.create({
      data: {
        name: payload.name.trim(),
        email,
        password_hash: this.security.hashPassword(payload.password),
        role: 'user',
        status: 'pending',
      },
    });

    return {
      message: 'Cadastro recebido. Aguarde a aprovacao do administrador.',
      status: 'pending',
    };
  }

  async login(payload: LoginDto) {
    const email = normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (
      !user ||
      !this.security.verifyPassword(payload.password, user.password_hash)
    ) {
      throw new HttpException(
        { detail: 'E-mail ou senha invalidos.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status === 'pending') {
      throw new HttpException(
        { detail: 'Conta pendente de aprovacao do administrador.' },
        HttpStatus.FORBIDDEN,
      );
    }
    if (user.status === 'suspended') {
      throw new HttpException(
        { detail: 'Conta suspensa. Contate o administrador.' },
        HttpStatus.FORBIDDEN,
      );
    }

    // Um registro por login bem-sucedido (alimenta last_access do admin).
    await this.prisma.accessLog.create({ data: { user_id: user.id } });

    const token = await this.security.createAccessToken(
      user.id,
      payload.remember_me === true,
    );
    return {
      access_token: token,
      token_type: 'bearer',
      user: userToOut(user),
    };
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const email = normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException(
        { detail: 'E-mail nao encontrado no sistema.' },
        HttpStatus.NOT_FOUND,
      );
    }

    const active = await this.prisma.passwordResetRequest.findFirst({
      where: { user_id: user.id, status: { in: ['pending', 'sent'] } },
    });
    if (active) {
      throw new HttpException(
        {
          detail:
            'Ja existe uma solicitacao ativa. Aguarde a analise do administrador.',
        },
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.passwordResetRequest.create({
      data: { user_id: user.id, status: 'pending' },
    });
    return {
      message: 'Solicitacao registrada. Aguardando aprovacao do administrador.',
    };
  }

  async resetPassword(payload: ResetPasswordDto) {
    validatePassword(payload.password);

    const req = await this.prisma.passwordResetRequest.findFirst({
      where: { token: payload.token },
    });
    if (!req || req.status !== 'sent') {
      throw new HttpException(
        { detail: 'Link invalido ou ja utilizado.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!req.token_expires_at || req.token_expires_at < new Date()) {
      await this.prisma.passwordResetRequest.update({
        where: { id: req.id },
        data: { status: 'expired' },
      });
      throw new HttpException(
        { detail: 'Link expirado. Solicite uma nova recuperacao.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user_id },
    });
    if (!user) {
      throw new HttpException(
        { detail: 'Usuario nao encontrado.' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password_hash: this.security.hashPassword(payload.password) },
      }),
      this.prisma.passwordResetRequest.update({
        where: { id: req.id },
        data: { status: 'used', used_at: new Date(), token: null },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso. Faca login novamente.' };
  }

  /**
   * Porte de `auth.generate_reset_link` — usado pelo modulo admin.
   * `secrets.token_urlsafe(32)` -> 32 bytes aleatorios em base64url sem padding.
   */
  async generateResetLink(req: PasswordResetRequest): Promise<string> {
    const token = randomTokenUrlsafe(32);
    const expires = new Date(
      Date.now() + this.settings.passwordResetExpireMinutes * 60_000,
    );

    await this.prisma.passwordResetRequest.update({
      where: { id: req.id },
      data: { token, token_expires_at: expires, status: 'sent' },
    });

    const base = this.settings.appBaseUrl.replace(/\/+$/, '');
    const link = `${base}/reset.html?token=${token}`;

    const user = await this.prisma.user.findUnique({
      where: { id: req.user_id },
    });
    if (user) await this.mailer.sendResetEmail(user.email, link);
    return link;
  }
}
