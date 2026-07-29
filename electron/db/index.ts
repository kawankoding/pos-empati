import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { runMigrations } from "./migrate";
import { seedInitialAdmin, seedSettings, seedCategoriesAndProducts } from "./seed";

let sqlite: DatabaseSync | null = null;
let dbPath: string | null = null;

export function initDatabase(userDataPath: string): DatabaseSync {
  const dataDir = path.join(userDataPath, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbPath = path.join(dataDir, "pos.db");
  sqlite = new DatabaseSync(dbPath);

  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA busy_timeout = 5000");

  runMigrations(sqlite);
  seedInitialAdmin(sqlite);
  seedSettings(sqlite);
  seedCategoriesAndProducts(sqlite);

  return sqlite;
}

export function getDb(): DatabaseSync {
  if (!sqlite) {
    throw new Error("Database has not been initialized");
  }
  return sqlite;
}

export function closeDatabase(): void {
  if (!sqlite) return;
  try {
    sqlite.exec("PRAGMA optimize");
    sqlite.close();
  } catch {
    /* best-effort close */
  }
  sqlite = null;
}

/* ------------------------------------------------------------------ */
/*  Backup & Restore                                                   */
/* ------------------------------------------------------------------ */

export type BackupMeta = {
  appVersion: string;
  schemaVersion: number;
  timestamp: string;
  checksum: string;
};

/**
 * Create a WAL-safe backup to the given destination path.
 * 1. Checkpoint WAL so all data is in the main DB file
 * 2. Copy the DB file
 * 3. Append JSON metadata footer (SQLite ignores trailing data)
 */
export function backupDatabase(destPath: string, appVersion: string): BackupMeta {
  const db = getDb();
  if (!dbPath) throw new Error("Database path not set");

  // 1. Checkpoint WAL — flush all pending writes to the main file
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");

  // 2. Copy the database file
  fs.copyFileSync(dbPath, destPath);

  // 3. Checksum — hash the binary file before appending metadata
  const fileBuffer = fs.readFileSync(destPath);
  const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  // 4. Read schema version
  const schemaRow = db.prepare("SELECT MAX(version) AS version FROM schema_version").get() as {
    version: number | null;
  };
  const schemaVersion = schemaRow.version ?? 0;

  const meta: BackupMeta = {
    appVersion,
    schemaVersion,
    timestamp: new Date().toISOString(),
    checksum,
  };

  // 5. Append metadata as JSON footer (no leading newline)
  const metaJson = "--POS_EMPATI_BACKUP_META\n" + JSON.stringify(meta) + "\n--END_META\n";
  fs.appendFileSync(destPath, metaJson);

  return meta;
}

/**
 * Validate a backup file. Returns metadata if valid, throws on invalid.
 */
export function validateBackup(filePath: string): BackupMeta {
  if (!fs.existsSync(filePath)) {
    throw new Error("File backup tidak ditemukan.");
  }

  const buf = fs.readFileSync(filePath);

  // Search for metadata marker as bytes (avoid UTF-8 corruption of binary DB data)
  const marker = Buffer.from("--POS_EMPATI_BACKUP_META\n");
  const metaStart = buf.lastIndexOf(marker);
  if (metaStart === -1) {
    throw new Error("File bukan backup POS Empati yang valid.");
  }

  // DB portion (binary)
  const dbBuffer = buf.subarray(0, metaStart);

  // Read metadata as string
  const metaContent = buf.subarray(metaStart + marker.length).toString("utf-8");
  const metaEnd = metaContent.indexOf("\n--END_META\n");
  if (metaEnd === -1) {
    throw new Error("Metadata backup rusak.");
  }

  const metaJson = metaContent.slice(0, metaEnd);

  let meta: BackupMeta;
  try {
    meta = JSON.parse(metaJson);
  } catch {
    throw new Error("Metadata backup tidak valid.");
  }

  if (!meta.checksum || !meta.timestamp || meta.schemaVersion === undefined) {
    throw new Error("Metadata backup tidak lengkap.");
  }

  // Verify checksum on binary DB portion
  const actualChecksum = crypto.createHash("sha256").update(dbBuffer).digest("hex");
  if (actualChecksum !== meta.checksum) {
    throw new Error("File backup rusak atau telah dimodifikasi (checksum tidak cocok).");
  }

  // Verify it's a valid SQLite database
  try {
    const tempDb = new DatabaseSync(filePath);
    const integrity = tempDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    tempDb.close();
    if (integrity.integrity_check !== "ok") {
      throw new Error(`Database rusak: ${integrity.integrity_check}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Database rusak")) throw e;
    throw new Error("File bukan database SQLite yang valid.");
  }

  return meta;
}

/**
 * Restore a backup file.
 * 1. Validate the backup
 * 2. Close the current database
 * 3. Replace the DB file with the backup
 * 4. Reinitialize the database (runs migrations, ensures settings exist)
 */
export function restoreDatabase(
  backupPath: string,
  userDataPath: string,
  _appVersion: string,
): void {
  // 1. Validate
  validateBackup(backupPath);

  // 2. Close current database
  if (sqlite) {
    try {
      sqlite.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      sqlite.close();
    } catch {
      /* best-effort */
    }
    sqlite = null;
  }

  // 3. Replace the database file
  const dataDir = path.join(userDataPath, "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const targetPath = path.join(dataDir, "pos.db");

  // Back up the current file just in case
  const rollbackPath = targetPath + ".rollback." + Date.now();
  if (fs.existsSync(targetPath)) {
    fs.copyFileSync(targetPath, rollbackPath);
  }

  // Remove WAL/SHM files
  for (const ext of ["-wal", "-shm"]) {
    const p = targetPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  // Copy backup data (strip metadata footer) to target
  const backupBuf = fs.readFileSync(backupPath);
  const marker = Buffer.from("--POS_EMPATI_BACKUP_META\n");
  const metaStart = backupBuf.lastIndexOf(marker);
  const dbOnly = metaStart !== -1 ? backupBuf.subarray(0, metaStart) : backupBuf;

  fs.writeFileSync(targetPath, dbOnly);

  // 4. Reinitialize
  try {
    sqlite = new DatabaseSync(targetPath);
    sqlite.exec("PRAGMA foreign_keys = ON");
    sqlite.exec("PRAGMA journal_mode = WAL");
    sqlite.exec("PRAGMA busy_timeout = 5000");

    runMigrations(sqlite);
    seedSettings(sqlite);
    seedCategoriesAndProducts(sqlite);

    dbPath = targetPath;
  } catch (e) {
    // Roll back on restore failure
    if (sqlite) {
      try {
        sqlite.close();
      } catch {
        /* no-op */
      }
      sqlite = null;
    }
    if (fs.existsSync(rollbackPath)) {
      fs.copyFileSync(rollbackPath, targetPath);
      fs.unlinkSync(rollbackPath);
      // Reopen the rollback
      sqlite = new DatabaseSync(targetPath);
      sqlite.exec("PRAGMA foreign_keys = ON");
      sqlite.exec("PRAGMA journal_mode = WAL");
      sqlite.exec("PRAGMA busy_timeout = 5000");
      dbPath = targetPath;
    }
    throw new Error(`Gagal memulihkan database: ${e instanceof Error ? e.message : String(e)}`);
  }
}
