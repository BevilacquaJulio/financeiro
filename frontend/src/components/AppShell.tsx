import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ICON } from '../lib/icons';
import { useSession } from '../lib/session';
import { NAV_LABELS } from '../theme/preferences';
import { NavGlyph } from './NavGlyph';
import { useUi } from './UiProvider';

export interface ShellNavItem {
  id: string;
  to: string;
  label: string;
  icon: string;
  badge?: number;
  /** So ativa em match exato — necessario em `/app` e `/admin` (rotas-pai). */
  end?: boolean;
}

/**
 * Casca do app (sidebar + conteudo).
 *
 * A ordem e os icones da navegacao vem das PREFERENCES do usuario
 * (`nav_order` / `nav_icons`), como no sistema atual — por isso a lista de
 * itens e derivada, nao hardcoded.
 */
export function AppShell({
  items,
  children,
  brandTitle,
  brandIcon,
}: {
  items: ShellNavItem[];
  children: React.ReactNode;
  brandTitle: string;
  brandIcon: string;
}) {
  const { user, logout, preferences } = useSession();
  const { confirm } = useUi();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const askLogout = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Sair da conta',
      message: 'Deseja realmente encerrar a sessão?',
      confirmText: 'Sair',
    });
    if (ok) logout();
  };

  const style = preferences.nav_icon_style;

  return (
    <div className="app">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          {style !== 'none' && (
            <span className="logo">
              <NavGlyph style={style} icon={brandIcon || 'wallet'} />
            </span>
          )}
          <strong>{brandTitle}</strong>
        </div>

        <nav className="nav" aria-label="Navegação principal">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.end ?? (item.to === '/app' || item.to === '/admin')}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <NavGlyph style={style} icon={item.icon} />
              <span className="grow">{item.label}</span>
              {item.badge ? <span className="badge-count">{item.badge}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="btn btn-ghost btn-block" onClick={askLogout}>
            {ICON.logout}
            <span>Sair</span>
          </button>
          <div className="user-chip">
            <div className="avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                (user?.name?.charAt(0).toUpperCase() ?? '?')
              )}
            </div>
            <div className="meta">
              <b>{user?.name ?? '-'}</b>
              <span>{user?.email ?? '-'}</span>
            </div>
          </div>
        </div>
      </aside>

      <div>
        <div className="mobile-bar">
          <button
            type="button"
            className="btn btn-icon"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
          >
            {ICON.menu}
          </button>
          <strong>{brandTitle}</strong>
        </div>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export { NAV_LABELS };
