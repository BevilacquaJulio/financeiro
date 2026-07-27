import { useEffect, useRef, useState } from 'react';

/**
 * Porte de `frontend/js/animate.js` para hook.
 *
 * COMPORTAMENTO OBRIGATORIO (roteiro-sistema 6.2, plano 2.6): quando o valor
 * de um card muda, ele conta ate o novo numero em 400-600ms com ease-out; o
 * numero fica em accent durante a transicao e o card da um leve pulso.
 * `prefers-reduced-motion` desliga a animacao.
 */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useAnimatedNumber(target: number): {
  value: number;
  counting: boolean;
} {
  const [value, setValue] = useState(target);
  const [counting, setCounting] = useState(false);
  const fromRef = useRef(target);
  const frameRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;

    // Primeira renderizacao nao anima: seria contagem "do zero" sem sentido.
    if (firstRef.current || reduced || from === target) {
      firstRef.current = false;
      fromRef.current = target;
      setValue(target);
      return;
    }

    const diff = Math.abs(target - from);
    const duration = Math.min(600, Math.max(400, 400 + diff));
    const start = performance.now();
    setCounting(true);

    const step = (now: number): void => {
      const p = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * easeOut(p));
      if (p < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        setValue(target);
        setCounting(false);
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target]);

  return { value, counting };
}
