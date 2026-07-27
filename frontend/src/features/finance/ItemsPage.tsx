import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { fmtMoney, PRIORITIES, priorityLabel } from '../../lib/format';
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
  TableWrap,
} from '../../components/primitives';

/**
 * Lista de Compras (`lista`) e Compras Futuras (`backlog`) — mesma tela, dois
 * estados. Porte de `viewItems` do dashboard.js.
 *
 * Assimetria preservada do sistema atual: na LISTA o "total a gastar" vem do
 * endpoint /dashboard (autoridade do servidor); no BACKLOG o total e somado no
 * cliente a partir dos itens carregados, porque o backend nao expoe essa
 * metrica.
 */
export function ItemsPage({ state }: { state: 'lista' | 'backlog' }) {
  const isBacklog = state === 'backlog';
  const { currency } = useSession();
  const { toast, confirm, formModal, pickModal } = useUi();
  const qc = useQueryClient();
  const location = useLocation();
  const tableRef = useRef<HTMLTableSectionElement>(null);

  const [selectedSum, setSelectedSum] = useState<{ ids: number[]; total: number } | null>(
    null,
  );

  const items = useQuery({
    queryKey: ['items', state],
    queryFn: () => api<ItemOut[]>(`/items?state=${state}`),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<CategoryOut[]>('/categories'),
  });
  const dashboard = useQuery({
    queryKey: ['dashboard', { period: 'all' }],
    queryFn: () => api<DashboardOut>('/dashboard?period=all'),
    enabled: !isBacklog,
  });
  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<string[]>('/categories/payment-methods'),
  });

  const rows = useMemo(() => items.data ?? [], [items.data]);

  // A soma temporaria some quando os itens escolhidos deixam de existir.
  useEffect(() => {
    if (!selectedSum) return;
    const valid = rows.filter((i) => selectedSum.ids.includes(i.id));
    if (valid.length === 0) {
      setSelectedSum(null);
      return;
    }
    const total = valid.reduce((s, i) => s + Number(i.estimated_price || 0), 0);
    if (valid.length !== selectedSum.ids.length || total !== selectedSum.total) {
      setSelectedSum({ ids: valid.map((i) => i.id), total });
    }
  }, [rows, selectedSum]);

  // Vindo do drawer do dashboard: destaca e rola ate a linha.
  const highlight = (location.state as { highlight?: number } | null)?.highlight;
  useEffect(() => {
    if (!highlight || !tableRef.current) return;
    const row = tableRef.current.querySelector(`tr[data-item-id="${highlight}"]`);
    if (!row) return;
    row.classList.add('row-highlight');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => row.classList.remove('row-highlight'), 3200);
    return () => clearTimeout(t);
  }, [highlight, rows]);

  const invalidate = (): void => {
    void qc.invalidateQueries({ queryKey: ['items'] });
    void qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: invalidate,
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const categoryOptions = (categories.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const openItemForm = async (item?: ItemOut): Promise<void> => {
    const data = await formModal({
      title: item ? 'Editar item' : 'Novo item',
      submitText: item ? 'Salvar' : 'Adicionar',
      values: item
        ? {
            name: item.name,
            category_id: item.category_id,
            estimated_price: item.estimated_price,
            priority: item.priority,
            notes: item.notes,
          }
        : {},
      fields: [
        { name: 'name', label: 'Nome do produto', required: true },
        {
          name: 'category_id',
          label: 'Categoria',
          type: 'select',
          empty: 'Sem categoria',
          options: categoryOptions,
        },
        { name: 'estimated_price', label: 'Preço estimado', type: 'number', step: '0.01' },
        {
          name: 'priority',
          label: 'Prioridade',
          type: 'select',
          empty: 'Nenhuma',
          options: PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
        },
        { name: 'notes', label: 'Observações', type: 'textarea' },
      ],
    });
    if (!data) return;

    mutate.mutate(async () => {
      if (item) await api(`/items/${item.id}`, { method: 'PUT', body: data });
      else await api(`/items?state=${state}`, { method: 'POST', body: data });
      toast(item ? 'Item atualizado.' : 'Item adicionado.', 'success');
    });
  };

  const payItem = async (item: ItemOut): Promise<void> => {
    const data = await formModal({
      title: 'Marcar como pago',
      submitText: 'Confirmar pagamento',
      values: { paid_value: item.estimated_price },
      fields: [
        { name: 'paid_value', label: 'Valor pago', type: 'number', step: '0.01' },
        {
          name: 'payment_method',
          label: 'Forma de pagamento',
          type: 'select',
          empty: 'Selecione',
          options: methods.data ?? [],
        },
      ],
    });
    if (!data) return;

    const ok = await confirm({
      title: 'Confirmar pagamento',
      message:
        'O item irá para Gastos e o valor entrará na métrica de total gasto.',
      confirmText: 'Confirmar',
    });
    if (!ok) return;

    mutate.mutate(async () => {
      await api(`/items/${item.id}/pay`, { method: 'POST', body: data });
      toast('Item marcado como pago.', 'success');
    });
  };

  const moveToBacklog = async (item: ItemOut): Promise<void> => {
    const ok = await confirm({
      title: 'Mover para Compras Futuras',
      message:
        'O item será movido para Compras Futuras e sairá das métricas. Continuar?',
      confirmText: 'Mover',
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/items/${item.id}/move-backlog`, { method: 'POST' });
      toast('Item movido para Compras Futuras.', 'success');
    });
  };

  const promote = async (item: ItemOut): Promise<void> => {
    const ok = await confirm({
      title: 'Promover item',
      message: 'Mover este item para a Lista de Compras?',
      confirmText: 'Promover',
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/items/${item.id}/promote`, { method: 'POST' });
      toast('Item promovido para a lista.', 'success');
    });
  };

  const remove = async (item: ItemOut): Promise<void> => {
    const ok = await confirm({
      title: 'Excluir item',
      message: 'O item será movido para a lixeira.',
      confirmText: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/items/${item.id}`, { method: 'DELETE' });
      toast('Item movido para a lixeira.', 'success');
    });
  };

  const openSum = async (): Promise<void> => {
    if (rows.length === 0) {
      toast('Não há itens para somar.', 'warning');
      return;
    }
    const chosen = await pickModal(
      'Somar itens escolhidos',
      'Marque os itens que deseja incluir na soma.',
      rows.map((i) => ({
        id: i.id,
        value: Number(i.estimated_price || 0),
        label: i.name,
        hint: fmtMoney(i.estimated_price, currency),
      })),
      selectedSum?.ids ?? [],
    );
    if (!chosen) return;
    const total = rows
      .filter((i) => chosen.includes(i.id))
      .reduce((s, i) => s + Number(i.estimated_price || 0), 0);
    setSelectedSum({ ids: chosen, total });
  };

  const totalBacklog = rows.reduce((s, i) => s + Number(i.estimated_price || 0), 0);

  return (
    <>
      <PageHead
        title={isBacklog ? 'Compras Futuras' : 'Lista de Compras'}
        subtitle={
          isBacklog
            ? 'O que você quer comprar, mas ainda não entrou no plano do mês.'
            : 'O que está planejado para sair do bolso.'
        }
        actions={
          <>
            <button type="button" className="btn btn-accent-outline" onClick={openSum}>
              Somar itens escolhidos
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void openItemForm()}
            >
              {ICON.plus} Novo item
            </button>
          </>
        }
      />

      {items.isLoading ? (
        <SkeletonCards n={2} />
      ) : (
        <div className="metrics">
          <MetricCard
            label={isBacklog ? 'Total Estimado' : 'Total a Gastar'}
            icon={isBacklog ? 'bookmark' : 'cart'}
            money
            currency={currency}
            value={
              isBacklog ? totalBacklog : (dashboard.data?.metrics.total_a_gastar ?? 0)
            }
          />
          {selectedSum && (
            <MetricCard
              label="Soma dos itens escolhidos"
              money
              dashed
              currency={currency}
              value={selectedSum.total}
              onDismiss={() => setSelectedSum(null)}
            />
          )}
          <MetricCard
            label={isBacklog ? 'Itens em Compras Futuras' : 'Itens na Lista'}
            icon="grid"
            value={
              isBacklog ? rows.length : (dashboard.data?.metrics.itens_planejados ?? 0)
            }
          />
        </div>
      )}

      <TableWrap>
        {items.isLoading ? (
          <SkeletonRows n={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="cart"
            text={`Nenhum item ${isBacklog ? 'em compras futuras' : 'na lista'}.`}
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Preço</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody ref={tableRef}>
              {rows.map((it) => (
                <tr key={it.id} data-item-id={it.id}>
                  <td>
                    <b>{it.name}</b>
                    {it.notes && <div className="hint">{it.notes}</div>}
                  </td>
                  <td>{it.category_name ?? '-'}</td>
                  <td>
                    {it.priority ? (
                      <span className={`tag ${it.priority}`}>
                        {priorityLabel(it.priority)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="tabular">{fmtMoney(it.estimated_price, currency)}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        type="button"
                        className="btn btn-icon btn-sm"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => void openItemForm(it)}
                      >
                        {ICON.edit}
                      </button>
                      {isBacklog ? (
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          title="Promover para lista"
                          aria-label="Promover para lista"
                          onClick={() => void promote(it)}
                        >
                          {ICON.arrowRight}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            title="Marcar como pago"
                            aria-label="Marcar como pago"
                            onClick={() => void payItem(it)}
                          >
                            {ICON.check}
                          </button>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm"
                            title="Mover para Compras Futuras"
                            aria-label="Mover para Compras Futuras"
                            onClick={() => void moveToBacklog(it)}
                          >
                            {ICON.bookmark}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-icon btn-sm btn-danger"
                        title="Excluir"
                        aria-label="Excluir"
                        onClick={() => void remove(it)}
                      >
                        {ICON.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableWrap>
    </>
  );
}
