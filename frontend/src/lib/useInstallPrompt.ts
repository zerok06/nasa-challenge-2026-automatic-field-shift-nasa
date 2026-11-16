/**
 * useInstallPrompt — PWA install state.
 *
 * Chrome/Android fires `beforeinstallprompt` early, possibly before the
 * Settings page mounts, so the event is captured in a tiny module-level store
 * and the hook reads it through `useSyncExternalStore`. iOS Safari never fires
 * it (and exposes `navigator.standalone` instead), so the card falls back to
 * the Share → "Añadir a inicio" steps.
 */
import { useCallback, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let acceptedInSession = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayMode =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
  const iosStandalone = (navigator as NavigatorWithStandalone).standalone === true;
  return displayMode || iosStandalone;
}

function startListening(): void {
  if (typeof window === 'undefined') return;
  // Keep the event so the "Instalar Anden" button can open the native prompt.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    acceptedInSession = true;
    emit();
  });
  if (typeof window.matchMedia === 'function') {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', emit);
  }
}

startListening();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallPrompt() {
  const canPrompt = useSyncExternalStore(
    subscribe,
    () => deferredPrompt !== null,
    () => false,
  );
  const installed = useSyncExternalStore(
    subscribe,
    () => acceptedInSession || isStandalone(),
    () => false,
  );

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    const event = deferredPrompt;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      const accepted = choice.outcome === 'accepted';
      if (accepted) acceptedInSession = true;
      return accepted;
    } catch {
      return false;
    } finally {
      // The event can only be used once.
      deferredPrompt = null;
      emit();
    }
  }, []);

  return {
    canInstall: canPrompt && !installed,
    installed,
    promptInstall,
  };
}
