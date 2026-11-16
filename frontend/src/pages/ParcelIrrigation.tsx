/**
 * Riego de la semana — web port of the native ParcelIrrigationScreen.
 * Open-Meteo forecast, declared water and terrain, with the same wording.
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { Mountain } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { SectionCard } from '../components/app/SectionCard';
import { MetricRow } from '../components/app/Metric';
import { AppAlert } from '../components/app/Feedback';
import { StateView } from '../components/app/StateView';
import { BarChart, ChartCard } from '../components/app/Charts';
import { Illustration } from '../components/illustrations/Illustration';
import { Screen } from '../components/app/Screen';
import { colors } from '../design/tokens';
import { api } from '../lib/api';
import { formatDate, formatNumber } from '../lib/format';
import { useParcel } from '../providers/ParcelProvider';
import type { Irrigation } from '../lib/types';

function adviceText(irrigation: Irrigation, t: TFunction) {
  const demand = irrigation.totals.net_demand_mm;
  return irrigation.advice
    .map((code) => {
      switch (code) {
        case 'irrigation_needed':
          return t(
            'Para los próximos 7 días, la lluvia no cubre la demanda de referencia. Repón alrededor de {{mm}} mm.',
            { mm: formatNumber(demand, '', 1) },
          );
        case 'rain_covers':
          return t('La lluvia esperada cubre la demanda de referencia de esta semana.');
        case 'water_unknown':
          return t('No sabemos cuánta agua tienes disponible. Puedes completarlo en tu ficha.');
        case 'terrain_unavailable':
          return t('No pudimos obtener la elevación. El pronóstico y el agua siguen disponibles.');
        case 'forecast_incomplete':
          return t('Faltan algunos días del pronóstico; el total es parcial.');
        default:
          return null;
      }
    })
    .filter((value): value is string => Boolean(value));
}

function waterStatusText(status: Irrigation['water_status'], t: TFunction) {
  switch (status) {
    case 'rain_covers':
      return t('La lluvia alcanza');
    case 'water_sufficient':
      return t('Tu agua declarada alcanza para la semana');
    case 'water_tight':
      return t('Tu agua está ajustada');
    case 'water_insufficient':
      return t('Tu agua no alcanza para la semana');
    case 'water_unknown':
      return t('No sabemos tu agua');
    default:
      return t('No disponible');
  }
}

function slopeText(slope: Irrigation['terrain'], t: TFunction) {
  if (!slope) return t('No disponible');
  switch (slope.slope_class) {
    case 'flat':
      return t('Plano');
    case 'gentle':
      return t('Suave');
    case 'moderate':
      return t('Moderado');
    case 'steep':
      return t('Fuerte');
    default:
      return t('No disponible');
  }
}

export default function ParcelIrrigation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { parcel } = useParcel();
  const irrigation = useQuery({
    queryKey: ['irrigation', parcel?.id],
    queryFn: () => api.getIrrigation(parcel!.id),
    enabled: Boolean(parcel),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const header = <AppHeader subtitle={t('Riego de la semana')} onBack={() => navigate('/parcela')} />;

  if (!parcel) {
    return (
      <Screen header={header}>
        <AppAlert tone="info">{t('Primero crea una parcela.')}</AppAlert>
        <AppButton fullWidth onClick={() => navigate('/parcela')}>
          {t('Crear mi parcela')}
        </AppButton>
      </Screen>
    );
  }

  if (irrigation.isLoading) {
    return (
      <Screen header={header}>
        <StateView
          loading
          title={t('Leyendo el pronóstico')}
          description={t('Consultando Open-Meteo y la elevación de tu parcela.')}
        />
      </Screen>
    );
  }

  if (irrigation.isError || !irrigation.data) {
    return (
      <Screen header={header}>
        <AppAlert tone="error">
          {irrigation.error instanceof Error && irrigation.error.message
            ? irrigation.error.message
            : t('No pudimos leer el pronóstico. Revisa la conexión e intenta de nuevo.')}
        </AppAlert>
        <p className="text-sm leading-5 text-muted-foreground">
          {t(
            'El pronóstico semanal usa Open-Meteo. NASA POWER aporta datos históricos en otras consultas.',
          )}
        </p>
        <AppButton fullWidth onClick={() => void irrigation.refetch()}>
          {t('Reintentar')}
        </AppButton>
      </Screen>
    );
  }

  const data = irrigation.data;
  const waterAdvice = adviceText(data, t);
  const source = data.terrain?.provider ?? t('Sin elevación');

  return (
    <Screen header={header}>
      <SectionCard title={t('Próximos 7 días')} subtitle={t('Una estimación con datos reales, no una receta')}>
        <Illustration name="water" size={72} />
        <MetricRow label={t('Lluvia esperada')} value={formatNumber(data.totals.precip_mm, 'mm', 1)} />
        <MetricRow label={t('ETo de referencia')} value={formatNumber(data.totals.et0_mm, 'mm', 1)} />
        <MetricRow
          label={t('Demanda neta estimada')}
          value={formatNumber(data.totals.net_demand_mm, 'mm', 1)}
        />
        <MetricRow
          label={t('Agua declarada')}
          value={formatNumber(data.water?.available_mm, 'mm', 1)}
        />
        <p className="text-base font-semibold text-foreground">
          {waterStatusText(data.water_status, t)}
        </p>
        {waterAdvice.map((text) => (
          <p key={text} className="text-sm leading-5 text-muted-foreground">
            {text}
          </p>
        ))}
        {data.water_status === 'water_unknown' ? (
          <AppButton tone="outline" fullWidth onClick={() => navigate('/parcela/ficha')}>
            {t('Completar agua en mi ficha')}
          </AppButton>
        ) : null}
      </SectionCard>

      <ChartCard
        title={t('Día por día')}
        subtitle={t('Lluvia, ETo y demanda neta')}
        columns={[t('Día'), t('Lluvia'), t('ETo'), t('Demanda')]}
        rows={data.forecast.map((day) => ({
          label: formatDate(day.date),
          values: [
            formatNumber(day.precip_mm, 'mm', 1),
            formatNumber(day.et0_mm, 'mm', 1),
            formatNumber(day.net_demand_mm, 'mm', 1),
          ],
        }))}
      >
        <BarChart
          data={data.forecast.map((day) => ({
            label: formatDate(day.date),
            value: day.net_demand_mm,
          }))}
          formatValue={(value) => formatNumber(value, 'mm', 1)}
        />
      </ChartCard>

      <SectionCard title={t('Tu terreno')} subtitle={t('Elevación y pendiente desde SRTM')}>
        {data.terrain ? (
          <>
            <MetricRow label={t('Elevación')} value={formatNumber(data.terrain.elevation_m, 'm', 0)} />
            <MetricRow
              label={t('Pendiente del terreno')}
              value={`${formatNumber(data.terrain.slope_pct, '%', 1)} · ${slopeText(data.terrain, t)}`}
            />
            <MetricRow label={t('Fuente')} value={data.terrain.provider} />
            <MetricRow label={t('Resolución')} value={data.terrain.resolution} />
          </>
        ) : (
          <div className="space-y-2">
            <Mountain size={28} style={{ color: colors.primary }} aria-hidden="true" />
            <p className="text-sm leading-5 text-muted-foreground">
              {t('No pudimos obtener la elevación de esta parcela. No la inventamos.')}
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title={t('Agua y fuentes')}>
        <MetricRow label={t('Fuente del pronóstico')} value={String(data.forecast_source.provider ?? '')} />
        <MetricRow label={t('Conjunto')} value={String(data.forecast_source.dataset ?? '')} />
        <MetricRow label={t('Elevación')} value={source} />
        <p className="text-sm leading-5 text-muted-foreground">
          {t(
            'La ETo es de referencia y no incluye el coeficiente de tu cultivo. Usamos 80% de la lluvia como efectiva. No es una recomendación agronómica validada.',
          )}
        </p>
        {data.warnings.includes('terrain_unavailable') ? (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('La elevación no estuvo disponible; el resto del cálculo sí.')}
          </p>
        ) : null}
        <AppButton tone="outline" fullWidth onClick={() => navigate('/fuentes')}>
          {t('Ver fuentes y límites')}
        </AppButton>
      </SectionCard>

      <p className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · datos abiertos')}
      </p>
    </Screen>
  );
}
