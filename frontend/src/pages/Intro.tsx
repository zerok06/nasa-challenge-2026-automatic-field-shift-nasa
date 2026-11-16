/**
 * Intro — the three cover slides shown before Inicio, identical to the native
 * application/src/features/onboarding/IntroScreen.tsx: same photos, same copy,
 * same brand header, same progress dots and the same Skip / Continue actions.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { AppButton } from '../components/app/AppButton';

const INTRO_KEY = 'anden.intro.completed.v1';

const slides = [
  {
    image: '/img/parcel-covers/field-1.jpg',
    title: 'Tu parcela, tus decisiones',
    description:
      'Anden reúne la información de tu chacra para ayudarte a planificar cada campaña.',
    imageLabel: 'Chacra cultivada en un valle andino',
  },
  {
    image: '/img/parcel-covers/field-2.jpg',
    title: 'Compara opciones con calma',
    description: 'Mira los planes A, B y C con el agua y los precios que conoces.',
    imageLabel: 'Cultivos en hileras en un paisaje andino',
  },
  {
    image: '/img/parcel-covers/field-3.jpg',
    title: 'Prueba antes de decidir',
    description:
      'Ajusta agua y precio, revisa los supuestos y guarda tus datos para consultarlos sin señal.',
    imageLabel: 'Cultivo de ají en una chacra andina',
  },
];

export function isIntroCompleted(): boolean {
  return window.localStorage.getItem(INTRO_KEY) === '1';
}

export default function Intro({ onFinished }: { onFinished?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const last = index === slides.length - 1;

  const finish = () => {
    window.localStorage.setItem(INTRO_KEY, '1');
    navigate('/', { replace: true });
    onFinished?.();
  };

  return (
    <div className="relative min-h-full">
      <img
        src={slide.image}
        alt={t(slide.imageLabel)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/85" />

      <div className="relative flex min-h-screen flex-col justify-between px-6 pb-8 pt-6">
        <header className="flex items-center gap-3">
          <img
            src="/img/anden-icon.png"
            alt={t('Marca Anden')}
            width={46}
            height={46}
            className="h-[46px] w-[46px] rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-extrabold tracking-[2px] text-white">ANDEN</p>
            <p className="text-sm text-white/95">{t('Rotaciones claras para tu chacra.')}</p>
          </div>
          <AppButton tone="surface" size="sm" onClick={finish} className="bg-white/95">
            {t('Saltar')}
          </AppButton>
        </header>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-10 text-white">{t(slide.title)}</h1>
            <p className="text-lg leading-7 text-white/95">{t(slide.description)}</p>
          </div>

          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={slides.length}
            aria-valuenow={index + 1}
            className="flex items-center justify-center gap-2"
          >
            {slides.map((item, dotIndex) => (
              <span
                key={item.title}
                aria-label={t('Paso {{current}} de {{total}}', {
                  current: dotIndex + 1,
                  total: slides.length,
                })}
                aria-current={dotIndex === index ? 'step' : undefined}
                className="h-[9px] rounded-full transition-all"
                style={{
                  width: dotIndex === index ? 24 : 9,
                  backgroundColor: dotIndex === index ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex((current) => Math.max(current - 1, 0))}
                aria-label={t('Volver a la diapositiva anterior')}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/10 text-white transition hover:bg-white/20"
              >
                <ArrowLeft size={22} aria-hidden="true" />
              </button>
            ) : null}
            <AppButton
              size="lg"
              fullWidth
              onClick={() => (last ? finish() : setIndex((current) => current + 1))}
            >
              {last ? t('Comenzar') : t('Continuar')}
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
