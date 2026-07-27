import { ICON } from '../lib/icons';

/** Tela de carregamento inicial — porte do `boot-loading` do sistema atual. */
export function BootScreen({
  label = 'Entrando…',
  exiting = false,
  entering = false,
}: {
  label?: string;
  exiting?: boolean;
  entering?: boolean;
}) {
  const mode = exiting ? ' boot--exit' : entering ? ' boot--enter' : '';
  return (
    <div className={`boot${mode}`} aria-hidden={exiting}>
      <div className="boot__inner">
        <div className="boot__logo">{ICON.wallet}</div>
        <p className="boot__label">{label}</p>
      </div>
    </div>
  );
}
