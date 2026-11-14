import React, { useMemo, useState } from 'react';
import { router } from 'expo-router';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import { MapView } from './MapView';
import { useParcel } from '@/providers/ParcelProvider';
import type { Parcel } from '@/services/api';

function mapPoint(parcel: Parcel | null): { lat: number; lon: number } {
  if (!parcel) return { lat: -17.19, lon: -70.93 };
  const geometry = parcel.geometry as { type: string; coordinates: any };
  if (geometry.type === 'Point') {
    return { lat: Number(geometry.coordinates[1]), lon: Number(geometry.coordinates[0]) };
  }
  const first = geometry.coordinates?.[0]?.[0];
  return first
    ? { lat: Number(first[1]), lon: Number(first[0]) }
    : { lat: -17.19, lon: -70.93 };
}

export function MapScreen() {
  const { parcel } = useParcel();
  const [layer, setLayer] = useState<'imerg' | 'ndvi'>('imerg');
  const [date, setDate] = useState('2024-06-01');
  const point = useMemo(() => mapPoint(parcel), [parcel]);

  return (
    <Screen
      header={
        <AppHeader
          subtitle={parcel?.name ?? 'Mapa regional'}
          isSimulated={parcel?.is_simulated}
          onSources={() => router.push('/sources')}
        />
      }
    >
      <VStack className="gap-2">
        <HStack className="gap-1 rounded-xl bg-muted p-1">
          <AppButton
            testID={testIDs.mapLayerImerg}
            size="sm"
            tone={layer === 'imerg' ? 'primary' : 'ghost'}
            className="flex-1"
            onPress={() => setLayer('imerg')}
          >
            IMERG
          </AppButton>
          <AppButton
            testID={testIDs.mapLayerNdvi}
            size="sm"
            tone={layer === 'ndvi' ? 'primary' : 'ghost'}
            className="flex-1"
            onPress={() => setLayer('ndvi')}
          >
            NDVI
          </AppButton>
        </HStack>
        <Text size="xs" className="text-muted-foreground">
          Capa regional de contexto; no es una medición de tu parcela.
        </Text>
      </VStack>

      <Box className="h-[340px] overflow-hidden rounded-2xl border border-border bg-muted">
        <MapView
          lat={point.lat}
          lon={point.lon}
          name={parcel?.name ?? 'Parcela'}
          layer={layer}
          date={date}
        />
      </Box>

      {layer === 'ndvi' ? (
        <SectionCard
          title="Fecha de la capa NDVI"
          subtitle="Comparación visual A/B; no implica causalidad ni diagnóstico."
          testID={testIDs.mapNdviDates}
        >
          <HStack className="gap-2">
            <AppButton
              testID={testIDs.mapNdviDateA}
              size="sm"
              tone={date === '2024-06-01' ? 'primary' : 'outline'}
              className="flex-1"
              onPress={() => setDate('2024-06-01')}
            >
              Jun 2024
            </AppButton>
            <AppButton
              testID={testIDs.mapNdviDateB}
              size="sm"
              tone={date === '2024-09-01' ? 'primary' : 'outline'}
              className="flex-1"
              onPress={() => setDate('2024-09-01')}
            >
              Sep 2024
            </AppButton>
          </HStack>
        </SectionCard>
      ) : null}

      <SectionCard
        title={layer === 'imerg' ? 'Precipitación IMERG' : 'NDVI VIIRS'}
        subtitle={`NASA GIBS · ${date} · contexto regional`}
        testID={testIDs.mapLegend}
      >
        <VStack className="gap-1">
          <Text size="sm" className="text-foreground">
            {layer === 'imerg'
              ? '0,1° (~11 km) · solo hasta zoom 6'
              : '~0,5–1 km · solo hasta zoom 7'}
          </Text>
          <Text size="sm" className="text-foreground">
            No es una medición de tu parcela.
          </Text>
          {layer === 'ndvi' ? (
            <Text size="xs" className="text-muted-foreground">
              NDVI es un índice de vegetación; no diagnostica nutrientes ni enfermedades.
            </Text>
          ) : null}
        </VStack>
      </SectionCard>

      <AppAlert tone="info">
        Fuente: NASA GIBS ·{' '}
        {layer === 'imerg'
          ? 'GPM IMERG Precipitation Rate'
          : 'VIIRS Suomi NPP NDVI mensual'}{' '}
        · datos satelitales de contexto regional.
      </AppAlert>
    </Screen>
  );
}
