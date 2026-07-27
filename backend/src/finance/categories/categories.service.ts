import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Category, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryDto } from './categories.dto';

export interface CategoryOut {
  id: number;
  name: string;
  item_count: number;
}

/**
 * Porte de `routers/categories.py`.
 *
 * A unicidade de `name` por usuario e validada NA APLICACAO (nao ha UNIQUE
 * composto no banco). Nao adicione a constraint na fase de paridade: isso
 * mudaria o comportamento com dados legados que ja tenham duplicatas.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async counts(userId: number): Promise<Map<number, number>> {
    const rows = await this.prisma.item.groupBy({
      by: ['category_id'],
      where: { user_id: userId, category_id: { not: null } },
      _count: { id: true },
    });
    const map = new Map<number, number>();
    for (const r of rows) {
      if (r.category_id !== null) map.set(r.category_id, r._count.id);
    }
    return map;
  }

  private toOut(cat: Category, itemCount = 0): CategoryOut {
    return { id: cat.id, name: cat.name, item_count: itemCount };
  }

  async list(user: User): Promise<CategoryOut[]> {
    const cats = await this.prisma.category.findMany({
      where: { user_id: user.id },
      orderBy: { name: 'asc' },
    });
    const counts = await this.counts(user.id);
    return cats.map((c) => this.toOut(c, counts.get(c.id) ?? 0));
  }

  async create(user: User, dto: CategoryDto): Promise<CategoryOut> {
    const name = dto.name.trim();
    if (!name) {
      throw new HttpException(
        { detail: 'Informe o nome da categoria.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const exists = await this.prisma.category.findFirst({
      where: { user_id: user.id, name },
    });
    if (exists) {
      throw new HttpException(
        { detail: 'Categoria ja existe.' },
        HttpStatus.CONFLICT,
      );
    }
    const cat = await this.prisma.category.create({
      data: { user_id: user.id, name },
    });
    return this.toOut(cat, 0);
  }

  private async getOwned(user: User, categoryId: number): Promise<Category> {
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, user_id: user.id },
    });
    if (!cat) {
      throw new HttpException(
        { detail: 'Categoria nao encontrada.' },
        HttpStatus.NOT_FOUND,
      );
    }
    return cat;
  }

  async update(
    user: User,
    categoryId: number,
    dto: CategoryDto,
  ): Promise<CategoryOut> {
    const cat = await this.getOwned(user, categoryId);
    const name = dto.name.trim();
    if (!name) {
      throw new HttpException(
        { detail: 'Informe o nome da categoria.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const clash = await this.prisma.category.findFirst({
      where: { user_id: user.id, name, id: { not: cat.id } },
    });
    if (clash) {
      throw new HttpException(
        { detail: 'Ja existe uma categoria com este nome.' },
        HttpStatus.CONFLICT,
      );
    }
    const updated = await this.prisma.category.update({
      where: { id: cat.id },
      data: { name },
    });
    const counts = await this.counts(user.id);
    return this.toOut(updated, counts.get(updated.id) ?? 0);
  }

  /** DELETE bloqueado (400) enquanto houver itens vinculados. */
  async remove(user: User, categoryId: number) {
    const cat = await this.getOwned(user, categoryId);
    const linked = await this.prisma.item.count({
      where: { user_id: user.id, category_id: categoryId },
    });
    if (linked > 0) {
      throw new HttpException(
        {
          detail: `Categoria em uso por ${linked} item(ns). Altere ou remova os itens antes de excluir.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.category.delete({ where: { id: cat.id } });
    return { message: 'Categoria excluida.', id: categoryId };
  }
}
