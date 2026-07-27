import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ICON } from '../../lib/icons';
import type { CategoryOut } from '../../lib/types';
import { useUi } from '../../components/UiProvider';
import {
  EmptyState,
  PageHead,
  SkeletonRows,
  TableWrap,
} from '../../components/primitives';

/**
 * Porte de `viewCategories`.
 * O botao de excluir fica DESABILITADO quando ha itens vinculados — o backend
 * tambem barra com 400, mas a UI evita o erro em vez de provoca-lo.
 */
export function CategoriesPage() {
  const { toast, confirm, formModal } = useUi();
  const qc = useQueryClient();

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<CategoryOut[]>('/categories'),
  });

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const openForm = async (cat?: CategoryOut): Promise<void> => {
    const data = await formModal({
      title: cat ? 'Editar categoria' : 'Nova categoria',
      submitText: 'Salvar',
      values: cat ? { name: cat.name } : {},
      fields: [{ name: 'name', label: 'Nome', required: true }],
    });
    if (!data) return;
    mutate.mutate(async () => {
      if (cat) await api(`/categories/${cat.id}`, { method: 'PUT', body: data });
      else await api('/categories', { method: 'POST', body: data });
      toast('Categoria salva.', 'success');
    });
  };

  const remove = async (cat: CategoryOut): Promise<void> => {
    if (cat.item_count > 0) {
      toast('Remova ou altere os itens vinculados antes de excluir.', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'Excluir categoria',
      message: `Excluir "${cat.name}" permanentemente? Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/categories/${cat.id}`, { method: 'DELETE' });
      toast('Categoria excluída.', 'success');
    });
  };

  const rows = categories.data ?? [];

  return (
    <>
      <PageHead
        title="Categorias"
        subtitle="Como seus gastos são agrupados no dashboard."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => void openForm()}>
            {ICON.plus} Nova categoria
          </button>
        }
      />

      <TableWrap>
        {categories.isLoading ? (
          <SkeletonRows n={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon="tags" text="Nenhuma categoria. Crie uma nova acima." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Itens</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td className="tabular">{c.item_count}</td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn-icon btn-sm" title="Editar" aria-label="Editar" onClick={() => void openForm(c)}>
                        {ICON.edit}
                      </button>
                      <button
                        type="button"
                        className={`btn btn-icon btn-sm${c.item_count === 0 ? ' btn-danger' : ''}`}
                        disabled={c.item_count > 0}
                        title={
                          c.item_count > 0
                            ? 'Remova os itens vinculados para excluir'
                            : 'Excluir'
                        }
                        aria-label="Excluir"
                        onClick={() => void remove(c)}
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
