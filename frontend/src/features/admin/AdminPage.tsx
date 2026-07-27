import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { fmtDateTime } from '../../lib/format';
import { ICON } from '../../lib/icons';
import type {
  AdminCountsOut,
  AdminUserDetailOut,
  AdminUserOut,
  ResetRequestOut,
} from '../../lib/types';
import { useUi } from '../../components/UiProvider';
import {
  EmptyState,
  PageHead,
  SkeletonRows,
  TableWrap,
} from '../../components/primitives';

type AdminTab = 'users' | 'registrations' | 'resets';

/**
 * Porte de `admin.html` + `admin.js`.
 *
 * Regras do backend que a UI respeita (plano, 2.5.4/2.5.5):
 *  - nenhuma acao de aprovar/rejeitar/suspender/excluir aparece para contas
 *    `admin`;
 *  - rejeitar cadastro DELETA o usuario — o texto de confirmacao diz isso;
 *  - o link de reset so existe enquanto o status for `sent`.
 */
export function AdminPage({ tab }: { tab: AdminTab }) {
  const counts = useQuery({
    queryKey: ['admin', 'counts'],
    queryFn: () => api<AdminCountsOut>('/admin/counts'),
    refetchInterval: 60_000,
  });

  return (
    <>
      {tab === 'users' && <UsersTab />}
      {tab === 'registrations' && <RegistrationsTab pending={counts.data?.pending_registrations} />}
      {tab === 'resets' && <ResetsTab pending={counts.data?.pending_resets} />}
    </>
  );
}

function statusClass(status: string): string {
  return `status-dot status-${status}`;
}

