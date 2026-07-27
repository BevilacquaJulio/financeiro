import { useEffect, useState, type ReactNode } from 'react';
import { BootScreen } from './BootScreen';
import { useBootLeaveTransition, useBootTransition } from '../hooks/useBootGate';
import { useSession } from '../lib/session';

/** Encapsula boot <-> app com crossfade na entrada e na saida. */
export function BootTransition({
  pending,
  ready,
  children,
}: {
  pending: boolean;
  ready: boolean;
  children: ReactNode;
}) {
  const { loggingOut, finishLogout } = useSession();
  const enter = useBootTransition(pending && !loggingOut);
  const leaveComplete = useBootLeaveTransition(loggingOut);
  const [enterActive, setEnterActive] = useState(false);
  const [leaveActive, setLeaveActive] = useState(false);

  useEffect(() => {
    if (!enter.appActive) {
      setEnterActive(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => setEnterActive(true));
    return () => window.cancelAnimationFrame(frame);
  }, [enter.appActive]);

  useEffect(() => {
    if (!loggingOut) {
      setLeaveActive(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => setLeaveActive(true));
    return () => window.cancelAnimationFrame(frame);
  }, [loggingOut]);

  useEffect(() => {
    if (leaveComplete) finishLogout();
  }, [leaveComplete, finishLogout]);

  if (loggingOut) {
    return (
      <>
        <div
          className={`app-enter app-enter--active${leaveActive ? ' app-enter--exit' : ''}`}
        >
          {children}
        </div>
        <BootScreen entering label="Saindo…" />
      </>
    );
  }

  return (
    <>
      {ready && enter.showApp ? (
        <div className={`app-enter${enterActive ? ' app-enter--active' : ''}`}>{children}</div>
      ) : null}
      {enter.showOverlay ? <BootScreen exiting={enter.exiting} /> : null}
    </>
  );
}
