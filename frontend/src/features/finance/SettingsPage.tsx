import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { fmtDateOnly, fmtDateTime, fmtMoney } from '../../lib/format';
import { ICON } from '../../lib/icons';
import { useSession } from '../../lib/session';
import type { AccessLogOut, UserOut, UserPreferences } from '../../lib/types';
import { useUi } from '../../components/UiProvider';
import { EmptyState, PageHead, SkeletonRows } from '../../components/primitives';
import { NavGlyph } from '../../components/NavGlyph';
import { applyAccentColor } from '../../theme/applyAccent';
import {
  ACCENT_PRESETS,
  NAV_ICON_KEYS,
  NAV_ICON_LABELS,
  NAV_ICON_STYLES,
  NAV_ICON_STYLE_LABELS,
  NAV_LABELS,
} from '../../theme/preferences';
import { PASSWORD_RULE } from '../auth/rules';

type Tab = 'account' | 'appearance' | 'security';

/**
 * Porte de `viewConfig` — Conta / Aparencia / Seguranca.
 *
 * A tela e uma mesa de trabalho, nao um formulario: abas no topo escolhem o
 * assunto, o painel abaixo mostra o efeito. Duas decisoes sustentam isso:
 *
 *  1. A aparencia tem PREVIA. Escolher "Losango" num <select> e apostar; ver a
 *     sidebar mudar e decidir. A previa usa o mesmo componente da sidebar real
 *     (`NavGlyph`), entao nao existe versao "de mentira" do simbolo.
 *  2. O salvar mora numa barra que so aparece quando ha diferenca entre o
 *     rascunho e o que esta salvo. Botao sempre visivel nao informa nada; um
 *     que aparece avisa que existe trabalho pendente.
 */
export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account');

  return (
    <>
      <PageHead
        title="Configurações"
        subtitle="Sua conta, a aparência do sistema e a sua senha."
      />

      <div className="settings">
        <nav className="settings-rail" role="tablist" aria-label="Seções de configurações">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`settings-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`settings-panel-${t.id}`}
              className={`settings-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="settings-tab-icon">{ICON[t.icon]}</span>
              <span className="settings-tab-text">
                <b>{t.label}</b>
                <small>{t.hint}</small>
              </span>
            </button>
          ))}
        </nav>

        <div
          className="settings-body"
          role="tabpanel"
          id={`settings-panel-${tab}`}
          aria-labelledby={`settings-tab-${tab}`}
        >
          {tab === 'account' && <AccountPanel />}
          {tab === 'appearance' && <AppearancePanel />}
          {tab === 'security' && <SecurityPanel />}
        </div>
      </div>
    </>
  );
}

const TABS = [
  { id: 'account', label: 'Conta', hint: 'Perfil, moeda e lixeira', icon: 'user' },
  { id: 'appearance', label: 'Aparência', hint: 'Cor, ícones e menu', icon: 'eye' },
  { id: 'security', label: 'Segurança', hint: 'Senha e acessos', icon: 'shield' },
] as const satisfies readonly { id: Tab; label: string; hint: string; icon: string }[];

/* ------------------------------------------------------------------------ */

/**
 * Barra de trabalho pendente. Fica colada no rodape da area util enquanto o
 * rascunho difere do salvo, e some sozinha quando nao ha o que salvar — por
 * isso e renderizada condicionalmente, e nao escondida com `aria-hidden`
 * (botao invisivel que ainda recebe foco e armadilha de teclado).
 */
function SaveBar({
  pending,
  label,
  onDiscard,
  onSave,
}: {
  pending: boolean;
  label: string;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="save-bar" role="status">
      <span className="save-bar-dot" aria-hidden="true" />
      <span className="save-bar-text">Alterações não salvas</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={pending}
        onClick={onDiscard}
      >
        Descartar
      </button>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={pending}
        onClick={onSave}
      >
        {pending ? 'Salvando…' : label}
      </button>
    </div>
  );
}

