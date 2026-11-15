import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { applyScenarioValues } from '@/engine/scenario';
import {
  createComparison as createComparisonRequest,
  simulate as simulateRequest,
  type Comparison,
} from '@/services/api';
import { useOffline } from './OfflineProvider';
import { useParcel } from './ParcelProvider';

type ComparisonOrigin = 'network' | 'bundle' | 'offline_estimate';

type ComparisonState = {
  comparison: Comparison | null;
  scenario: Comparison | null;
  comparisonOrigin: ComparisonOrigin | null;
  scenarioOrigin: ComparisonOrigin | null;
  stale: boolean;
  busy: boolean;
  error: string | null;
  createComparison: () => Promise<Comparison>;
  markStale: () => void;
  simulate: (waterMultiplier?: number, priceMultiplier?: number) => Promise<Comparison | null>;
  resetScenario: () => void;
  setComparison: (comparison: Comparison | null) => void;
  clearError: () => void;
};

const ComparisonContext = createContext<ComparisonState | null>(null);

function offlineScenario(
  comparison: Comparison,
  waterMultiplier: number,
  priceMultiplier: number,
): Comparison {
  return {
    ...comparison,
    comparison_id: `${comparison.comparison_id}-offline-${waterMultiplier}-${priceMultiplier}`,
    scenario_type: 'offline_estimate',
    warnings: [...comparison.warnings, 'offline_estimate'],
    plans: comparison.plans.map((plan) => {
      const result = applyScenarioValues({
        water_multiplier: waterMultiplier,
        price_multiplier: priceMultiplier,
        available_mm: plan.water.available_mm,
        gross_irrigation_mm: plan.water.gross_irrigation_mm,
        deficit_mm: plan.water.deficit_mm,
        feasibility: plan.water.feasibility,
        margin_pen: plan.economics.margin_pen,
        margin_pen_ha: plan.economics.margin_pen_ha,
        income_pen: plan.economics.income_pen ?? null,
        costs_pen: plan.economics.costs_pen ?? null,
        status: plan.status,
      });
      return {
        ...plan,
        water: {
          ...plan.water,
          available_mm: result.available_mm,
          deficit_mm: result.deficit_mm,
          feasibility: result.feasibility,
          missing_inputs: [...plan.water.missing_inputs, 'offline_estimate'],
        },
        economics: {
          ...plan.economics,
          margin_pen: result.margin_pen,
          margin_pen_ha: result.margin_pen_ha,
        },
        status: result.status,
      };
    }),
  };
}

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  const { online, bundle } = useOffline();
  const [comparison, setComparisonState] = useState<Comparison | null>(null);
  const [scenario, setScenario] = useState<Comparison | null>(null);
  const [comparisonOrigin, setComparisonOrigin] = useState<ComparisonOrigin | null>(null);
  const [scenarioOrigin, setScenarioOrigin] = useState<ComparisonOrigin | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setComparison = useCallback((value: Comparison | null) => {
    setComparisonState(value);
    setComparisonOrigin(value ? 'network' : null);
    setStale(false);
  }, []);

  const markStale = useCallback(() => {
    setStale(true);
  }, []);

  const createComparison = useCallback(async () => {
    if (!online) {
      if (bundle) {
        setComparisonState(bundle.comparison);
        setComparisonOrigin('bundle');
        setStale(false);
        setScenario(null);
        setScenarioOrigin(null);
        return bundle.comparison;
      }
      throw new Error('Sin conexión y sin datos guardados para esta parcela');
    }
    if (!parcel) throw new Error('No hay una parcela activa');
    setBusy(true);
    setError(null);
    try {
      const result = await createComparisonRequest(parcel.id);
      setComparisonState(result);
      setComparisonOrigin('network');
      setStale(false);
      setScenario(null);
      setScenarioOrigin(null);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo comparar';
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [bundle, online, parcel]);

  const simulate = useCallback(
    async (waterMultiplier = 1, priceMultiplier = 1) => {
      const base = comparison ?? (!online ? bundle?.comparison : null);
      if (!base) return null;
      if (waterMultiplier === 1 && priceMultiplier === 1) {
        setScenario(null);
        setScenarioOrigin(null);
        return null;
      }
      setError(null);
      if (!online) {
        const result = offlineScenario(base, waterMultiplier, priceMultiplier);
        setScenario(result);
        setScenarioOrigin('offline_estimate');
        return result;
      }
      setBusy(true);
      try {
        const result = await simulateRequest(
          base.comparison_id,
          waterMultiplier,
          priceMultiplier,
        );
        setScenario(result);
        setScenarioOrigin('network');
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'No se pudo simular';
        setError(message);
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [bundle, comparison, online],
  );

  const resetScenario = useCallback(() => {
    setScenario(null);
    setScenarioOrigin(null);
  }, []);

  const value = useMemo<ComparisonState>(
    () => ({
      comparison: comparison ?? (!online ? bundle?.comparison ?? null : null),
      scenario,
      comparisonOrigin:
        comparisonOrigin ?? (!online && bundle ? 'bundle' : null),
      scenarioOrigin,
      stale,
      busy,
      error,
      createComparison,
      markStale,
      simulate,
      resetScenario,
      setComparison,
      clearError: () => setError(null),
    }),
    [
      comparison,
      scenario,
      comparisonOrigin,
      scenarioOrigin,
      stale,
      busy,
      error,
      createComparison,
      markStale,
      simulate,
      resetScenario,
      setComparison,
      bundle,
      online,
    ],
  );

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

export function useComparison(): ComparisonState {
  const value = useContext(ComparisonContext);
  if (!value) throw new Error('useComparison must be used inside ComparisonProvider');
  return value;
}
