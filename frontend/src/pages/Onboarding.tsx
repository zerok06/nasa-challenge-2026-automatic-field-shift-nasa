/**
 * Onboarding — web port of the native OnboardingScreen.
 *
 * Five steps: idioma, nombre y experiencia, ubicación, consentimiento y cierre.
 * "Ahora no" and "No sé" are always valid answers; nothing is invented.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, MapPin, ShieldCheck } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { HeroCard } from '../components/app/HeroCard';
import { SectionCard } from '../components/app/SectionCard';
import { AppAlert, Disclosure } from '../components/app/Feedback';
import { FormField, Progress } from '../components/app/FormField';
import { Illustration } from '../components/illustrations/Illustration';
import { Screen } from '../components/app/Screen';
import { colors } from '../design/tokens';
import { languageOptions, setLanguage, type LanguageCode } from '../i18n';
import { parseEsNumber } from '../lib/format';
import { useProfile } from '../providers/ProfileProvider';

const ONBOARDING_KEY = 'anden.onboarding.completed.v1';

export function isOnboardingCompleted(): boolean {
  return window.localStorage.getItem(ONBOARDING_KEY) === '1';
}

type Experience = 'first' | 'some' | 'experienced';

const EXPERIENCES: { code: Experience; label: string }[] = [
  { code: 'first', label: 'Es mi primera vez' },
  { code: 'some', label: 'Ya sembré antes' },
  { code: 'experienced', label: 'Tengo experiencia' },
];

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { saveProfile } = useProfile();

  const [step, setStep] = useState(0);
  const [language, setLanguageState] = useState<LanguageCode>(
    (i18n.language as LanguageCode) ?? 'es-PE',
  );
  const [name, setName] = useState('');
  const [experience, setExperience] = useState<Experience>('first');
  const [audio, setAudio] = useState(true);
  const [consent, setConsent] = useState(false);
  const [home, setHome] = useState<{ lat: number; lon: number } | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(t('No pudimos leer tu ubicación. Escribe las coordenadas.'));
      return;
    }
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setHome({ lat, lon });
        setManualLat(lat.toFixed(5));
        setManualLon(lon.toFixed(5));
        setLocationBusy(false);
      },
      () => {
        setError(t('No diste permiso de ubicación. Puedes escribir las coordenadas.'));
        setLocationBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  const saveManualLocation = () => {
    const lat = parseEsNumber(manualLat);
    const lon = parseEsNumber(manualLon);
    if (lat === null || lon === null) {
      setError(t('Escribe una latitud y longitud válidas.'));
      return;
    }
    setHome({ lat, lon });
    setError(null);
  };

  const finish = async () => {
    if (!name.trim()) {
      setError(t('Escribe tu nombre para saludarte como corresponde.'));
      return;
    }
    if (!consent) {
      setError(t('Marca que aceptas usar tus datos para este piloto.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveProfile({
        displayName: name.trim(),
        locale: language,
        profile: { audio, experience, home, onboarding_version: 1 },
        onboardingCompleted: true,
        consentVersion: 'v1',
      });
      window.localStorage.setItem(ONBOARDING_KEY, '1');
      setStep(4);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t('No se pudo crear tu perfil. Intenta de nuevo.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const header = <AppHeader subtitle={t('Tu perfil')} />;

  return (
    <Screen
      header={header}
      footer={
        step === 0 ? (
          <AppButton fullWidth size="lg" onClick={() => setStep(1)}>
            {t('Continuar')}
          </AppButton>
        ) : step === 1 ? (
          <>
            <AppButton fullWidth size="lg" onClick={() => setStep(2)}>
              {t('Continuar')}
            </AppButton>
            <AppButton tone="ghost" fullWidth onClick={() => setStep(0)}>
              {t('Volver')}
            </AppButton>
          </>
        ) : step === 2 ? (
          <>
            <AppButton fullWidth size="lg" onClick={() => setStep(3)}>
              {t('Continuar')}
            </AppButton>
            <AppButton
              tone="ghost"
              fullWidth
              onClick={() => {
                setHome(null);
                setStep(3);
              }}
            >
              {t('Ahora no')}
            </AppButton>
          </>
        ) : step === 3 ? (
          <>
            <AppButton
              fullWidth
              size="lg"
              loading={busy}
              disabled={!consent}
              onClick={() => void finish()}
            >
              {t('Crear mi perfil')}
            </AppButton>
            <AppButton tone="ghost" fullWidth onClick={() => setStep(2)}>
              {t('Volver')}
            </AppButton>
          </>
        ) : (
          <AppButton fullWidth size="lg" onClick={() => navigate('/', { replace: true })}>
            {t('Ir a Inicio')}
          </AppButton>
        )
      }
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t('Paso {{current}} de {{total}}', { current: Math.min(step + 1, 5), total: 5 })}
        </p>
        <Progress value={step === 0 ? 20 : step === 1 ? 40 : step === 2 ? 60 : step === 3 ? 80 : 100} />
      </div>

      {step === 0 ? (
        <>
          <HeroCard
            eyebrow={t('Bienvenido')}
            title={t('Tu parcela, tus decisiones, más simples')}
            description={t(
              'Anden te ayuda a comparar qué sembrar con el clima, tu agua y tus costos. Sin inventar números.',
            )}
            illustration="onboarding-language"
          />
          <SectionCard title={t('Idioma')} subtitle={t('Elige cómo quieres leer la app')}>
            <div className="flex flex-wrap gap-2">
              {languageOptions.map((option) => {
                const selected = language === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setLanguageState(option.code);
                      setLanguage(option.code);
                    }}
                    className={`flex min-h-12 w-[48%] items-center justify-center gap-1 rounded-full border px-3 py-2 ${
                      selected ? 'border-primary bg-accent text-primary' : 'border-border bg-card'
                    }`}
                  >
                    {selected ? <Check size={16} aria-hidden="true" /> : null}
                    <span className={`text-base ${selected ? 'font-semibold' : 'text-foreground'}`}>
                      {option.nativeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm leading-5 text-muted-foreground">
              {t('Quechua y aimara están en revisión con hablantes nativos.')}
            </p>
          </SectionCard>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Illustration name="onboarding-profile" size={88} />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('¿Cómo te llamas?')}
            </h1>
            <p className="text-base leading-6 text-muted-foreground">
              {t('Así te saludamos en Inicio. No pedimos teléfono ni correo.')}
            </p>
          </div>
          <SectionCard title={t('Tu nombre')}>
            <FormField
              label={t('Nombre')}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('Ejemplo: Juan')}
              required
            />
          </SectionCard>
          <SectionCard
            title={t('Tu experiencia')}
            subtitle={t('Nos ayuda a explicarte con más o menos detalle')}
          >
            {EXPERIENCES.map((option) => {
              const selected = experience === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setExperience(option.code)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2 ${
                    selected ? 'border-primary bg-accent' : 'border-border bg-card'
                  }`}
                >
                  <span className="text-base text-foreground">{t(option.label)}</span>
                  {selected ? <Check size={20} style={{ color: colors.primary }} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </SectionCard>
          <SectionCard
            title={t('Escuchar las preguntas')}
            subtitle={t('Puedes activar o desactivar el audio cuando quieras')}
          >
            <label className="flex items-center justify-between gap-3">
              <span className="flex-1 text-base text-foreground">{t('Audio activado')}</span>
              <input
                type="checkbox"
                checked={audio}
                onChange={(event) => setAudio(event.target.checked)}
                className="h-6 w-6 accent-primary"
              />
            </label>
          </SectionCard>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Illustration name="onboarding-location" size={88} />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('¿Dónde está tu parcela?')}
            </h1>
            <p className="text-base leading-6 text-muted-foreground">
              {t('Con tu ubicación buscamos el clima de tu zona. No mostramos un mapa.')}
            </p>
          </div>
          <SectionCard title={t('Ubicación')} subtitle={t('Solo la usamos para el clima y tus planes')}>
            <AppButton fullWidth loading={locationBusy} onClick={useMyLocation}>
              {t('Usar mi ubicación')}
            </AppButton>
            <div className="flex items-center gap-2">
              <MapPin size={18} style={{ color: colors.primary }} aria-hidden="true" />
              <p className="flex-1 text-sm leading-5 text-muted-foreground">
                {home
                  ? t('Ubicación lista: {{lat}}, {{lon}}', {
                      lat: home.lat.toFixed(4),
                      lon: home.lon.toFixed(4),
                    })
                  : t('Todavía no tenemos tu ubicación.')}
              </p>
            </div>
            <Disclosure title={t('Escribir las coordenadas')}>
              <FormField
                label={t('Latitud')}
                value={manualLat}
                onChange={(event) => setManualLat(event.target.value)}
                placeholder="-17.19"
              />
              <FormField
                label={t('Longitud')}
                value={manualLon}
                onChange={(event) => setManualLon(event.target.value)}
                placeholder="-70.93"
              />
              <AppButton tone="outline" fullWidth onClick={saveManualLocation}>
                {t('Guardar ubicación')}
              </AppButton>
            </Disclosure>
          </SectionCard>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Illustration name="onboarding-consent" size={88} />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('Revisa y acepta')}
            </h1>
            <p className="text-base leading-6 text-muted-foreground">
              {t('Usamos tus datos para el piloto de Anden. No los vendemos.')}
            </p>
          </div>
          <SectionCard title={t('Resumen')}>
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} style={{ color: colors.primary }} aria-hidden="true" />
              <p className="flex-1 text-base text-foreground">{name.trim() || t('Sin nombre')}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {home
                ? t('Zona: {{district}}', { district: t('Ubicación guardada') })
                : t('Sin ubicación por ahora')}
            </p>
            <p className="text-sm text-muted-foreground">
              {audio ? t('Audio activado') : t('Audio desactivado')}
            </p>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 accent-primary"
                aria-label={t('Aceptar el uso de datos del piloto')}
              />
              <span className="text-base leading-6 text-foreground">
                {t('Acepto usar mis datos para este piloto. Puedo pedir que los borren.')}
              </span>
            </label>
            <Disclosure title={t('Qué datos usamos y para qué')}>
              <p className="text-sm leading-5 text-muted-foreground">
                {t(
                  'Usamos tu nombre, idioma y ubicación para saludarte y buscar el clima de tu zona. No pedimos teléfono ni correo. No vendemos tus datos.',
                )}
              </p>
            </Disclosure>
          </SectionCard>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Illustration name="success" size={96} />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('Tu perfil está listo')}
            </h1>
            <p className="text-base leading-6 text-muted-foreground">
              {t('Ahora puedes crear tu primera parcela.')}
            </p>
          </div>
          <SectionCard title={t('Bienvenido, {{name}}', { name: name.trim() })}>
            <p className="text-base leading-6 text-foreground">
              {t('Tu cuenta está en este teléfono. No necesitas contraseña.')}
            </p>
          </SectionCard>
        </>
      ) : null}

      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      <p className="text-center text-sm leading-5 text-muted-foreground">
        {t('Anden · piloto Moquegua · datos abiertos de NASA · app gratuita')}
      </p>
    </Screen>
  );
}
