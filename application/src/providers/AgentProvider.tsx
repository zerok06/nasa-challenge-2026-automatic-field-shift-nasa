import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  confirmAction,
  createThread,
  getComparison,
  sendAgentMessage,
  type AgentAction,
  type AgentNextStep,
  type AgentToolTrace,
} from '@/services/api';
import { useComparison } from './ComparisonProvider';
import { useOffline } from './OfflineProvider';
import { useParcel } from './ParcelProvider';

export type AgentChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  trace?: AgentToolTrace[];
  actions?: AgentAction[];
  nextStep?: AgentNextStep | null;
};

type AgentState = {
  messages: AgentChatMessage[];
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  proposalId: string | null;
  savedMessage: string | null;
  error: string | null;
  send: (textOverride?: string) => Promise<void>;
  confirmSave: () => Promise<void>;
  clearError: () => void;
  clearSavedMessage: () => void;
};

const AgentContext = createContext<AgentState | null>(null);

function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  const { online, bundle } = useOffline();
  const { setComparison } = useComparison();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureThread = useCallback(async () => {
    if (!parcel) throw new Error('No hay una parcela activa');
    if (threadId) return threadId;
    const thread = await createThread(parcel.id);
    setThreadId(thread.thread_id);
    return thread.thread_id;
  }, [parcel, threadId]);

  const send = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || !parcel || sending) return;
      setInput('');
      setSending(true);
      setError(null);
      setSavedMessage(null);
      setMessages((current) => [
        ...current,
        { id: nextId('user'), role: 'user', text },
      ]);
      if (!online) {
        const lower = text.toLowerCase();
        let answer: string;
        if (lower.includes('compar') || lower.includes('rotac')) {
          if (bundle) {
            setComparison(bundle.comparison);
            answer = bundle.comparison.plans
              .map(
                (plan) =>
                  `${plan.label}: ganancia ${plan.economics.margin_pen ?? 'sin dato'} soles, ` +
                  `agua que necesitas ${plan.water.gross_irrigation_mm ?? 'sin dato'} mm`,
              )
              .join('. ');
            answer = `Sin conexión, con tus datos guardados. ${answer}`;
          } else {
            answer =
              'No hay datos guardados para esta parcela. Conéctate una vez y descárgalos para usarlos sin internet.';
          }
        } else if (lower.includes('agua') || lower.includes('riego')) {
          answer =
            'Sin conexión puedo usar tus datos guardados. Abre “Comparar” y toca “Probar un cambio” para probar menos agua; el resultado se marcará como estimación sin internet.';
        } else if (lower.includes('guardar') || lower.includes('borrador')) {
          answer =
            'Para guardar un borrador necesitas conexión. Puedes seguir comparando y probando cambios con tus datos guardados.';
        } else if (lower.includes('paquete') || lower.includes('datos')) {
          answer = bundle
            ? `Tus datos guardados tienen ${bundle.climate.length} meses de clima y ${bundle.comparison.plans.length} planes, y vencen el ${bundle.expires_at.slice(0, 10)}.`
            : 'No hay datos guardados. Conéctate y descárgalos desde “Mi parcela”.';
        } else {
          answer =
            'Estoy sin conexión. Puedo comparar planes con tus datos guardados, explicarlos o indicarte cómo probar agua y precio.';
        }
        setMessages((current) => [
          ...current,
          {
            id: nextId('assistant-offline'),
            role: 'assistant',
            text: answer,
          },
        ]);
        setSending(false);
        return;
      }
      try {
        const id = await ensureThread();
        const response = await sendAgentMessage(id, text);
        setMessages((current) => [
          ...current,
          {
            id: nextId('assistant'),
            role: 'assistant',
            text: response.answer,
            trace: response.tool_trace,
            actions: response.ui_actions,
            nextStep: response.next_step,
          },
        ]);
        const saveAction = response.ui_actions.find(
          (action) => action.action === 'save_plan_draft',
        );
        if (saveAction?.payload?.proposal_id) {
          setProposalId(String(saveAction.payload.proposal_id));
        }
        const openAction = response.ui_actions.find(
          (action) => action.action === 'open_comparison',
        );
        if (openAction?.payload?.comparison_id) {
          const existing = await getComparison(String(openAction.payload.comparison_id));
          setComparison(existing);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'El agente no respondió';
        setError(message);
        setMessages((current) => [
          ...current,
          {
            id: nextId('assistant-error'),
            role: 'assistant',
            text: 'No pude completar la consulta. Revisa la conexión e intenta de nuevo.',
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [bundle, ensureThread, input, online, parcel, sending, setComparison],
  );

  const confirmSave = useCallback(async () => {
    if (!proposalId) return;
    if (!online) {
      setError('Sin conexión no se puede guardar el borrador');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await confirmAction(proposalId, true);
      setSavedMessage('Borrador guardado. Lo encuentras en “Mi parcela”.');
      setProposalId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSending(false);
    }
  }, [online, proposalId]);

  const value = useMemo<AgentState>(
    () => ({
      messages,
      input,
      setInput,
      sending,
      proposalId,
      savedMessage,
      error,
      send,
      confirmSave,
      clearError: () => setError(null),
      clearSavedMessage: () => setSavedMessage(null),
    }),
    [messages, input, sending, proposalId, savedMessage, error, send, confirmSave],
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentState {
  const value = useContext(AgentContext);
  if (!value) throw new Error('useAgent must be used inside AgentProvider');
  return value;
}
