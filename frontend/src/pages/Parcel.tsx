/**
 * Mi parcela — web port of the native ParcelScreen.
 *
 * Photo cover with inline editing, the ficha / prices / irrigation rows, the
 * "Datos para decidir" completeness rows, offline readiness, saved plans and
 * the footer links. The page is deliberately scannable: one photo, short rows
 * and a single obvious action per block.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Pencil, Settings, X } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { SectionCard } from '../components/app/SectionCard';
import { MediaCard } from '../components/app/MediaCard';
import { ListRow } from '../components/app/ListRow';
import { Badge, type BadgeTone } from '../components/app/Badge';
import { ProgressRing } from '../components/app/ProgressRing';
import { SkeletonList } from '../components/app/Skeleton';
import { AppAlert } from '../components/app/Feedback';
import { FormField } from '../components/app/FormField';
import { StatusBadge } from '../components/app/Feedback';
import { Screen } from '../components/app/Screen';
import { OfflineReadyCard } from '../components/app/OfflineReadyCard';
import { Illustration } from '../components/illustrations/Illustration';
import { ApiError, api } from '../lib/api';
import {
  formatCompleteness,
  formatCropSequence,
  formatDate,
  formatMissing,
  formatNumber,
  parseEsNumber,
} from '../lib/format';
import { parcelCoverFor } from '../lib/parcelCovers';
import { profileProgress } from '../lib/profileStatus';
import { useOnline } from '../lib/useOnline';
import { useComparison } from '../providers/ComparisonProvider';
import { useParcel } from '../providers/ParcelProvider';
import { useToast } from '../providers/ToastProvider';
import type { Parcel } from '../lib/types';

function locationCoordinates(parcel: Parcel): { lat: number; lon: number } | null {
  const coordinates = parcel.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  if (parcel.geometry.type === 'Point') {
    return { lat: Number(coordinates[1]), lon: Number(coordinates[0]) };
  }
  if (parcel.geometry.type === 'Polygon' && Array.isArray(coordinates[0])) {
    const ring = coordinates[0] as number[][];
    const points =
      ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] ? ring.slice(0, -1) : ring;
    if (points.length === 0) return null;
    return {
      lat: points.reduce((sum, point) => sum + point[1], 0) / points.length,
      lon: points.reduce((sum, point) => sum + point[0], 0) / points.length,
    };
  }
  return null;
}

function movedGeometry(parcel: Parcel, lat: number, lon: number) {
  const current = locationCoordinates(parcel);
  if (parcel.geometry.type !== 'Polygon' || !current) {
    return { type: 'Point' as const, coordinates: [lon, lat] };
  }
  const deltaLon = lon - current.lon;
  const deltaLat = lat - current.lat;
  const rings = parcel.geometry.coordinates as number[][][];
  return {
    type: 'Polygon' as const,
    coordinates: rings.map((ring) =>
      ring.map((point) => [point[0] + deltaLon, point[1] + deltaLat, ...point.slice(2)]),
    ),
  };
}

/** Read-only pair of label and value, aligned like a ListRow but lighter. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm leading-5 text-muted-foreground">{label}</span>
      <span className="max-w-[60%] break-words text-right text-base font-semibold leading-5 text-foreground">
        {value}
      </span>
    </div>
  );
}

export default function ParcelPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const online = useOnline();
  const toast = useToast();
  const { parcel, context, loading, error, refresh, updateMeta, createParcel, clearError } =
    useParcel();
  const { markStale } = useComparison();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(parcel?.name ?? '');
  const [editArea, setEditArea] = useState(parcel?.area_ha != null ? String(parcel.area_ha) : '');
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

  // First-run creation: without a parcel the rest of the app cannot calculate
  // anything, so this tab offers the creation form instead of a dead end.
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLon, setNewLon] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const savedPlans = useQuery({
    queryKey: ['saved-plans', parcel?.id],
    queryFn: api.getSavedPlans,
    enabled: Boolean(parcel),
    retry: false,
  });

  const startEditing = () => {
    if (!parcel) return;
    const current = locationCoordinates(parcel);
    setEditName(parcel.name);
    setEditArea(parcel.area_ha != null ? String(parcel.area_ha) : '');
    setEditDistrict(parcel.district ?? '');
    setEditLat(current ? String(current.lat) : '');
    setEditLon(current ? String(current.lon) : '');
    setEditError(null);
    setEditing(true);
  };

  const handleSaveMeta = async () => {
    if (!parcel) return;
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
    clearError();
    try {
      await updateMeta({
        name,
        areaHa: area,
        district: editDistrict.trim() || null,
        geometry: movedGeometry(parcel, lat, lon),
      });
      markStale();
      setEditing(false);
      toast.success(t('Datos de la parcela guardados.'));
    } catch (cause) {
      clearError();
      toast.error(
        cause instanceof ApiError && typeof cause.message === 'string' && cause.message
          ? cause.message
          : t('No se pudo guardar. Revisa tu conexión e intenta de nuevo.'),
      );
    } finally {
      setEditBusy(false);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast.error(t('No pudimos leer tu ubicación. Escribe las coordenadas.'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewLat(position.coords.latitude.toFixed(5));
        setNewLon(position.coords.longitude.toFixed(5));
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(t('No diste permiso de ubicación. Puedes escribir las coordenadas.'));
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  const handleCreateParcel = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error(t('Escribe un nombre para la parcela.'));
      return;
    }
    const area = newArea.trim() ? parseEsNumber(newArea) : null;
    if (newArea.trim() && (area === null || area <= 0)) {
      toast.error(
        t('“{{value}}” no es una superficie válida. Usa hectáreas, por ejemplo 1.2.', {
          value: newArea.trim(),
        }),
      );
      return;
    }
    const lat = parseEsNumber(newLat);
    const lon = parseEsNumber(newLon);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast.error(t('Escribe una latitud y longitud válidas.'));
      return;
    }
    setCreateBusy(true);
    clearError();
    try {
      await createParcel({ name, areaHa: area, lat, lon });
      setNewName('');
      setNewArea('');
      setNewLat('');
      setNewLon('');
      toast.success(t('Parcela creada'));
    } catch (cause) {
      clearError();
      toast.error(
        cause instanceof ApiError && typeof cause.message === 'string' && cause.message
          ? cause.message
          : t('No se pudo guardar. Revisa tu conexión e intenta de nuevo.'),
      );
    } finally {
      setCreateBusy(false);
    }
  };

  if (!parcel) {
    return (
      <Screen
        header={<AppHeader subtitle={t('Mi parcela')} onSettings={() => navigate('/ajustes')} />}
      >
        <AppAlert tone="info">
          {t('Todavía no tienes una parcela. Crea la primera para empezar.')}
        </AppAlert>
        <SectionCard
          title={t('Crear mi parcela')}
          subtitle={t('Necesitamos tu ubicación y superficie para comparar planes.')}
        >
          <div className="flex items-start gap-3">
            <Illustration name="onboarding-location" size={56} />
            <p className="flex-1 text-sm leading-5 text-muted-foreground">
              {t(
                'Marca dónde está tu chacra y cuánto mide. Con eso calculamos agua, costos y ganancia.',
              )}
            </p>
          </div>
          <FormField
            label={t('Nombre de la parcela')}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t('Ej. Mi chacra')}
            required
          />
          <FormField
            label={t('Superficie (ha, opcional)')}
            value={newArea}
            onChange={(event) => setNewArea(event.target.value)}
            inputMode="decimal"
            placeholder={t('Ej. 1.2 — acepta coma o punto')}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              label={t('Latitud')}
              value={newLat}
              onChange={(event) => setNewLat(event.target.value)}
              inputMode="decimal"
              placeholder="-17.19"
            />
            <FormField
              label={t('Longitud')}
              value={newLon}
              onChange={(event) => setNewLon(event.target.value)}
              inputMode="decimal"
              placeholder="-70.93"
            />
          </div>
          <AppButton tone="outline" icon={MapPin} fullWidth loading={locating} onClick={locateMe}>
            {t('Usar mi ubicación')}
          </AppButton>
          <AppButton
            fullWidth
            size="lg"
            loading={createBusy}
            onClick={() => void handleCreateParcel()}
          >
            {t('Crear mi parcela')}
          </AppButton>
        </SectionCard>
      </Screen>
    );
  }

  const missing = context?.missing_inputs ?? [];
  const fichaProgress = profileProgress(parcel, context);
  const location = locationCoordinates(parcel);
  const parcelPlans = (savedPlans.data ?? [])
    .filter((plan) => plan.parcel_id === parcel.id)
    .slice(0, 5);

  const coverBadges: { label: string; tone: BadgeTone }[] = [];
  if (parcel.is_simulated) coverBadges.push({ label: t('DEMO'), tone: 'brand' });
  coverBadges.push({
    label: t('Ficha {{progress}}%', { progress: fichaProgress }),
    tone: 'soft',
  });

  const completenessRows = [
    { label: t('Datos para comparar'), value: context?.completeness.comparison },
    { label: t('Agua'), value: context?.completeness.water },
    { label: t('Ganancia'), value: context?.completeness.margin },
  ];

  return (
    <Screen
      header={<AppHeader subtitle={t('Mi parcela')} onSettings={() => navigate('/ajustes')} />}
    >
      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <MediaCard
        image={parcelCoverFor(parcel.id)}
        imageAlt={t('Portada ilustrativa de una chacra agrícola')}
        title={parcel.name}
        subtitle={parcel.district ?? t('Moquegua')}
        badges={coverBadges}
        footer={
          <AppButton
            tone={editing ? 'ghost' : 'secondary'}
            icon={editing ? X : Pencil}
            fullWidth
            onClick={() => (editing ? setEditing(false) : startEditing())}
          >
            {editing ? t('Cancelar') : t('Editar')}
          </AppButton>
        }
      >
        {editing ? (
          <>
            <FormField
              label={t('Nombre de la parcela')}
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
            <FormField
              label={t('Superficie (ha, opcional)')}
              value={editArea}
              onChange={(event) => setEditArea(event.target.value)}
              inputMode="decimal"
              placeholder={t('Ej. 1.2 — acepta coma o punto')}
            />
            <FormField
              label={t('Distrito')}
              value={editDistrict}
              onChange={(event) => setEditDistrict(event.target.value)}
              placeholder={t('Ej. Moquegua')}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label={t('Latitud')}
                value={editLat}
                onChange={(event) => setEditLat(event.target.value)}
                placeholder="-17.19"
              />
              <FormField
                label={t('Longitud')}
                value={editLon}
                onChange={(event) => setEditLon(event.target.value)}
                placeholder="-70.93"
              />
            </div>
            {editError ? <AppAlert tone="error">{editError}</AppAlert> : null}
            <AppButton loading={editBusy} fullWidth onClick={() => void handleSaveMeta()}>
              {t('Guardar cambios')}
            </AppButton>
          </>
        ) : (
          <div className="divide-y divide-border">
            <DetailRow
              label={t('Superficie')}
              value={parcel.area_ha ? formatNumber(parcel.area_ha, t('ha'), 2) : t('No disponible')}
            />
            <DetailRow label={t('Distrito')} value={parcel.district ?? t('No disponible')} />
            <DetailRow
              label={t('Ubicación')}
              value={
                location
                  ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
                  : t('No disponible')
              }
            />
          </div>
        )}
      </MediaCard>

      <div className="space-y-2">
        <ListRow
          illustration="onboarding-location"
          title={t('Ficha de parcela')}
          subtitle={
            fichaProgress === 100
              ? t('Revisa o actualiza tu historial, agua y prioridades')
              : t('Completa historial, agua, suelo y prioridades')
          }
          badge={
            fichaProgress === 100 ? <Badge tone="success">{t('Completa')}</Badge> : undefined
          }
          trailing={
            <ProgressRing value={fichaProgress} size={40} label={t('Avance de la ficha')} />
          }
          onClick={() => navigate('/parcela/ficha')}
        />

        <ListRow
          illustration="prices"
          tone="earth"
          title={t('Precios y costos')}
          subtitle={t('Para calcular tu margen real, no un supuesto')}
          onClick={() => navigate('/parcela/economia')}
        />

        <ListRow
          illustration="water"
          tone="water"
          title={t('Riego de la semana')}
          subtitle={
            online
              ? t('Lluvia, demanda y pendiente con datos reales')
              : t('Necesita internet para consultar la semana')
          }
          onClick={() => navigate('/parcela/riego')}
          disabled={!online}
        />
      </div>

      <SectionCard
        title={t('Datos para decidir')}
        subtitle={t('Mientras más completos, mejores tus números')}
      >
        <div className="space-y-2">
          {completenessRows.map((row) => {
            const ready = row.value === 'ready';
            return (
              <ListRow
                key={row.label}
                title={row.label}
                badge={
                  <Badge tone={ready ? 'success' : 'warning'}>
                    {formatCompleteness(row.value)}
                  </Badge>
                }
              />
            );
          })}
        </div>
        {missing.length > 0 ? (
          <AppAlert tone="warning">
            {t('Falta: {{missing}}', { missing: formatMissing(missing) })}
          </AppAlert>
        ) : (
          <p className="text-sm leading-5 text-muted-foreground">
            {t('Ya tienes lo necesario para comparar tus planes.')}
          </p>
        )}
        <AppButton tone="outline" loading={loading} fullWidth onClick={() => void refresh()}>
          {t('Actualizar datos')}
        </AppButton>
      </SectionCard>

      <OfflineReadyCard parcel={parcel} />

      <SectionCard title={t('Mis planes guardados')} subtitle={t('Los planes que decidiste guardar')}>
        {savedPlans.isLoading ? (
          <SkeletonList rows={2} label={t('Cargando planes…')} />
        ) : parcelPlans.length > 0 ? (
          <div className="space-y-2">
            {parcelPlans.map((plan) => {
              const detail = [
                plan.created_at ? formatDate(plan.created_at) : null,
                plan.preferred ? formatCropSequence(plan.preferred.crop_sequence) : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <ListRow
                  key={plan.id}
                  illustration="success"
                  title={plan.name}
                  subtitle={detail || undefined}
                  badge={<StatusBadge status={plan.status} />}
                  onClick={() => navigate('/comparar')}
                />
              );
            })}
          </div>
        ) : (
          <>
            <p className="text-sm leading-5 text-muted-foreground">
              {t('Todavía no guardaste ningún plan. Compara y guarda el que más te sirva.')}
            </p>
            <AppButton fullWidth onClick={() => navigate('/comparar')}>
              {t('Comparar y guardar')}
            </AppButton>
          </>
        )}
      </SectionCard>

      <div className="space-y-2">
        <ListRow
          illustration="sources"
          tone="water"
          title={t('Fuentes y límites')}
          subtitle={t('De dónde vienen los datos y qué no podemos afirmar')}
          onClick={() => navigate('/fuentes')}
        />
        <ListRow
          icon={Settings}
          title={t('Ajustes')}
          subtitle={t('Idioma, tema, accesibilidad y Acerca de Anden')}
          onClick={() => navigate('/ajustes')}
        />
      </div>

      <p className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · app gratuita')}
      </p>
    </Screen>
  );
}
