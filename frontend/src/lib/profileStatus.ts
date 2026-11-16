/** Parcel ficha progress — port of application/src/features/parcel/profileStatus.ts. */
import type { Context, Parcel } from './types';

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
      done: context?.completeness?.water === 'ready' || (context?.water?.length ?? 0) > 0,
    },
    {
      key: 'soil',
      label: 'Análisis de suelo',
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
