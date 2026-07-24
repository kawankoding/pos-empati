import type { DatabaseSync } from "node:sqlite";

export function seedInitialAdmin(_db: DatabaseSync): void {
  // Admin creation is now handled by the first-run setup flow.
  // This function intentionally left as a no-op.
}

export function seedSettings(db: DatabaseSync): void {
  const row = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };

  if (row.count === 0) {
    const defaults: Record<string, string> = {
      store_name: "Toko Empati",
      store_address: "Jl. Sudirman No. 123, Jakarta Selatan, Indonesia",
      contact_email: "contact@tokoempati.com",
      phone_number: "+62 21 555 0123",
      currency: "IDR",
      timezone: "WIB",
      language: "id",
      sound_notifications: "true",
      auto_print_receipts: "false",
    };

    db.exec("BEGIN");
    try {
      const stmt = db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      );
      for (const [key, value] of Object.entries(defaults)) {
        stmt.run(key, value);
      }
      db.exec("COMMIT");
      console.log("[seed] Default settings created");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
