import { getDb } from "../index";

export type ShoppingListRow = {
  id: number;
  name: string;
  created_by: number | null;
  created_at: string;
  item_count: number;
  checked_count: number;
  pending_count: number;
};

export type ShoppingListItemRow = {
  id: number;
  list_id: number;
  product_id: number | null;
  name: string;
  qty: number;
  note: string;
  checked: number;
  created_at: string;
};

export type ShoppingListDetail = ShoppingListRow & {
  items: ShoppingListItemRow[];
};

function withCounts(list: {
  id: number;
  name: string;
  created_by: number | null;
  created_at: string;
  items: ShoppingListItemRow[];
}): ShoppingListDetail {
  const checkedCount = list.items.filter((i) => i.checked === 1).length;
  return {
    ...list,
    item_count: list.items.length,
    checked_count: checkedCount,
    pending_count: list.items.length - checkedCount,
  };
}

export const shoppingListQueries = {
  listAll(): ShoppingListRow[] {
    const db = getDb();
    return db
      .prepare(
        `SELECT l.id, l.name, l.created_by, l.created_at,
                COUNT(i.id) AS item_count,
                COALESCE(SUM(CASE WHEN i.checked = 1 THEN 1 ELSE 0 END), 0) AS checked_count,
                COUNT(i.id) - COALESCE(SUM(CASE WHEN i.checked = 1 THEN 1 ELSE 0 END), 0) AS pending_count
         FROM shopping_lists l
         LEFT JOIN shopping_list_items i ON i.list_id = l.id
         GROUP BY l.id
         ORDER BY l.created_at DESC`,
      )
      .all() as ShoppingListRow[];
  },

  getById(id: number): ShoppingListDetail | null {
    const db = getDb();
    const list = db
      .prepare("SELECT id, name, created_by, created_at FROM shopping_lists WHERE id = ?")
      .get(id) as { id: number; name: string; created_by: number | null; created_at: string } | undefined;

    if (!list) return null;

    const items = db
      .prepare(
        `SELECT id, list_id, product_id, name, qty, note, checked, created_at
         FROM shopping_list_items
         WHERE list_id = ?
         ORDER BY checked ASC, created_at ASC`,
      )
      .all(id) as ShoppingListItemRow[];

    return withCounts({ ...list, items });
  },

  create(payload: { name: string; createdBy: number | null }) {
    const db = getDb();
    try {
      const result = db
        .prepare("INSERT INTO shopping_lists (name, created_by) VALUES (?, ?)")
        .run(payload.name.trim(), payload.createdBy);
      return { ok: true as const, id: Number(result.lastInsertRowid) };
    } catch (e: unknown) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Failed to create shopping list.",
      };
    }
  },

  updateName(id: number, name: string) {
    const db = getDb();
    const result = db
      .prepare("UPDATE shopping_lists SET name = ? WHERE id = ?")
      .run(name.trim(), id);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Shopping list not found." };
  },

  remove(id: number) {
    const db = getDb();
    const result = db.prepare("DELETE FROM shopping_lists WHERE id = ?").run(id);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Shopping list not found." };
  },

  addItem(
    listId: number,
    payload: { productId: number | null; name: string; qty: number; note: string },
  ) {
    const db = getDb();
    const list = db.prepare("SELECT id FROM shopping_lists WHERE id = ?").get(listId);
    if (!list) return { ok: false as const, message: "Shopping list not found." };

    const result = db
      .prepare(
        "INSERT INTO shopping_list_items (list_id, product_id, name, qty, note) VALUES (?, ?, ?, ?, ?)",
      )
      .run(listId, payload.productId, payload.name.trim(), payload.qty, payload.note.trim());
    return { ok: true as const, id: Number(result.lastInsertRowid) };
  },

  updateItem(
    id: number,
    payload: { qty?: number; note?: string; checked?: number },
  ) {
    const db = getDb();
    const current = db
      .prepare("SELECT id FROM shopping_list_items WHERE id = ?")
      .get(id);
    if (!current) return { ok: false as const, message: "Item not found." };

    const qty = payload.qty ?? undefined;
    const note = payload.note ?? undefined;
    const checked = payload.checked ?? undefined;

    if (qty !== undefined && qty <= 0) {
      return { ok: false as const, message: "Quantity must be greater than zero." };
    }

    db.prepare(
      `UPDATE shopping_list_items
       SET qty = COALESCE(?, qty),
           note = COALESCE(?, note),
           checked = COALESCE(?, checked)
       WHERE id = ?`,
    ).run(qty ?? null, note ?? null, checked ?? null, id);
    return { ok: true as const };
  },

  removeItem(id: number) {
    const db = getDb();
    const result = db.prepare("DELETE FROM shopping_list_items WHERE id = ?").run(id);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Item not found." };
  },

  clearChecked(listId: number) {
    const db = getDb();
    db.prepare("DELETE FROM shopping_list_items WHERE list_id = ? AND checked = 1").run(listId);
    return { ok: true as const };
  },
};
