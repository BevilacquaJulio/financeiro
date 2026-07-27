import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, qs } from '../../lib/api';
import { fmtDateOnly, fmtMoney, priorityLabel } from '../../lib/format';
import { ICON } from '../../lib/icons';
import { useSession } from '../../lib/session';
import type { CategoryOut, DashboardOut, ItemOut } from '../../lib/types';
import { useUi } from '../../components/UiProvider';
import {
  EmptyState,
  MetricCard,
  PageHead,
  SkeletonCards,
  SkeletonRows,
} from '../../components/primitives';

const METRIC_DEFS = [
  { key: 'total_gasto', label: 'Total Gasto', icon: 'receipt', money: true, detail: 'gastos' },
  { key: 'itens_planejados', label: 'Lista de Compras', icon: 'cart', money: false, detail: 'lista' },
  { key: 'itens_backlog', label: 'Compras Futuras', icon: 'bookmark', money: false, detail: 'backlog' },
  { key: 'itens_lixeira', label: 'Itens na Lixeira', icon: 'trash', money: false, detail: 'lixeira' },
] as const;

const PERIODS = [
  { value: 'all', label: 'Todo período' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
  { value: 'quarter', label: 'Último trimestre' },
  { value: 'year', label: 'Último ano' },
];

export function DashboardPage() {
  const { currency } = useSession();
  const { openDrawer, toast } = useUi();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    period: 'all',
    category_id: '',
    payment_method: '',
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<CategoryOut[]>('/categories'),
  });
  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<string[]>('/categories/payment-methods'),
  });
  const dashboard = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => api<DashboardOut>(`/dashboard${qs(filters)}`),
  });

  /** Card clicavel -> drawer com os itens daquela metrica (porte de openMetricDetail). */
  const openDetail = async (detail: string): Promise<void> => {
    const titles: Record<string, string> = {
      lista: 'Lista de Compras',
      gastos: 'Gastos',
      backlog: 'Compras Futuras',
      lixeira: 'Lixeira',
    };
    openDrawer(titles[detail] ?? 'Detalhes', <SkeletonRows n={5} />);
    try {
      const path =
        detail === 'gastos'
          ? '/expenses'
          : detail === 'lixeira'
            ? '/trash'
            : `/items?state=${detail}`;
      const items = await api<ItemOut[]>(path);
      openDrawer(
        titles[detail] ?? 'Detalhes',
        items.length === 0 ? (
          <EmptyState icon="inbox" text="Nenhum item aqui." />
        ) : (
          <>
            {items.map((it) => (
              <div
                key={it.id}
                className="detail-item detail-item-link"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/app/${detail}`, { state: { highlight: it.id } })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    navigate(`/app/${detail}`, { state: { highlight: it.id } });
                }}
              >
                <div className="di-head">
                  <span className="di-name">{it.name}</span>
                  <span className="tabular text-accent">
                    {fmtMoney(it.paid_value ?? it.estimated_price, currency)}
                  </span>
                </div>
                <div className="di-meta">
                  <span>{it.category_name ?? 'Sem categoria'}</span>
                  {it.priority && (
                    <span className={`tag ${it.priority}`}>
                      {priorityLabel(it.priority)}
                    </span>
                  )}
                  {it.payment_method && <span>{it.payment_method}</span>}
                  <span>{fmtDateOnly(it.paid_at ?? it.included_at ?? it.deleted_at)}</span>
                  {it.origin && (
                    <span className={`tag ${it.origin === 'avulso' ? 'info' : 'accent'}`}>
                      {it.origin}
                    </span>
                  )}
                </div>
                {it.notes && <p className="hint">{it.notes}</p>}
              </div>
            ))}
          </>
        ),
      );
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const metrics = dashboard.data?.metrics;
  const byCategory = dashboard.data?.by_category ?? [];
  const max = byCategory.length ? Math.max(...byCategory.map((c) => c.total)) : 0;

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle="Visão geral do que você planejou gastar e do que já saiu."
      />

      <div className="toolbar">
        <select
          aria-label="Período"
          value={filters.period}
          onChange={(e) => setFilters({ ...filters, period: e.target.value })}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Categoria"
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
        >
          <option value="">Todas categorias</option>
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Forma de pagamento"
          value={filters.payment_method}
          onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
        >
          <option value="">Todas formas</option>
          {(methods.data ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {!metrics ? (
        <SkeletonCards n={4} />
      ) : (
        <div className="metrics">
          {METRIC_DEFS.map((m) => (
            <MetricCard
              key={m.key}
              label={m.label}
              icon={m.icon}
              money={m.money}
              currency={currency}
              value={metrics[m.key]}
              onOpen={() => void openDetail(m.detail)}
            />
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Gastos por categoria</h3>
          {byCategory.length > 0 && (
            <span className="muted tabular">
              {fmtMoney(
                byCategory.reduce((s, c) => s + c.total, 0),
                currency,
              )}
            </span>
          )}
        </div>

        {dashboard.isLoading ? (
          <SkeletonRows n={4} />
        ) : byCategory.length === 0 ? (
          <EmptyState icon="receipt" text="Sem gastos no período selecionado." />
        ) : (
          <div className="bars">
            {byCategory.map((c) => (
              <div className="bar-row" key={c.category}>
                <span className="muted">{c.category}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${max ? (c.total / max) * 100 : 0}%` }}
                  />
                </div>
                <span className="tabular">{fmtMoney(c.total, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {dashboard.isError && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row">
            {ICON.x}
            <span>Não foi possível carregar o dashboard.</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void dashboard.refetch()}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
