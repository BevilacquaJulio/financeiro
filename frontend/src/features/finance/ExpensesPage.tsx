import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { fmtDateOnly, fmtMoney } from '../../lib/format';
import { ICON } from '../../lib/icons';
import { useSession } from '../../lib/session';
import type { CategoryOut, ItemOut } from '../../lib/types';
import { useUi } from '../../components/UiProvider';
import {
  EmptyState,
  PageHead,
  SkeletonRows,
  TableWrap,
} from '../../components/primitives';

/** Porte de `viewExpenses` — gastos realizados (state=gasto). */
export function ExpensesPage() {
  const { currency } = useSession();
  const { toast, confirm, formModal } = useUi();
  const qc = useQueryClient();

  const expenses = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api<ItemOut[]>('/expenses'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<CategoryOut[]>('/categories'),
  });
  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<string[]>('/categories/payment-methods'),
  });

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      void qc.invalidateQueries({ queryKey: ['items'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const openForm = async (item?: ItemOut): Promise<void> => {
    const data = await formModal({
      title: item ? 'Editar gasto' : 'Novo gasto avulso',
      submitText: item ? 'Salvar' : 'Registrar',
      values: item
        ? {
            name: item.name,
            category_id: item.category_id,
            paid_value: item.paid_value,
            payment_method: item.payment_method,
            notes: item.notes,
          }
        : {},
      fields: [
        { name: 'name', label: 'Nome da despesa', required: true },
        {
          name: 'category_id',
          label: 'Categoria',
          type: 'select',
          empty: 'Sem categoria',
          options: (categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
        },
        { name: 'paid_value', label: 'Valor pago', type: 'number', step: '0.01', required: true },
        {
          name: 'payment_method',
          label: 'Forma de pagamento',
          type: 'select',
          empty: 'Selecione',
          options: methods.data ?? [],
        },
        { name: 'notes', label: 'Observações', type: 'textarea' },
      ],
    });
    if (!data) return;

    mutate.mutate(async () => {
      if (item) await api(`/expenses/${item.id}`, { method: 'PUT', body: data });
      else await api('/expenses', { method: 'POST', body: data });
      toast(item ? 'Gasto atualizado.' : 'Gasto registrado.', 'success');
    });
  };

  const reopen = async (item: ItemOut): Promise<void> => {
    const ok = await confirm({
      title: 'Reabrir gasto',
      warn: 'Este item será devolvido para a lista de compras e o valor será removido da métrica de gastos. Deseja continuar?',
      confirmText: 'Reabrir',
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/expenses/${item.id}/reopen`, { method: 'POST' });
      toast('Gasto reaberto e devolvido para a lista.', 'success');
    });
  };

  const remove = async (item: ItemOut): Promise<void> => {
    const ok = await confirm({
      title: 'Excluir gasto',
      warn: `Este item irá para a lixeira. Se for excluído definitivamente, o valor de ${fmtMoney(
        item.paid_value,
        currency,
      )} será subtraído da métrica de total gasto.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/expenses/${item.id}`, { method: 'DELETE' });
      toast('Gasto movido para a lixeira.', 'success');
    });
  };

  const rows = expenses.data ?? [];

  return (
    <>
      <PageHead
        title="Gastos"
        subtitle="Tudo que já saiu — vindo da lista ou lançado avulso."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => void openForm()}>
            {ICON.plus} Gasto avulso
          </button>
        }
      />

      <TableWrap>
        {expenses.isLoading ? (
          <SkeletonRows n={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon="receipt" text="Nenhum gasto registrado." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Despesa</th>
                <th>Categoria</th>
                <th>Origem</th>
                <th>Pagamento</th>
                <th>Data</th>
                <th>Valor</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id} data-item-id={it.id}>
                  <td><b>{it.name}</b></td>
                  <td>{it.category_name ?? '-'}</td>
                  <td>
                    {it.origin ? (
                      <span className={`tag ${it.origin === 'avulso' ? 'info' : 'accent'}`}>
                        {it.origin}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{it.payment_method ?? '-'}</td>
                  <td>{fmtDateOnly(it.paid_at)}</td>
                  <td className="tabular">{fmtMoney(it.paid_value, currency)}</td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn-icon btn-sm" title="Editar" aria-label="Editar" onClick={() => void openForm(it)}>
                        {ICON.edit}
                      </button>
                      <button type="button" className="btn btn-icon btn-sm" title="Reabrir" aria-label="Reabrir" onClick={() => void reopen(it)}>
                        {ICON.reopen}
                      </button>
                      <button type="button" className="btn btn-icon btn-sm btn-danger" title="Excluir" aria-label="Excluir" onClick={() => void remove(it)}>
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
