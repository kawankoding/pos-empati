import type { DatabaseSync } from "node:sqlite";
import { migration001 } from "./migrations/001_initial";
import { migration002 } from "./migrations/002_legacy_columns";
import { migration003 } from "./migrations/003_integer_money";
import { migration004 } from "./migrations/004_indexes";

/* ------------------------------------------------------------------ */
/*  Migration definitions (immutable — never modify existing entries)  */
/* ------------------------------------------------------------------ */

const migrations = [migration001, migration002, migration003, migration004] as const;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function runMigrations(db: DatabaseSync): void {
  // Ensure the version-tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Read the highest applied version
  const row = db.prepare("SELECT MAX(version) AS version FROM schema_version").get() as {
    version: number | null;
  };
  const currentVersion = row.version ?? 0;

  const maxVersion = migrations[migrations.length - 1].version;

  // Refuse to run if the database was created by a newer version of the app
  if (currentVersion > maxVersion) {
    throw new Error(
      `Database version ${currentVersion} is newer than this app supports (max ${maxVersion}). ` +
        `Please update the application.`,
    );
  }

  // Apply every pending migration inside its own transaction
  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;

    try {
      db.exec("BEGIN");
      migration.up(db);
      db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(migration.version);
      db.exec("COMMIT");
      console.log(`[migration] Applied v${migration.version}: ${migration.name}`);
    } catch (e) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* best-effort rollback */
      }
      throw new Error(
        `Migration v${migration.version} (${migration.name}) failed: ` +
          `${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
