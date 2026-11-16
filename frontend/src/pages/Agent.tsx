/**
 * Preguntar — chat with the Anden agent.
 *
 * The empty state offers three concrete questions, then the screen becomes a
 * conversation: deep-green user bubbles, white agent cards with the avatar,
 * typing dots while the deterministic engine answers, quick replies above the
 * composer and a save-draft proposal attached to the composer. The agent never
 * calculates figures itself; it returns engine values and asks before saving.
 *
 * The agent is online-only: without internet the history stays readable, but
 * suggestions, quick replies and the composer are disabled and one alert
 * explains what can still be done with saved data.
 *
 * Every reply is committed exactly once. There `ui_actions` are interpreted:
 * comparison/scenario actions navigate to /comparar, while an `open_screen`
 * becomes a CTA inside the bubble so the farmer is never pulled out of the
 * conversation mid-answer. The ReAct trace is a plain-language step list in
 * ChatBubble; no raw chain of thought is shown.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Banknote,
  Bookmark,
  BookmarkCheck,
  Droplets,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  WifiOff,
} from 'lucide-react';
import { AppButton, AppIconButton } from '../components/app/AppButton';
import { AppHeader } from '../components/app/AppHeader';
import { ActionCard } from '../components/app/ActionCard';
import { Chip, ChipBar } from '../components/app/Chip';
import { ChatBubble } from '../components/app/ChatBubble';
import { TypingDots } from '../components/app/TypingDots';
import { AppAlert } from '../components/app/Feedback';
import { StateView } from '../components/app/StateView';
import { Illustration } from '../components/illustrations/Illustration';
import { Screen } from '../components/app/Screen';
import { ApiError, api, type AgentReply } from '../lib/api';
import { enqueue } from '../lib/outbox';
import { useOnline } from '../lib/useOnline';
import { useParcel } from '../providers/ParcelProvider';
import { useToast } from '../providers/ToastProvider';

const FEEDBACK_PATH = '/api/v1/feedback';

type ReplyCta = {
  /** React Router destination; always validated as an internal path. */
  path: string;
  /** `price` gets the explicit review copy, everything else stays generic. */
  kind: 'price' | 'screen';
  /** The same reply also offered open_comparison / open_scenario. */
  comparison: boolean;
};

type ChatEntry =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'agent'; data: AgentReply; cta: ReplyCta | null }
  | { id: string; role: 'note'; text: string };

type PendingProposal = {
  id: string;
  preview: string[];
};

const suggestions = [
  {
    icon: Droplets,
    label: '¿Qué siembro con menos agua?',
    prompt: 'Compara rotaciones que usen menos agua',
    tone: 'water' as const,
  },
  {
    icon: Banknote,
    label: '¿Qué pasa si baja el precio?',
    prompt: 'Simula un precio 15% menor',
    tone: 'earth' as const,
  },
  {
    icon: Bookmark,
    label: 'Guarda un plan',
    prompt: 'Guarda un borrador del plan',
    tone: 'primary' as const,
  },
];

/** Quick replies only appear once the conversation exists, so they never
 *  duplicate the three empty-state cards. Each one is sent verbatim. */
const quickReplies = [
  { icon: Droplets, label: '¿Cuánta agua me falta?' },
  { icon: Banknote, label: '¿Qué pasa si baja el precio?' },
  { icon: Bookmark, label: 'Guarda un plan' },
  { icon: Sparkles, label: '¿Qué puedes hacer?' },
];

/** Only same-origin, internal React Router paths are actionable. */
function safeInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  return path;
}

function ctaForPath(path: string): ReplyCta {
  return {
    kind: path.startsWith('/parcela/economia') ? 'price' : 'screen',
    path,
    comparison: false,
  };
}

/** Copy is returned as i18n keys and translated at render time. */
function ctaCopy(cta: ReplyCta): { label: string; helper: string } {
  if (cta.kind === 'price') {
    return {
      label: 'Revisar precio y guardar',
      helper: 'Revisa el precio propuesto en el catálogo y guárdalo cuando estés de acuerdo.',
    };
  }
  if (cta.path.startsWith('/comparar')) {
    return {
      label: 'Ver comparación',
      helper: 'Abre la comparación con los planes y datos de tu parcela.',
    };
  }
  if (cta.path.startsWith('/parcela/ficha')) {
    return {
      label: 'Completar mi ficha',
      helper: 'Completa los datos que faltan para que el agente responda mejor.',
    };
  }
  return {
    label: 'Ir a revisar',
    helper: 'Abre la pantalla con el detalle de esta respuesta.',
  };
}

