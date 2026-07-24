import type { DatabaseSync } from "node:sqlite";

export const migration002 = {
  version: 2,
  name: "Add legacy columns (buy_price, image, name, payment_method, status)",
  up(db: DatabaseSync): void {
    // Helper: add column if it doesn't already exist
    const addColumnIfMissing = (table: string, column: string, definition: string) => {
      const cols = new Set(
        (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
          (c) => c.name,
        ),
      );
      if (!cols.has(column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      }
    };

    addColumnIfMissing("products", "buy_price", "REAL NOT NULL DEFAULT 0 CHECK(buy_price >= 0)");
    addColumnIfMissing("sale_items", "buy_price", "REAL DEFAULT 0");
    addColumnIfMissing("categories", "image", "TEXT");
    addColumnIfMissing("products", "image", "TEXT");
    addColumnIfMissing("users", "name", "TEXT NOT NULL DEFAULT ''");
    addColumnIfMissing("sales", "payment_method", "TEXT NOT NULL DEFAULT 'cash'");
    addColumnIfMissing("sales", "status", "TEXT NOT NULL DEFAULT 'completed'");
  },
};
