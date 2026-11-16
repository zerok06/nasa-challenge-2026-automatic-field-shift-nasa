import * as SecureStore from 'expo-secure-store';

export type PendingFeedback = {
  parcelId: string | null;
  kind: 'comparison' | 'onboarding' | 'general';
  rating: number;
  comment?: string | null;
  context: Record<string, unknown>;
  queuedAt: string;
};

const KEY = 'anden_feedback_queue_v1';

export async function loadPendingFeedback(): Promise<PendingFeedback[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingFeedback[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueueFeedback(item: PendingFeedback): Promise<void> {
  const current = await loadPendingFeedback();
  current.push(item);
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(current.slice(-20)));
  } catch {
    // Queue failure must not block the UI.
  }
}

export async function clearPendingFeedback(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing to clear.
  }
}
