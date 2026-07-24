import { ipcMain, app as electronApp, dialog } from "electron";
import fs from "node:fs";
import path from "node:path";
import { getDb } from "./db/index";
import { backupDatabase, validateBackup, restoreDatabase } from "./db/index";
import { userQueries } from "./db/queries/users";
import { categoryQueries } from "./db/queries/categories";
import { productQueries } from "./db/queries/products";
import { saleQueries } from "./db/queries/sales";
import { reportQueries } from "./db/queries/reports";
import { settingsQueries } from "./db/queries/settings";
import { registerSession, removeSession, requireAuth, requireAdmin, getSession } from "./auth";
import { installUpdateAndRestart } from "./updater";
import { autoUpdater } from "electron-updater";
import { printReceipt, type ReceiptData } from "./printer";

export function registerIpc(): void {
  /* ── Auth ── */
  ipcMain.handle("auth:login", (event, payload: { username: string; password: string }) => {
    const trimmed = payload.username?.trim();
    if (!trimmed || !payload.password) {
      return { ok: false, message: "Username and password are required." };
    }

    try {
      const user = userQueries.login(trimmed, payload.password);
      if (!user) return { ok: false, message: "Invalid credentials." };

      registerSession(event.sender.id, { id: user.id, username: user.username, role: user.role });

      return {
        ok: true,
        user: { id: user.id, username: user.username, role: user.role },
      };
    } catch {
      return { ok: false, message: "Authentication error. Please try again." };
    }
  });

  ipcMain.handle(
    "auth:setup",
    (event, payload: { username: string; name: string; password: string }) => {
      if (!payload.username?.trim() || !payload.password) {
        return { ok: false, message: "Username and password are required." };
      }
      if (!payload.name?.trim()) {
        return { ok: false, message: "Name is required." };
      }

      try {
        if (!userQueries.isFirstRun()) {
          return { ok: false, message: "Setup has already been completed." };
        }

        const result = userQueries.createAdmin(
          payload.username.trim(),
          payload.name.trim(),
          payload.password,
        );
        if (!result.ok) return result;

        const user = userQueries.login(payload.username.trim(), payload.password);
        if (!user) return { ok: false, message: "Setup succeeded but login failed." };

        registerSession(event.sender.id, {
          id: user.id,
          username: user.username,
          role: user.role,
        });

        return { ok: true, user: { id: user.id, username: user.username, role: user.role } };
      } catch (err) {
        return { ok: false, message: (err as Error).message || "Setup failed." };
      }
    },
  );

  ipcMain.handle("auth:logout", (event) => {
    removeSession(event.sender.id);
    return { ok: true };
  });

  ipcMain.handle("auth:checkSession", (event) => {
    const session = getSession(event.sender.id);
    return session ? session.user : null;
  });

  ipcMain.handle(
    "auth:restoreSession",
    (event, user: { id: number; username: string; role: "admin" | "cashier" }) => {
      if (!user?.id || !user?.username || !user?.role) {
        return { ok: false };
      }
      const db = getDb();
      const row = db.prepare("SELECT id, username, role, is_active FROM users WHERE id = ? AND username = ?")
        .get(user.id, user.username) as { id: number; username: string; role: string; is_active: number } | undefined;

      if (!row || row.is_active !== 1) {
        return { ok: false };
      }

      registerSession(event.sender.id, { id: row.id, username: row.username, role: row.role as "admin" | "cashier" });
      return { ok: true, user: { id: row.id, username: row.username, role: row.role } };
    },
  );

  /* ── Users ── */
  ipcMain.handle("users:list", (event) => {
    requireAdmin(event.sender.id);
    return userQueries.listAll();
  });

  ipcMain.handle(
    "users:create",
    (
      event,
      payload: { username: string; name?: string; password: string; role: "admin" | "cashier" },
    ) => {
      requireAdmin(event.sender.id);
      if (!payload.username?.trim() || !payload.password) {
        return { ok: false, message: "Username and password are required." };
      }
      if (!["admin", "cashier"].includes(payload.role)) {
        return { ok: false, message: "Role must be admin or cashier." };
      }
      return userQueries.create({
        username: payload.username.trim(),
        name: payload.name,
        password: payload.password,
        role: payload.role,
      });
    },
  );

  ipcMain.handle(
    "users:update",
    (
      event,
      payload: {
        id: number;
        username?: string;
        name?: string;
        role?: "admin" | "cashier";
        is_active?: number;
      },
    ) => {
      requireAdmin(event.sender.id);
      const { id, ...fields } = payload;
      return userQueries.update(id, fields);
    },
  );

  ipcMain.handle(
    "users:changePassword",
    (event, payload: { id: number; currentPassword: string; newPassword: string }) => {
      requireAdmin(event.sender.id);
      if (!payload.newPassword) {
        return { ok: false, message: "New password is required." };
      }
      return userQueries.changePassword(payload.id, payload.currentPassword, payload.newPassword);
    },
  );

  ipcMain.handle("users:delete", (event, id: number) => {
    requireAdmin(event.sender.id);
    const db = getDb();
    const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return result.changes > 0 ? { ok: true } : { ok: false, message: "User not found." };
  });

  /* ── Categories ── */
  ipcMain.handle("categories:list", (event) => {
    try {
      requireAuth(event.sender.id);
    } catch {
      return [];
    }
    return categoryQueries.listAll();
  });

  ipcMain.handle("categories:create", (event, payload: { name: string; image?: string | null }) => {
    requireAdmin(event.sender.id);
    const name = payload.name?.trim();
    if (!name) return { ok: false, message: "Category name is required." };
    return categoryQueries.create(name, payload.image);
  });

  ipcMain.handle(
    "categories:update",
    (event, payload: { id: number; name: string; image?: string | null }) => {
      requireAdmin(event.sender.id);
      const name = payload.name?.trim();
      if (!name) return { ok: false, message: "Category name is required." };
      return categoryQueries.update(payload.id, { name, image: payload.image });
    },
  );

  ipcMain.handle("categories:delete", (event, id: number) => {
    requireAdmin(event.sender.id);
    const db = getDb();
    const usage = db
      .prepare("SELECT COUNT(*) as count FROM products WHERE category_id = ?")
      .get(id) as { count: number };
    if (usage.count > 0) {
      return { ok: false, message: "Cannot delete category that is used by products." };
    }
    return categoryQueries.remove(id);
  });

  /* ── Products ── */
  ipcMain.handle("products:list", (event) => {
    try {
      requireAuth(event.sender.id);
    } catch {
      return [];
    }
    return productQueries.listAll();
  });

  ipcMain.handle(
    "products:create",
    (
      event,
      payload: {
        category_id: number | null;
        name: string;
        sku: string | null;
        image?: string | null;
        buy_price: number;
        sell_price: number;
        stock: number;
      },
    ) => {
      requireAdmin(event.sender.id);
      if (!payload.name?.trim()) return { ok: false, message: "Product name is required." };
      if (payload.buy_price < 0 || payload.sell_price < 0 || payload.stock < 0) {
        return { ok: false, message: "Buy price, sell price and stock cannot be negative." };
      }
      if (payload.sell_price < payload.buy_price) {
        return { ok: false, message: "Sell price cannot be lower than buy price." };
      }
      return productQueries.create({
        categoryId: payload.category_id,
        name: payload.name.trim(),
        sku: payload.sku?.trim() || null,
        image: payload.image,
        buyPrice: payload.buy_price,
        sellPrice: payload.sell_price,
        stock: payload.stock,
      });
    },
  );

  ipcMain.handle(
    "products:update",
    (
      event,
      payload: {
        id: number;
        category_id: number | null;
        name: string;
        sku: string | null;
        image?: string | null;
        buy_price: number;
        sell_price: number;
        stock: number;
      },
    ) => {
      requireAdmin(event.sender.id);
      if (!payload.name?.trim()) return { ok: false, message: "Product name is required." };
      if (payload.buy_price < 0 || payload.sell_price < 0 || payload.stock < 0) {
        return { ok: false, message: "Buy price, sell price and stock cannot be negative." };
      }
      if (payload.sell_price < payload.buy_price) {
        return { ok: false, message: "Sell price cannot be lower than buy price." };
      }
      return productQueries.update(payload.id, {
        categoryId: payload.category_id,
        name: payload.name.trim(),
        sku: payload.sku?.trim() || null,
        image: payload.image,
        buyPrice: payload.buy_price,
        sellPrice: payload.sell_price,
        stock: payload.stock,
      });
    },
  );

  ipcMain.handle("products:delete", (event, id: number) => {
    requireAdmin(event.sender.id);
    const db = getDb();
    const used = db
      .prepare("SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?")
      .get(id) as { count: number };
    if (used.count > 0) {
      return { ok: false, message: "Cannot delete product with sales history." };
    }
    return productQueries.remove(id);
  });

  /* ── Sales ── */
  ipcMain.handle("sales:list", (event) => {
    try {
      requireAuth(event.sender.id);
    } catch {
      return [];
    }
    return saleQueries.listAll();
  });

  ipcMain.handle("sales:get", (event, id: number) => {
    try {
      requireAuth(event.sender.id);
    } catch {
      return null;
    }
    return saleQueries.getById(id) ?? null;
  });

  ipcMain.handle(
    "sales:create",
    (
      event,
      payload: {
        paid: number;
        paymentMethod?: string;
        items: Array<{ productId: number; qty: number }>;
      },
    ) => {
      requireAuth(event.sender.id);
      const session = getSession(event.sender.id);
      const cashierId = session!.user.id;
      return saleQueries.create({
        cashierId,
        paid: payload.paid,
        paymentMethod: payload.paymentMethod,
        items: payload.items,
      });
    },
  );

  /* ── Reports ── */
  ipcMain.handle("reports:summary", (event, payload: { startDate: string; endDate: string }) => {
    try {
      requireAuth(event.sender.id);
    } catch {
      return null;
    }
    return reportQueries.summary(payload);
  });

  /* ── Settings ── */
  ipcMain.handle("settings:getAll", (event) => {
    try {
      requireAuth(event.sender.id);
    } catch {
      // Not authenticated yet — return empty, SettingsProvider will reload after login
      return {};
    }
    try {
      return settingsQueries.getAll();
    } catch {
      return {};
    }
  });

  ipcMain.handle("settings:set", (event, payload: { key: string; value: string }) => {
    requireAdmin(event.sender.id);
    try {
      settingsQueries.set(payload.key, payload.value);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

  ipcMain.handle("settings:setMany", (event, payload: Record<string, string>) => {
    requireAdmin(event.sender.id);
    try {
      settingsQueries.setMany(payload);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

  /* ── Updates ── */
  ipcMain.handle("update:check", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        ok: true,
        updateInfo: result?.updateInfo ? { version: result.updateInfo.version } : null,
      };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

  ipcMain.handle("update:install", () => {
    installUpdateAndRestart();
    return { ok: true };
  });

  /* ── App info ── */
  ipcMain.handle("app:info", () => {
    const db = getDb();
    const schemaRow = db.prepare("SELECT MAX(version) AS version FROM schema_version").get() as {
      version: number | null;
    };

    return {
      name: electronApp.getName(),
      version: electronApp.getVersion(),
      isPackaged: electronApp.isPackaged,
      schemaVersion: schemaRow.version ?? 0,
    };
  });

  /* ── Printer ── */
  ipcMain.handle(
    "print:receipt",
    async (_event, payload: ReceiptData & { vendorId?: number; productId?: number }) => {
      try {
        const { vendorId, productId, ...data } = payload;
        // Resolve logo path from renderer `/images/` to filesystem path
        let logoPath = data.logoPath;
        if (logoPath && logoPath.startsWith("/")) {
          logoPath = path.join(__dirname, "..", logoPath.slice(1));
          if (fs.existsSync(logoPath)) {
            data.logoPath = logoPath;
          } else {
            delete data.logoPath;
          }
        }
        await printReceipt(data, vendorId, productId);
        return { ok: true };
      } catch (err) {
        return { ok: false, message: (err as Error).message };
      }
    },
  );

  ipcMain.handle("printers:list", async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usb = require("escpos-usb") as any;
      const devices = usb.findPrinter?.() ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return devices.map((d: any) => ({
        vendorId: d.deviceDescriptor.idVendor,
        productId: d.deviceDescriptor.idProduct,
      }));
    } catch {
      return [];
    }
  });

  /* ── Backup & Restore ── */
  ipcMain.handle("backup:create", async (event) => {
    requireAdmin(event.sender.id);
    try {
      const { filePath } = await dialog.showSaveDialog({
        title: "Simpan Backup Database",
        defaultPath: `pos-empati-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: "Database", extensions: ["db"] }],
      });
      if (!filePath) return { ok: false, message: "Dibatalkan." };

      const meta = backupDatabase(filePath, electronApp.getVersion());
      return { ok: true, meta };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

  ipcMain.handle("backup:restore", async (event) => {
    requireAdmin(event.sender.id);
    try {
      const { filePaths } = await dialog.showOpenDialog({
        title: "Pilih File Backup",
        filters: [{ name: "Database", extensions: ["db"] }],
        properties: ["openFile"],
      });
      if (!filePaths || filePaths.length === 0) return { ok: false, message: "Dibatalkan." };

      restoreDatabase(filePaths[0], electronApp.getPath("userData"), electronApp.getVersion());
      return { ok: true };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

  ipcMain.handle("backup:validate", async (_event, filePath: string) => {
    try {
      const meta = validateBackup(filePath);
      return { ok: true, meta };
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }
  });

  /* ── Export ── */
  ipcMain.handle(
    "export:csv",
    async (_event, payload: { csv: string; defaultName: string }) => {
      try {
        const { filePath } = await dialog.showSaveDialog({
          title: "Ekspor Laporan Penjualan",
          defaultPath: payload.defaultName,
          filters: [{ name: "CSV", extensions: ["csv"] }],
        });
        if (!filePath) return { ok: false, message: "Dibatalkan." };

        // Write UTF-8 BOM so Excel recognizes the encoding
        const BOM = "\uFEFF";
        fs.writeFileSync(filePath, BOM + payload.csv, "utf-8");
        return { ok: true };
      } catch (err) {
        return { ok: false, message: (err as Error).message };
      }
    },
  );
}
