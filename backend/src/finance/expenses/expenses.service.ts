import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { parseDate } from '../../common/serialize';
import { itemToOut } from '../../common/serializers';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseCreateDto, ExpenseUpdateDto } from '../items/items.dto';
import { ItemsRepository } from '../items/items.repository';

/**
 * Porte de `routers/expenses.py`.
 *
 * QUIRK CENTRAL (plano, secao 2.4): o gasto AVULSO nasce ja em `gasto`, com
 * `origin=avulso` e `estimated_price = paid_value` (copia o valor pago para o
 * estimado). Nao "corrija" isso — o dashboard e a lixeira contam com esse
 * comportamento.
 */
@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsRepository,
  ) {}

  async list(user: User) {
    const rows = await this.prisma.item.findMany({
      where: { user_id: user.id, state: 'gasto' },
      orderBy: { paid_at: 'desc' },
      include: this.items.withCategory,
    });
    return rows.map(itemToOut);
  }

  async create(user: User, dto: ExpenseCreateDto) {
    const created = await this.prisma.item.create({
      data: {
        user_id: user.id,
        name: dto.name.trim(),
        category_id: dto.category_id ?? null,
        estimated_price: dto.paid_value, // <- quirk: copia o pago no estimado
        paid_value: dto.paid_value,
        payment_method: dto.payment_method ?? null,
        notes: dto.notes ?? null,
        origin: 'avulso',
        state: 'gasto',
        paid_at: parseDate(dto.paid_at) ?? new Date(),
      },
      include: this.items.withCategory,
    });
    return itemToOut(created);
  }

  async update(user: User, itemId: number, dto: ExpenseUpdateDto) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'gasto') {
      throw new HttpException(
        { detail: 'Item nao e um gasto realizado.' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name ? dto.name.trim() : dto.name;
    if (dto.category_id !== undefined) data.category_id = dto.category_id;
    if (dto.paid_value !== undefined) data.paid_value = dto.paid_value;
    if (dto.payment_method !== undefined) data.payment_method = dto.payment_method;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.paid_at !== undefined) data.paid_at = parseDate(dto.paid_at);

    const updated = Object.keys(data).length
      ? await this.prisma.item.update({
          where: { id: item.id },
          data,
          include: this.items.withCategory,
        })
      : item;
    return itemToOut(updated);
  }

  /**
   * [gasto] --reopen--> [lista]. SEMPRE volta para `lista` (nao usa
   * previous_state) e ZERA os campos de pagamento.
   */
  async reopen(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'gasto') {
      throw new HttpException(
        { detail: 'Apenas gastos podem ser reabertos.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        previous_state: item.state,
        state: 'lista',
        paid_value: null,
        paid_at: null,
        payment_method: null,
        origin: null,
      },
      include: this.items.withCategory,
    });
    return itemToOut(updated);
  }

  /** [gasto] --delete--> [lixeira] (soft delete). */
  async softDelete(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'gasto') {
      throw new HttpException(
        { detail: 'Item nao e um gasto realizado.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        previous_state: item.state,
        state: 'lixeira',
        deleted_at: new Date(),
      },
      include: this.items.withCategory,
    });
    return itemToOut(updated);
  }
}
