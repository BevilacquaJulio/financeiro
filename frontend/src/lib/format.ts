/** Formatadores da UI (porte das helpers de `ui.js`). */

export function fmtMoney(value: number | null | undefined, currency = 'R$'): string {
  const n = Number(value ?? 0);
  return `${currency} ${n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtInt(value: number | null | undefined): string {
  return Math.round(Number(value ?? 0)).toLocaleString('pt-BR');
}

/**
 * O backend devolve datas NAIVE em UTC ("2026-07-24T18:30:00", sem "Z"), igual
 * ao pydantic. `new Date()` interpretaria isso como hora LOCAL. Anexamos o "Z"
 * para ler como UTC e so entao converter para o fuso do usuario.
 */
function parseNaiveUtc(value: string | null | undefined): Date | null {
  if (!value) return null;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const d = new Date(hasZone ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDateOnly(value: string | null | undefined): string {
  const d = parseNaiveUtc(value);
  return d ? d.toLocaleDateString('pt-BR') : '-';
}

export function fmtDateTime(value: string | null | undefined): string {
  const d = parseNaiveUtc(value);
  return d
    ? d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '-';
}

export const PRIORITIES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
] as const;

export function priorityLabel(value: string | null | undefined): string {
  return PRIORITIES.find((p) => p.value === value)?.label ?? value ?? '-';
}
