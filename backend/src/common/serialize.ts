/**
 * Utilitarios de PARIDADE de serializacao com FastAPI/pydantic.
 *
 * Duas armadilhas que quebram o diff Node vs Python (plano, secao 6.7):
 *
 * 1) DATA/HORA. As colunas sao DATETIME (sem timezone) e o Python grava
 *    `datetime.utcnow()` (UTC ingenuo). O pydantic serializa isso como
 *    "2026-07-24T18:30:00" — SEM sufixo "Z". Um `Date` do JS vira
 *    "2026-07-24T18:30:00.000Z" no JSON.stringify. Isso desloca datas em
 *    clientes que interpretam o "Z". `toNaiveIso` reproduz o formato Python.
 *
 * 2) ARREDONDAMENTO. `round()` do Python usa banker's rounding (empate vai
 *    para o par) sobre o valor binario exato. `Math.round` do JS arredonda
 *    empate para cima. `pyRound` reproduz o comportamento do Python.
 */

/** Converte Date -> "YYYY-MM-DDTHH:MM:SS[.mmm]" (UTC, sem sufixo Z). */
export function toNaiveIso(value: Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const iso = value.toISOString(); // sempre "....sssZ"
  const withoutZ = iso.slice(0, -1);
  // MySQL DATETIME(0) nao guarda fracao: o Python devolve sem milissegundos.
  return withoutZ.endsWith('.000') ? withoutZ.slice(0, -4) : withoutZ;
}

/** Aceita string ISO ou Date vindo do corpo da requisicao. */
export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Equivalente a `round(value, digits)` do Python (half-to-even sobre o valor
 * binario EXATO do double).
 *
 * NAO use `Number(value.toFixed(digits))`: o `toFixed` do V8 nao arredonda a
 * partir do valor exato para todos os casos. `(2.675).toFixed(2)` devolve
 * "2.68", enquanto o Python devolve 2.67 — porque o double armazenado e
 * 2.67499999999999982236, abaixo do empate. Isso deslocaria centavos no
 * dashboard e o diff Node-vs-Python nunca fecharia.
 *
 * Estrategia: expandir o double em 20 casas decimais (exato o bastante para
 * qualquer valor monetario) e arredondar a string, com desempate para o par.
 */
export function pyRound(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return value;
  if (Number.isInteger(value)) return value;

  const negative = value < 0;
  const expanded = Math.abs(value).toFixed(20); // expansao decimal exata o bastante
  const dot = expanded.indexOf('.');
  const intPart = expanded.slice(0, dot);
  const fracPart = expanded.slice(dot + 1);

  const keep = fracPart.slice(0, digits);
  const rest = fracPart.slice(digits);

  let digitsStr = intPart + keep; // numero inteiro escalado, como string
  const firstDropped = rest.charCodeAt(0) - 48;
  const restNonZero = /[1-9]/.test(rest.slice(1));

  let roundUp: boolean;
  if (firstDropped > 5) roundUp = true;
  else if (firstDropped < 5) roundUp = false;
  else if (restNonZero) roundUp = true;
  else {
    // Empate exato -> vai para o PAR (banker's rounding, igual ao Python).
    const last = digitsStr.charCodeAt(digitsStr.length - 1) - 48;
    roundUp = last % 2 === 1;
  }

  if (roundUp) digitsStr = (BigInt(digitsStr) + 1n).toString();

  const result = Number(digitsStr) / 10 ** digits;
  return negative ? -result : result;
}

/** Reproduz `float | None` do pydantic: mantem null, nunca vira 0. */
export function orNull<T>(value: T | null | undefined): T | null {
  return value === undefined || value === null ? null : value;
}
