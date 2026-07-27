import { useEffect, useRef, useState } from 'react';

/** Tempo minimo da tela "Entrando…" */
export const BOOT_MIN_MS = 650;

/** Duracao do fade-out do boot + fade-in do app */
export const BOOT_EXIT_MS = 480;

/**
 * Mantem a tela de boot visivel por pelo menos `minMs`, mesmo quando a sessao
 * ja resolveu em memoria. Enquanto `pending` for true, a boot fica aberta.
 */
export function useBootGate(pending: boolean, minMs = BOOT_MIN_MS): boolean {
  const startedAt = useRef(Date.now());
  const [hold, setHold] = useState(true);

  useEffect(() => {
    if (pending) {
      setHold(true);
      return;
    }

    const remaining = Math.max(0, minMs - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => setHold(false), remaining);
    return () => window.clearTimeout(timer);
  }, [pending, minMs]);

  return pending || hold;
}

export type BootPhase = 'boot' | 'exit' | 'done';

/** Crossfade inverso: app some, boot de "Saindo…" aparece. */
export function useBootLeaveTransition(leaving: boolean) {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!leaving) {
      setComplete(false);
      return;
    }

    const timer = window.setTimeout(() => setComplete(true), BOOT_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return complete;
}

/** Boot minimo + saida animada antes de liberar o app. */
export function useBootTransition(pending: boolean, minMs = BOOT_MIN_MS) {
  const gateOpen = useBootGate(pending, minMs);
  const [phase, setPhase] = useState<BootPhase>('boot');

  useEffect(() => {
    if (gateOpen) {
      setPhase('boot');
      return;
    }

    setPhase('exit');
    const timer = window.setTimeout(() => setPhase('done'), BOOT_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [gateOpen]);

  return {
    phase,
    showOverlay: phase === 'boot' || phase === 'exit',
    showApp: phase === 'exit' || phase === 'done',
    appActive: phase === 'exit' || phase === 'done',
    exiting: phase === 'exit',
  };
}
