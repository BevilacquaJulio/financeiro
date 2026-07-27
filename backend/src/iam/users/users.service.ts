import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { toNaiveIso } from '../../common/serialize';
import { userToOut } from '../../common/serializers';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityService } from '../auth/security.service';
import {
  normalizePreferences,
  PreferencesValidationError,
  UserPreferences,
  validatePreferences,
} from '../preferences/preferences';
import {
  ChangePasswordDto,
  UserPreferencesUpdateDto,
  UserUpdateDto,
} from './users.dto';

/** Porte de `routers/users.py`. */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly security: SecurityService,
  ) {}

  getMe(user: User) {
    return userToOut(user);
  }

  async updateMe(user: User, dto: UserUpdateDto) {
    // `exclude_unset=True` do pydantic: so aplica o que veio no corpo.
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.trash_autoclean_days !== undefined) {
      data.trash_autoclean_days = dto.trash_autoclean_days;
    }

    const updated = Object.keys(data).length
      ? await this.prisma.user.update({ where: { id: user.id }, data })
      : user;
    return userToOut(updated);
  }

  getPreferences(user: User): UserPreferences {
    return normalizePreferences(user.preferences);
  }

  async updatePreferences(user: User, dto: UserPreferencesUpdateDto) {
    const patch: Record<string, unknown> = {};
    for (const key of [
      'sidebar_title',
      'accent_color',
      'brand_icon',
      'nav_icon_style',
      'nav_order',
      'nav_icons',
    ] as const) {
      if (dto[key] !== undefined) patch[key] = dto[key];
    }

    // Patch vazio: devolve o normalizado atual sem tocar no banco.
    if (Object.keys(patch).length === 0) {
      return normalizePreferences(user.preferences);
    }

    let merged: UserPreferences;
    try {
      merged = validatePreferences({
        ...normalizePreferences(user.preferences),
        ...patch,
      });
    } catch (exc) {
      if (exc instanceof PreferencesValidationError) {
        throw new HttpException({ detail: exc.message }, HttpStatus.BAD_REQUEST);
      }
      throw exc;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { preferences: merged as unknown as object },
    });
    return merged;
  }

  /**
   * NOTA DE PARIDADE: o plano (secao 2.3) afirma que `validate_password` e
   * aplicada aqui. O CODIGO ATUAL NAO APLICA — so exige `min_length=8` do
   * schema. Regra de ouro do plano: o codigo vence. Mantido sem a regra forte
   * e registrado como divergencia (candidata a correcao na Fase 7).
   */
  async changePassword(user: User, dto: ChangePasswordDto) {
    if (!this.security.verifyPassword(dto.current_password, user.password_hash)) {
      throw new HttpException(
        { detail: 'Senha atual incorreta.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password_hash: this.security.hashPassword(dto.new_password) },
    });
    return { message: 'Senha alterada com sucesso.' };
  }

  async accessLogs(user: User, limit = 10) {
    const logs = await this.prisma.accessLog.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: Math.min(limit, 50),
    });
    return logs.map((l) => ({ id: l.id, created_at: toNaiveIso(l.created_at) }));
  }
}
