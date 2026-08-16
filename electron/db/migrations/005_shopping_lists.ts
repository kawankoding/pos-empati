import type { DatabaseSync } from "node:sqlite";

export const migration005 = {
  version: 5,
  name: "Shopping lists",
  up(db: DatabaseSync): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS shopping_list_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id INTEGER NOT NULL,
        product_id INTEGER,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL DEFAULT 1 CHECK(qty > 0),
        note TEXT NOT NULL DEFAULT '',
        checked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list_id
        ON shopping_list_items(list_id);
    `);
  },
};
