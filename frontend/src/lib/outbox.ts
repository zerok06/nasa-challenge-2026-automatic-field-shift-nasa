/**
 * Offline outbox: IndexedDB queue for write operations.
 *
 * Every POST/PATCH/DELETE that is enqueued via `enqueue()` gets an
 * Idempotency-Key (crypto.randomUUID) so replay after reconnect does
 * not duplicate the effect.  The flush loop runs on:
 *   - `navigator.onLine` → true
 *   - `document.visibilitychange` → visible
 *   - a 5 s interval as a safety net
 *
 * Max 5 retries with exponential backoff (1 s, 2 s, 4 s, 8 s, 16 s).
 */

import { apiBase } from './api';

const DB_NAME = 'anden_outbox';
const STORE = 'writes';
const MAX_RETRIES = 5;

// ── IndexedDB helpers ─────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Types ─────────────────────────────────────────────────────────────

export interface OutboxEntry {
  id: string;
  path: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  idempotencyKey: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Record a write operation in the outbox.  The caller is expected to
 * have already fired the network request; `enqueue` is called when the
 * request fails (offline or 5xx) so it can be replayed later.
 */
export async function enqueue(
  path: string,
  method: OutboxEntry['method'],
  body?: unknown,
): Promise<string> {
  const db = await openDB();
  const entry: OutboxEntry = {
    id: crypto.randomUUID(),
    path,
    method,
    body,
    idempotencyKey: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve(entry.id);
    tx.onerror = () => reject(tx.error);
  });
}

/** Number of pending writes. */
export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/** All pending entries, oldest first (FIFO). */
export async function getAllPending(): Promise<OutboxEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve(
          (req.result as OutboxEntry[]).sort(
            (a, b) => a.createdAt.localeCompare(b.createdAt),
          ),
        );
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

function removeEntry(id: string): Promise<void> {
  const db = openDB();
  return db.then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
    () => Promise.resolve(),
  );
}

function updateAttempts(id: string, attempts: number, lastError?: string): Promise<void> {
  const db = openDB();
  return db.then(
    (d) =>
      new Promise((resolve, reject) => {
        const tx = d.transaction(STORE, 'readwrite');
        const store = tx.objectStore(STORE);
        const get = store.get(id);
        get.onsuccess = () => {
          if (!get.result) return resolve();
          get.result.attempts = attempts;
          get.result.lastError = lastError;
          store.put(get.result);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
    () => Promise.resolve(),
  );
}

// ── Flush loop ────────────────────────────────────────────────────────

let _flushing = false;

/**
 * Re-enqueue all pending writes.  Called automatically on online /
 * visibility events; also callable manually.
 */
export async function flush(): Promise<void> {
  if (_flushing || !navigator.onLine) return;
  _flushing = true;
  try {
    const pending = await getAllPending();
    for (const entry of pending) {
      if (entry.attempts >= MAX_RETRIES) continue;
      const backoffMs = Math.min(1000 * 2 ** entry.attempts, 16_000);
      await new Promise((r) => setTimeout(r, backoffMs));
      try {
        const token = localStorage.getItem('anden_token');
        const resp = await fetch(`${apiBase}${entry.path}`, {
          method: entry.method,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': entry.idempotencyKey,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: entry.body !== undefined ? JSON.stringify(entry.body) : undefined,
        });
        if (resp.ok || resp.status === 401) {
          // Success or auth issue (which the main client will handle)
          // → remove from outbox.
          await removeEntry(entry.id);
        } else {
          await updateAttempts(entry.id, entry.attempts + 1, `HTTP ${resp.status}`);
        }
      } catch (err) {
        await updateAttempts(entry.id, entry.attempts + 1, String(err));
        break; // network still down
      }
    }
  } finally {
    _flushing = false;
  }
}

// ── Auto-start listeners ─────────────────────────────────────────────

let _listenersStarted = false;

/** Idempotent: attach `online` + `visibilitychange` listeners once. */
export function startOutboxListeners(): void {
  if (_listenersStarted || typeof window === 'undefined') return;
  _listenersStarted = true;
  window.addEventListener('online', () => void flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });
  setInterval(() => void flush(), 5_000);
}
