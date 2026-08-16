import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "../../electron/db/migrate";
import { migration001 } from "../../electron/db/migrations/001_initial";
import { migration002 } from "../../electron/db/migrations/002_legacy_columns";

/**
 * Migration tests.
 *
 * Tests that the migration system works correctly:
 * - Fresh database applies all migrations
 * - schema_version table records all versions
 * - Migrations are idempotent (re-running doesn't fail)
 * - Database version is checked
 */

describe("Migrations", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON");
  });

  afterEach(() => {
    db.close();
  });

  it("should apply all migrations on a fresh database", () => {
    runMigrations(db);

    // Verify all expected tables exist after migrations
    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map((r) => r.name);

    expect(tables).toContain("users");
    expect(tables).toContain("categories");
    expect(tables).toContain("products");
    expect(tables).toContain("sales");
    expect(tables).toContain("sale_items");
    expect(tables).toContain("settings");
    expect(tables).toContain("schema_version");
  });

  it("should record all migration versions in schema_version", () => {
    runMigrations(db);

    const versions = (
      db.prepare("SELECT version FROM schema_version ORDER BY version").all() as Array<{
        version: number;
      }>
    ).map((r) => r.version);

    // Should have versions 1 through 5
    expect(versions).toEqual([1, 2, 3, 4, 5]);
  });

  it("should be idempotent — re-running migrations should not fail", () => {
    // First run
    runMigrations(db);

    // Second run — should not throw
    expect(() => runMigrations(db)).not.toThrow();

    // schema_version should still have only 5 unique rows
    const count = db.prepare("SELECT COUNT(*) as cnt FROM schema_version").get() as { cnt: number };
    expect(count.cnt).toBe(5);
  });

  it("should create tables with correct column types after migrations", () => {
    runMigrations(db);

    // Check products table has INTEGER money columns (migration 003)
    const productCols = db.prepare("PRAGMA table_info(products)").all() as Array<{
      name: string;
      type: string;
    }>;
    const buyPriceCol = productCols.find((c) => c.name === "buy_price");
    const sellPriceCol = productCols.find((c) => c.name === "sell_price");
    const stockCol = productCols.find((c) => c.name === "stock");

    expect(buyPriceCol?.type).toBe("INTEGER");
    expect(sellPriceCol?.type).toBe("INTEGER");
    expect(stockCol?.type).toBe("INTEGER");

    // Check sale_items has buy_price column (migration 002)
    const saleItemCols = db.prepare("PRAGMA table_info(sale_items)").all() as Array<{
      name: string;
      type: string;
    }>;
    const saleItemBuyPriceCol = saleItemCols.find((c) => c.name === "buy_price");
    expect(saleItemBuyPriceCol).toBeDefined();
    expect(saleItemBuyPriceCol?.type).toBe("INTEGER");

    // Check sales has payment_method and status columns (migration 002)
    const salesCols = db.prepare("PRAGMA table_info(sales)").all() as Array<{
      name: string;
      type: string;
    }>;
    expect(salesCols.some((c) => c.name === "payment_method")).toBe(true);
    expect(salesCols.some((c) => c.name === "status")).toBe(true);

    // Check products has image column (migration 002)
    expect(productCols.some((c) => c.name === "image")).toBe(true);
  });

  it("should create indexes after migration 004", () => {
    runMigrations(db);

    const indexes = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
        .all() as Array<{ name: string }>
    ).map((r) => r.name);

    expect(indexes).toContain("idx_products_category_id");
    expect(indexes).toContain("idx_sales_created_at");
    expect(indexes).toContain("idx_sales_cashier_id");
    expect(indexes).toContain("idx_sale_items_sale_id");
    expect(indexes).toContain("idx_sale_items_product_id");
  });

  it("should create shopping list tables after migration 005", () => {
    runMigrations(db);

    const tables = (
      db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as Array<{ name: string }>
    ).map((r) => r.name);

    expect(tables).toContain("shopping_lists");
    expect(tables).toContain("shopping_list_items");

    const indexes = (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
        .all() as Array<{ name: string }>
    ).map((r) => r.name);
    expect(indexes).toContain("idx_shopping_list_items_list_id");
  });

  it("should allow inserting data after migrations", () => {
    runMigrations(db);

    // Users
    db.prepare(
      "INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)",
    ).run("admin", "Admin", "$2a$10$hash", "admin");

    // Products
    db.prepare(
      "INSERT INTO products (name, buy_price, sell_price, stock) VALUES (?,?,?,?)",
    ).run("Test Product", 5000, 10000, 10);

    // Sales with all migrated columns
    db.prepare(
      "INSERT INTO sales (cashier_id, total, paid, change_amount, payment_method, status) VALUES (?,?,?,?,?,?)",
    ).run(1, 10000, 20000, 10000, "cash", "completed");

    const sale = db.prepare("SELECT * FROM sales WHERE id = 1").get() as any;
    expect(sale.total).toBe(10000);
    expect(sale.payment_method).toBe("cash");
    expect(sale.status).toBe("completed");
  });

  it("should throw if database version is newer than supported", () => {
    // Manually set version to 999
    db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)");
    db.prepare("INSERT INTO schema_version (version) VALUES (999)").run();

    expect(() => runMigrations(db)).toThrow(/Database version 999 is newer than this app supports/);
  });

  it("should not re-apply already applied migrations", () => {
    // Create a DB with migrations 1-2 already applied (schema + version records).
    // We apply the first two migrations, then re-run — migrations 3-4 should apply,
    // 1-2 should be skipped.
    db.exec("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)");

    migration001.up(db);
    db.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
    migration002.up(db);
    db.prepare("INSERT INTO schema_version (version) VALUES (2)").run();

    // Now re-run all migrations — only 3, 4 and 5 should be applied
    runMigrations(db);

    const versions = (
      db.prepare("SELECT version FROM schema_version ORDER BY version").all() as Array<{
        version: number;
      }>
    ).map((r) => r.version);
    expect(versions).toEqual([1, 2, 3, 4, 5]);
  });
});
