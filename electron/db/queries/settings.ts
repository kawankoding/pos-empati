import { getDb } from "../index";

export type SettingsMap = Record<string, string>;

const ALLOWED_KEYS = new Set([
  "store_name",
  "store_address",
  "contact_email",
  "phone_number",
  "currency",
  "timezone",
  "language",
  "sound_notifications",
  "auto_print_receipts",
]);

const VALID_CURRENCIES = new Set(["IDR", "USD", "SGD"]);
const VALID_TIMEZONES = new Set(["WIB", "WITA", "WIT"]);
const VALID_LANGUAGES = new Set(["id", "en"]);
const VALID_BOOLEANS = new Set(["true", "false"]);

function isValidValue(key: string, value: string): boolean {
  switch (key) {
    case "currency":
      return VALID_CURRENCIES.has(value);
    case "timezone":
      return VALID_TIMEZONES.has(value);
    case "language":
      return VALID_LANGUAGES.has(value);
    case "sound_notifications":
    case "auto_print_receipts":
      return VALID_BOOLEANS.has(value);
    default:
      return true; // free-text fields
  }
}

export function validateSettings(entries: Record<string, string>): void {
  for (const [key, value] of Object.entries(entries)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Invalid setting key: "${key}"`);
    }
    if (!isValidValue(key, value)) {
      throw new Error(`Invalid value "${value}" for setting "${key}"`);
    }
  }
}

export const settingsQueries = {
  /** Get all settings as a key-value map */
  getAll(): SettingsMap {
    const db = getDb();
    const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{
      key: string;
      value: string;
    }>;
    const map: SettingsMap = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  },

  /** Get a single setting by key, returns null if not found */
  get(key: string): string | null {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
      { value: string } | undefined;
    return row?.value ?? null;
  },

  /** Upsert a single setting */
  set(key: string, value: string): void {
    validateSettings({ [key]: value });
    const db = getDb();
    db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(key, value);
  },

  /** Upsert multiple settings at once, wrapped in a transaction */
  setMany(entries: Record<string, string>): void {
    validateSettings(entries);
    const db = getDb();
    db.exec("BEGIN");
    try {
      const stmt = db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      );
      for (const [key, value] of Object.entries(entries)) {
        stmt.run(key, value);
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  },
};
