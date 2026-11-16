/**
 * FeedbackCard — one short question, three answers and an optional comment.
 *
 * The answer is never lost: online it goes straight to the API, and offline (or
 * when the network fails) it is written to the IndexedDB outbox so the replay
 * loop sends it on reconnect. Once answered, the form is replaced by a polite
 * live region; there is no second set of submit buttons.
 *
 * Accessible: `radiogroup` with roving tabindex and arrow keys, labelled
 * textarea, 48 px targets and a `role="status"` thank-you message.
 */
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { AppButton } from './AppButton';
import { SectionCard } from './SectionCard';
import { AppAlert } from './Feedback';
import { ApiError, api } from '../../lib/api';
import { enqueue } from '../../lib/outbox';
import { useOnline } from '../../lib/useOnline';
import { useToast } from '../../providers/ToastProvider';

export type FeedbackKind = 'comparison' | 'onboarding' | 'general';

/** Body exactly as the backend expects it, also used by the outbox replay. */
type FeedbackBody = {
  parcel_id: string | null;
  kind: FeedbackKind;
  rating: number;
  comment: string | null;
  context: Record<string, unknown>;
};

const OPTIONS = [
  { rating: 5, label: 'Sí, me ayudó' },
  { rating: 2, label: 'No me ayudó' },
  { rating: 1, label: 'No entendí' },
] as const;

const MAX_COMMENT = 500;

type Status = 'idle' | 'sending' | 'sent' | 'queued';

function shouldQueue(cause: unknown): boolean {
  // A network/server failure is worth replaying; a 4xx is not.
  if (!(cause instanceof ApiError)) return true;
  return cause.status >= 500 || cause.status === 408 || cause.status === 429;
}

export function FeedbackCard({
  title,
  description,
  parcelId,
  kind,
  context,
}: {
  title: string;
  description?: string;
  parcelId?: string | null;
  kind: FeedbackKind;
  context: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const online = useOnline();
  const toast = useToast();
  const uid = useId();
  const commentId = `${uid}-comment`;
  const commentHintId = `${uid}-comment-hint`;
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const submittingRef = useRef(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const sending = status === 'sending';
  const answered = status === 'sent' || status === 'queued';

  const queue = async (body: FeedbackBody) => {
    try {
      await enqueue('/api/v1/feedback', 'POST', body);
      setStatus('queued');
      toast.info(t('Guardada en el teléfono. Se enviará cuando tengas señal.'));
    } catch {
      submittingRef.current = false;
      setStatus('idle');
      setError(t('No pudimos guardar tu respuesta. Inténtalo otra vez.'));
    }
  };

  const submit = async () => {
    if (rating === null || submittingRef.current || answered) return;
    submittingRef.current = true;
    const trimmed = comment.trim();
    const body: FeedbackBody = {
      parcel_id: parcelId ?? null,
      kind,
      rating,
      comment: trimmed ? trimmed : null,
      context,
    };
    setError(null);

    if (!online) {
      await queue(body);
      return;
    }

    setStatus('sending');
    try {
      await api.sendFeedback({
        parcelId: parcelId ?? null,
        kind,
        rating,
        comment: trimmed ? trimmed : null,
        context,
      });
      setStatus('sent');
      toast.success(t('Gracias. Tu respuesta nos ayuda a mejorar Anden.'));
    } catch (cause) {
      if (!shouldQueue(cause)) {
        submittingRef.current = false;
        setStatus('idle');
        setError(
          cause instanceof Error ? cause.message : t('No pudimos enviar tu respuesta.'),
        );
        return;
      }
      await queue(body);
    }
  };

  const choose = (index: number) => {
    const option = OPTIONS[(index + OPTIONS.length) % OPTIONS.length];
    if (!option) return;
    setRating(option.rating);
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      choose(index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      choose(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      choose(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      choose(OPTIONS.length - 1);
    }
  };

  if (answered) {
    return (
      <SectionCard title={title}>
        <p role="status" aria-live="polite" className="text-sm leading-5 text-muted-foreground">
          {status === 'sent'
            ? t('Gracias. Tu respuesta nos ayuda a mejorar Anden.')
            : t('Guardada en el teléfono. Se enviará cuando tengas señal.')}
        </p>
      </SectionCard>
    );
  }

  const currentIndex = Math.max(
    0,
    OPTIONS.findIndex((option) => option.rating === rating),
  );

  return (
    <SectionCard title={title}>
      {description ? (
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      ) : null}

      <div role="radiogroup" aria-label={title} className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option, index) => {
          const checked = rating === option.rating;
          return (
            <button
              key={option.rating}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={index === currentIndex ? 0 : -1}
              onClick={() => setRating(option.rating)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                checked
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-card text-foreground hover:bg-primary-50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full border ${
                  checked ? 'border-primary bg-primary' : 'border-border bg-card'
                }`}
              />
              {t(option.label)}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <label
          htmlFor={commentId}
          className="flex items-baseline justify-between gap-2 text-sm font-medium text-foreground"
        >
          <span>{t('Comentario (opcional)')}</span>
          <span className="text-xs font-normal text-muted-foreground" aria-hidden="true">
            {comment.length}/{MAX_COMMENT}
          </span>
        </label>
        <textarea
          id={commentId}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={MAX_COMMENT}
          rows={3}
          aria-describedby={commentHintId}
          className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-subtle"
          placeholder={t('Si quieres, cuéntanos por qué')}
        />
        <p id={commentHintId} className="text-xs leading-4 text-muted-foreground">
          {t('Máximo 500 caracteres.')}
        </p>
      </div>

      {error ? <AppAlert tone="error">{error}</AppAlert> : null}

      {rating === null ? (
        <p className="text-sm leading-5 text-muted-foreground">
          {t('Elige una respuesta para enviar.')}
        </p>
      ) : null}

      <AppButton
        fullWidth
        loading={sending}
        disabled={rating === null || sending}
        onClick={() => void submit()}
      >
        {t('Enviar respuesta')}
      </AppButton>
    </SectionCard>
  );
}
