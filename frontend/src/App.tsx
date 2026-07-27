import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { api, Auth } from './lib/api';
import { useSession } from './lib/session';
import type { AdminCountsOut } from './lib/types';
import { AppShell, type ShellNavItem } from './components/AppShell';
import { BootTransition } from './components/BootTransition';
import { NAV_LABELS } from './theme/preferences';

import { AuthPage } from './features/auth/AuthPage';
import { ForgotPage } from './features/auth/ForgotPage';
import { ResetPage } from './features/auth/ResetPage';
import { StatusPage } from './features/auth/StatusPage';

import { DashboardPage } from './features/finance/DashboardPage';
import { ItemsPage } from './features/finance/ItemsPage';
import { ExpensesPage } from './features/finance/ExpensesPage';
import { TrashPage } from './features/finance/TrashPage';
import { CategoriesPage } from './features/finance/CategoriesPage';
import { SettingsPage } from './features/finance/SettingsPage';
import { AdminPage } from './features/admin/AdminPage';

/** Rota do usuario comum -> `/app/*`; a rota do admin nao aceita usuario comum. */
const NAV_ROUTES: Record<string, string> = {
  dashboard: '/app',
  lista: '/app/lista',
  backlog: '/app/backlog',
  gastos: '/app/gastos',
  lixeira: '/app/lixeira',
  categorias: '/app/categorias',
  config: '/app/config',
};

function RequireAuth({ role }: { role?: 'admin' | 'user' }) {
  const { user, loading } = useSession();
  const location = useLocation();
  const sessionPending = loading || !user;

  if (!Auth.token) return <Navigate to="/" replace state={{ from: location }} />;
  if (!sessionPending && !user) return <Navigate to="/" replace state={{ from: location }} />;

  return (
    <BootTransition pending={sessionPending} ready={Boolean(user)}>
      {user ? <RequireAuthOutlet role={role} user={user} /> : null}
    </BootTransition>
  );
}

function RequireAuthOutlet({
  role,
  user,
}: {
  role?: 'admin' | 'user';
  user: NonNullable<ReturnType<typeof useSession>['user']>;
}) {
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/app" replace />;
  if (role === 'user' && user.role === 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

function UserLayout() {
  const { preferences } = useSession();
  const items: ShellNavItem[] = preferences.nav_order.map((id) => ({
    id,
    to: NAV_ROUTES[id] ?? '/app',
    label: NAV_LABELS[id] ?? id,
    icon: preferences.nav_icons[id] ?? 'grid',
  }));

  return (
    <AppShell
      items={items}
      brandTitle={preferences.sidebar_title}
      brandIcon={preferences.brand_icon}
    >
      <Outlet />
    </AppShell>
  );
}

function AdminLayout() {
  const counts = useQuery({
    queryKey: ['admin', 'counts'],
    queryFn: () => api<AdminCountsOut>('/admin/counts'),
    refetchInterval: 60_000,
  });

  const items: ShellNavItem[] = [
    { id: 'users', to: '/admin', label: 'Usuários', icon: 'user' },
    {
      id: 'registrations',
      to: '/admin/cadastros',
      label: 'Cadastros',
      icon: 'inbox',
      badge: counts.data?.pending_registrations,
    },
    {
      id: 'resets',
      to: '/admin/senhas',
      label: 'Recuperações',
      icon: 'key',
      badge: counts.data?.pending_resets,
    },
  ];

  return (
    <AppShell items={items} brandTitle="Administração" brandIcon="shield">
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/forgot" element={<ForgotPage />} />
      <Route path="/status" element={<StatusPage />} />
      {/* Duas rotas para o reset: o link enviado por e-mail aponta para
          `/reset.html?token=...` e nao pode deixar de funcionar. */}
      <Route path="/reset" element={<ResetPage />} />
      <Route path="/reset.html" element={<ResetPage />} />

      <Route element={<RequireAuth role="user" />}>
        <Route path="/app" element={<UserLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="lista" element={<ItemsPage state="lista" />} />
          <Route path="backlog" element={<ItemsPage state="backlog" />} />
          <Route path="gastos" element={<ExpensesPage />} />
          <Route path="lixeira" element={<TrashPage />} />
          <Route path="categorias" element={<CategoriesPage />} />
          <Route path="config" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminPage tab="users" />} />
          <Route path="cadastros" element={<AdminPage tab="registrations" />} />
          <Route path="senhas" element={<AdminPage tab="resets" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
