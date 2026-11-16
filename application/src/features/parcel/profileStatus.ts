import type { Context, Parcel } from '@/services/api';

export type ProfileItem = {
  key: 'history' | 'water' | 'soil' | 'priorities';
  label: string;
  done: boolean;
};

export function profileItems(parcel: Parcel | null, context: Context | null): ProfileItem[] {
  const priorities = parcel?.preferences?.priorities;
  const hasPriorities =
    typeof priorities === 'object' &&
    priorities !== null &&
    Object.keys(priorities as Record<string, unknown>).length > 0;

  return [
    {
      key: 'history',
      label: 'Historial de cultivos',
      done: Boolean(context?.history?.length),
    },
    {
      key: 'water',
      label: 'Agua disponible',
      // A declared "I don't know" counts as answered: the engine still
      // reports unknown, but the farmer is not asked again.
      done: context?.completeness.water === 'ready' || (context?.water?.length ?? 0) > 0,
    },
    {
      key: 'soil',
      label: 'Análisis de suelo',
      // Any soil declaration counts, including "no analysis": the point of
      // the record is knowing the state, not forcing a lab test.
      done: (context?.soil?.length ?? 0) > 0,
    },
    {
      key: 'priorities',
      label: 'Prioridades',
      done: hasPriorities,
    },
  ];
}

export function profileProgress(parcel: Parcel | null, context: Context | null): number {
  const items = profileItems(parcel, context);
  return Math.round((items.filter((item) => item.done).length / items.length) * 100);
}
