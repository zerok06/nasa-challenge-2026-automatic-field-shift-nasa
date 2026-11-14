import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  createComparison as createComparisonRequest,
  simulate as simulateRequest,
  type Comparison,
} from '@/services/api';
import { useParcel } from './ParcelProvider';

type ComparisonState = {
  comparison: Comparison | null;
  scenario: Comparison | null;
  busy: boolean;
  error: string | null;
  createComparison: () => Promise<Comparison>;
  simulate: (waterMultiplier?: number, priceMultiplier?: number) => Promise<Comparison | null>;
  resetScenario: () => void;
  setComparison: (comparison: Comparison | null) => void;
  clearError: () => void;
};

const ComparisonContext = createContext<ComparisonState | null>(null);

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [scenario, setScenario] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComparison = useCallback(async () => {
    if (!parcel) throw new Error('No hay una parcela activa');
    setBusy(true);
    setError(null);
    try {
      const result = await createComparisonRequest(parcel.id);
      setComparison(result);
      setScenario(null);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo comparar';
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [parcel]);

  const simulate = useCallback(
    async (waterMultiplier = 1, priceMultiplier = 1) => {
      if (!comparison) return null;
      if (waterMultiplier === 1 && priceMultiplier === 1) {
        setScenario(null);
        return null;
      }
      setBusy(true);
      setError(null);
      try {
        const result = await simulateRequest(
          comparison.comparison_id,
          waterMultiplier,
          priceMultiplier,
        );
        setScenario(result);
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'No se pudo simular';
        setError(message);
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [comparison],
  );

  const resetScenario = useCallback(() => setScenario(null), []);

  const value = useMemo<ComparisonState>(
    () => ({
      comparison,
      scenario,
      busy,
      error,
      createComparison,
      simulate,
      resetScenario,
      setComparison,
      clearError: () => setError(null),
    }),
    [comparison, scenario, busy, error, createComparison, simulate, resetScenario],
  );

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

export function useComparison(): ComparisonState {
  const value = useContext(ComparisonContext);
  if (!value) throw new Error('useComparison must be used inside ComparisonProvider');
  return value;
}
