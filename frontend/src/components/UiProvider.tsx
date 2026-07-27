/**
 * Porte de `frontend/js/ui.js` para React.
 *
 * Expoe a mesma API imperativa do sistema atual (`toast`, `confirm`,
 * `formModal`, `drawer`), porque os fluxos do roteiro sao escritos assim:
 * "abre modal de confirmacao -> se confirmar, chama a API -> toast". Manter a
 * forma imperativa preserva 1:1 os fluxos da secao 11 do roteiro sem espalhar
 * estado de modal por dez componentes.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ICON } from '../lib/icons';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Bloco de alerta destacado — usado quando a acao tem efeito em metricas. */
  warn?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export type FieldType = 'text' | 'number' | 'textarea' | 'select' | 'date';

export interface FormField {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  step?: string;
  empty?: string;
  options?: readonly (string | { value: string | number; label: string })[];
}

export interface FormModalOptions {
  title: string;
  submitText?: string;
  fields: FormField[];
  values?: Record<string, unknown>;
}

export interface PickOption {
  id: number;
  label: string;
  value: number;
  hint: string;
}

interface UiContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  formModal: (
    options: FormModalOptions,
  ) => Promise<Record<string, unknown> | null>;
  pickModal: (
    title: string,
    description: string,
    options: PickOption[],
    preselected: number[],
  ) => Promise<number[] | null>;
  openDrawer: (title: string, content: ReactNode) => void;
  closeDrawer: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi precisa estar dentro de <UiProvider>');
  return ctx;
}

function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add('scroll-locked');
    return () => document.documentElement.classList.remove('scroll-locked');
  }, [active]);
}

