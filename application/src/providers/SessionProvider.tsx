import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ensureSession } from '@/services/api';

type SessionState = {
  ready: boolean;
  error: string | null;
  retry: () => void;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    ensureSession()
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch((cause: unknown) => {
        if (!mounted) return;
        setError(cause instanceof Error ? cause.message : 'No se pudo iniciar la sesión');
        setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setReady(false);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);
  const value = useMemo(() => ({ ready, error, retry }), [ready, error, retry]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
