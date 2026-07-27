import { describe, expect, it } from 'vitest';
import { EMAIL_LOCAL_RULE, PASSWORD_RULE } from '../src/iam/auth/auth.rules';
import { pyRound, toNaiveIso } from '../src/common/serialize';
import {
  DEFAULT_USER_PREFERENCES,
  normalizePreferences,
  validatePreferences,
} from '../src/iam/preferences/preferences';

describe('regra de senha (regex identico ao auth.py)', () => {
  it.each(['Senha@123', 'ABCdefg!', 'X_aaaaaaa', 'Aa1!aaaa'])(
    'aceita %s',
    (p) => expect(PASSWORD_RULE.test(p)).toBe(true),
  );
  it.each(['senha@123', 'SENHA123', 'Ab!1', 'Abcdefgh', ''])(
    'rejeita %s',
    (p) => expect(PASSWORD_RULE.test(p)).toBe(false),
  );
});

describe('parte local do e-mail', () => {
  it.each(['julio', 'j', 'a.b_c-d', 'user123'])('aceita %s', (v) =>
    expect(EMAIL_LOCAL_RULE.test(v)).toBe(true),
  );
  it.each(['.julio', '-x', '_a', 'Julio', 'ju lio', ''])('rejeita %s', (v) =>
    expect(EMAIL_LOCAL_RULE.test(v)).toBe(false),
  );
});

describe('data no formato do pydantic (naive, sem "Z")', () => {
  it('remove o Z e os milissegundos zerados', () =>
    expect(toNaiveIso(new Date('2026-07-24T18:30:00.000Z'))).toBe(
      '2026-07-24T18:30:00',
    ));
  it('mantem milissegundos quando existirem', () =>
    expect(toNaiveIso(new Date('2026-07-24T18:30:00.123Z'))).toBe(
      '2026-07-24T18:30:00.123',
    ));
  it('null continua null', () => expect(toNaiveIso(null)).toBeNull());
});

describe('pyRound (banker rounding do Python)', () => {
  it('2.675 -> 2.67 (o double e 2.67499...)', () =>
    expect(pyRound(2.675, 2)).toBe(2.67));
  it('0.125 -> 0.12 (empate exato vai para o par)', () =>
    expect(pyRound(0.125, 2)).toBe(0.12));
  it('0.135 -> 0.14', () => expect(pyRound(0.135, 2)).toBe(0.14));
  it('mantem inteiros', () => expect(pyRound(10, 2)).toBe(10));
});

describe('preferences: porte 1:1 do preferences.py', () => {
  it('nulo devolve os defaults', () =>
    expect(normalizePreferences(null)).toEqual(DEFAULT_USER_PREFERENCES));

  it('descarta valores invalidos silenciosamente', () => {
    const p = normalizePreferences({
      accent_color: 'vermelho',
      brand_icon: 'nao-existe',
      nav_icon_style: 'zig',
      sidebar_title: '   ',
    });
    expect(p.accent_color).toBe('#2e90ff');
    expect(p.brand_icon).toBe('wallet');
    expect(p.nav_icon_style).toBe('default');
    expect(p.sidebar_title).toBe('Financeiro');
  });

  it('nav_order parcial e completado com os ids faltantes', () => {
    const p = normalizePreferences({
      nav_order: ['config', 'lista', 'inexistente'],
    });
    expect(p.nav_order[0]).toBe('config');
    expect(p.nav_order[1]).toBe('lista');
    expect(p.nav_order).toHaveLength(7);
    expect(new Set(p.nav_order).size).toBe(7);
  });

  it('normaliza cor para minusculo', () =>
    expect(normalizePreferences({ accent_color: '#AABBCC' }).accent_color).toBe(
      '#aabbcc',
    ));

  it('validatePreferences aceita o resultado do normalize', () =>
    expect(validatePreferences({})).toEqual(DEFAULT_USER_PREFERENCES));
});
