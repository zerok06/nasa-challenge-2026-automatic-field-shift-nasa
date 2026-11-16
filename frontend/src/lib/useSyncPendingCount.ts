/**
 * useSyncPendingCount – polls the outbox every 2 s and returns
 * the number of pending (unsynced) writes.
 */
import { useState, useEffect } from 'react';
import { getPendingCount } from './outbox';

export function useSyncPendingCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        setCount(await getPendingCount());
      } catch {
        /* outbox may not be initialised yet */
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return count;
}
