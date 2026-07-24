import { getDb } from "../index";

export type CategoryRow = {
  id: number;
  name: string;
  image: string | null;
  created_at: string;
};

export const categoryQueries = {
  listAll(): CategoryRow[] {
    return getDb()
      .prepare("SELECT id, name, image, created_at FROM categories ORDER BY name")
      .all() as CategoryRow[];
  },

  create(name: string, image?: string | null) {
    const db = getDb();
    try {
      const result = db
        .prepare("INSERT INTO categories (name, image) VALUES (?, ?)")
        .run(name, image ?? null);
      return { ok: true as const, id: Number(result.lastInsertRowid) };
    } catch (e: unknown) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Failed to create category.",
      };
    }
  },

  update(id: number, data: { name: string; image?: string | null }) {
    const db = getDb();
    const result = db
      .prepare("UPDATE categories SET name = ?, image = ? WHERE id = ?")
      .run(data.name, data.image ?? null, id);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Category not found." };
  },

  remove(id: number) {
    const db = getDb();
    const result = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "Category not found." };
  },
};
