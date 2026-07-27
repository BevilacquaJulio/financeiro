import { describe, expect, it } from 'vitest';
import * as jwt from 'jsonwebtoken';
import fixtures from './fixtures/python-tokens.json';

/**
 * Paridade de token (plano, secao 3.2): com o MESMO `JWT_SECRET` e HS256, um
 * token emitido pelo Python precisa ser aceito no Node — senao todo usuario
 * logado e deslogado a forca no dia do deploy.
 */
const f = fixtures as {
  secret: string;
  valido: { sub: string; token: string };
  expirado: { sub: string; token: string };
};

/**
 * As fixtures foram geradas uma vez, com `exp` ABSOLUTO: o token "valido" vale
 * 120 minutos a partir do instante em que o `gen-fixtures.py` rodou. Verificar
 * contra o relogio real faz o teste passar no dia em que foi escrito e falhar
 * em todos os outros — foi exatamente o que aconteceu.
 *
 * A correcao e fixar o relogio da verificacao (`clockTimestamp`) numa
 * referencia derivada da propria fixture, em vez de "agora". O que esta sob
 * teste e a interoperabilidade da ASSINATURA HS256 entre python-jose e
 * jsonwebtoken, nao a passagem do tempo.
 */
function expOf(token: string): number {
  const exp = (jwt.decode(token) as jwt.JwtPayload | null)?.exp;
  if (typeof exp !== 'number') throw new Error('fixture sem exp');
  return exp;
}

/** Um minuto antes de o token valido expirar: dentro da janela dele. */
const CLOCK = expOf(f.valido.token) - 60;

describe('JWT emitido pelo python-jose', () => {
  it('e aceito pelo verificador do Node', () => {
    const payload = jwt.verify(f.valido.token, f.secret, {
      algorithms: ['HS256'],
      clockTimestamp: CLOCK,
    }) as jwt.JwtPayload;
    expect(String(payload.sub)).toBe(String(f.valido.sub));
  });

  it('token expirado e rejeitado', () =>
    expect(() =>
      jwt.verify(f.expirado.token, f.secret, {
        algorithms: ['HS256'],
        clockTimestamp: CLOCK,
      }),
    ).toThrow(jwt.TokenExpiredError));

  it('o token valido tambem expira, passada a janela', () =>
    expect(() =>
      jwt.verify(f.valido.token, f.secret, {
        algorithms: ['HS256'],
        clockTimestamp: expOf(f.valido.token) + 1,
      }),
    ).toThrow(jwt.TokenExpiredError));

  it('assinatura com outro segredo e rejeitada', () =>
    expect(() =>
      jwt.verify(f.valido.token, f.secret + 'x', { algorithms: ['HS256'] }),
    ).toThrow());

  it('token do Node tem o mesmo formato de payload (sub string, exp number)', () => {
    const t = jwt.sign({ sub: '42' }, f.secret, {
      algorithm: 'HS256',
      expiresIn: '120m',
    });
    const p = jwt.decode(t) as jwt.JwtPayload;
    expect(typeof p.sub).toBe('string');
    expect(p.sub).toBe('42');
    expect(typeof p.exp).toBe('number');
  });
});