/** Cartao com titulo, descricao opcional e conteudo — a unidade da tela. */
function Block({
  title,
  desc,
  aside,
  children,
}: {
  title: string;
  desc?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card settings-block">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          {desc && <p className="settings-block-desc">{desc}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------- CONTA ---------------------------------- */

const CURRENCY_PRESETS = ['R$', 'US$', '€', '£'];
const TRASH_PRESETS = [7, 15, 30, 60, 90];

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  pending: 'Pendente',
  suspended: 'Suspensa',
};

const STATUS_TAGS: Record<string, string> = {
  active: 'tag success',
  pending: 'tag media',
  suspended: 'tag alta',
};

function AccountPanel() {
  const { user, setUser } = useSession();
  const { toast } = useUi();

  // O salvo e a fonte da verdade; o rascunho so existe enquanto difere dele.
  const saved = useMemo(
    () => ({
      name: user?.name ?? '',
      currency: user?.currency ?? 'R$',
      trashDays: String(user?.trash_autoclean_days ?? 30),
    }),
    [user],
  );
  const [draft, setDraft] = useState(saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = useMutation({
    mutationFn: () =>
      api<UserOut>('/users/me', {
        method: 'PUT',
        body: {
          name: draft.name.trim(),
          currency: draft.currency.trim(),
          trash_autoclean_days: Number.parseInt(draft.trashDays, 10) || 30,
        },
      }),
    onSuccess: (u) => {
      setUser(u);
      toast('Conta atualizada.', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const patch = (part: Partial<typeof draft>): void =>
    setDraft((prev) => ({ ...prev, ...part }));

  return (
    <div className="settings-stack">
      <section className="card identity">
        <div className="identity-avatar" aria-hidden="true">
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            (user?.name?.charAt(0).toUpperCase() ?? '?')
          )}
        </div>
        <div className="identity-meta">
          <h3>{user?.name || '—'}</h3>
          <span className="identity-mail tabular">{user?.email ?? '—'}</span>
          <div className="row wrap">
            <span className="tag accent">
              {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
            </span>
            <span className={STATUS_TAGS[user?.status ?? ''] ?? 'tag'}>
              {STATUS_LABELS[user?.status ?? ''] ?? '—'}
            </span>
            <span className="identity-since">
              Na casa desde {fmtDateOnly(user?.created_at)}
            </span>
          </div>
        </div>
      </section>

      <Block title="Perfil" desc="Como o sistema chama você.">
        <div className="stack">
          <div className="field">
            <label htmlFor="cfg-name">Nome</label>
            <input
              id="cfg-name"
              value={draft.name}
              autoComplete="name"
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>

          <div className="field">
            <label htmlFor="cfg-email">E-mail</label>
            <div className="input-locked">
              <input id="cfg-email" value={user?.email ?? ''} disabled />
              <span className="input-locked-mark" aria-hidden="true">
                {ICON.key}
              </span>
            </div>
            <p className="hint">
              O e-mail identifica a conta e não pode ser alterado por aqui.
            </p>
          </div>
        </div>
      </Block>

      <Block title="Uso do sistema" desc="Como os valores aparecem e por quanto tempo a lixeira guarda.">
        <div className="stack">
          <div className="field">
            <label htmlFor="cfg-currency">Moeda</label>
            <div className="field-inline">
              <input
                id="cfg-currency"
                className="field-inline-input"
                value={draft.currency}
                placeholder="R$"
                maxLength={6}
                onChange={(e) => patch({ currency: e.target.value })}
              />
              <div className="chip-row">
                {CURRENCY_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip${draft.currency === c ? ' active' : ''}`}
                    aria-pressed={draft.currency === c}
                    onClick={() => patch({ currency: c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <p className="hint">
              Prefixo dos valores no dashboard e nas listas —{' '}
              <span className="tabular">
                {fmtMoney(1234.5, draft.currency.trim() || 'R$')}
              </span>
              .
            </p>
          </div>

          <div className="field">
            <label htmlFor="cfg-trash">Lixeira automática (dias)</label>
            <div className="field-inline">
              <input
                id="cfg-trash"
                className="field-inline-input"
                type="number"
                min={1}
                max={365}
                value={draft.trashDays}
                onChange={(e) => patch({ trashDays: e.target.value })}
              />
              <div className="chip-row">
                {TRASH_PRESETS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`chip${draft.trashDays === String(d) ? ' active' : ''}`}
                    aria-pressed={draft.trashDays === String(d)}
                    onClick={() => patch({ trashDays: String(d) })}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            {/*
              Honestidade sobre o sistema: o valor e salvo, mas NAO existe job
              de limpeza (plano, 6.10). Prometer o contrario seria mentira de
              interface — por isso o aviso e um estado visivel, nao uma nota de
              rodape em cinza claro.
            */}
            <p className="notice notice-warn">
              {ICON.clock}
              <span>
                Preferência salva, mas a limpeza automática ainda não está ativa:
                por enquanto a exclusão definitiva é manual, pela Lixeira.
              </span>
            </p>
          </div>
        </div>
      </Block>

      {dirty && (
        <SaveBar
          pending={save.isPending}
          label="Salvar conta"
          onDiscard={() => setDraft(saved)}
          onSave={() => save.mutate()}
        />
      )}
    </div>
  );
}

/* ----------------------------- APARENCIA -------------------------------- */

function AppearancePanel() {
  const { preferences, setPreferences, currency } = useSession();
  const { toast } = useUi();
  const [draft, setDraft] = useState<UserPreferences>(preferences);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);
  // Fora de `default` o marcador e unico para a sidebar toda: escolher icone
  // por item deixa de ter efeito, entao a escolha some em vez de enganar.
  const iconsEditable = draft.nav_icon_style === 'default';

  /*
    Forma funcional de proposito: duas alteracoes na mesma passada do React
    (trocar a cor e mover um item, por exemplo) leriam o MESMO rascunho antigo
    se o `setDraft` recebesse um objeto pronto — e a segunda apagaria a
    primeira. Aqui cada alteracao parte do rascunho corrente.
  */
  const patch = (part: Partial<UserPreferences>): void => {
    setDraft((prev) => ({ ...prev, ...part }));
    // Pre-visualizacao imediata do accent, antes mesmo de salvar.
    if (part.accent_color) applyAccentColor(part.accent_color);
  };

  const discard = (): void => {
    setDraft(preferences);
    applyAccentColor(preferences.accent_color);
    setPickerFor(null);
  };

  const save = useMutation({
    mutationFn: () =>
      api<UserPreferences>('/users/me/preferences', { method: 'PUT', body: draft }),
    onSuccess: (prefs) => {
      setPreferences(prefs);
      setDraft(prefs);
      applyAccentColor(prefs.accent_color);
      toast('Aparência atualizada.', 'success');
    },
    onError: (e: Error) => {
      applyAccentColor(preferences.accent_color);
      toast(e.message, 'error');
    },
  });

  const move = (index: number, delta: number): void => {
    setDraft((prev) => {
      const order = [...prev.nav_order];
      const target = index + delta;
      if (target < 0 || target >= order.length) return prev;
      [order[index], order[target]] = [order[target], order[index]];
      return { ...prev, nav_order: order };
    });
  };

  return (
    <div className="settings-stack">
      {/* --- previa ------------------------------------------------------ */}
      <section className="card preview-card">
        <div className="card-head">
          <div>
            <h3>Prévia</h3>
            <p className="settings-block-desc">O resultado, enquanto você decide.</p>
          </div>
          <span className="tag accent">Ao vivo</span>
        </div>

        <div
          className="preview"
          style={{ '--preview-accent': draft.accent_color } as CSSProperties}
        >
          <div className="preview-sidebar">
            <div className="preview-brand">
              {draft.nav_icon_style !== 'none' && (
                <span className="preview-logo">
                  <NavGlyph style={draft.nav_icon_style} icon={draft.brand_icon} />
                </span>
              )}
              <strong>{draft.sidebar_title.trim() || 'Financeiro'}</strong>
            </div>
            <div className="preview-nav">
              {draft.nav_order.map((id, i) => (
                <span key={id} className={`preview-nav-item${i === 0 ? ' active' : ''}`}>
                  <NavGlyph style={draft.nav_icon_style} icon={draft.nav_icons[id]} />
                  <span className="grow">{NAV_LABELS[id] ?? id}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="preview-content" aria-hidden="true">
            <span className="preview-heading">Dashboard</span>
            <div className="preview-metric">
              <span className="preview-metric-label">Total gasto</span>
              <span className="preview-metric-value tabular">
                {fmtMoney(4280, currency)}
              </span>
            </div>
            <div className="preview-bars">
              <span style={{ width: '82%' }} />
              <span style={{ width: '54%' }} />
              <span style={{ width: '31%' }} />
            </div>
            <span className="preview-btn">Novo item</span>
          </div>
        </div>
      </section>

      {/* --- identidade -------------------------------------------------- */}
      <Block title="Identidade" desc="O nome e o símbolo no topo da sidebar.">
        <div className="stack">
          <div className="field">
            <label htmlFor="cfg-title">Título da sidebar</label>
            <input
              id="cfg-title"
              maxLength={40}
              value={draft.sidebar_title}
              onChange={(e) => patch({ sidebar_title: e.target.value })}
            />
          </div>

          <div className="field">
            <label>Ícone do título</label>
            {iconsEditable ? (
              <div className="icon-grid">
                {NAV_ICON_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    title={NAV_ICON_LABELS[key] ?? key}
                    aria-label={NAV_ICON_LABELS[key] ?? key}
                    aria-pressed={draft.brand_icon === key}
                    className={`icon-pick${draft.brand_icon === key ? ' active' : ''}`}
                    onClick={() => patch({ brand_icon: key })}
                  >
                    {ICON[key]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="notice">
                {ICON.eye}
                <span>
                  Com o estilo <b>{NAV_ICON_STYLE_LABELS[draft.nav_icon_style]}</b>, o
                  mesmo marcador vale para o título e para todos os itens.
                </span>
              </p>
            )}
          </div>
        </div>
      </Block>

      {/* --- cor --------------------------------------------------------- */}
      <Block
        title="Cor de destaque"
        desc="Repinta cards, botões, gráficos e o brilho de fundo."
        aside={
          <span className="accent-readout tabular">
            {draft.accent_color.toUpperCase()}
          </span>
        }
      >
        <div className="swatches">
          {ACCENT_PRESETS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Cor ${hex}`}
              aria-pressed={draft.accent_color === hex}
              className={`swatch${draft.accent_color === hex ? ' active' : ''}`}
              style={{ '--swatch': hex } as CSSProperties}
              onClick={() => patch({ accent_color: hex })}
            >
              {draft.accent_color === hex && ICON.check}
            </button>
          ))}

          <label
            className="swatch swatch-custom"
            title="Cor personalizada"
            style={{ '--swatch': draft.accent_color } as CSSProperties}
          >
            {ICON.edit}
            <input
              type="color"
              aria-label="Cor personalizada"
              value={draft.accent_color}
              onChange={(e) => patch({ accent_color: e.target.value })}
            />
          </label>
        </div>
        <p className="hint">
          As oito primeiras foram medidas contra o fundo do sistema e passam em
          contraste AA. Uma cor sua pode não passar.
        </p>
      </Block>

      {/* --- navegacao --------------------------------------------------- */}
      <Block title="Navegação" desc="O símbolo e a ordem dos itens da sidebar.">
        <div className="stack">
          <div className="field">
            <label id="cfg-style-label">Estilo dos símbolos</label>
            <div className="style-picker" role="group" aria-labelledby="cfg-style-label">
              {NAV_ICON_STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={draft.nav_icon_style === s}
                  className={`style-option${draft.nav_icon_style === s ? ' active' : ''}`}
                  onClick={() => patch({ nav_icon_style: s })}
                >
                  <span className="style-option-glyph">
                    {s === 'default' ? ICON.grid : <NavGlyph style={s} />}
                  </span>
                  <span className="style-option-label">{NAV_ICON_STYLE_LABELS[s]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Ordem dos itens</label>
            <ol className="nav-order">
              {draft.nav_order.map((id, index) => {
                const label = NAV_LABELS[id] ?? id;
                const open = pickerFor === id;
                return (
                  <li key={id} className={`nav-order-row${open ? ' open' : ''}`}>
                    <div className="nav-order-main">
                      <span className="nav-order-index tabular">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      {iconsEditable ? (
                        <button
                          type="button"
                          className={`icon-pick${open ? ' active' : ''}`}
                          aria-expanded={open}
                          aria-label={`Trocar ícone de ${label}`}
                          onClick={() => setPickerFor(open ? null : id)}
                        >
                          <NavGlyph style={draft.nav_icon_style} icon={draft.nav_icons[id]} />
                        </button>
                      ) : (
                        <span className="icon-pick is-static" aria-hidden="true">
                          <NavGlyph style={draft.nav_icon_style} />
                        </span>
                      )}

                      <span className="grow">{label}</span>

                      <span className="nav-order-moves">
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          aria-label={`Mover ${label} para cima`}
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                        >
                          {ICON.arrowUp}
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon btn-sm"
                          aria-label={`Mover ${label} para baixo`}
                          disabled={index === draft.nav_order.length - 1}
                          onClick={() => move(index, 1)}
                        >
                          {ICON.arrowDown}
                        </button>
                      </span>
                    </div>

                    {open && (
                      <div className="icon-grid nav-order-picker">
                        {NAV_ICON_KEYS.map((key) => (
                          <button
                            key={key}
                            type="button"
                            title={NAV_ICON_LABELS[key] ?? key}
                            aria-label={NAV_ICON_LABELS[key] ?? key}
                            aria-pressed={draft.nav_icons[id] === key}
                            className={`icon-pick${draft.nav_icons[id] === key ? ' active' : ''}`}
                            onClick={() => {
                              setDraft((prev) => ({
                                ...prev,
                                nav_icons: { ...prev.nav_icons, [id]: key },
                              }));
                              setPickerFor(null);
                            }}
                          >
                            {ICON[key]}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </Block>

      {dirty && (
        <SaveBar
          pending={save.isPending}
          label="Salvar aparência"
          onDiscard={discard}
          onSave={() => save.mutate()}
        />
      )}
    </div>
  );
}

/* ----------------------------- SEGURANCA -------------------------------- */

/**
 * Espelho legivel de `PASSWORD_RULE` (features/auth/rules.ts).
 *
 * A regex continua sendo quem autoriza o envio — a lista abaixo so diz ao
 * usuario, enquanto ele digita, qual pedaco ainda falta. Se a regra mudar la,
 * mude aqui: duas fontes de verdade divergem na primeira alteracao.
 */
const PASSWORD_CHECKS = [
  { label: 'Mínimo de 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Uma letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  {
    label: 'Um caractere especial',
    test: (v: string) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/.test(v),
  },
];

function SecurityPanel() {
  const { toast, confirm } = useUi();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [reveal, setReveal] = useState(false);

  const logs = useQuery({
    queryKey: ['access-logs'],
    queryFn: () => api<AccessLogOut[]>('/users/me/access-logs?limit=10'),
  });

  const change = useMutation({
    mutationFn: () =>
      api('/users/me/password', {
        method: 'PUT',
        body: { current_password: current, new_password: next },
      }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      toast('Senha alterada com sucesso.', 'success');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const strong = PASSWORD_RULE.test(next);

  const submit = async (): Promise<void> => {
    if (!current || !next) {
      toast('Preencha as duas senhas.', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'Alterar senha',
      message: 'Deseja confirmar a alteração de senha?',
      confirmText: 'Alterar',
    });
    if (ok) change.mutate();
  };

  return (
    <div className="settings-stack">
      <Block title="Alterar senha" desc="Vale para o próximo login — a sessão atual continua.">
        <div className="stack">
          <div className="field">
            <label htmlFor="cur-pwd">Senha atual</label>
            <input
              id="cur-pwd"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="new-pwd">Nova senha</label>
            <div className="input-locked">
              <input
                id="new-pwd"
                type={reveal ? 'text' : 'password'}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <button
                type="button"
                className="input-reveal"
                aria-label={reveal ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={reveal}
                onClick={() => setReveal(!reveal)}
              >
                {ICON.eye}
              </button>
            </div>

            <ul className="rule-list">
              {PASSWORD_CHECKS.map((r) => {
                const ok = r.test(next);
                return (
                  <li key={r.label} className={ok ? 'ok' : undefined}>
                    <span className="rule-mark" aria-hidden="true">
                      {ok ? ICON.check : null}
                    </span>
                    <span>{r.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="settings-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={change.isPending || !current || !strong}
              onClick={() => void submit()}
            >
              {change.isPending ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </div>
      </Block>

      <Block
        title="Últimos acessos"
        desc="Os dez registros mais recentes desta conta."
        aside={
          <button
            type="button"
            className="btn btn-icon btn-sm"
            aria-label="Atualizar lista"
            disabled={logs.isFetching}
            onClick={() => void logs.refetch()}
          >
            {ICON.reopen}
          </button>
        }
      >
        {logs.isLoading ? (
          <SkeletonRows n={4} />
        ) : logs.data && logs.data.length > 0 ? (
          <ol className="access-log">
            {logs.data.map((l, i) => (
              <li key={l.id}>
                <span className="access-log-mark" aria-hidden="true" />
                <span className="access-log-when tabular">{fmtDateTime(l.created_at)}</span>
                {i === 0 && <span className="tag accent">Mais recente</span>}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState icon="clock" text="Nenhum acesso registrado ainda." />
        )}
      </Block>
    </div>
  );
}
