import Database from "better-sqlite3";
import type { AuthRecord, AuthRecordStore, UpdatePatch } from "@authai/relay";

type Row = {
  id: string;
  iv: Buffer;
  blob: Buffer;
  account_id_hash: string;
  created_at: number;
  updated_at: number;
  expires_at: number;
};

// Schema notes:
//
//   - `account_id_hash` has a UNIQUE index so two concurrent sign-ins for the
//     same provider account cannot create duplicate records. The upsert path
//     leans on this constraint via `INSERT ... ON CONFLICT(account_id_hash)`.
//
//   - Old (pre-Wave-2) databases shipped a non-unique index by the same
//     logical name. `migrateSchema()` below drops it and recreates as UNIQUE
//     on startup. The migration aborts if real duplicates exist; the operator
//     is expected to wipe or clean the row collisions first.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS auth_records (
  id               TEXT    PRIMARY KEY,
  iv               BLOB    NOT NULL,
  blob             BLOB    NOT NULL,
  account_id_hash  TEXT    NOT NULL,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_records_by_account
  ON auth_records (account_id_hash);
CREATE INDEX IF NOT EXISTS auth_records_by_expires
  ON auth_records (expires_at);
`;

function migrateSchema(db: Database.Database): void {
  // If the existing index isn't UNIQUE, drop and recreate. SQLite stores
  // index metadata in sqlite_master.
  type IndexRow = { name: string; sql: string | null };
  const row = db
    .prepare<[], IndexRow>(
      `SELECT name, sql FROM sqlite_master
       WHERE type='index' AND name='auth_records_by_account'`,
    )
    .get();
  if (row && row.sql && !/UNIQUE/i.test(row.sql)) {
    db.exec("DROP INDEX auth_records_by_account;");
  }
}

export function createSqliteStore(path: string): AuthRecordStore {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  migrateSchema(db);
  // Re-run SCHEMA after a potential drop so the unique index is in place.
  db.exec(SCHEMA);

  type UpsertRow = { id: string; created_at: number };
  const upsertStmt = db.prepare<
    [string, Buffer, Buffer, string, number, number, number],
    UpsertRow
  >(
    `INSERT INTO auth_records
       (id, iv, blob, account_id_hash, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id_hash) DO UPDATE SET
       iv         = excluded.iv,
       blob       = excluded.blob,
       updated_at = excluded.updated_at,
       expires_at = excluded.expires_at
     RETURNING id, created_at`,
  );

  const getById = db.prepare<[string], Row>(`SELECT * FROM auth_records WHERE id = ?`);

  // CAS update: the WHERE clause includes `updated_at = ?expected` so a
  // concurrent writer that already advanced updated_at sees 0 changes.
  const casUpdate = db.prepare<[Buffer, Buffer, number, number | null, string, number]>(
    `UPDATE auth_records
        SET iv         = ?,
            blob       = ?,
            updated_at = ?,
            expires_at = COALESCE(?, expires_at)
      WHERE id = ?
        AND updated_at = ?`,
  );

  const deleteStmt = db.prepare<[string]>(`DELETE FROM auth_records WHERE id = ?`);
  const sweep = db.prepare<[number]>(`DELETE FROM auth_records WHERE expires_at < ?`);

  return {
    async upsertByAccountHash(c: AuthRecord) {
      const row = upsertStmt.get(
        c.id,
        Buffer.from(c.iv),
        Buffer.from(c.blob),
        c.accountIdHash,
        c.createdAt,
        c.updatedAt,
        c.expiresAt,
      );
      if (!row) {
        // RETURNING should always produce a row on INSERT or DO UPDATE;
        // this branch is defensive against driver edge cases.
        throw new Error("upsertByAccountHash: no row returned");
      }
      return { id: row.id, createdAt: row.created_at };
    },

    async get(id: string) {
      const row = getById.get(id);
      return row ? rowToRecord(row) : null;
    },

    async update(id: string, patch: UpdatePatch, expectedUpdatedAt: number) {
      const info = casUpdate.run(
        Buffer.from(patch.iv),
        Buffer.from(patch.blob),
        patch.updatedAt,
        patch.expiresAt ?? null,
        id,
        expectedUpdatedAt,
      );
      return info.changes > 0;
    },

    async delete(id: string) {
      deleteStmt.run(id);
    },

    async sweepExpired(now: number) {
      return sweep.run(now).changes;
    },

    async close() {
      db.close();
    },
  };
}

function rowToRecord(row: Row): AuthRecord {
  return {
    id: row.id,
    iv: new Uint8Array(row.iv),
    blob: new Uint8Array(row.blob),
    accountIdHash: row.account_id_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}
