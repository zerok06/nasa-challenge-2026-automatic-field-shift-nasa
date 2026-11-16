/**
 * App shell — mirrors the native (tabs) layout:
 * Inicio · Comparar · Preguntar · Mi parcela, with the same Lucide icons,
 * the same 68 px tab bar and the brand colours from the design tokens.
 *
 * Providers wrap the whole tree so every screen shares the active parcel, the
 * current comparison and the farmer's profile, exactly like the Android app.
 */
import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Home, Info, Loader2, MessageCircle, Sprout, Wifi, WifiOff, X } from 'lucide-react';
import { useOnline } from './lib/useOnline';
import { useSyncPendingCount } from './lib/useSyncPendingCount';
import { useViewport } from './lib/useDevice';
import { DeviceFrame } from './components/app/DeviceFrame';
import { InstallNudge } from './components/app/InstallNudge';
import { translationStatus, type LanguageCode } from './i18n';
import { ParcelProvider } from './providers/ParcelProvider';
import { ComparisonProvider } from './providers/ComparisonProvider';
import { ProfileProvider, useProfile } from './providers/ProfileProvider';
import { ToastProvider } from './providers/ToastProvider';
import HomePage from './pages/Home';
import ParcelPage from './pages/Parcel';
import ParcelFicha from './pages/ParcelFicha';
import ParcelEconomics from './pages/ParcelEconomics';
import ParcelIrrigation from './pages/ParcelIrrigation';
import Comparison from './pages/Comparison';
import SavePlan from './pages/SavePlan';
import Agent from './pages/Agent';
import Intro, { isIntroCompleted } from './pages/Intro';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import Sources from './pages/Sources';

export default function App() {
  return (
    <ToastProvider>
      <ProfileProvider>
        <ParcelProvider>
          <ComparisonProvider>
            <Shell />
          </ComparisonProvider>
        </ParcelProvider>
      </ProfileProvider>
    </ToastProvider>
  );
}

const tabs = [
  { key: 'home', path: '/', label: 'Inicio', icon: Home },
  { key: 'comparison', path: '/comparar', label: 'Comparar', icon: ArrowLeftRight },
  { key: 'agent', path: '/preguntar', label: 'Preguntar', icon: MessageCircle },
  { key: 'parcel', path: '/parcela', label: 'Mi parcela', icon: Sprout },
] as const;

function Shell() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const online = useOnline();
  const pending = useSyncPendingCount();
  const { isMobile, showPhoneFrame } = useViewport();
  const [introDone, setIntroDone] = useState(() => isIntroCompleted());
  const draftLocale = translationStatus[i18n.language as LanguageCode] === 'review_pending';
  const [draftNoticeDismissed, setDraftNoticeDismissed] = useState(false);

  useEffect(() => {
    setIntroDone(isIntroCompleted());
  }, [location.pathname]);

  if (!introDone) return <Intro onFinished={() => setIntroDone(true)} />;

  const shell = (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        {t('Saltar al contenido')}
      </a>

      {draftLocale && !draftNoticeDismissed ? (
        <div className="flex items-start gap-2 border-b border-border bg-primary-50 px-4 py-2 text-primary">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="flex-1 text-sm leading-5">
            {t(
              'Este idioma está en borrador: parte del texto sigue en español mientras lo revisamos con hablantes nativos.',
            )}
          </p>
          <button
            type="button"
            aria-label={t('Cerrar')}
            onClick={() => setDraftNoticeDismissed(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-primary-100"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <InstallNudge mobile={isMobile} />

      <main
        id="main"
        className="flex-1 pb-[calc(68px+env(safe-area-inset-bottom))]"
      >
        {profileLoading && !profile ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            {t('Cargando tu perfil')}
          </div>
        ) : null}

        <Routes>
          <Route path="/intro" element={<Navigate to="/" replace />} />
          <Route
            path="/onboarding"
            element={profile?.onboarding_completed_at ? <Navigate to="/" replace /> : <Onboarding />}
          />
          <Route
            path="/"
            element={
              !profileLoading && profile && !profile.onboarding_completed_at ? (
                <Navigate to="/onboarding" replace />
              ) : (
                <HomePage />
              )
            }
          />
          <Route path="/comparar" element={<Comparison />} />
          <Route path="/comparar/guardar" element={<SavePlan />} />
          <Route path="/preguntar" element={<Agent />} />
          <Route path="/parcela" element={<ParcelPage />} />
          <Route path="/parcela/ficha" element={<ParcelFicha />} />
          <Route path="/parcela/economia" element={<ParcelEconomics />} />
          <Route path="/parcela/riego" element={<ParcelIrrigation />} />
          <Route path="/ajustes" element={<Settings />} />
          <Route path="/fuentes" element={<Sources />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {location.pathname.startsWith('/onboarding') ? null : (
        <TabBar
          activeKey={activeKeyFor(location.pathname)}
          onNavigate={navigate}
          online={online}
          pending={pending}
        />
      )}
    </>
  );

  if (showPhoneFrame) {
    return <DeviceFrame>{shell}</DeviceFrame>;
  }

  return <div className="flex min-h-screen flex-col bg-background">{shell}</div>;
}

function ConnectionBadge({ online, pending }: { online: boolean; pending: number }) {
  const { t } = useTranslation();
  return (
    <span
      aria-live="polite"
      className="pointer-events-none absolute -top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-sm"
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${online ? 'bg-success' : 'bg-warning'}`}
      />
      {online ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
      {online ? t('En línea') : t('Sin conexión')}
      {pending > 0 ? <span className="text-muted-foreground">· {t('{{count}} por enviar', { count: pending })}</span> : null}
    </span>
  );
}

function activeKeyFor(pathname: string): string {
  return tabs.find((tab) => tab.path !== '/' && pathname.startsWith(tab.path))?.key ?? 'home';
}

function TabBar({
  activeKey,
  onNavigate,
  online,
  pending,
}: {
  activeKey: string;
  onNavigate: (path: string) => void;
  online: boolean;
  pending: number;
}) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('Navegación principal')}
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-[68px] border-t border-border bg-card pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-1.5"
    >
      <ConnectionBadge online={online} pending={pending} />
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onNavigate(tab.path)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={24} aria-hidden="true" />
            <span>{t(tab.label)}</span>
          </button>
        );
      })}
    </nav>
  );
}
