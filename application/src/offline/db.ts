import * as SQLite from 'expo-sqlite';

import type { ParcelBundle } from '@/services/api/types';

export type StoredBundle = {
  parcelId: string;
  bundle: ParcelBundle;
  checksum: string;
  sizeBytes: number;
  downloadedAt: string;
  expiresAt: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function database(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('anden.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS bundles (
          parcel_id TEXT PRIMARY KEY NOT NULL,
          bundle_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          checksum TEXT NOT NULL,
          size_bytes INTEGER NOT NULL DEFAULT 0,
          downloaded_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
      `);
      // Migration for databases created before size_bytes was added.
      try {
        await db.execAsync('ALTER TABLE bundles ADD COLUMN size_bytes INTEGER NOT NULL DEFAULT 0');
      } catch {
        // Column already exists.
      }
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY NOT NULL,
          method TEXT NOT NULL,
          path TEXT NOT NULL,
          body TEXT,
          created_at TEXT NOT NULL,
          synced_at TEXT
        );
      `);
      return db;
    });
  }
  return databasePromise;
}

export async function saveBundle(
  parcelId: string,
  bundle: ParcelBundle,
  checksum: string,
  sizeBytes: number,
  downloadedAt: string,
): Promise<void> {
  const db = await database();
  await db.runAsync(
    `INSERT OR REPLACE INTO bundles
      (parcel_id, bundle_id, payload, checksum, size_bytes, downloaded_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    parcelId,
    bundle.bundle_id,
    JSON.stringify(bundle),
    checksum,
    sizeBytes,
    downloadedAt,
    bundle.expires_at,
  );
}

export async function loadBundle(parcelId: string): Promise<StoredBundle | null> {
  const db = await database();
  const row = await db.getFirstAsync<{
    parcel_id: string;
    payload: string;
    checksum: string;
    size_bytes: number;
    downloaded_at: string;
    expires_at: string;
  }>(
    'SELECT parcel_id, payload, checksum, size_bytes, downloaded_at, expires_at FROM bundles WHERE parcel_id = ?',
    parcelId,
  );
  if (!row) return null;
  try {
    return {
      parcelId: row.parcel_id,
      bundle: JSON.parse(row.payload) as ParcelBundle,
      checksum: row.checksum,
      sizeBytes: row.size_bytes,
      downloadedAt: row.downloaded_at,
      expiresAt: row.expires_at,
    };
  } catch {
    await db.runAsync('DELETE FROM bundles WHERE parcel_id = ?', parcelId);
    return null;
  }
}

export async function deleteBundle(parcelId: string): Promise<void> {
  const db = await database();
  await db.runAsync('DELETE FROM bundles WHERE parcel_id = ?', parcelId);
}

export type QueuedOperation = {
  id: string;
  method: string;
  path: string;
  body: string | null;
  createdAt: string;
};

export async function enqueueOperation(operation: QueuedOperation): Promise<void> {
  const db = await database();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_queue (id, method, path, body, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, NULL)`,
    operation.id,
    operation.method,
    operation.path,
    operation.body,
    operation.createdAt,
  );
}

export async function listPendingOperations(): Promise<QueuedOperation[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    id: string;
    method: string;
    path: string;
    body: string | null;
    created_at: string;
  }>(
    'SELECT id, method, path, body, created_at FROM sync_queue WHERE synced_at IS NULL ORDER BY created_at',
  );
  return rows.map((row) => ({
    id: row.id,
    method: row.method,
    path: row.path,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function markSynced(id: string): Promise<void> {
  const db = await database();
  await db.runAsync('UPDATE sync_queue SET synced_at = ? WHERE id = ?', new Date().toISOString(), id);
}
