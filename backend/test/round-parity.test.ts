import { describe, expect, it } from 'vitest';
import { pyRound } from '../src/common/serialize';
import cases from './fixtures/python-rounds.json';

/**
 * Cada par [valor, esperado] foi produzido pelo `round(valor, 2)` do PYTHON.
 * Se este teste quebrar, o dashboard vai divergir em centavos e o diff
 * Node-vs-Python da secao 7 do plano nunca fecha.
 */
describe('pyRound bate com round() do Python', () => {
  it('todos os casos', () => {
    const divergentes = (cases as [number, number][])
      .map(([v, esperado]) => ({ v, esperado, obtido: pyRound(v, 2) }))
      .filter((r) => r.obtido !== r.esperado);
    expect(divergentes).toEqual([]);
  });
});
