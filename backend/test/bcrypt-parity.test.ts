import { describe, expect, it } from 'vitest';
import * as bcrypt from 'bcryptjs';
import fixtures from './fixtures/python-hashes.json';

/**
 * RISCO Nº 1 DA MIGRACAO (plano, secao 6.2): "todo mundo perdeu o login".
 *
 * Estes hashes foram gerados pelo bcrypt do PYTHON usando exatamente o que o
 * `security.py` faz: `bcrypt.hashpw(password.encode('utf-8')[:72], gensalt())`.
 * Se qualquer um destes falhar, NAO suba a migracao.
 */
type Case = { pw: string; hash: string };
const cases = fixtures as Record<string, Case>;

describe('bcrypt: hashes do Python validam no Node', () => {
  for (const [name, c] of Object.entries(cases)) {
    it(`valida "${name}"`, () => {
      expect(bcrypt.compareSync(c.pw, c.hash)).toBe(true);
    });
  }

  it('rejeita senha errada', () => {
    const c = Object.values(cases)[0];
    expect(bcrypt.compareSync(c.pw + 'x', c.hash)).toBe(false);
  });

  /**
   * Regressao da divergencia documentada em `security.service.ts`:
   * PRE-TRUNCAR a senha em 72 bytes no Node QUEBRA senhas multibyte, porque
   * re-decodificar um corte no meio de um caractere gera U+FFFD.
   * A implementacao correta passa a string CRUA para o bcryptjs.
   */
  it('nao pre-trunca: senha multibyte cortada ao meio continua validando', () => {
    const c = cases['corte_multibyte'];
    expect(bcrypt.compareSync(c.pw, c.hash)).toBe(true);
    const reencoded = Buffer.from(c.pw, 'utf8').subarray(0, 72).toString('utf8');
    expect(bcrypt.compareSync(reencoded, c.hash)).toBe(false);
  });
});
