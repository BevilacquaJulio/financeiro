import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { ItemWithCategory } from '../../common/serializers';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Porte de `routers/items.get_owned_item`, compartilhado por items, expenses
 * e trash — e o que garante o ISOLAMENTO POR USUARIO (404 em item de outro
 * dono, nunca 403, para nao vazar existencia).
 */
@Injectable()
export class ItemsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Todo `include: { category: true }` mora aqui (plano, secao 6.9). */
  readonly withCategory = { category: true } as const;

  async getOwned(user: User, itemId: number): Promise<ItemWithCategory> {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, user_id: user.id },
      include: this.withCategory,
    });
    if (!item) {
      throw new HttpException(
        { detail: 'Item nao encontrado.' },
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }

  reload(itemId: number): Promise<ItemWithCategory> {
    return this.prisma.item.findUniqueOrThrow({
      where: { id: itemId },
      include: this.withCategory,
    });
  }
}
