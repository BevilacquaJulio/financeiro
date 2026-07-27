import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { fmtDateOnly, fmtMoney } from '../../lib/format';
import { ICON } from '../../lib/icons';
import { useSession } from '../../lib/session';
import type { ItemOut } from '../../lib/types';
import { useUi } from '../../components/UiProvider';
import {
  EmptyState,
  PageHead,
  SkeletonRows,
  TableWrap,
} from '../../components/primitives';

/**
 * Porte de `viewTrash`.
 *
 * LACUNA CONHECIDA (plano, secao 6.10): `trash_autoclean_days` e configuravel
 * mas NAO existe job que limpe a lixeira. A UI nao promete o que o sistema nao
 * faz — o aviso abaixo e explicito sobre isso.
 */
export function TrashPage() {
  const { currency } = useSession();
  const { toast, confirm } = useUi();
  const qc = useQueryClient();

  const trash = useQuery({
    queryKey: ['trash'],
    queryFn: () => api<ItemOut[]>('/trash'),
  });

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['trash'] });
      void qc.invalidateQueries({ queryKey: ['items'] });
      void qc.invalidateQueries({ queryKey: ['expenses'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const restore = (item: ItemOut): void => {
    mutate.mutate(async () => {
      await api(`/trash/${item.id}/restore`, { method: 'POST' });
      toast('Item restaurado.', 'success');
    });
  };

  const purge = async (item: ItemOut): Promise<void> => {
    const wasExpense = item.previous_state === 'gasto';
    const valor = fmtMoney(item.paid_value ?? item.estimated_price, currency);
    const ok = await confirm({
      title: 'Excluir definitivamente',
      warn: wasExpense
        ? `Este item será removido definitivamente e o valor de ${valor} será subtraído da sua métrica de total gasto. Esta ação não pode ser desfeita.`
        : 'Este item será removido definitivamente. Esta ação não pode ser desfeita.',
      confirmText: 'Excluir definitivamente',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/trash/${item.id}`, { method: 'DELETE' });
      toast('Item removido definitivamente.', 'success');
    });
  };

  const rows = trash.data ?? [];

  return (
    <>
      <PageHead
        title="Lixeira"
        subtitle="Itens excluídos ficam aqui até você restaurar ou apagar de vez."
      />

      <TableWrap>
        {trash.isLoading ? (
          <SkeletonRows n={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon="trash" text="Lixeira vazia." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Origem</th>
                <th>Valor</th>
                <th>Excluído em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id} data-item-id={it.id}>
                  <td><b>{it.name}</b></td>
                  <td><span className="tag">{it.previous_state ?? '-'}</span></td>
                  <td className="tabular">
                    {fmtMoney(it.paid_value ?? it.estimated_price, currency)}
                  </td>
                  <td>{fmtDateOnly(it.deleted_at)}</td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn-icon btn-sm" title="Restaurar" aria-label="Restaurar" onClick={() => restore(it)}>
                        {ICON.restore}
                      </button>
                      <button type="button" className="btn btn-icon btn-sm btn-danger" title="Excluir definitivamente" aria-label="Excluir definitivamente" onClick={() => void purge(it)}>
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
