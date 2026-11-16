import React, { useState } from 'react';
import { router } from 'expo-router';
import { ClipboardList, Coins, Droplets, FileText, Settings } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { ActionCard } from '@/components/app/ActionCard';
import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { FormField } from '@/components/app/FormField';
import { MetricRow } from '@/components/app/Metric';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StatusBadge } from '@/components/app/StatusBadge';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import { formatCompleteness, formatCropSequence, formatDate, formatMissing, formatNumber } from '@/lib/format';
import { parseEsNumber } from '@/lib/parse';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';
import { useComparison } from '@/providers/ComparisonProvider';
import { getSavedPlans, type Parcel, type ParcelGeometryInput } from '@/services/api';
import { BundleCard } from '@/features/parcel/BundleCard';
import { profileProgress } from '@/features/parcel/profileStatus';
import { parcelCoverFor } from '@/features/parcel/parcelCovers';

function locationCoordinates(parcel: Parcel): { lat: number; lon: number } | null {
  const geometry = parcel.geometry;
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  if (geometry.type === 'Point') {
    return { lat: Number(coordinates[1]), lon: Number(coordinates[0]) };
  }
  if (geometry.type === 'Polygon' && Array.isArray(coordinates[0])) {
    const ring = coordinates[0] as number[][];
    const points =
      ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.slice(0, -1) : ring;
    if (points.length === 0) return null;
    const lat = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    const lon = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    return { lat, lon };
  }
  return null;
}

function movedGeometry(parcel: Parcel, lat: number, lon: number): ParcelGeometryInput {
  const current = locationCoordinates(parcel);
  if (parcel.geometry.type !== 'Polygon' || !current) {
    return { type: 'Point', coordinates: [lon, lat] };
  }
  const deltaLon = lon - current.lon;
  const deltaLat = lat - current.lat;
  const rings = parcel.geometry.coordinates as number[][][];
  return {
    type: 'Polygon',
    coordinates: rings.map((ring) =>
      ring.map((point) => [point[0] + deltaLon, point[1] + deltaLat, ...point.slice(2)]),
    ),
  };
}