/** Fecha no ESC — exigido em todos os modais e no drawer. */
function useEscape(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, onEscape]);
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null);
  const [formState, setFormState] = useState<
    (FormModalOptions & { resolve: (v: Record<string, unknown> | null) => void }) | null
  >(null);
  const [pickState, setPickState] = useState<{
    title: string;
    description: string;
    options: PickOption[];
    selected: Set<number>;
    resolve: (v: number[] | null) => void;
  } | null>(null);
  const [drawer, setDrawer] = useState<{ title: string; content: ReactNode } | null>(
    null,
  );
  const seq = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    [],
  );

  const formModal = useCallback(
    (options: FormModalOptions) =>
      new Promise<Record<string, unknown> | null>((resolve) =>
        setFormState({ ...options, resolve }),
      ),
    [],
  );

  const pickModal = useCallback(
    (
      title: string,
      description: string,
      options: PickOption[],
      preselected: number[],
    ) =>
      new Promise<number[] | null>((resolve) =>
        setPickState({
          title,
          description,
          options,
          selected: new Set(preselected),
          resolve,
        }),
      ),
    [],
  );

  const openDrawer = useCallback((title: string, content: ReactNode) => {
    setDrawer({ title, content });
  }, []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  const value = useMemo<UiContextValue>(
    () => ({ toast, confirm, formModal, pickModal, openDrawer, closeDrawer }),
    [toast, confirm, formModal, pickModal, openDrawer, closeDrawer],
  );

  const anyOverlay = Boolean(confirmState || formState || pickState || drawer);
  useScrollLock(anyOverlay);

  const closeAllTop = useCallback(() => {
    if (pickState) {
      pickState.resolve(null);
      setPickState(null);
    } else if (formState) {
      formState.resolve(null);
      setFormState(null);
    } else if (confirmState) {
      confirmState.resolve(false);
      setConfirmState(null);
    } else if (drawer) {
      setDrawer(null);
    }
  }, [pickState, formState, confirmState, drawer]);

  useEscape(anyOverlay, closeAllTop);

  return (
    <UiContext.Provider value={value}>
      {children}

      {/* ------------------------------- toasts ------------------------- */}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* --------------------------- confirmacao ------------------------ */}
      {confirmState && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              confirmState.resolve(false);
              setConfirmState(null);
            }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <h3>{confirmState.title}</h3>
            {confirmState.message && (
              <p className="modal-body">{confirmState.message}</p>
            )}
            {confirmState.warn && (
              <div className="modal-warn">{confirmState.warn}</div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
              >
                {confirmState.cancelText ?? 'Cancelar'}
              </button>
              <button
                type="button"
                autoFocus
                className={`btn ${confirmState.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  confirmState.resolve(true);
                  setConfirmState(null);
                }}
              >
                {confirmState.confirmText ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------- formulario ------------------------ */}
      {formState && (
        <FormModal
          key={formState.title}
          options={formState}
          onDone={(data) => {
            formState.resolve(data);
            setFormState(null);
          }}
        />
      )}

      {/* --------------------- selecao multipla (somar) ------------------ */}
      {pickState && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              pickState.resolve(null);
              setPickState(null);
            }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <h3>{pickState.title}</h3>
            <p className="modal-body">{pickState.description}</p>
            <div className="pick-list">
              {pickState.options.map((o) => (
                <label className="pick-item" key={o.id}>
                  <input
                    type="checkbox"
                    defaultChecked={pickState.selected.has(o.id)}
                    onChange={(e) => {
                      const next = new Set(pickState.selected);
                      if (e.target.checked) next.add(o.id);
                      else next.delete(o.id);
                      setPickState({ ...pickState, selected: next });
                    }}
                  />
                  <span>{o.label}</span>
                  <span className="pick-price tabular">{o.hint}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  pickState.resolve(null);
                  setPickState(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (pickState.selected.size === 0) {
                    toast('Selecione ao menos um item.', 'warning');
                    return;
                  }
                  pickState.resolve([...pickState.selected]);
                  setPickState(null);
                }}
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ drawer -------------------------- */}
      {drawer && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawer(null)} />
          <aside className="drawer" role="dialog" aria-modal="true">
            <div className="drawer-head">
              <h3>{drawer.title}</h3>
              <button
                type="button"
                className="btn btn-icon"
                aria-label="Fechar"
                onClick={() => setDrawer(null)}
              >
                {ICON.x}
              </button>
            </div>
            <div className="drawer-content">{drawer.content}</div>
          </aside>
        </>
      )}
    </UiContext.Provider>
  );
}

/** Modal de formulario generico — porte de `UI.formModal`. */
function FormModal({
  options,
  onDone,
}: {
  options: FormModalOptions;
  onDone: (data: Record<string, unknown> | null) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of options.fields) {
      const v = options.values?.[f.name];
      initial[f.name] = v === null || v === undefined ? '' : String(v);
    }
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const f of options.fields) {
      if (f.required && !values[f.name].trim()) {
        nextErrors[f.name] = 'Campo obrigatório.';
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // Converte para o formato que a API espera: vazio -> null, number -> Number.
    const payload: Record<string, unknown> = {};
    for (const f of options.fields) {
      const raw = values[f.name];
      if (raw === '') {
        payload[f.name] = f.type === 'number' ? null : null;
      } else if (f.type === 'number') {
        payload[f.name] = Number(raw);
      } else if (f.name === 'category_id') {
        payload[f.name] = Number(raw);
      } else {
        payload[f.name] = raw;
      }
    }
    onDone(payload);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDone(null);
      }}
    >
      <form className="modal" role="dialog" aria-modal="true" onSubmit={submit}>
        <h3>{options.title}</h3>
        <div className="stack" style={{ marginTop: 18 }}>
          {options.fields.map((f) => (
            <div className="field" key={f.name}>
              <label htmlFor={`f-${f.name}`}>
                {f.label}
                {f.required ? ' *' : ''}
              </label>

              {f.type === 'textarea' ? (
                <textarea
                  id={`f-${f.name}`}
                  value={values[f.name]}
                  onChange={(e) =>
                    setValues({ ...values, [f.name]: e.target.value })
                  }
                />
              ) : f.type === 'select' ? (
                <select
                  id={`f-${f.name}`}
                  value={values[f.name]}
                  onChange={(e) =>
                    setValues({ ...values, [f.name]: e.target.value })
                  }
                >
                  <option value="">{f.empty ?? 'Selecione'}</option>
                  {(f.options ?? []).map((o) => {
                    const value = typeof o === 'string' ? o : String(o.value);
                    const label = typeof o === 'string' ? o : o.label;
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  id={`f-${f.name}`}
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  step={f.step}
                  value={values[f.name]}
                  onChange={(e) =>
                    setValues({ ...values, [f.name]: e.target.value })
                  }
                />
              )}

              {errors[f.name] && <p className="field-error">{errors[f.name]}</p>}
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => onDone(null)}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {options.submitText ?? 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
