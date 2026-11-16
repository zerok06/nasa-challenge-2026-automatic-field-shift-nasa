/**
 * ComparisonProvider — web port of the native ComparisonProvider.
 *
 * Keeps the current comparison, the optional scenario, the active plan and the
 * "stale" flag that makes Comparar refresh itself after the ficha changes.
 * Offline, it serves the last comparison cached for the active parcel and
 * estimates scenarios locally with the same arithmetic as the Python engine.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { loadCachedComparison, saveCachedComparison } from '../lib/cache';
import { applyScenarioValues } from '../lib/scenario';
import type { Comparison, Plan } from '../lib/types';
import { useOnline } from '../lib/useOnline';
import { useParcel } from './ParcelProvider';

type ComparisonOrigin = 'network' | 'bundle' | 'offline_estimate';

type ComparisonState = {
  comparison: Comparison | null;
  scenario: Comparison | null;
  comparisonOrigin: ComparisonOrigin | null;
  scenarioOrigin: ComparisonOrigin | null;
  activePlanId: string | null;
  stale: boolean;
  busy: boolean;
  error: string | null;
  createComparison: () => Promise<Comparison>;
  markStale: () => void;
  simulate: (waterMultiplier?: number, priceMultiplier?: number) => Promise<Comparison | null>;
  resetScenario: () => void;
  setActivePlanId: (planId: string) => void;
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
    plans: comparison.plans.map((plan): Plan => {
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

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const { parcel } = useParcel();
  const online = useOnline();
  const [comparison, setComparisonState] = useState<Comparison | null>(() =>
    parcel ? loadCachedComparison(parcel.id) : null,
  );
  const [scenario, setScenario] = useState<Comparison | null>(null);
  const [comparisonOrigin, setComparisonOrigin] = useState<ComparisonOrigin | null>(null);
  const [scenarioOrigin, setScenarioOrigin] = useState<ComparisonOrigin | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markStale = useCallback(() => setStale(true), []);

  // When the PWA opens offline, the parcel arrives after the first render:
  // load the comparison cached for that parcel so Comparar still works.
  useEffect(() => {
    if (comparison || !parcel || online) return;
    const cached = loadCachedComparison(parcel.id);
    if (!cached) return;
    setComparisonState(cached);
    setComparisonOrigin('bundle');
    setActivePlanId(cached.plans[0]?.plan_id ?? null);
  }, [comparison, online, parcel]);

  const createComparison = useCallback(async () => {
    if (!parcel) throw new Error('No hay una parcela activa');
    if (!online) {
      const cached = loadCachedComparison(parcel.id);
      if (cached) {
        setComparisonState(cached);
        setComparisonOrigin('bundle');
        setActivePlanId(cached.plans[0]?.plan_id ?? null);
        setStale(false);
        return cached;
      }
      throw new Error('Sin conexión y sin datos guardados para esta parcela');
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.createComparison(parcel.id);
      setComparisonState(result);
      setComparisonOrigin('network');
      setActivePlanId(result.plans[0]?.plan_id ?? null);
      setStale(false);
      setScenario(null);
      setScenarioOrigin(null);
      saveCachedComparison(parcel.id, result);
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo comparar');
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [online, parcel]);

  const simulate = useCallback(
    async (waterMultiplier = 1, priceMultiplier = 1) => {
      const base = comparison ?? (parcel ? loadCachedComparison(parcel.id) : null);
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
        const result = await api.simulate(base.comparison_id, waterMultiplier, priceMultiplier);
        setScenario(result);
        setScenarioOrigin('network');
        return result;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudo simular');
        throw cause;
      } finally {
        setBusy(false);
      }
    },
    [comparison, online, parcel],
  );

  const resetScenario = useCallback(() => {
    setScenario(null);
    setScenarioOrigin(null);
  }, []);

  const value = useMemo<ComparisonState>(
    () => ({
      comparison,
      scenario,
      comparisonOrigin,
      scenarioOrigin,
      activePlanId,
      stale,
      busy,
      error,
      createComparison,
      markStale,
      simulate,
      resetScenario,
      setActivePlanId,
      clearError: () => setError(null),
    }),
    [
      comparison,
      scenario,
      comparisonOrigin,
      scenarioOrigin,
      activePlanId,
      stale,
      busy,
      error,
      createComparison,
      markStale,
      simulate,
      resetScenario,
    ],
  );

  return <ComparisonContext.Provider value={value}>{children}</ComparisonContext.Provider>;
}

export function useComparison(): ComparisonState {
  const value = useContext(ComparisonContext);
  if (!value) throw new Error('useComparison must be used inside ComparisonProvider');
  return value;
}
