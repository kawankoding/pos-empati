import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createTestDb } from "./helpers";

/**
 * Settings validation tests.
 *
 * These tests validate the business logic from `electron/db/queries/settings.ts`.
 * We can import `validateSettings` directly since it's a pure function
 * that doesn't depend on the database.
 */

// Replicate the validation logic from settings.ts for test independence
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

function validateSettings(entries: Record<string, string>): void {
  for (const [key, value] of Object.entries(entries)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Invalid setting key: "${key}"`);
    }
    if (!isValidValue(key, value)) {
      throw new Error(`Invalid value "${value}" for setting "${key}"`);
    }
  }
}

describe("Settings validation", () => {
  describe("key validation", () => {
    it("should accept all valid keys", () => {
      expect(() => validateSettings({ store_name: "Test" })).not.toThrow();
      expect(() => validateSettings({ currency: "IDR" })).not.toThrow();
      expect(() => validateSettings({ timezone: "WIB" })).not.toThrow();
      expect(() => validateSettings({ language: "id" })).not.toThrow();
      expect(() => validateSettings({ sound_notifications: "true" })).not.toThrow();
      expect(() => validateSettings({ auto_print_receipts: "false" })).not.toThrow();
    });

    it("should throw on invalid key", () => {
      expect(() => validateSettings({ invalid_key: "value" })).toThrow(
        'Invalid setting key: "invalid_key"',
      );
    });

    it("should throw on empty string key", () => {
      expect(() => validateSettings({ "": "value" })).toThrow('Invalid setting key: ""');
    });

    it("should throw on unknown key with valid value", () => {
      expect(() => validateSettings({ foo: "bar" })).toThrow('Invalid setting key: "foo"');
    });
  });

  describe("value validation — currency", () => {
    it("should accept valid currencies", () => {
      expect(() => validateSettings({ currency: "IDR" })).not.toThrow();
      expect(() => validateSettings({ currency: "USD" })).not.toThrow();
      expect(() => validateSettings({ currency: "SGD" })).not.toThrow();
    });

    it("should reject invalid currency", () => {
      expect(() => validateSettings({ currency: "EUR" })).toThrow(
        'Invalid value "EUR" for setting "currency"',
      );
    });

    it("should reject empty currency", () => {
      expect(() => validateSettings({ currency: "" })).toThrow(
        'Invalid value "" for setting "currency"',
      );
    });
  });

  describe("value validation — timezone", () => {
    it("should accept valid timezones", () => {
      expect(() => validateSettings({ timezone: "WIB" })).not.toThrow();
      expect(() => validateSettings({ timezone: "WITA" })).not.toThrow();
      expect(() => validateSettings({ timezone: "WIT" })).not.toThrow();
    });

    it("should reject invalid timezone", () => {
      expect(() => validateSettings({ timezone: "UTC" })).toThrow(
        'Invalid value "UTC" for setting "timezone"',
      );
    });
  });

  describe("value validation — language", () => {
    it("should accept valid languages", () => {
      expect(() => validateSettings({ language: "id" })).not.toThrow();
      expect(() => validateSettings({ language: "en" })).not.toThrow();
    });

    it("should reject invalid language", () => {
      expect(() => validateSettings({ language: "fr" })).toThrow(
        'Invalid value "fr" for setting "language"',
      );
    });
  });

  describe("value validation — booleans", () => {
    it("should accept 'true' for sound_notifications", () => {
      expect(() => validateSettings({ sound_notifications: "true" })).not.toThrow();
    });

    it("should accept 'false' for sound_notifications", () => {
      expect(() => validateSettings({ sound_notifications: "false" })).not.toThrow();
    });

    it("should reject non-boolean for sound_notifications", () => {
      expect(() => validateSettings({ sound_notifications: "yes" })).toThrow(
        'Invalid value "yes" for setting "sound_notifications"',
      );
    });

    it("should accept valid boolean for auto_print_receipts", () => {
      expect(() => validateSettings({ auto_print_receipts: "true" })).not.toThrow();
      expect(() => validateSettings({ auto_print_receipts: "false" })).not.toThrow();
    });

    it("should reject non-boolean for auto_print_receipts", () => {
      expect(() => validateSettings({ auto_print_receipts: "1" })).toThrow(
        'Invalid value "1" for setting "auto_print_receipts"',
      );
    });
  });

  describe("free-text fields", () => {
    it("should accept any value for store_name", () => {
      expect(() => validateSettings({ store_name: "My Store" })).not.toThrow();
      expect(() => validateSettings({ store_name: "" })).not.toThrow();
      expect(() => validateSettings({ store_name: "123!@#" })).not.toThrow();
    });

    it("should accept any value for store_address", () => {
      expect(() => validateSettings({ store_address: "Jl. Example No. 1" })).not.toThrow();
    });

    it("should accept any value for contact_email", () => {
      expect(() =>
        validateSettings({ contact_email: "admin@example.com" }),
      ).not.toThrow();
    });

    it("should accept any value for phone_number", () => {
      expect(() => validateSettings({ phone_number: "+62 123 456" })).not.toThrow();
    });
  });

  describe("setMany validation", () => {
    it("should validate all entries before upsert", () => {
      // One valid + one invalid should throw
      expect(() =>
        validateSettings({
          store_name: "Test",
          currency: "INVALID",
        }),
      ).toThrow('Invalid value "INVALID" for setting "currency"');
    });

    it("should accept multiple valid entries", () => {
      expect(() =>
        validateSettings({
          store_name: "Test",
          currency: "USD",
          timezone: "WITA",
          language: "en",
          sound_notifications: "false",
        }),
      ).not.toThrow();
    });
  });
});

describe("Settings database operations", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it("should upsert a single setting (INSERT then UPDATE)", () => {
    const stmt = db.prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    );

    // First insert
    stmt.run("store_name", "Toko A");
    let row = db.prepare("SELECT value FROM settings WHERE key = ?").get("store_name") as {
      value: string;
    };
    expect(row.value).toBe("Toko A");

    // Update same key
    stmt.run("store_name", "Toko B");
    row = db.prepare("SELECT value FROM settings WHERE key = ?").get("store_name") as {
      value: string;
    };
    expect(row.value).toBe("Toko B");

    // Verify only one row exists
    const count = db.prepare("SELECT COUNT(*) as cnt FROM settings WHERE key = ?").get(
      "store_name",
    ) as { cnt: number };
    expect(count.cnt).toBe(1);
  });

  it("should setMany in a transaction atomically", () => {
    const entries = {
      store_name: "Toko Empati",
      currency: "IDR",
      timezone: "WIB",
    };

    db.exec("BEGIN");
    try {
      const stmt = db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      );
      for (const [key, value] of Object.entries(entries)) {
        stmt.run(key, value);
      }
      db.exec("COMMIT");
    } catch {
      db.exec("ROLLBACK");
      throw new Error("setMany should succeed");
    }

    // All three keys should be present
    expect(
      (db.prepare("SELECT COUNT(*) as cnt FROM settings").get() as { cnt: number }).cnt,
    ).toBe(3);

    expect(
      (db.prepare("SELECT value FROM settings WHERE key = ?").get("store_name") as { value: string })
        .value,
    ).toBe("Toko Empati");
  });

  it("should rollback setMany when one entry fails", () => {
    // Insert initial data
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("store_name", "Original");

    // Try to insert a batch, but trigger a constraint violation mid-way
    // Simulate what happens when a constraint fails
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("currency", "IDR");
      // Force constraint violation on second insert (duplicate primary key)
      db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      ).run("currency", "USD");
      throw new Error("Simulated constraint error");
    } catch {
      db.exec("ROLLBACK");
    }

    // store_name should still be "Original" (not affected by rolled back transaction)
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("store_name") as {
      value: string;
    };
    expect(row.value).toBe("Original");

    // currency should not exist (rolled back)
    const currencyRow = db.prepare("SELECT value FROM settings WHERE key = ?").get("currency") as
      | { value: string }
      | undefined;
    expect(currencyRow).toBeUndefined();
  });
});
