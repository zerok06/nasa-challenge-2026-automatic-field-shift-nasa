import React from 'react';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { DemoBadge } from '@/components/app/StatusBadge';
import { Disclosure } from '@/components/app/Disclosure';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatDate } from '@/lib/format';
import { useParcel } from '@/providers/ParcelProvider';

export function SourcesScreen() {
  const { indicators } = useParcel();
  const source = indicators?.source;

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <AppHeader
          title="FUENTES"
          subtitle="Transparencia y fuentes"
          onBack={() => router.back()}
        />
      }
    >
      <SectionCard
        title="Snapshot y origen"
        subtitle="Cada cifra debe poder rastrearse hasta su fuente."
      >
        <VStack className="gap-2">
          <MetricRow label="Snapshot" value={source?.snapshot_id ?? 'No disponible'} />
          <MetricRow label="Fuente" value={source?.source ?? 'NASA POWER'} />
          <MetricRow label="Resolución" value={source?.resolution ?? 'No disponible'} />
          <MetricRow label="Calidad" value={source?.quality_flag ?? 'No declarada'} />
          <MetricRow label="Actualizado" value={formatDate(source?.retrieved_at)} />
        </VStack>
        <HStack className="items-center gap-2">
          <Text size="xs" className="text-muted-foreground">
            ¿Es simulado?
          </Text>
          {source?.is_simulated ? <DemoBadge /> : <Text size="xs">No</Text>}
        </HStack>
      </SectionCard>

      <SectionCard
        title="Capas satelitales"
        subtitle="Contexto regional; no miden tu parcela."
      >
        <VStack className="gap-3">
          <VStack className="gap-1">
            <Text className="text-sm font-semibold text-foreground">
              IMERG · Precipitación
            </Text>
            <Text size="xs" className="text-muted-foreground">
              NASA GIBS / GPM IMERG · 0,1° (~11 km) · solo hasta zoom 6.
            </Text>
            <AppButton
              tone="outline"
              size="sm"
              onPress={() =>
                void WebBrowser.openBrowserAsync(
                  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/2024-06-01/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
                )
              }
            >
              Abrir referencia GIBS
            </AppButton>
          </VStack>
          <VStack className="gap-1">
            <Text className="text-sm font-semibold text-foreground">NDVI · VIIRS</Text>
            <Text size="xs" className="text-muted-foreground">
              NASA GIBS / VIIRS Suomi NPP mensual · ~0,5–1 km · solo hasta zoom 7.
            </Text>
            <Text size="xs" className="text-muted-foreground">
              No diagnostica nutrientes, enfermedades ni “salud del suelo”.
            </Text>
          </VStack>
        </VStack>
      </SectionCard>

      <SectionCard title="Metodología y límites">
        <Disclosure title="Cómo se calculan los resultados">
          <Text size="sm" className="text-muted-foreground">
            ETo se calcula con FAO-56/Hargreaves a partir de temperatura y radiación. El riego
            neto usa ETc por etapas, lluvia efectiva y eficiencia declarada. El margen usa
            rendimiento, precio y costos del agricultor. Las cifras las producen los motores,
            no el modelo de lenguaje.
          </Text>
        </Disclosure>
        <Disclosure title="Límites del piloto">
          <Text size="sm" className="text-muted-foreground">
            Los datos de demostración son sintéticos y están etiquetados. El catálogo de cultivos
            está pendiente de revisión agronómica local. No es una recomendación certificada ni
            reemplaza la visita de un profesional.
          </Text>
        </Disclosure>
      </SectionCard>

      <AppAlert tone="warning">
        Datos de demostración: el snapshot POWER es sintético. No uses estas cifras para tomar
        decisiones comerciales sin validación local.
      </AppAlert>

      <SectionCard title="Licencia y atribución">
        <Text size="sm" className="text-foreground">
          Código MIT. Datos NASA POWER/GIBS, FAO-56 y anuario de Moquegua; ver
          docs/data-licenses.md. App gratuita para agricultores; no se venden datos.
        </Text>
      </SectionCard>
    </Screen>
  );
}