function locationLabel(parcel: Parcel): string {
  const location = locationCoordinates(parcel);
  return location ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}` : '';
}

export function ParcelScreen() {
  const { t } = useTranslation();
  const { online, bundle } = useOffline();
  const { parcel, context, loading, error, refresh, updateMeta } = useParcel();
  const { markStale } = useComparison();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(parcel?.name ?? '');
  const [editArea, setEditArea] = useState(
    parcel?.area_ha != null ? String(parcel.area_ha) : '',
  );
  const [editDistrict, setEditDistrict] = useState(parcel?.district ?? '');
  const [editLat, setEditLat] = useState(() => {
    const location = parcel ? locationCoordinates(parcel) : null;
    return location ? String(location.lat) : '';
  });
  const [editLon, setEditLon] = useState(() => {
    const location = parcel ? locationCoordinates(parcel) : null;
    return location ? String(location.lon) : '';
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSaveMeta = async () => {
    const name = editName.trim();
    if (!name) {
      setEditError(t('Escribe un nombre para la parcela.'));
      return;
    }
    const area = editArea.trim() ? parseEsNumber(editArea) : null;
    if (editArea.trim() && (area === null || area <= 0)) {
      setEditError(
        t('“{{value}}” no es una superficie válida. Usa hectáreas, por ejemplo 1.2.', {
          value: editArea.trim(),
        }),
      );
      return;
    }
    const lat = parseEsNumber(editLat);
    const lon = parseEsNumber(editLon);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setEditError(t('Revisa la latitud y longitud de tu parcela.'));
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await updateMeta({
        name,
        areaHa: area,
        district: editDistrict.trim() || null,
        geometry: movedGeometry(parcel!, lat, lon),
      });
      markStale();
      setEditing(false);
    } catch (cause) {
      setEditError(cause instanceof Error ? cause.message : t('No se pudo guardar.'));
    } finally {
      setEditBusy(false);
    }
  };

  const savedPlans = useQuery({
    queryKey: ['saved-plans', parcel?.id],
    queryFn: getSavedPlans,
    enabled: Boolean(parcel),
  });

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Mi parcela')} />}>
        <AppAlert tone="info">
          {t('Todavía no tienes una parcela. Crea la primera para empezar.')}
        </AppAlert>
        <AppButton onPress={() => router.push('/parcel-new')}>{t('Crear mi parcela')}</AppButton>
      </Screen>
    );
  }

  const missing = context?.missing_inputs ?? [];
  const fichaProgress = profileProgress(parcel, context);
  const location = locationLabel(parcel);
  const parcelPlans = (savedPlans.data ?? [])
    .filter((plan) => plan.parcel_id === parcel.id)
    .slice(0, 5);

  return (
    <Screen
      header={
        <AppHeader
          subtitle={t('Mi parcela')}
          onSettings={() => router.push('/settings')}
        />
      }
    >
      {error && online ? <AppAlert tone="error">{error}</AppAlert> : null}
      {!online ? (
        <AppAlert tone="info">
          {bundle
            ? t('Sin conexión: usando los datos guardados de esta parcela.')
            : t('Sin conexión: descarga los datos de tu parcela cuando tengas señal.')}
        </AppAlert>
      ) : null}

      <SectionCard
        title={parcel.name}
        subtitle={parcel.district ?? t('Moquegua')}
        testID={testIDs.parcelSummary}
        coverImage={parcelCoverFor(parcel.id)}
        coverLabel={t('Portada ilustrativa')}
        coverAccessibilityLabel={t('Portada ilustrativa de una chacra agrícola')}
        action={
          <AppButton
            tone="ghost"
            size="sm"
            onPress={() => {
              if (!editing) {
                const currentLocation = locationCoordinates(parcel);
                setEditName(parcel.name);
                setEditArea(parcel.area_ha != null ? String(parcel.area_ha) : '');
                setEditDistrict(parcel.district ?? '');
                setEditLat(currentLocation ? String(currentLocation.lat) : '');
                setEditLon(currentLocation ? String(currentLocation.lon) : '');
              }
              setEditing((value) => !value);
            }}
          >
            {t('Editar')}
          </AppButton>
        }
      >
        {editing ? (
          <>
            <FormField
              label={t('Nombre de la parcela')}
              value={editName}
              onChangeText={setEditName}
            />
            <FormField
              label={t('Superficie (ha, opcional)')}
              value={editArea}
              onChangeText={setEditArea}
              keyboardType="decimal-pad"
              placeholder={t('Ej. 1.2 — acepta coma o punto')}
            />
            <FormField label={t('Distrito')} value={editDistrict} onChangeText={setEditDistrict} placeholder={t('Ej. Moquegua')} />
            <FormField label={t('Latitud')} value={editLat} onChangeText={setEditLat} keyboardType="numbers-and-punctuation" placeholder="-17.19" />
            <FormField label={t('Longitud')} value={editLon} onChangeText={setEditLon} keyboardType="numbers-and-punctuation" placeholder="-70.93" />
            {editError ? <AppAlert tone="error">{editError}</AppAlert> : null}
            <AppButton loading={editBusy} onPress={() => void handleSaveMeta()}>
              {t('Guardar cambios')}
            </AppButton>
          </>
        ) : (
          <>
            <MetricRow
              label={t('Superficie')}
              value={parcel.area_ha ? formatNumber(parcel.area_ha, t('ha'), 2) : t('No disponible')}
            />
            <MetricRow label={t('Distrito')} value={parcel.district ?? t('No disponible')} />
            <MetricRow label={t('Ubicación')} value={location || t('No disponible')} />
          </>
        )}
      </SectionCard>

      <ActionCard
        icon={ClipboardList}
        title={fichaProgress === 100 ? t('Ficha completa') : t('Ficha de parcela')}
        subtitle={
          fichaProgress === 100
            ? t('Revisa o actualiza tu historial, agua y prioridades')
            : t('Completa historial, agua, suelo y prioridades')
        }
        badge={`${fichaProgress}%`}
        onPress={() => router.push('/parcel-profile')}
        testID={testIDs.parcelProfile}
      />

      <ActionCard
        icon={Coins}
        illustration="prices"
        title={t('Precios y costos')}
        subtitle={t('Para calcular tu margen real, no un supuesto')}
        tone="earth"
        onPress={() => router.push('/parcel-economics')}
      />

      <ActionCard
        icon={Droplets}
        illustration="water"
        title={t('Riego de la semana')}
        subtitle={online ? t('Lluvia, demanda y pendiente con datos reales') : t('Necesita internet para consultar la semana')}
        tone="water"
        onPress={() => router.push('/parcel-irrigation')}
        disabled={!online}
        testID={testIDs.parcelIrrigation}
      />

      <SectionCard
        title={t('Datos para decidir')}
        subtitle={t('Mientras más completos, mejores tus números')}
        testID={testIDs.parcelData}
      >
        <MetricRow
          label={t('Datos para comparar')}
          value={formatCompleteness(context?.completeness.comparison)}
        />
        <MetricRow label={t('Agua')} value={formatCompleteness(context?.completeness.water)} />
        <MetricRow label={t('Ganancia')} value={formatCompleteness(context?.completeness.margin)} />
        {missing.length > 0 ? (
          <AppAlert tone="warning">
            {t('Falta: {{missing}}', { missing: formatMissing(missing) })}
          </AppAlert>
        ) : (
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Ya tienes lo necesario para comparar tus planes.')}
          </Text>
        )}
        {context?.completeness?.margin === null || context?.completeness?.margin === undefined ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {t('Aún no declaraste precios y costos. Ingrésalos para calcular tu margen real.')}
          </Text>
        ) : null}
        <AppButton tone="outline" loading={loading} onPress={() => void refresh()}>
          {t('Actualizar datos')}
        </AppButton>
      </SectionCard>

      <BundleCard />

      <SectionCard
        title={t('Mis planes guardados')}
        subtitle={t('Los planes que decidiste guardar')}
        testID={testIDs.parcelSavedPlans}
      >
        {savedPlans.isLoading ? (
          <Text className="text-sm text-muted-foreground">{t('Cargando planes…')}</Text>
        ) : parcelPlans.length > 0 ? (
          <VStack className="gap-2">
            {parcelPlans.map((plan) => (
              <HStack
                key={plan.id}
                className="items-center justify-between gap-2 rounded-xl bg-muted/60 p-3"
              >
                <VStack className="flex-1">
                  <Text className="text-base font-semibold text-foreground">{plan.name}</Text>
                  {plan.created_at ? (
                    <Text className="text-sm text-muted-foreground">
                      {formatDate(plan.created_at)}
                    </Text>
                  ) : null}
                  {plan.preferred ? (
                    <Text className="text-sm text-muted-foreground">
                      {formatCropSequence(plan.preferred.crop_sequence)}
                    </Text>
                  ) : null}
                </VStack>
                <VStack className="items-end gap-1">
                  <StatusBadge status={plan.status} />
                  <AppButton
                    tone="ghost"
                    size="sm"
                    onPress={() =>
                      router.push({ pathname: '/plan-review', params: { id: plan.id } })
                    }
                  >
                    {t('Revisar')}
                  </AppButton>
                </VStack>
              </HStack>
            ))}
          </VStack>
        ) : (
          <>
            <Text className="text-sm leading-5 text-muted-foreground">
              {t('Todavía no guardaste ningún plan. Compara y guarda el que más te sirva.')}
            </Text>
            <AppButton onPress={() => router.push('/comparison')}>
              {t('Comparar y guardar')}
            </AppButton>
          </>
        )}
      </SectionCard>

      <VStack className="gap-3">
        <ActionCard
          icon={FileText}
          title={t('Fuentes y límites')}
          subtitle={t('De dónde vienen los datos y qué no podemos afirmar')}
          tone="water"
          onPress={() => router.push('/sources')}
          testID={testIDs.parcelSources}
        />
        <ActionCard
          icon={Settings}
          title={t('Ajustes')}
          subtitle={t('Idioma, tema, accesibilidad y Acerca de Anden')}
          onPress={() => router.push('/settings')}
          testID={testIDs.parcelSettings}
        />
      </VStack>

      <Text className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · app gratuita')}
      </Text>
    </Screen>
  );
}