function UsersTab() {
  const { toast, confirm, formModal, openDrawer } = useUi();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');

  const users = useQuery({
    queryKey: ['admin', 'users', filter],
    queryFn: () => api<AdminUserOut[]>(`/admin/users${filter ? `?status=${filter}` : ''}`),
  });

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const showDetail = async (u: AdminUserOut): Promise<void> => {
    openDrawer(u.name, <SkeletonRows n={5} />);
    try {
      const d = await api<AdminUserDetailOut>(`/admin/users/${u.id}`);
      openDrawer(
        d.name,
        <>
          <div className="detail-item">
            <div className="di-head">
              <span className="di-name">{d.email}</span>
              <span className={statusClass(d.status)}>{d.status}</span>
            </div>
            <div className="di-meta">
              <span>Criado em {fmtDateTime(d.created_at)}</span>
              <span>Último acesso: {fmtDateTime(d.last_access)}</span>
            </div>
          </div>

          <h4 className="m-label" style={{ marginTop: 12 }}>Acessos (últimos 20)</h4>
          {d.access_logs.length === 0 ? (
            <p className="hint">Nenhum acesso registrado.</p>
          ) : (
            d.access_logs.map((l) => (
              <div className="detail-item" key={l.id}>
                {fmtDateTime(l.created_at)}
              </div>
            ))
          )}

          <h4 className="m-label" style={{ marginTop: 12 }}>Recuperações (últimas 10)</h4>
          {d.reset_requests.length === 0 ? (
            <p className="hint">Nenhuma solicitação.</p>
          ) : (
            d.reset_requests.map((r) => (
              <div className="detail-item" key={r.id}>
                <div className="di-head">
                  <span>{fmtDateTime(r.created_at)}</span>
                  <span className="tag">{r.status}</span>
                </div>
              </div>
            ))
          )}
        </>,
      );
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const edit = async (u: AdminUserOut): Promise<void> => {
    const isAdmin = u.role === 'admin';
    const data = await formModal({
      title: `Editar ${u.name}`,
      submitText: 'Salvar',
      values: isAdmin ? {} : { name: u.name },
      fields: isAdmin
        ? [{ name: 'password', label: 'Nova senha (obrigatória)', required: true }]
        : [
            { name: 'name', label: 'Nome' },
            { name: 'password', label: 'Nova senha (opcional)' },
          ],
    });
    if (!data) return;
    // Campos vazios viram null no formModal; o backend ignora null/vazio.
    const body = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== null && v !== ''),
    );
    mutate.mutate(async () => {
      await api(`/admin/users/${u.id}`, { method: 'PUT', body });
      toast('Usuário atualizado.', 'success');
    });
  };

  const suspend = async (u: AdminUserOut): Promise<void> => {
    const suspending = u.status !== 'suspended';
    const ok = await confirm({
      title: suspending ? 'Suspender conta' : 'Reativar conta',
      message: suspending
        ? `${u.name} perderá o acesso imediatamente. Os dados são preservados.`
        : `${u.name} volta a ter acesso ao sistema.`,
      confirmText: suspending ? 'Suspender' : 'Reativar',
      danger: suspending,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/admin/users/${u.id}/suspend`, { method: 'POST' });
      toast(suspending ? 'Conta suspensa.' : 'Conta reativada.', 'success');
    });
  };

  const remove = async (u: AdminUserOut): Promise<void> => {
    const ok = await confirm({
      title: 'Excluir conta',
      warn: `Todos os itens, gastos, categorias e registros de ${u.name} serão apagados em cascata. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir tudo',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/admin/users/${u.id}`, { method: 'DELETE' });
      toast('Conta e dados financeiros removidos.', 'success');
    });
  };

  const rows = users.data ?? [];

  return (
    <>
      <PageHead
        title="Usuários"
        subtitle="Quem tem acesso, em que estado, e quando entrou pela última vez."
        actions={
          <select
            aria-label="Filtrar por status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 190 }}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="pending">Pendentes</option>
            <option value="suspended">Suspensos</option>
          </select>
        }
      />

      <TableWrap>
        {users.isLoading ? (
          <SkeletonRows n={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon="user" text="Nenhum usuário com esse filtro." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Status</th>
                <th>Último acesso</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    {u.role === 'admin' && (
                      <span className="tag accent" style={{ marginLeft: 8 }}>admin</span>
                    )}
                  </td>
                  <td className="muted">{u.email}</td>
                  <td><span className={statusClass(u.status)}>{u.status}</span></td>
                  <td>{fmtDateTime(u.last_access)}</td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn-icon btn-sm" title="Detalhes" aria-label="Detalhes" onClick={() => void showDetail(u)}>
                        {ICON.eye}
                      </button>
                      <button type="button" className="btn btn-icon btn-sm" title="Editar" aria-label="Editar" onClick={() => void edit(u)}>
                        {ICON.edit}
                      </button>
                      {u.role !== 'admin' && (
                        <>
                          <button type="button" className="btn btn-icon btn-sm" title={u.status === 'suspended' ? 'Reativar' : 'Suspender'} aria-label="Suspender" onClick={() => void suspend(u)}>
                            {u.status === 'suspended' ? ICON.restore : ICON.shield}
                          </button>
                          <button type="button" className="btn btn-icon btn-sm btn-danger" title="Excluir" aria-label="Excluir" onClick={() => void remove(u)}>
                            {ICON.trash}
                          </button>
                        </>
                      )}
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

function RegistrationsTab({ pending }: { pending?: number }) {
  const { toast, confirm } = useUi();
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn: () => api<AdminUserOut[]>('/admin/users?status=pending'),
  });

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const approve = async (u: AdminUserOut): Promise<void> => {
    const ok = await confirm({
      title: 'Aprovar cadastro',
      message: `Aprovar a conta de ${u.name}? Ele poderá entrar imediatamente.`,
      confirmText: 'Aprovar',
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/admin/users/${u.id}/approve`, { method: 'POST' });
      toast('Cadastro aprovado.', 'success');
    });
  };

  const reject = async (u: AdminUserOut): Promise<void> => {
    const ok = await confirm({
      title: 'Rejeitar cadastro',
      // O backend DELETA o usuario — a confirmacao nao pode suavizar isso.
      warn: `A solicitação de ${u.name} será rejeitada e a conta REMOVIDA do sistema. Não é possível desfazer.`,
      confirmText: 'Rejeitar e remover',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/admin/users/${u.id}/reject`, { method: 'POST' });
      toast('Cadastro rejeitado e removido.', 'success');
    });
  };

  const rows = users.data ?? [];

  return (
    <>
      <PageHead
        title="Cadastros pendentes"
        subtitle={
          pending
            ? `${pending} solicitação(ões) aguardando sua decisão.`
            : 'Novas contas ficam bloqueadas até você aprovar.'
        }
      />

      <TableWrap>
        {users.isLoading ? (
          <SkeletonRows n={3} />
        ) : rows.length === 0 ? (
          <EmptyState icon="inbox" text="Nenhum cadastro aguardando aprovação." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Solicitado em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td>
                  <td className="muted">{u.email}</td>
                  <td>{fmtDateTime(u.created_at)}</td>
                  <td>
                    <div className="actions-cell">
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => void approve(u)}>
                        {ICON.check} Aprovar
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={() => void reject(u)}>
                        {ICON.x} Rejeitar
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

function ResetsTab({ pending }: { pending?: number }) {
  const { toast, confirm } = useUi();
  const qc = useQueryClient();

  const resets = useQuery({
    queryKey: ['admin', 'password-resets'],
    queryFn: () => api<ResetRequestOut[]>('/admin/password-resets'),
  });

  const mutate = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const approve = async (r: ResetRequestOut): Promise<void> => {
    const ok = await confirm({
      title: 'Aprovar recuperação',
      message: `Gerar um link de redefinição para ${r.user_name}? O link vale 30 minutos.`,
      confirmText: 'Gerar link',
    });
    if (!ok) return;
    mutate.mutate(async () => {
      const res = await api<ResetRequestOut>(
        `/admin/password-resets/${r.id}/approve`,
        { method: 'POST' },
      );
      if (res.reset_link) {
        await navigator.clipboard?.writeText(res.reset_link).catch(() => undefined);
        toast('Link gerado e copiado para a área de transferência.', 'success');
      } else {
        toast('Solicitação aprovada.', 'success');
      }
    });
  };

  const reject = async (r: ResetRequestOut): Promise<void> => {
    const ok = await confirm({
      title: 'Rejeitar solicitação',
      message: `Negar o pedido de recuperação de ${r.user_name}?`,
      confirmText: 'Rejeitar',
      danger: true,
    });
    if (!ok) return;
    mutate.mutate(async () => {
      await api(`/admin/password-resets/${r.id}/reject`, { method: 'POST' });
      toast('Solicitação rejeitada.', 'success');
    });
  };

  const rows = resets.data ?? [];

  return (
    <>
      <PageHead
        title="Recuperações de senha"
        subtitle={
          pending
            ? `${pending} pedido(s) aguardando análise.`
            : 'Cada pedido gera um link válido por 30 minutos, só depois da sua aprovação.'
        }
      />

      <TableWrap>
        {resets.isLoading ? (
          <SkeletonRows n={3} />
        ) : rows.length === 0 ? (
          <EmptyState icon="key" text="Nenhuma solicitação de recuperação." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Status</th>
                <th>Solicitado em</th>
                <th>Expira em</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.user_name ?? '-'}</b>
                    <div className="hint">{r.user_email}</div>
                    {r.reset_link && (
                      <div className="copy-box" style={{ marginTop: 8 }}>
                        <span>{r.reset_link}</span>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          aria-label="Copiar link"
                          onClick={() => {
                            void navigator.clipboard?.writeText(r.reset_link ?? '');
                            toast('Link copiado.', 'success');
                          }}
                        >
                          {ICON.copy}
                        </button>
                      </div>
                    )}
                  </td>
                  <td><span className="tag">{r.status}</span></td>
                  <td>{fmtDateTime(r.created_at)}</td>
                  <td>{fmtDateTime(r.token_expires_at)}</td>
                  <td>
                    <div className="actions-cell">
                      {r.status === 'pending' && (
                        <>
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => void approve(r)}>
                            {ICON.key} Aprovar
                          </button>
                          <button type="button" className="btn btn-sm btn-danger" onClick={() => void reject(r)}>
                            {ICON.x}
                          </button>
                        </>
                      )}
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
