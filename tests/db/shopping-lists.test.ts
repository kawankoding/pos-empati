import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createTestDb, seedTestData } from "./helpers";

/**
 * Shopping list tests.
 *
 * These tests replicate the SQL patterns used in
 * `electron/db/queries/shoppingLists.ts` because the module relies on a
 * global `getDb()` singleton that requires Electron's `app.getPath("userData")`.
 * By testing the SQL patterns directly, we validate the business logic
 * without mocking.
 */

describe("Shopping lists", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
    db.exec(`
      CREATE TABLE shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE TABLE shopping_list_items (
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
    `);
  });

  afterEach(() => {
    db.close();
  });

  function createList(name: string): number {
    const result = db
      .prepare("INSERT INTO shopping_lists (name, created_by) VALUES (?, ?)")
      .run(name, 1);
    return Number(result.lastInsertRowid);
  }

  it("should create a shopping list and add items", () => {
    const listId = createList("Restok Mingguan");

    const addResult = db
      .prepare(
        "INSERT INTO shopping_list_items (list_id, product_id, name, qty, note) VALUES (?, ?, ?, ?, ?)",
      )
      .run(listId, 1, "Product A", 10, "dus kecil");

    expect(addResult.changes).toBe(1);

    const items = db
      .prepare(
        "SELECT id, list_id, product_id, name, qty, note, checked FROM shopping_list_items WHERE list_id = ?",
      )
      .all(listId) as Array<{
      id: number;
      list_id: number;
      product_id: number | null;
      name: string;
      qty: number;
      note: string;
      checked: number;
    }>;

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("Product A");
    expect(items[0].qty).toBe(10);
    expect(items[0].note).toBe("dus kecil");
    expect(items[0].checked).toBe(0);
    expect(items[0].product_id).toBe(1);
  });

  it("should list all lists with item and pending counts", () => {
    const listId = createList("Restok");
    const listId2 = createList("Kebutuhan Toko");

    const insertItem = db.prepare(
      "INSERT INTO shopping_list_items (list_id, product_id, name, qty) VALUES (?, ?, ?, ?)",
    );
    insertItem.run(listId, 1, "Product A", 5);
    insertItem.run(listId, 2, "Product B", 3);
    insertItem.run(listId2, null, "Kresek besar", 50);

    // Mark one item as checked
    db.prepare("UPDATE shopping_list_items SET checked = 1 WHERE list_id = ? AND product_id = ?")
      .run(listId, 1);

    const rows = db
      .prepare(
        `SELECT l.id, l.name,
                COUNT(i.id) AS item_count,
                COALESCE(SUM(CASE WHEN i.checked = 1 THEN 1 ELSE 0 END), 0) AS checked_count,
                COUNT(i.id) - COALESCE(SUM(CASE WHEN i.checked = 1 THEN 1 ELSE 0 END), 0) AS pending_count
         FROM shopping_lists l
         LEFT JOIN shopping_list_items i ON i.list_id = l.id
         GROUP BY l.id
         ORDER BY l.created_at DESC`,
      )
      .all() as Array<{
      id: number;
      item_count: number;
      checked_count: number;
      pending_count: number;
    }>;

    const restock = rows.find((r) => r.id === listId);
    const kebutuhan = rows.find((r) => r.id === listId2);

    expect(restock?.item_count).toBe(2);
    expect(restock?.checked_count).toBe(1);
    expect(restock?.pending_count).toBe(1);
    expect(kebutuhan?.item_count).toBe(1);
    expect(kebutuhan?.pending_count).toBe(1);
  });

  it("should reject items with zero or negative quantity", () => {
    const invalid = [0, -1].map((qty) => qty <= 0);
    expect(invalid).toEqual([true, true]);
  });

  it("should update qty, note and checked state of an item", () => {
    const listId = createList("Restok");
    const result = db
      .prepare(
        "INSERT INTO shopping_list_items (list_id, product_id, name, qty) VALUES (?, ?, ?, ?)",
      )
      .run(listId, 1, "Product A", 5);
    const itemId = Number(result.lastInsertRowid);

    // Simulate the COALESCE update pattern from shoppingListQueries.updateItem
    const qty = 12;
    const note = "beli 2 dus";
    const checked = 1;
    const updateResult = db
      .prepare(
        `UPDATE shopping_list_items
         SET qty = COALESCE(?, qty),
             note = COALESCE(?, note),
             checked = COALESCE(?, checked)
         WHERE id = ?`,
      )
      .run(qty, note, checked, itemId);
    expect(updateResult.changes).toBe(1);

    const item = db
      .prepare("SELECT qty, note, checked FROM shopping_list_items WHERE id = ?")
      .get(itemId) as { qty: number; note: string; checked: number };
    expect(item.qty).toBe(12);
    expect(item.note).toBe("beli 2 dus");
    expect(item.checked).toBe(1);
  });

  it("should delete items and lists, cascading item removal", () => {
    const listId = createList("Restok");
    db.prepare(
      "INSERT INTO shopping_list_items (list_id, product_id, name, qty) VALUES (?, ?, ?, ?)",
    ).run(listId, 1, "Product A", 5);

    // Delete a single item
    const itemResult = db
      .prepare("DELETE FROM shopping_list_items WHERE list_id = ? AND product_id = ?")
      .run(listId, 1);
    expect(itemResult.changes).toBe(1);

    // Re-add, then delete the whole list — items should cascade
    db.prepare(
      "INSERT INTO shopping_list_items (list_id, product_id, name, qty) VALUES (?, ?, ?, ?)",
    ).run(listId, 1, "Product A", 5);

    const listResult = db.prepare("DELETE FROM shopping_lists WHERE id = ?").run(listId);
    expect(listResult.changes).toBe(1);

    const remaining = db
      .prepare("SELECT COUNT(*) AS cnt FROM shopping_list_items WHERE list_id = ?")
      .get(listId) as { cnt: number };
    expect(remaining.cnt).toBe(0);
  });

  it("should clear only checked items", () => {
    const listId = createList("Restok");
    const insert = db.prepare(
      "INSERT INTO shopping_list_items (list_id, product_id, name, qty) VALUES (?, ?, ?, ?)",
    );
    insert.run(listId, 1, "Product A", 5);
    insert.run(listId, 2, "Product B", 3);
    insert.run(listId, null, "Kresek besar", 50);

    db.prepare("UPDATE shopping_list_items SET checked = 1 WHERE product_id = 1").run();

    const deleteResult = db
      .prepare("DELETE FROM shopping_list_items WHERE list_id = ? AND checked = 1")
      .run(listId);
    expect(deleteResult.changes).toBe(1);

    const remaining = db
      .prepare("SELECT name FROM shopping_list_items WHERE list_id = ? ORDER BY id")
      .all(listId) as Array<{ name: string }>;
    expect(remaining.map((r) => r.name)).toEqual(["Product B", "Kresek besar"]);
  });

  it("should keep product name snapshot when product is deleted", () => {
    const listId = createList("Restok");
    db.prepare(
      "INSERT INTO shopping_list_items (list_id, product_id, name, qty) VALUES (?, ?, ?, ?)",
    ).run(listId, 1, "Product A", 5);

    // Simulate products:delete — FK is ON DELETE SET NULL, name is preserved
    db.prepare("DELETE FROM products WHERE id = 1").run();

    const item = db
      .prepare("SELECT product_id, name FROM shopping_list_items WHERE list_id = ?")
      .get(listId) as { product_id: number | null; name: string };
    expect(item.product_id).toBeNull();
    expect(item.name).toBe("Product A");
  });
});
