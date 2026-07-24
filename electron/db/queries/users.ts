import { getDb } from "../index";

export type UserRow = {
  id: number;
  username: string;
  name: string;
  password_hash: string;
  role: "admin" | "cashier";
  is_active: number;
  created_at: string;
};

export type PublicUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "cashier";
  is_active: number;
  created_at: string;
};

export const userQueries = {
  login(
    username: string,
    password: string,
  ): {
    id: number;
    username: string;
    name: string;
    role: "admin" | "cashier";
    is_active: number;
    created_at: string;
  } | null {
    const bcrypt = require("bcryptjs");
    const db = getDb();
    const user = db
      .prepare(
        `SELECT id, username, name, password_hash, role, is_active, created_at
         FROM users WHERE username = ?`,
      )
      .get(username) as UserRow | undefined;

    if (!user || user.is_active !== 1) return null;
    if (!bcrypt.compareSync(password, user.password_hash)) return null;

    const { password_hash: _password_hash, ...safe } = user;
    void _password_hash;
    return safe;
  },

  listAll(): PublicUser[] {
    return getDb()
      .prepare(
        "SELECT id, username, name, role, is_active, created_at FROM users ORDER BY username",
      )
      .all() as PublicUser[];
  },

  create(payload: {
    username: string;
    name?: string;
    password: string;
    role: "admin" | "cashier";
  }) {
    const bcrypt = require("bcryptjs");
    const db = getDb();
    try {
      const hash = bcrypt.hashSync(payload.password, 10);
      const result = db
        .prepare("INSERT INTO users (username, name, password_hash, role) VALUES (?, ?, ?, ?)")
        .run(payload.username, payload.name || payload.username, hash, payload.role);
      return { ok: true as const, id: Number(result.lastInsertRowid) };
    } catch (e: unknown) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Failed to create user.",
      };
    }
  },

  update(
    id: number,
    data: { username?: string; name?: string; role?: "admin" | "cashier"; is_active?: number },
  ) {
    const db = getDb();
    const sets: string[] = [];
    const values: (string | number)[] = [];

    // Fixed whitelist of allowed columns — no dynamic key interpolation
    if (data.username !== undefined) {
      sets.push("username = ?");
      values.push(data.username);
    }
    if (data.name !== undefined) {
      sets.push("name = ?");
      values.push(data.name);
    }
    if (data.role !== undefined) {
      sets.push("role = ?");
      values.push(data.role);
    }
    if (data.is_active !== undefined) {
      sets.push("is_active = ?");
      values.push(data.is_active);
    }

    if (!sets.length) return { ok: false as const, message: "Nothing to update." };
    values.push(id);
    const result = db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return result.changes > 0
      ? { ok: true as const }
      : { ok: false as const, message: "User not found." };
  },

  changePassword(id: number, currentPassword: string, newPassword: string) {
    const bcrypt = require("bcryptjs");
    const db = getDb();
    const user = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as
      Pick<UserRow, "password_hash"> | undefined;
    if (!user) return { ok: false as const, message: "User not found." };
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return { ok: false as const, message: "Current password is incorrect." };
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      bcrypt.hashSync(newPassword, 10),
      id,
    );
    return { ok: true as const };
  },

  isFirstRun(): boolean {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    return row.count === 0;
  },

  createAdmin(username: string, name: string, password: string) {
    const bcrypt = require("bcryptjs");
    const db = getDb();
    try {
      const hash = bcrypt.hashSync(password, 10);
      const result = db
        .prepare(
          "INSERT INTO users (username, name, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', 1)",
        )
        .run(username, name, hash);
      return { ok: true as const, id: Number(result.lastInsertRowid) };
    } catch (e: unknown) {
      return {
        ok: false as const,
        message: e instanceof Error ? e.message : "Failed to create admin.",
      };
    }
  },
};