export default function Agent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const { parcel } = useParcel();

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null);
  const [proposalBusy, setProposalBusy] = useState<'confirm' | 'discard' | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const entrySeq = useRef(0);
  // Idempotency guard: each HTTP reply may be committed only once, so its
  // ui_actions can never be replayed by a re-render or a duplicated callback.
  const handledReplies = useRef<Set<string>>(new Set());

  const nextEntryId = () => {
    entrySeq.current += 1;
    return `entry-${entrySeq.current}`;
  };

  useEffect(() => {
    if (!parcel || threadId || !online) return;
    api
      .createThread(parcel.id)
      .then((result) => setThreadId(result.thread_id))
      .catch(() => setError(t('No pudimos iniciar la conversación.')));
  }, [parcel, threadId, online, t]);

  // Keep the newest message above the sticky composer: the composer height is
  // used as scroll margin so the answer is never hidden behind it.
  useEffect(() => {
    if (messages.length === 0 && !error) return;
    const end = endRef.current;
    if (!end) return;
    const composerHeight = composerRef.current?.offsetHeight ?? 0;
    end.style.scrollMarginBottom = `${composerHeight + 16}px`;
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    end.scrollIntoView?.({ block: 'end', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [error, messages.length, pendingProposal, sending]);

  const focusComposer = () => {
    inputRef.current?.focus({ preventScroll: true });
  };

  /**
   * Commit one agent reply: append the bubble, drive the proposal card and
   * interpret `ui_actions` exactly once.
   *
   * Economics `open_screen` never navigates on its own; it becomes the bubble
   * CTA. Other screens can navigate immediately, and comparison/scenario
   * navigates to /comparar only when no CTA is competing for the same next
   * step; when both arrive, the comparison is offered inside the CTA card
   * instead of yanking the screen.
   */
  const commitReply = (data: AgentReply) => {
    let cta: ReplyCta | null = null;
    let immediateScreen: string | null = null;
    let wantsComparison = false;

    for (const action of data.ui_actions ?? []) {
      if (!action || typeof action.action !== 'string') continue;
      if (action.action === 'open_screen') {
        const path = safeInternalPath(action.payload?.path);
        if (!path) continue;
        if (path.startsWith('/parcela/economia')) {
          if (!cta) cta = ctaForPath(path);
        } else if (!immediateScreen) {
          immediateScreen = path;
        }
      } else if (action.action === 'open_comparison' || action.action === 'open_scenario') {
        wantsComparison = true;
      }
      // save_plan_draft / capture_draft need no extra work here: the proposal
      // card is driven by pending_proposal_id + save_preview below.
    }

    if (cta) cta.comparison = wantsComparison;

    const proposalAction = (data.ui_actions ?? []).find(
      (action) => action.action === 'save_plan_draft' || action.action === 'capture_draft',
    );
    const actionProposalId =
      typeof proposalAction?.payload?.proposal_id === 'string'
        ? proposalAction.payload.proposal_id
        : null;
    const proposalId = data.pending_proposal_id ?? actionProposalId;
    const entryId = nextEntryId();

    setMessages((current) => [
      ...current,
      { id: entryId, role: 'agent', data, cta },
    ]);
    setPendingProposal(
      proposalId ? { id: proposalId, preview: data.save_preview ?? [] } : null,
    );

    if (!cta && immediateScreen) {
      navigate(immediateScreen);
      return;
    }
    if (!cta && wantsComparison) {
      toast.info(t('Abrí la comparación de planes.'));
      navigate('/comparar');
    }
  };

  const send = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed || !threadId || sending || !online) return;
    setSending(true);
    setError(null);
    const entryId = nextEntryId();
    setMessages((current) => [...current, { id: entryId, role: 'user', text: trimmed }]);
    setInput('');
    focusComposer();

    const replyId = crypto.randomUUID();

    api
      .sendAgentMessage(threadId, trimmed, { screen: 'agent' }, 'chat')
      .then((data) => {
        if (handledReplies.current.has(replyId)) return;
        handledReplies.current.add(replyId);
        commitReply(data);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : t('No pudimos obtener la respuesta.'));
      })
      .finally(() => setSending(false));
  };

  const handleProposalFailure = (cause: unknown, fallback: string) => {
    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 409)) {
      setPendingProposal(null);
      setError(t('Ese borrador ya no está disponible. Pídelo de nuevo si lo necesitas.'));
      return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  };

  const confirmPending = async () => {
    if (!pendingProposal || proposalBusy) return;
    if (!online) {
      setError(t('Sin conexión no podemos guardar. Vuelve a intentarlo con internet.'));
      return;
    }
    setProposalBusy('confirm');
    setError(null);
    try {
      await api.confirmProposal(pendingProposal.id, true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['parcels'] }),
        queryClient.invalidateQueries({ queryKey: ['context'] }),
        queryClient.invalidateQueries({ queryKey: ['saved-plans'] }),
      ]);
      setPendingProposal(null);
      const noteId = nextEntryId();
      setMessages((current) => [
        ...current,
        { id: noteId, role: 'note', text: t('Listo, ya quedó guardado.') },
      ]);
      toast.success(t('Listo, ya quedó guardado.'));
    } catch (cause) {
      handleProposalFailure(cause, t('No pudimos guardar. Inténtalo de nuevo.'));
    } finally {
      setProposalBusy(null);
    }
  };

  const discardPending = async () => {
    if (!pendingProposal || proposalBusy) return;
    if (!online) {
      setError(t('Sin conexión no podemos guardar. Vuelve a intentarlo con internet.'));
      return;
    }
    setProposalBusy('discard');
    setError(null);
    try {
      await api.confirmProposal(pendingProposal.id, false);
      setPendingProposal(null);
      toast.info(t('No se guardó nada.'));
    } catch (cause) {
      handleProposalFailure(cause, t('No pudimos descartar. Inténtalo de nuevo.'));
    } finally {
      setProposalBusy(null);
    }
  };

  const header = (
    <AppHeader
      subtitle={
        online
          ? parcel?.name ?? t('Preguntar')
          : `${parcel?.name ?? t('Preguntar')} · ${t('Sin conexión')}`
      }
      onSources={() => navigate('/fuentes')}
    />
  );

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Preguntar')} />}>
        <StateView
          illustration="empty"
          title={t('Primero crea tu parcela')}
          description={t('El agente usa los datos de tu parcela para responder.')}
          action={
            <AppButton fullWidth onClick={() => navigate('/parcela')}>
              {t('Crear mi parcela')}
            </AppButton>
          }
        />
      </Screen>
    );
  }

  const occupied = !online || !threadId;

  return (
    <div className="flex min-h-[calc(100dvh_-_68px_-_env(safe-area-inset-bottom))] flex-col">
      {header}

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-4 pb-6 pt-4">
        <h1 className="sr-only">{t('Preguntar')}</h1>

        {!online ? (
          <AppAlert tone="neutral">
            <span className="flex items-start gap-2">
              <WifiOff size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
              <span>
                {t(
                  'El agente necesita internet. Sin conexión puedes revisar tus planes, tu ficha y probar cambios con los datos guardados.',
                )}
              </span>
            </span>
          </AppAlert>
        ) : null}

        {messages.length === 0 ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-primary-50/60 px-5 py-6 text-center">
              <Illustration name="agent" size={96} />
              <h2 className="text-xl font-bold text-foreground">{t('¿Qué quieres saber?')}</h2>
              <p className="max-w-[320px] text-base leading-6 text-muted-foreground">
                {t('Pregunta con tus palabras. Yo uso los datos de tu parcela.')}
              </p>
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t('Sugerencias')}
              </h2>
              {online && !threadId && !error ? (
                <p className="text-sm leading-5 text-muted-foreground" role="status">
                  {t('Preparando la conversación…')}
                </p>
              ) : null}
              {suggestions.map((suggestion) => (
                <ActionCard
                  key={suggestion.label}
                  icon={suggestion.icon}
                  title={t(suggestion.label)}
                  tone={suggestion.tone}
                  disabled={occupied || sending}
                  onClick={() => send(suggestion.prompt)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 id="conversacion-titulo" className="sr-only">
              {t('Conversación')}
            </h2>
            {!online ? <OfflineConversationNote /> : null}
            <div
              role="log"
              aria-live="polite"
              aria-labelledby="conversacion-titulo"
              className="space-y-3"
            >
              {messages.map((message) =>
                message.role === 'user' ? (
                  <ChatBubble key={message.id} role="user" text={message.text} />
                ) : message.role === 'note' ? (
                  <ChatBubble key={message.id} role="note" text={message.text} />
                ) : (
                  <AgentBubble
                    key={message.id}
                    message={message.data}
                    cta={message.cta}
                    parcelId={parcel.id}
                    online={online}
                    onNext={send}
                  />
                ),
              )}
            </div>
            {sending ? <TypingDots /> : null}
          </div>
        )}

        {error ? <AppAlert tone="error">{error}</AppAlert> : null}
        <div ref={endRef} aria-hidden="true" className="h-px" />
      </div>

      <div
        ref={composerRef}
        className="sticky bottom-[calc(68px_+_env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 shadow-sticky backdrop-blur"
      >
        {pendingProposal ? (
          <ProposalPanel
            preview={pendingProposal.preview}
            busy={proposalBusy}
            online={online}
            onConfirm={() => void confirmPending()}
            onDiscard={() => void discardPending()}
          />
        ) : null}

        <div className="mx-auto w-full max-w-2xl space-y-2 px-4 pb-3 pt-2">
          {messages.length > 0 ? (
            <ChipBar label={t('Respuestas rápidas')}>
              {quickReplies.map((reply) => (
                <Chip
                  key={reply.label}
                  icon={reply.icon}
                  onClick={() => send(reply.label)}
                  disabled={occupied || sending}
                >
                  {t(reply.label)}
                </Chip>
              ))}
            </ChipBar>
          ) : null}

          <form
            className="mx-auto flex w-full max-w-2xl items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                online ? t('Escribe tu pregunta') : t('Sin conexión: el agente no responde')
              }
              aria-label={t('Escribe tu pregunta')}
              disabled={!online}
              autoComplete="off"
              enterKeyHint="send"
              className="min-h-12 flex-1 rounded-2xl border border-border bg-background px-4 text-base disabled:opacity-60"
            />
            <AppButton
              type="submit"
              icon={Send}
              loading={sending}
              disabled={occupied || !input.trim()}
              aria-label={t('Enviar')}
              className="shrink-0 px-4 sm:px-5"
            >
              <span className="hidden sm:inline">{t('Enviar')}</span>
            </AppButton>
          </form>
        </div>
      </div>
    </div>
  );
}

