import type { DatabaseSync } from "node:sqlite";

export const migration003 = {
  version: 3,
  name: "Convert REAL money columns to INTEGER (whole rupiah)",
  up(db: DatabaseSync): void {
    // Drop child tables BEFORE parent tables to avoid FK constraint issues
    // even though foreign_keys are OFF — some SQLite builds check DROP TABLE FKs
    db.exec("PRAGMA foreign_keys = OFF");

    try {
      // Drop in child-first order
      dropRecreateEmpty(
        db,
        "sale_items",
        `
        CREATE TABLE sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          qty INTEGER NOT NULL CHECK(qty > 0),
          price INTEGER NOT NULL CHECK(price >= 0),
          subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
          buy_price INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `,
      );

      dropRecreateEmpty(
        db,
        "sales",
        `
        CREATE TABLE sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cashier_id INTEGER NOT NULL,
          total INTEGER NOT NULL CHECK(total >= 0),
          paid INTEGER NOT NULL CHECK(paid >= 0),
          change_amount INTEGER NOT NULL,
          payment_method TEXT NOT NULL DEFAULT 'cash',
          status TEXT NOT NULL DEFAULT 'completed',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cashier_id) REFERENCES users(id)
        )
      `,
      );

      dropRecreateEmpty(
        db,
        "products",
        `
        CREATE TABLE products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER,
          name TEXT NOT NULL,
          sku TEXT UNIQUE,
          image TEXT,
          buy_price INTEGER NOT NULL DEFAULT 0 CHECK(buy_price >= 0),
          sell_price INTEGER NOT NULL DEFAULT 0 CHECK(sell_price >= 0),
          stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
        )
      `,
      );
    } finally {
      db.exec("PRAGMA foreign_keys = ON");
    }
  },
};

function dropRecreateEmpty(db: DatabaseSync, tableName: string, createSql: string): void {
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${tableName}`).get() as { cnt: number };
  if (row.cnt > 0) {
    convertTable(db, tableName, createSql);
  } else {
    db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    db.exec(createSql);
  }
}

function convertTable(db: DatabaseSync, tableName: string, createSql: string): void {
  // Build column list and conversion expressions for the INSERT SELECT
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
    type: string;
  }>;

  const colNames = cols.map((c) => c.name);
  const selectExprs = colNames.map((col) => {
    // Convert known REAL columns to INTEGER via CAST(ROUND(...))
    if (
      [
        "buy_price",
        "sell_price",
        "total",
        "paid",
        "change_amount",
        "price",
        "subtotal",
        "stock",
        "qty",
      ].includes(col)
    ) {
      return `CAST(ROUND(COALESCE(${col}, 0)) AS INTEGER)`;
    }
    return col;
  });

  db.exec(`CREATE TABLE ${tableName}_new (${extractColumns(createSql)})`);
  db.exec(
    `INSERT INTO ${tableName}_new (${colNames.join(", ")})
     SELECT ${selectExprs.join(", ")} FROM ${tableName}`,
  );
  db.exec(`DROP TABLE ${tableName}`);
  db.exec(`ALTER TABLE ${tableName}_new RENAME TO ${tableName}`);
}

function extractColumns(sql: string): string {
  // Extract the column definitions between the first ( and the last )
  const start = sql.indexOf("(");
  const end = sql.lastIndexOf(")");
  return sql.slice(start + 1, end).trim();
}
