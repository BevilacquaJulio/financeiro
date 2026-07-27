import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { pyRound } from '../../common/serialize';
import { PrismaService } from '../../prisma/prisma.service';

export interface DashboardQuery {
  period?: string;
  category_id?: number;
  payment_method?: string;
  start?: Date | null;
  end?: Date | null;
}

export interface DashboardOut {
  metrics: {
    total_a_gastar: number;
    total_gasto: number;
    itens_planejados: number;
    itens_backlog: number;
    itens_lixeira: number;
  };
  by_category: { category: string; total: number }[];
}

/**
 * Porte de `routers/dashboard.py` — a parte mais sensivel do diff numerico.
 *
 * Assimetrias do sistema atual que PRECISAM ser preservadas (plano, 2.5.2):
 *
 *  - `total_a_gastar` IGNORA todos os filtros (periodo, categoria, pagamento).
 *    E sempre a soma de `estimated_price` de TODOS os itens em `lista`.
 *  - `total_gasto` respeita os filtros.
 *  - Os tres contadores (planejados/backlog/lixeira) tambem ignoram filtros.
 *  - `total_a_gastar` e somado pelo BANCO (SUM), `total_gasto` e somado pela
 *    APLICACAO. Com FLOAT isso pode dar diferencas na ultima casa; mantivemos
 *    a mesma divisao de trabalho para nao introduzir divergencia.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Porte de `_period_start`: deltas a partir de "agora" em UTC. */
  private periodStart(period?: string): Date | null {
    if (!period || period === 'all') return null;
    const days: Record<string, number> = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    const d = days[period];
    if (!d) return null;
    return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  }

  async build(user: User, q: DashboardQuery): Promise<DashboardOut> {
    // --- total_a_gastar: SEM filtros, somado pelo banco -------------------
    const agg = await this.prisma.item.aggregate({
      where: { user_id: user.id, state: 'lista' },
      _sum: { estimated_price: true },
    });
    const totalAGastar = agg._sum.estimated_price ?? 0.0;

    // --- gastos filtrados -------------------------------------------------
    const paidAt: { gte?: Date; lte?: Date } = {};
    const from = q.start ?? this.periodStart(q.period);
    if (from) paidAt.gte = from;
    if (q.end) paidAt.lte = q.end;

    const where: Record<string, unknown> = {
      user_id: user.id,
      state: 'gasto',
    };
    if (paidAt.gte || paidAt.lte) where.paid_at = paidAt;
    // `if category_id:` no Python — 0 e falsy e NAO filtra. Idem string vazia.
    if (q.category_id) where.category_id = q.category_id;
    if (q.payment_method) where.payment_method = q.payment_method;

    const expenses = await this.prisma.item.findMany({
      where,
      include: { category: true },
    });

    let totalGasto = 0.0;
    for (const e of expenses) totalGasto += e.paid_value ?? 0.0;

    // --- contadores: SEM filtros -----------------------------------------
    const [itensPlanejados, itensBacklog, itensLixeira] = await Promise.all([
      this.prisma.item.count({ where: { user_id: user.id, state: 'lista' } }),
      this.prisma.item.count({ where: { user_id: user.id, state: 'backlog' } }),
      this.prisma.item.count({ where: { user_id: user.id, state: 'lixeira' } }),
    ]);

    // --- by_category ------------------------------------------------------
    // Map preserva a ordem de primeira aparicao, igual ao dict do Python, e o
    // sort do JS e estavel — entao empates saem na mesma ordem.
    const byCat = new Map<string, number>();
    for (const e of expenses) {
      const name = e.category ? e.category.name : 'Sem categoria';
      byCat.set(name, (byCat.get(name) ?? 0.0) + (e.paid_value ?? 0.0));
    }
    const byCategory = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => ({ category, total: pyRound(total, 2) }));

    return {
      metrics: {
        total_a_gastar: pyRound(totalAGastar ?? 0.0, 2),
        total_gasto: pyRound(totalGasto, 2),
        itens_planejados: itensPlanejados,
        itens_backlog: itensBacklog,
        itens_lixeira: itensLixeira,
      },
      by_category: byCategory,
    };
  }
}
