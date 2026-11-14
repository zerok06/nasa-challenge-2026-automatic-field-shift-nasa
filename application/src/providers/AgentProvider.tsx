import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  confirmAction,
  createThread,
  getComparison,
  sendAgentMessage,
  type AgentAction,
  type AgentToolTrace,
} from '@/services/api';
import { useComparison } from './ComparisonProvider';
import { useParcel } from './ParcelProvider';

export type AgentChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  trace?: AgentToolTrace[];
  actions?: AgentAction[];
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
            text: 'No pude completar la consulta. Revisá la conexión e intentá de nuevo.',
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [ensureThread, input, parcel, sending, setComparison],
  );

  const confirmSave = useCallback(async () => {
    if (!proposalId) return;
    setSending(true);
    setError(null);
    try {
      await confirmAction(proposalId, true);
      setSavedMessage('Borrador guardado con estado draft.');
      setProposalId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setSending(false);
    }
  }, [proposalId]);

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
