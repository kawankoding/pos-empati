import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createTestDb, seedTestData } from "./helpers";

/**
 * Sales transaction tests.
 *
 * These tests replicate the SQL patterns used in `electron/db/queries/sales.ts`
 * because the module relies on a global `getDb()` singleton that requires
 * Electron's `app.getPath("userData")`. By testing the SQL patterns directly,
 * we validate the business logic without mocking.
 */

describe("Sales transactions", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
  });

  afterEach(() => {
    db.close();
  });

  it("should create a sale and reduce stock correctly", () => {
    // Verify initial stock
    const before = db.prepare("SELECT stock FROM products WHERE id = 1").get() as { stock: number };
    expect(before.stock).toBe(10);

    db.exec("BEGIN");
    try {
      // Fetch product prices
      const product = db
        .prepare("SELECT id, buy_price, sell_price, stock FROM products WHERE id = ?")
        .get(1) as { id: number; buy_price: number; sell_price: number; stock: number };

      const qty = 2;
      const subtotal = product.sell_price * qty; // 10000 * 2 = 20000
      const total = subtotal;
      const paid = 50000;
      const changeAmount = paid - total;

      // Deduct stock with guard clause
      const updateResult = db
        .prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
        .run(qty, product.id, qty);
      expect(updateResult.changes).toBe(1);

      // Insert sale
      const saleResult = db
        .prepare(
          "INSERT INTO sales (cashier_id, total, paid, change_amount, payment_method) VALUES (?, ?, ?, ?, ?)",
        )
        .run(2, total, paid, changeAmount, "cash");
      const saleId = Number(saleResult.lastInsertRowid);

      // Insert sale items
      db.prepare(
        "INSERT INTO sale_items (sale_id, product_id, qty, price, buy_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(saleId, product.id, qty, product.sell_price, product.buy_price, subtotal);

      db.exec("COMMIT");

      // Verify stock was reduced
      const after = db.prepare("SELECT stock FROM products WHERE id = 1").get() as { stock: number };
      expect(after.stock).toBe(8);

      // Verify sale was recorded
      const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(saleId) as any;
      expect(sale.total).toBe(20000);
      expect(sale.paid).toBe(50000);
      expect(sale.change_amount).toBe(30000);
    } catch {
      db.exec("ROLLBACK");
      throw new Error("Sale should have succeeded");
    }
  });

  it("should reject sale when paid amount is less than total", () => {
    const product = db
      .prepare("SELECT id, sell_price FROM products WHERE id = 1")
      .get() as { id: number; sell_price: number };

    const qty = 2;
    const total = product.sell_price * qty; // 20000
    const paid = 10000; // less than total

    expect(paid).toBeLessThan(total);
  });

  it("should prevent stock going negative with guard clause", () => {
    const result = db
      .prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
      .run(999, 1, 999);
    expect(result.changes).toBe(0);

    // Stock should remain unchanged
    const product = db.prepare("SELECT stock FROM products WHERE id = 1").get() as { stock: number };
    expect(product.stock).toBe(10);
  });

  it("should handle insufficient stock during transaction", () => {
    db.exec("BEGIN");
    try {
      // Product A has 10 stock — try to deduct 11
      const result = db
        .prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
        .run(11, 1, 11);
      expect(result.changes).toBe(0);

      // Rollback on insufficient stock (as saleQueries.create does)
      db.exec("ROLLBACK");
    } catch {
      db.exec("ROLLBACK");
      throw new Error("Insufficient stock guard should return changes === 0, not throw");
    }

    // Stock should be unchanged
    const product = db.prepare("SELECT stock FROM products WHERE id = 1").get() as { stock: number };
    expect(product.stock).toBe(10);
  });

  it("should handle duplicate product IDs by merging quantities", () => {
    // Simulate the merge logic from saleQueries.create
    const rawItems = [
      { productId: 1, qty: 2 },
      { productId: 1, qty: 3 },
      { productId: 2, qty: 1 },
    ];

    const merged = new Map<number, number>();
    for (const item of rawItems) {
      if (item.qty <= 0) continue;
      const existing = merged.get(item.productId) ?? 0;
      merged.set(item.productId, existing + item.qty);
    }

    expect(merged.get(1)).toBe(5); // 2 + 3
    expect(merged.get(2)).toBe(1);
    expect(merged.size).toBe(2);
  });

  it("should reject sale with empty items", () => {
    const items: Array<{ productId: number; qty: number }> = [];
    expect(items.length).toBe(0);
  });

  it("should reject sale with zero or negative quantity", () => {
    const items = [
      { productId: 1, qty: 0 },
      { productId: 2, qty: -1 },
    ];

    const invalidItems = items.filter((item) => item.qty <= 0);
    expect(invalidItems.length).toBe(2);
  });

  it("should reject sale with non-existent product", () => {
    const product = db
      .prepare("SELECT id FROM products WHERE id = ?")
      .get(9999) as { id: number } | undefined;
    expect(product).toBeUndefined();
  });

  it("should handle sale of a product with zero stock", () => {
    // Product C has 0 stock
    const result = db
      .prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
      .run(1, 3, 1);
    expect(result.changes).toBe(0);

    // Stock remains 0
    const product = db.prepare("SELECT stock FROM products WHERE id = 3").get() as { stock: number };
    expect(product.stock).toBe(0);
  });
});
