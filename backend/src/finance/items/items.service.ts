import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { parseDate } from '../../common/serialize';
import { itemToOut } from '../../common/serializers';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemCreateDto, ItemUpdateDto, PayItemDto } from './items.dto';
import { ItemsRepository } from './items.repository';

const VALID_PRIORITIES = new Set(['baixa', 'media', 'alta']);
const LIST_STATES = new Set(['lista', 'backlog']);

type ItemState = 'lista' | 'backlog' | 'gasto' | 'lixeira';
type ItemPriority = 'baixa' | 'media' | 'alta';

/**
 * Porte de `routers/items.py` — MAQUINA DE ESTADOS (plano, secao 2.4).
 *
 *   [lista]   --pay-->          [gasto]   origin=planejado, paid_value=payload||estimated_price
 *   [lista]   --move-backlog--> [backlog]
 *   [lista]   --delete-->       [lixeira] deleted_at=now
 *   [backlog] --promote-->      [lista]
 *   [backlog] --delete-->       [lixeira]
 *
 * Em TODAS as transicoes, `previous_state` recebe o estado de ORIGEM.
 */
@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsRepository,
  ) {}

  private validatePriority(priority: unknown): void {
    if (
      priority !== null &&
      priority !== undefined &&
      !VALID_PRIORITIES.has(String(priority))
    ) {
      throw new HttpException(
        { detail: 'Prioridade invalida.' },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async list(user: User, state = 'lista') {
    if (!LIST_STATES.has(state)) {
      throw new HttpException(
        { detail: 'Estado invalido para este endpoint.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const rows = await this.prisma.item.findMany({
      where: { user_id: user.id, state: state as ItemState },
      orderBy: { included_at: 'desc' },
      include: this.items.withCategory,
    });
    return rows.map(itemToOut);
  }

  async create(user: User, dto: ItemCreateDto, state = 'lista') {
    if (!LIST_STATES.has(state)) {
      throw new HttpException(
        { detail: 'Estado invalido.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    this.validatePriority(dto.priority);

    const created = await this.prisma.item.create({
      data: {
        user_id: user.id,
        name: dto.name.trim(),
        category_id: dto.category_id ?? null,
        // `payload.estimated_price or 0.0` — 0, null e undefined viram 0.0.
        estimated_price: dto.estimated_price || 0.0,
        priority: (dto.priority ?? null) as ItemPriority | null,
        notes: dto.notes ?? null,
        state: state as ItemState,
      },
      include: this.items.withCategory,
    });
    return itemToOut(created);
  }

  async update(user: User, itemId: number, dto: ItemUpdateDto) {
    const item = await this.items.getOwned(user, itemId);
    if (!LIST_STATES.has(item.state)) {
      throw new HttpException(
        { detail: 'Apenas itens da lista ou backlog aqui.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    this.validatePriority(dto.priority);

    // `exclude_unset=True`: campo ausente nao e tocado; `name` sofre strip().
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name ? dto.name.trim() : dto.name;
    if (dto.category_id !== undefined) data.category_id = dto.category_id;
    if (dto.estimated_price !== undefined) data.estimated_price = dto.estimated_price;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = Object.keys(data).length
      ? await this.prisma.item.update({
          where: { id: item.id },
          data,
          include: this.items.withCategory,
        })
      : item;
    return itemToOut(updated);
  }

  /** [lista] --pay--> [gasto]. `paid_value` ausente => usa `estimated_price`. */
  async pay(user: User, itemId: number, dto: PayItemDto) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'lista') {
      throw new HttpException(
        { detail: 'Apenas itens da lista podem ser pagos.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: {
        previous_state: item.state,
        state: 'gasto',
        origin: 'planejado',
        paid_value:
          dto.paid_value !== undefined && dto.paid_value !== null
            ? dto.paid_value
            : item.estimated_price,
        payment_method: dto.payment_method ?? null,
        paid_at: parseDate(dto.paid_at) ?? new Date(),
      },
      include: this.items.withCategory,
    });
    return itemToOut(updated);
  }

  /** [lista] --move-backlog--> [backlog] */
  async moveToBacklog(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'lista') {
      throw new HttpException(
        { detail: 'Apenas itens da lista vao para o backlog.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: { previous_state: item.state, state: 'backlog' },
      include: this.items.withCategory,
    });
    return itemToOut(updated);
  }

  /** [backlog] --promote--> [lista] */
  async promote(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state !== 'backlog') {
      throw new HttpException(
        { detail: 'Apenas itens do backlog podem ser promovidos.' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.prisma.item.update({
      where: { id: item.id },
      data: { previous_state: item.state, state: 'lista' },
      include: this.items.withCategory,
    });
    return itemToOut(updated);
  }

  /** Soft delete: qualquer estado (menos lixeira) --> [lixeira] */
  async softDelete(user: User, itemId: number) {
    const item = await this.items.getOwned(user, itemId);
    if (item.state === 'lixeira') {
      throw new HttpException(
        { detail: 'Item ja esta na lixeira.' },
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
