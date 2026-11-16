/**
 * One clear next step for Inicio.
 *
 * The farmer audit said "no sé qué hacer primero": Inicio showed several equal
 * shortcuts. This pure selector decides the single action that unlocks the
 * most value next, in the same order the ficha and Comparar screens expect.
 *
 * The strings are Spanish i18n keys (Spanish is the source language), so the
 * screens call `t(step.title)`, `t(step.why)` and `t(step.cta)`.
 */
import type { Comparison, Context, Parcel } from './types';

export type NextStepId =
  | 'parcela'
  | 'historial'
  | 'agua'
  | 'precios'
  | 'comparar'
  | 'guardar'
  | 'probar'
  | 'listo';

export type NextStepTone = 'primary' | 'water' | 'earth';

export type NextStep = {
  id: NextStepId;
  title: string;
  why: string;
  cta: string;
  path: string;
  tone: NextStepTone;
};

export type NextStepInput = {
  parcel: Parcel | null;
  context: Context | null;
  comparison: Comparison | null;
  savedPlanCount: number;
};

type CropEconomics = {
  yield_kg_ha?: number | null;
  price_pen_kg?: number | null;
  costs_pen?: number | null;
};

/** Step numbers for the badge in NextStepCard (same order as the flow). */
export const NEXT_STEP_NUMBER: Record<NextStepId, number> = {
  parcela: 1,
  historial: 2,
  agua: 3,
  precios: 4,
  comparar: 5,
  guardar: 6,
  probar: 7,
  listo: 8,
};

const STEPS = {
  parcela: {
    id: 'parcela',
    title: 'Crea tu parcela',
    why: 'Sin tu parcela no podemos usar tu agua, tu suelo ni tus precios. Toma menos de un minuto.',
    cta: 'Crear mi parcela',
    path: '/parcela',
    tone: 'primary',
  },
  historial: {
    id: 'historial',
    title: 'Registra qué sembraste',
    why: 'Con lo que sembraste antes sabemos qué funciona en tu chacra y podemos comparar con tus datos.',
    cta: 'Registrar mi cultivo',
    path: '/parcela/ficha',
    tone: 'earth',
  },
  agua: {
    id: 'agua',
    title: 'Dinos cuánta agua tienes',
    why: 'Con tu agua ya podemos decir si alcanza para la campaña. Si no sabes la cantidad, responde "No sé" y seguimos.',
    cta: 'Completar agua',
    path: '/parcela/ficha',
    tone: 'water',
  },
  precios: {
    id: 'precios',
    title: 'Completa precios con el catálogo',
    why: 'Con tu agua anotada ya vemos si alcanza. Para la ganancia te proponemos el precio del catálogo; tú confirmas el rendimiento y el costo.',
    cta: 'Completar precios',
    path: '/parcela/economia?guiado=1',
    tone: 'earth',
  },
  comparar: {
    id: 'comparar',
    title: 'Compara tus 3 planes',
    why: 'Con tu agua, tu suelo y tus precios ya podemos mostrarte tres formas de sembrar y cuál te conviene más.',
    cta: 'Comparar ahora',
    path: '/comparar',
    tone: 'primary',
  },
  guardar: {
    id: 'guardar',
    title: 'Elige y guarda tu plan',
    why: 'Tu comparación está lista. Guarda el plan que más te sirva para revisarlo cuando quieras, incluso sin señal.',
    cta: 'Elegir y guardar',
    path: '/comparar/guardar',
    tone: 'primary',
  },
  probar: {
    id: 'probar',
    title: 'Prueba con menos agua o menor precio',
    why: 'Tu plan ya está guardado. Mira si aguanta con menos agua o si el precio baja antes de decidir.',
    cta: 'Probar un cambio',
    path: '/comparar',
    tone: 'water',
  },
  listo: {
    id: 'listo',
    title: 'Revisa tu plan guardado',
    why: 'Ya tienes lo necesario. Revisa tu plan cuando cambie el agua o el precio.',
    cta: 'Revisar mi plan',
    path: '/parcela',
    tone: 'primary',
  },
} satisfies Record<NextStepId, NextStep>;

function economicsFor(parcel: Parcel): Record<string, CropEconomics> {
  const value = parcel.preferences?.economics;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, CropEconomics>;
}

/** True when any crop in the history is missing price, yield or cost. */
function hasIncompleteEconomics(parcel: Parcel, context: Context | null): boolean {
  const cropIds = [
    ...new Set(
      (context?.history ?? [])
        .map((row) => row.crop_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (cropIds.length === 0) return false;

  const economics = economicsFor(parcel);
  return cropIds.some((cropId) => {
    const value = economics[cropId];
    return (
      !value ||
      value.price_pen_kg == null ||
      value.yield_kg_ha == null ||
      value.costs_pen == null
    );
  });
}

export function selectNextStep({
  parcel,
  context,
  comparison,
  savedPlanCount,
}: NextStepInput): NextStep {
  // 1. Without a parcel there is nothing to calculate.
  if (!parcel) return STEPS.parcela;

  // 2. The rotation needs at least one crop the farmer actually planted.
  const history = context?.history ?? [];
  if (history.length === 0) return STEPS.historial;

  // 3. Water is the first hard limit: the farmer can answer "No sé".
  const waterEntries = context?.water ?? [];
  const waterReady = context?.completeness?.water === 'ready';
  if (!waterReady && waterEntries.length === 0) return STEPS.agua;

  // 4. Without price/yield/cost we can compare water but not profit.
  if (hasIncompleteEconomics(parcel, context)) return STEPS.precios;

  // 5. With the data in place, the three plans are the next decision.
  if (!comparison) return STEPS.comparar;

  // 6. A comparison without a saved plan disappears on the next visit.
  if (savedPlanCount === 0) return STEPS.guardar;

  // 7. The saved plan is a baseline: test less water or a lower price.
  if (savedPlanCount > 0) return STEPS.probar;

  // 8. Fallback: review what is already saved.
  return STEPS.listo;
}

const ECONOMICS_MISSING_KEYS = new Set([
  'price',
  'yield',
  'costs',
  'crop_economics',
]);

/**
 * Missing inputs the next step itself asks the farmer to complete. Inicio
 * hides them from the generic "Faltan datos" alert so the screen does not ask
 * twice for the same thing.
 */
export function isMissingInputCoveredByStep(stepId: NextStepId, missing: string): boolean {
  if (stepId === 'historial') return missing === 'crop_history';
  if (stepId === 'agua') return missing === 'water_available' || missing === 'water_volume';
  if (stepId === 'precios') return ECONOMICS_MISSING_KEYS.has(missing);
  return false;
}

/** Remaining missing inputs that the next step does not explain. */
export function uncoveredMissingInputs(stepId: NextStepId, missing: string[]): string[] {
  return missing.filter((value) => {
    if (stepId === 'precios' && value.startsWith('economics.')) return false;
    return !isMissingInputCoveredByStep(stepId, value);
  });
}
