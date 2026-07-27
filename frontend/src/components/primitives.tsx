import type { ReactNode } from 'react';
import { ICON } from '../lib/icons';
import { fmtInt, fmtMoney } from '../lib/format';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  );
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <div className="skeleton-rows">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  );
}

export function SkeletonCards({ n = 4 }: { n?: number }) {
  return (
    <div className="metrics">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton skeleton-card" />
      ))}
    </div>
  );
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty">
      {ICON[icon]}
      <p>{text}</p>
    </div>
  );
}

/**
 * Card de metrica com contagem animada (comportamento obrigatorio 6.2).
 * O pulso do card e disparado por classe, igual ao `animate.js` original.
 */
export function MetricCard({
  label,
  icon,
  value,
  money,
  currency,
  onOpen,
  onDismiss,
  dashed,
}: {
  label: string;
  icon?: string;
  value: number;
  money?: boolean;
  currency?: string;
  onOpen?: () => void;
  onDismiss?: () => void;
  dashed?: boolean;
}) {
  const { value: shown, counting } = useAnimatedNumber(value);
  const text = money ? fmtMoney(shown, currency) : fmtInt(shown);

  return (
    <div
      className={`metric${counting ? ' pulse' : ''}${dashed ? ' metric-sum-temp' : ''}`}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {onDismiss && (
        <button
          type="button"
          className="metric-dismiss"
          aria-label="Remover soma"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          {ICON.x}
        </button>
      )}
      <div className="m-top">
        <span className="m-label">{label}</span>
        {icon && ICON[icon]}
      </div>
      <div className={`m-value tabular${counting ? ' counting' : ''}`}>{text}</div>
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <div className="table-scroll">{children}</div>
    </div>
  );
}
