import { getDb } from "../index";

export type SaleRecord = {
  id: number;
  cashier_id: number;
  cashier_name: string;
  total: number;
  paid: number;
  change_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
};

export type SaleItemRecord = {
  id: number;
  product_name: string;
  qty: number;
  price: number;
  subtotal: number;
};

export type SaleDetail = SaleRecord & {
  items: SaleItemRecord[];
};

export const saleQueries = {
  listAll(): SaleRecord[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT s.id, s.cashier_id, COALESCE(NULLIF(u.name, ''), u.username) AS cashier_name,
                s.total, s.paid, s.change_amount, s.payment_method, s.status, s.created_at
         FROM sales s
         LEFT JOIN users u ON s.cashier_id = u.id
         ORDER BY s.created_at DESC`,
      )
      .all() as SaleRecord[];
  },

  create(payload: {
    cashierId: number;
    paid: number;
    paymentMethod?: string;
    items: Array<{ productId: number; qty: number }>;
  }) {
    const db = getDb();

    // Normalize duplicate product IDs: combine quantities for same productId
    const merged = new Map<number, number>();
    for (const item of payload.items) {
      if (item.qty <= 0) {
        return { ok: false as const, message: "Quantity must be greater than zero." };
      }
      const existing = merged.get(item.productId) ?? 0;
      merged.set(item.productId, existing + item.qty);
    }

    const normalizedItems = Array.from(merged.entries()).map(([productId, qty]) => ({
      productId,
      qty,
    }));

    if (!normalizedItems.length) {
      return { ok: false as const, message: "Sale must have at least one item." };
    }

    // Validate products exist before entering the transaction
    for (const item of normalizedItems) {
      const product = db
        .prepare("SELECT id, buy_price, sell_price, stock FROM products WHERE id = ?")
        .get(item.productId) as
        { id: number; buy_price: number; sell_price: number; stock: number } | undefined;

      if (!product) {
        return { ok: false as const, message: `Product with id ${item.productId} not found.` };
      }
    }

    // Begin transaction BEFORE processing line items and stock updates
    db.exec("BEGIN");

    try {
      let total = 0;
      const lineItems: Array<{
        productId: number;
        qty: number;
        price: number;
        buyPrice: number;
        subtotal: number;
      }> = [];

      // Read product prices inside the transaction
      for (const item of normalizedItems) {
        const product = db
          .prepare("SELECT id, buy_price, sell_price, stock FROM products WHERE id = ?")
          .get(item.productId) as
          { id: number; buy_price: number; sell_price: number; stock: number } | undefined;

        // Should not happen since we validated above, but guard defensively
        if (!product) {
          throw new Error(`Product with id ${item.productId} not found.`);
        }

        const subtotal = product.sell_price * item.qty;
        total += subtotal;
        lineItems.push({
          productId: item.productId,
          qty: item.qty,
          price: product.sell_price,
          buyPrice: product.buy_price,
          subtotal,
        });
      }

      if (payload.paid < total) {
        throw new Error("Paid amount is less than total.");
      }

      // Deduct stock with guard clause inside transaction
      const updateStock = db.prepare(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
      );
      for (const item of lineItems) {
        const result = updateStock.run(item.qty, item.productId, item.qty);
        if (result.changes !== 1) {
          throw new Error(`Insufficient stock for product id ${item.productId}.`);
        }
      }

      const changeAmount = payload.paid - total;
      const paymentMethod = payload.paymentMethod || "cash";

      const saleResult = db
        .prepare(
          "INSERT INTO sales (cashier_id, total, paid, change_amount, payment_method) VALUES (?, ?, ?, ?, ?)",
        )
        .run(payload.cashierId, total, payload.paid, changeAmount, paymentMethod);
      const saleId = Number(saleResult.lastInsertRowid);

      const insertItem = db.prepare(
        "INSERT INTO sale_items (sale_id, product_id, qty, price, buy_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
      );

      for (const item of lineItems) {
        insertItem.run(saleId, item.productId, item.qty, item.price, item.buyPrice, item.subtotal);
      }

      db.exec("COMMIT");
      return { ok: true as const, saleId, total, changeAmount };
    } catch (e: unknown) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* no-op */
      }
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Failed to create sale.",
      };
    }
  },

  getById(id: number): SaleDetail | null {
    const db = getDb();
    const sale = db
      .prepare(
        `SELECT s.id, s.cashier_id, COALESCE(NULLIF(u.name, ''), u.username) AS cashier_name,
                s.total, s.paid, s.change_amount, s.payment_method, s.status, s.created_at
         FROM sales s
         LEFT JOIN users u ON s.cashier_id = u.id
         WHERE s.id = ?`,
      )
      .get(id) as SaleRecord | undefined;

    if (!sale) return null;

    const items = db
      .prepare(
        `SELECT si.id, p.name AS product_name, si.qty, si.price, si.subtotal
         FROM sale_items si
         LEFT JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
      )
      .all(id) as SaleItemRecord[];

    return { ...sale, items };
  },
};
