import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { PasswordResetRequest, User } from '@prisma/client';
import { toNaiveIso } from '../../common/serialize';
import { loadSettings } from '../../config/configuration';
import { PrismaService } from '../../prisma/prisma.service';
import {
  validateEmailDomain,
  validatePassword,
} from '../auth/auth.rules';
import { AuthService } from '../auth/auth.service';
import { SecurityService } from '../auth/security.service';
import { AdminUserUpdateDto } from './admin.dto';

export interface AdminUserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string | null;
  last_access: string | null;
}

/** Porte de `routers/admin.py`. Todas as rotas exigem `role=admin`. */
@Injectable()
export class AdminService {
  private readonly settings = loadSettings();

  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
    private readonly auth: AuthService,
  ) {}

  private async toAdminOut(user: User): Promise<AdminUserOut> {
    const last = await this.prisma.accessLog.aggregate({
      where: { user_id: user.id },
      _max: { created_at: true },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: toNaiveIso(user.created_at),
      last_access: toNaiveIso(last._max.created_at),
    };
  }

  async counts() {
    const [pendingReg, pendingReset] = await Promise.all([
      this.prisma.user.count({ where: { status: 'pending' } }),
      this.prisma.passwordResetRequest.count({ where: { status: 'pending' } }),
    ]);
    return {
      pending_registrations: pendingReg,
      pending_resets: pendingReset,
      total_pending: pendingReg + pendingReset,
    };
  }

  /**
   * Ordenacao do Python: `CASE WHEN role='admin' THEN 0 ELSE 1 END, created_at DESC`.
   *
   * NAO da para reproduzir com `orderBy: { role: 'asc' }`: MySQL ordena ENUM
   * pelo INDICE do valor, e no ENUM('user','admin') o `user` vem primeiro —
   * exatamente o inverso do desejado. Por isso ordenamos por created_at no
   * banco e aplicamos o "admin primeiro" com um sort ESTAVEL na aplicacao.
   */
  async listUsers(status?: string): Promise<AdminUserOut[]> {
    const users = await this.prisma.user.findMany({
      where: status ? { status: status as User['status'] } : undefined,
      orderBy: { created_at: 'desc' },
    });
    const ordered = users
      .map((u, i) => ({ u, i }))
      .sort((a, b) => {
        const ra = a.u.role === 'admin' ? 0 : 1;
        const rb = b.u.role === 'admin' ? 0 : 1;
        return ra !== rb ? ra - rb : a.i - b.i;
      })
      .map((x) => x.u);
    return Promise.all(ordered.map((u) => this.toAdminOut(u)));
  }

  private async findUser(userId: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpException(
        { detail: 'Usuario nao encontrado.' },
        HttpStatus.NOT_FOUND,
      );
    }
    return user;
  }

  /** approve/reject/suspend/delete sao PROIBIDOS sobre contas admin. */
  private async getManagedUser(userId: number): Promise<User> {
    const user = await this.findUser(userId);
    if (user.role === 'admin') {
      throw new HttpException(
        { detail: 'Acao nao permitida sobre o administrador.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return user;
  }

  async updateUser(userId: number, dto: AdminUserUpdateDto) {
    const user = await this.findUser(userId);
    const data: Record<string, unknown> = {};

    if (user.role === 'admin') {
      // Sobre a propria conta admin: nome/e-mail travados, senha obrigatoria.
      if (dto.name !== undefined || dto.email !== undefined) {
        throw new HttpException(
          { detail: 'Nome e e-mail do administrador nao podem ser alterados.' },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!dto.password) {
        throw new HttpException(
          { detail: 'Informe a nova senha.' },
          HttpStatus.BAD_REQUEST,
        );
      }
      validatePassword(dto.password);
      data.password_hash = this.security.hashPassword(dto.password);
    } else {
      if (dto.email !== undefined && dto.email) {
        const newEmail = validateEmailDomain(dto.email);
        const exists = await this.prisma.user.findFirst({
          where: { email: newEmail, id: { not: user.id } },
        });
        if (exists) {
          throw new HttpException(
            { detail: 'E-mail ja em uso.' },
            HttpStatus.CONFLICT,
          );
        }
        data.email = newEmail;
      }
      if (dto.name !== undefined && dto.name) data.name = dto.name.trim();
      if (dto.password !== undefined && dto.password) {
        validatePassword(dto.password);
        data.password_hash = this.security.hashPassword(dto.password);
      }
    }

    const updated = Object.keys(data).length
      ? await this.prisma.user.update({ where: { id: user.id }, data })
      : user;
    return this.toAdminOut(updated);
  }

  async approveUser(userId: number) {
    const user = await this.getManagedUser(userId);
    if (user.status !== 'pending') {
      throw new HttpException(
        { detail: 'Conta nao esta pendente.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'active' },
    });
    return this.toAdminOut(updated);
  }

  /**
   * ATENCAO (plano, secao 6.14): rejeitar NAO e soft delete — o usuario e
   * REMOVIDO do banco, e a cascata leva junto itens, categorias, logs e
   * pedidos de reset. Nao troque por "marcar como rejeitado" na paridade.
   */
  async rejectUser(userId: number) {
    const user = await this.getManagedUser(userId);
    if (user.status !== 'pending') {
      throw new HttpException(
        { detail: 'Conta nao esta pendente.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.user.delete({ where: { id: user.id } });
    return { message: 'Cadastro rejeitado e removido.' };
  }

  /** Toggle: suspended <-> active. */
  async suspendUser(userId: number) {
    const user = await this.getManagedUser(userId);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: user.status !== 'suspended' ? 'suspended' : 'active' },
    });
    return this.toAdminOut(updated);
  }

  async deleteUser(userId: number) {
    const user = await this.getManagedUser(userId);
    await this.prisma.user.delete({ where: { id: user.id } });
    return { message: 'Conta e dados financeiros removidos.' };
  }

  async getUserDetail(userId: number) {
    const user = await this.findUser(userId);
    const base = await this.toAdminOut(user);

    const [accessLogs, resetRequests] = await Promise.all([
      this.prisma.accessLog.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      this.prisma.passwordResetRequest.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    return {
      ...base,
      access_logs: accessLogs.map((l) => ({
        id: l.id,
        created_at: toNaiveIso(l.created_at),
      })),
      reset_requests: resetRequests.map((r) => ({
        id: r.id,
        status: r.status,
        created_at: toNaiveIso(r.created_at),
      })),
    };
  }

  // --- password resets ----------------------------------------------------

  private resetToOut(
    req: PasswordResetRequest & { user?: User | null },
    includeLink = false,
  ) {
    const base = this.settings.appBaseUrl.replace(/\/+$/, '');
    return {
      id: req.id,
      user_id: req.user_id,
      user_name: req.user ? req.user.name : null,
      user_email: req.user ? req.user.email : null,
      status: req.status,
      created_at: toNaiveIso(req.created_at),
      token_expires_at: toNaiveIso(req.token_expires_at),
      // `reset_link` so aparece quando ha token E o chamador pediu.
      reset_link:
        includeLink && req.token ? `${base}/reset.html?token=${req.token}` : null,
    };
  }

  async listResets(onlyPending = false) {
    const reqs = await this.prisma.passwordResetRequest.findMany({
      where: onlyPending ? { status: 'pending' } : undefined,
      orderBy: { created_at: 'desc' },
      include: { user: true },
    });
    return reqs.map((r) => this.resetToOut(r, r.status === 'sent'));
  }

  async resetHistory(userId: number) {
    const reqs = await this.prisma.passwordResetRequest.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: { user: true },
    });
    return reqs.map((r) => this.resetToOut(r, false));
  }

  async approveReset(reqId: number) {
    const req = await this.prisma.passwordResetRequest.findUnique({
      where: { id: reqId },
      include: { user: true },
    });
    if (!req) {
      throw new HttpException(
        { detail: 'Solicitacao nao encontrada.' },
        HttpStatus.NOT_FOUND,
      );
    }
    if (req.status !== 'pending') {
      throw new HttpException(
        { detail: 'Solicitacao nao esta pendente.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.auth.generateResetLink(req);
    const fresh = await this.prisma.passwordResetRequest.findUniqueOrThrow({
      where: { id: reqId },
      include: { user: true },
    });
    return this.resetToOut(fresh, true);
  }

  async rejectReset(reqId: number) {
    const req = await this.prisma.passwordResetRequest.findUnique({
      where: { id: reqId },
      include: { user: true },
    });
    if (!req) {
      throw new HttpException(
        { detail: 'Solicitacao nao encontrada.' },
        HttpStatus.NOT_FOUND,
      );
    }
    if (req.status !== 'pending') {
      throw new HttpException(
        { detail: 'Solicitacao nao esta pendente.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.passwordResetRequest.update({
      where: { id: reqId },
      data: { status: 'rejected' },
      include: { user: true },
    });
    return this.resetToOut(updated, false);
  }
}
