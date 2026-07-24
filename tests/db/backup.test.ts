import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";

// We test the backup/restore logic directly since it's in the db/index module.
// The module uses module-level state, so we test the underlying logic via a
// standalone implementation for isolation.

/* ------------------------------------------------------------------ */
/*  Helpers — inline backup/restore for testing                        */
/* ------------------------------------------------------------------ */

function makeBackup(
  srcDb: DatabaseSync,
  srcPath: string,
  destPath: string,
  appVersion: string,
): { schemaVersion: number; checksum: string } {
  // Checkpoint WAL
  srcDb.exec("PRAGMA wal_checkpoint(TRUNCATE)");

  // Copy file
  fs.copyFileSync(srcPath, destPath);

  // Checksum (binary)
  const buf = fs.readFileSync(destPath);
  const checksum = crypto.createHash("sha256").update(buf).digest("hex");

  // Read schema version safely
  let schemaVersion = 0;
  try {
    const row = srcDb
      .prepare("SELECT MAX(version) AS version FROM schema_version")
      .get() as { version: number | null };
    schemaVersion = row.version ?? 0;
  } catch {
    // No schema_version table — fine for test DBs
  }

  // Metadata
  const meta = { appVersion, schemaVersion, timestamp: new Date().toISOString(), checksum };
  fs.appendFileSync(destPath, "--POS_EMPATI_BACKUP_META\n" + JSON.stringify(meta) + "\n--END_META\n");

  return meta;
}

function validateAndStripBackup(backupPath: string): { schemaVersion: number } {
  const buf = fs.readFileSync(backupPath);

  // Search for metadata marker as bytes (avoid UTF-8 corruption of binary DB content)
  const marker = Buffer.from("--POS_EMPATI_BACKUP_META\n");
  const metaStart = buf.lastIndexOf(marker);
  if (metaStart === -1) throw new Error("Not a valid backup");

  // Get DB-only buffer
  const dbBuffer = buf.subarray(0, metaStart);

  // Read metadata as string from the portion after the marker
  const metaContent = buf.subarray(metaStart + marker.length).toString("utf-8");
  const metaEnd = metaContent.indexOf("\n--END_META\n");
  if (metaEnd === -1) throw new Error("Metadata not found");

  const metaJson = metaContent.slice(0, metaEnd);
  const meta = JSON.parse(metaJson);

  // Verify checksum on the binary DB portion
  const actual = crypto.createHash("sha256").update(dbBuffer).digest("hex");
  if (actual !== meta.checksum) throw new Error("Checksum mismatch");

  // Verify SQLite integrity
  const tempDb = new DatabaseSync(backupPath);
  const integrity = tempDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
  tempDb.close();
  if (integrity.integrity_check !== "ok") throw new Error("Corrupt database");

  return { schemaVersion: meta.schemaVersion };
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("Backup & Restore", () => {
  let db: DatabaseSync;
  let dbPath: string;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-test-"));
    dbPath = path.join(tmpDir, "test.db");
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password_hash TEXT, role TEXT, is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, buy_price INTEGER, sell_price INTEGER, stock INTEGER DEFAULT 0);
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP);
    `);
    db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(1);
    db.prepare("INSERT INTO products (name, buy_price, sell_price, stock) VALUES (?,?,?,?)").run("Test", 5000, 10000, 10);
  });

  afterEach(() => {
    try { db.close(); } catch { /* no-op */ }
    try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* no-op */ }
  });

  it("should create a valid backup with metadata", () => {
    const backupPath = path.join(tmpDir, "backup.db");
    const meta = makeBackup(db, dbPath, backupPath, "1.0.0");

    expect(fs.existsSync(backupPath)).toBe(true);
    expect(meta.schemaVersion).toBe(1);
    expect(meta.checksum).toHaveLength(64); // SHA-256 hex
  });

  it("should validate a legitimate backup", () => {
    const backupPath = path.join(tmpDir, "backup.db");
    makeBackup(db, dbPath, backupPath, "1.0.0");

    const result = validateAndStripBackup(backupPath);
    expect(result.schemaVersion).toBe(1);
  });

  it("should reject a file without backup metadata", () => {
    const notBackup = path.join(tmpDir, "not-backup.db");
    fs.writeFileSync(notBackup, "not a database");

    expect(() => validateAndStripBackup(notBackup)).toThrow("Not a valid backup");
  });

  it("should reject a backup with modified content", () => {
    const backupPath = path.join(tmpDir, "backup.db");
    makeBackup(db, dbPath, backupPath, "1.0.0");

    // Tamper with the file
    const content = fs.readFileSync(backupPath, "utf-8");
    fs.writeFileSync(backupPath, content.replace("10", "99"));

    expect(() => validateAndStripBackup(backupPath)).toThrow("Checksum mismatch");
  });

  it("should preserve data through backup/restore cycle", () => {
    // Create backup
    const backupPath = path.join(tmpDir, "backup.db");
    makeBackup(db, dbPath, backupPath, "1.0.0");

    // Verify backup
    validateAndStripBackup(backupPath);

    // "Restore" — replace DB with backup content (binary strip)
    const backupBuf = fs.readFileSync(backupPath);
    const marker = Buffer.from("--POS_EMPATI_BACKUP_META\n");
    const metaStart = backupBuf.lastIndexOf(marker);
    const dbContent = metaStart !== -1 ? backupBuf.subarray(0, metaStart) : backupBuf;

    db.close();
    fs.writeFileSync(dbPath, dbContent);

    // Reopen and verify
    const restored = new DatabaseSync(dbPath);
    restored.exec("PRAGMA foreign_keys = ON");

    const products = restored.prepare("SELECT * FROM products").all() as Array<{ name: string; stock: number }>;
    expect(products.length).toBe(1);
    expect(products[0].name).toBe("Test");
    expect(products[0].stock).toBe(10);

    restored.close();
  });

  it("should handle empty database backup", () => {
    // Create empty DB
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "pos-empty-"));
    const emptyPath = path.join(emptyDir, "empty.db");
    const emptyDb = new DatabaseSync(emptyPath);
    emptyDb.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER)");

    const backupPath = path.join(tmpDir, "empty-backup.db");
    makeBackup(emptyDb, emptyPath, backupPath, "1.0.0");

    emptyDb.close();
    expect(fs.existsSync(backupPath)).toBe(true);

    const result = validateAndStripBackup(backupPath);
    expect(result.schemaVersion).toBeDefined();

    try { fs.rmSync(emptyDir, { recursive: true }); } catch { /* no-op */ }
  });

  it("should include correct schema version in metadata", () => {
    const backupPath = path.join(tmpDir, "backup.db");
    const meta = makeBackup(db, dbPath, backupPath, "2.0.0");

    expect(meta.schemaVersion).toBe(1);
    expect(meta.appVersion).toBe("2.0.0");
  });
});