/** The old history stays readable, but it is clearly paused. */
function OfflineConversationNote() {
  const { t } = useTranslation();

  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm leading-5 text-muted-foreground"
    >
      <WifiOff size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <span>
        <span className="font-semibold text-foreground">{t('Sin conexión')}. </span>
        {t(
          'La conversación está en pausa: el agente no puede responder hasta que vuelvas a estar en línea.',
        )}
      </span>
    </p>
  );
}

function ProposalPanel({
  preview,
  busy,
  online,
  onConfirm,
  onDiscard,
}: {
  preview: string[];
  busy: 'confirm' | 'discard' | null;
  online: boolean;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="proposal-title"
      className="border-b border-border bg-primary-50/70 px-4 py-3"
    >
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <div className="flex items-start gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <BookmarkCheck size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="proposal-title" className="text-base font-bold text-foreground">
              {t('Borrador listo')}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {t('Todavía no se guarda nada. Confirma para guardarlo.')}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{t('Se guardará')}</p>
          {preview.length > 0 ? (
            <ul className="max-h-24 list-disc space-y-1 overflow-y-auto pl-5 text-sm leading-5 text-foreground">
              {preview.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-5 text-muted-foreground">
              {t('Se guardará el borrador que revisamos en la conversación.')}
            </p>
          )}
        </div>

        {!online ? (
          <p className="flex items-start gap-2 text-sm leading-5 text-warning">
            <WifiOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {t('Necesitas internet para confirmar o descartar este borrador.')}
          </p>
        ) : null}

        <div className="space-y-2">
          <AppButton
            fullWidth
            onClick={onConfirm}
            loading={busy === 'confirm'}
            disabled={busy !== null || !online}
          >
            {t('Confirmar y guardar')}
          </AppButton>
          <AppButton
            tone="ghost"
            fullWidth
            onClick={onDiscard}
            loading={busy === 'discard'}
            disabled={busy !== null || !online}
          >
            {t('Descartar')}
          </AppButton>
        </div>
      </div>
    </section>
  );
}

function AgentBubble({
  message,
  cta,
  parcelId,
  online,
  onNext,
}: {
  message: AgentReply;
  cta: ReplyCta | null;
  parcelId: string;
  online: boolean;
  onNext: (prompt: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const [rating, setRating] = useState<5 | 1 | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  // Synchronous guard so a double tap cannot post the same rating twice before
  // React has painted the disabled buttons.
  const ratingGuard = useRef<5 | 1 | null>(null);

  const stepTools = (message.tool_trace ?? []).map((trace) => trace.tool);

  const rateAnswer = async (value: 5 | 1) => {
    if (ratingGuard.current !== null) return;
    ratingGuard.current = value;
    if (rating !== null || feedbackBusy) return;
    setFeedbackBusy(true);

    const body = {
      parcel_id: parcelId,
      kind: 'general' as const,
      rating: value,
      comment: null,
      context: {
        screen: 'agent',
        thread_id: message.thread_id,
        step_tools: stepTools,
      },
    };

    let recorded = false;
    try {
      if (online) {
        try {
          await api.sendFeedback({
            parcelId,
            kind: 'general',
            rating: value,
            context: body.context,
          });
        } catch {
          // A network blip should not lose the rating: replay it later.
          await enqueue(FEEDBACK_PATH, 'POST', body);
        }
      } else {
        await enqueue(FEEDBACK_PATH, 'POST', body);
      }
      recorded = true;
    } catch {
      recorded = false;
    } finally {
      setRating(value);
      setFeedbackBusy(false);
    }

    if (recorded) {
      toast.success(t('Gracias, tu respuesta nos ayuda a mejorar.'));
    } else {
      toast.error(t('No pudimos registrar tu respuesta. Inténtalo de nuevo.'));
    }
  };

  const nextStep = message.next_step
    ? {
        datos: { label: t('Completa los datos en Mi parcela'), prompt: null, path: '/parcela/ficha' },
        comparar: {
          label: t('Compara 3 planes para tu parcela'),
          prompt: 'Compara mis planes',
          path: null,
        },
        probar: {
          label: t('Prueba con 20% menos agua'),
          prompt: 'Simula 20% menos agua',
          path: null,
        },
        guardar: { label: t('Si te sirve, guarda un plan'), prompt: 'Guarda un borrador', path: null },
        listo: { label: t('Revisa tus planes en Mi parcela'), prompt: null, path: '/parcela' },
      }[message.next_step.phase]
    : null;

  // One next step per answer: never stack the generic card on top of the
  // proposal card or the ui_action CTA.
  const showNextStep = !cta && !message.pending_proposal_id && nextStep !== null;
  const copy = cta ? ctaCopy(cta) : null;

  return (
    <ChatBubble role="agent" text={message.answer} trace={message.tool_trace}>
      {cta && copy ? (
        <div className="space-y-2 rounded-xl border border-border bg-primary-50 p-3">
          <p className="text-sm leading-5 text-foreground">{t(copy.helper)}</p>
          <div className="flex flex-wrap gap-2">
            <AppButton icon={ArrowRight} onClick={() => navigate(cta.path)}>
              {t(copy.label)}
            </AppButton>
            {cta.comparison ? (
              <AppButton tone="outline" onClick={() => navigate('/comparar')}>
                {t('Ver comparación')}
              </AppButton>
            ) : null}
          </div>
        </div>
      ) : showNextStep && nextStep ? (
        <div className="space-y-2 rounded-xl bg-primary-50 p-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            {t('Siguiente paso')}
          </h3>
          <p className="text-sm leading-5 text-foreground">{nextStep.label}</p>
          {nextStep.prompt ? (
            <AppButton onClick={() => onNext(nextStep.prompt!)}>{t('Hacerlo')}</AppButton>
          ) : nextStep.path ? (
            <AppButton tone="outline" onClick={() => navigate(nextStep.path!)}>
              {t('Hacerlo')}
            </AppButton>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-border/70 pt-1.5">
        <div
          role="group"
          aria-label={t('¿Te sirvió esta respuesta?')}
          className="flex items-center gap-1"
        >
          <span className="mr-1 text-sm leading-5 text-muted-foreground">{t('¿Te sirvió?')}</span>
          <AppIconButton
            icon={ThumbsUp}
            label={t('Sí, me sirvió')}
            tone={rating === 5 ? 'primary' : 'muted'}
            aria-pressed={rating === 5}
            disabled={rating !== null || feedbackBusy}
            onClick={() => void rateAnswer(5)}
            className={`disabled:pointer-events-none disabled:opacity-40 ${
              rating === 5 ? 'bg-primary-50' : ''
            }`}
          />
          <AppIconButton
            icon={ThumbsDown}
            label={t('No me sirvió')}
            tone={rating === 1 ? 'primary' : 'muted'}
            aria-pressed={rating === 1}
            disabled={rating !== null || feedbackBusy}
            onClick={() => void rateAnswer(1)}
            className={`disabled:pointer-events-none disabled:opacity-40 ${
              rating === 1 ? 'bg-primary-50' : ''
            }`}
          />
        </div>
      </div>
    </ChatBubble>
  );
}
