import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { itemToOut } from '../../common/serializers';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsRepository } from '../items/items.repository';

/** Porte de `routers/trash.py`. */
@Injectable()
export class TrashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsRepository,
  ) {}

  async list(user: User) {
    const rows = await this.prisma.item.findMany({
      where: { user_id: user.id, state: 'lixeira' },
      orderBy: { deleted_at: 'desc' },
      include: this.items.withCategory,
    });
    return rows.map(itemToOut);
  }

  /** [lixeira] --restore--> previous_state (ou `lista` se nulo). */
  async restore(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'lixeira') {
      throw new HttpException(
        { detail: 'Item nao esta na lixeira.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        state: item.previous_state ?? 'lista',
        previous_state: null,
        deleted_at: null,
      },
      include: this.items.withCategory,
    });
    return itemToOut(updated);
  }

  /** Hard delete — sai do banco. So permitido a partir da lixeira. */
  async purge(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'lixeira') {
      throw new HttpException(
        { detail: 'Item precisa estar na lixeira.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.item.delete({ where: { id: item.id } });
    return { message: 'Item removido definitivamente.' };
  }
}
