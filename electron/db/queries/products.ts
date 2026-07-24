import { getDb } from "../index";

export type ProductRow = {
  id: number;
  name: string;
  sku: string | null;
  image: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
  category_id: number | null;
  category_name: string | null;
};

export const productQueries = {
  listAll(): ProductRow[] {
    return getDb()
      .prepare(
        `SELECT p.id, p.name, p.sku, p.image, p.buy_price, p.sell_price, p.stock,
                p.category_id, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         ORDER BY p.name`,
      )
      .all() as ProductRow[];
  },

  create(payload: {
    categoryId: number | null;
    name: string;
    sku: string | null;
    image?: string | null;
    buyPrice: number;
    sellPrice: number;
    stock: number;
  }) {
    const db = getDb();
    try {
      const result = db
        .prepare(
          `INSERT INTO products (category_id, name, sku, image, buy_price, sell_price, stock)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          payload.categoryId,
          payload.name,
          payload.sku ?? null,
          payload.image ?? null,
          payload.buyPrice,
          payload.sellPrice,
          payload.stock,
        );
      return { ok: true as const, id: Number(result.lastInsertRowid) };
    } catch (e: unknown) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Failed to create product.",
      };
    }
  },

  update(
    id: number,
    payload: {
      categoryId: number | null;
      name: string;
      sku: string | null;
      image?: string | null;
      buyPrice: number;
      sellPrice: number;
      stock: number;
    },
  ) {
    const db = getDb();
    const result = db
      .prepare(
        `UPDATE products
         SET category_id = ?, name = ?, sku = ?, image = ?, buy_price = ?, sell_price = ?, stock = ?
         WHERE id = ?`,
      )
      .run(
        payload.categoryId,
        payload.name,
        payload.sku ?? null,
        payload.image ?? null,
        payload.buyPrice,
        payload.sellPrice,
        payload.stock,
        id,
      );
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Product not found." };
  },

  remove(id: number) {
    const db = getDb();
    const result = db.prepare("DELETE FROM products WHERE id = ?").run(id);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Product not found." };
  },
};
