import { DatabaseSync } from "node:sqlite";

export function createTestDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','cashier')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      image TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
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
    );
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
    );
    CREATE TABLE sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL CHECK(qty > 0),
      price INTEGER NOT NULL CHECK(price >= 0),
      buy_price INTEGER DEFAULT 0,
      subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

export function seedTestData(db: DatabaseSync): void {
  db.prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)")
    .run("admin", "Admin", "$2a$10$testhash", "admin");
  db.prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)")
    .run("cashier", "Cashier", "$2a$10$testhash", "cashier");
  db.prepare("INSERT INTO products (name, buy_price, sell_price, stock) VALUES (?,?,?,?)")
    .run("Product A", 5000, 10000, 10);
  db.prepare("INSERT INTO products (name, buy_price, sell_price, stock) VALUES (?,?,?,?)")
    .run("Product B", 3000, 7000, 5);
  db.prepare("INSERT INTO products (name, buy_price, sell_price, stock) VALUES (?,?,?,?)")
    .run("Product C", 1000, 2000, 0);
}
