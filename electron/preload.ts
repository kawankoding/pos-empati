/**
 * Preload script — runs in a sandboxed renderer process.
 * Only contextBridge and ipcRenderer APIs are available;
 * Node.js built-ins (fs, path, etc.) are not accessible here.
 */
import { contextBridge, ipcRenderer } from "electron";

type PublicUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "cashier";
  is_active: number;
  created_at: string;
};

contextBridge.exposeInMainWorld("api", {
  login: (payload: { username: string; password: string }) =>
    ipcRenderer.invoke("auth:login", payload),

  setup: (payload: { username: string; name: string; password: string }) =>
    ipcRenderer.invoke("auth:setup", payload),

  logout: () => ipcRenderer.invoke("auth:logout"),

  checkSession: () => ipcRenderer.invoke("auth:checkSession"),
  restoreSession: (user: { id: number; username: string; role: string }) =>
    ipcRenderer.invoke("auth:restoreSession", user),

  listUsers: () => ipcRenderer.invoke("users:list") as Promise<PublicUser[]>,
  createUser: (payload: {
    username: string;
    name?: string;
    password: string;
    role: "admin" | "cashier";
  }) => ipcRenderer.invoke("users:create", payload),
  updateUser: (payload: {
    id: number;
    username?: string;
    name?: string;
    role?: "admin" | "cashier";
    is_active?: number;
  }) => ipcRenderer.invoke("users:update", payload),
  changePassword: (payload: { id: number; currentPassword: string; newPassword: string }) =>
    ipcRenderer.invoke("users:changePassword", payload),
  deleteUser: (id: number) => ipcRenderer.invoke("users:delete", id),

  listCategories: () => ipcRenderer.invoke("categories:list"),
  createCategory: (payload: { name: string }) => ipcRenderer.invoke("categories:create", payload),
  updateCategory: (payload: { id: number; name: string }) =>
    ipcRenderer.invoke("categories:update", payload),
  deleteCategory: (id: number) => ipcRenderer.invoke("categories:delete", id),

  listProducts: () => ipcRenderer.invoke("products:list"),
  createProduct: (payload: {
    category_id: number | null;
    name: string;
    sku: string | null;
    buy_price: number;
    sell_price: number;
    stock: number;
  }) => ipcRenderer.invoke("products:create", payload),
  updateProduct: (payload: {
    id: number;
    category_id: number | null;
    name: string;
    sku: string | null;
    buy_price: number;
    sell_price: number;
    stock: number;
  }) => ipcRenderer.invoke("products:update", payload),
  deleteProduct: (id: number) => ipcRenderer.invoke("products:delete", id),

  createSale: (payload: {
    paid: number;
    paymentMethod?: string;
    items: Array<{ productId: number; qty: number }>;
  }) => ipcRenderer.invoke("sales:create", payload),

  listSales: () => ipcRenderer.invoke("sales:list"),
  getSale: (id: number) => ipcRenderer.invoke("sales:get", id),

  listShoppingLists: () => ipcRenderer.invoke("shoppingLists:list"),
  getShoppingList: (id: number) => ipcRenderer.invoke("shoppingLists:get", id),
  createShoppingList: (payload: { name: string }) =>
    ipcRenderer.invoke("shoppingLists:create", payload),
  updateShoppingList: (payload: { id: number; name: string }) =>
    ipcRenderer.invoke("shoppingLists:update", payload),
  deleteShoppingList: (id: number) => ipcRenderer.invoke("shoppingLists:delete", id),
  addShoppingListItem: (payload: {
    listId: number;
    productId: number | null;
    name: string;
    qty: number;
    note: string;
  }) => ipcRenderer.invoke("shoppingLists:addItem", payload),
  updateShoppingListItem: (payload: {
    id: number;
    qty?: number;
    note?: string;
    checked?: number;
  }) => ipcRenderer.invoke("shoppingLists:updateItem", payload),
  removeShoppingListItem: (id: number) => ipcRenderer.invoke("shoppingLists:removeItem", id),
  clearCheckedShoppingListItems: (listId: number) =>
    ipcRenderer.invoke("shoppingLists:clearChecked", listId),
  printShoppingList: (payload: Record<string, unknown>) =>
    ipcRenderer.invoke("print:shoppingList", payload),

  reportSummary: (payload: { startDate: string; endDate: string }) =>
    ipcRenderer.invoke("reports:summary", payload),

  getSettings: () => ipcRenderer.invoke("settings:getAll"),
  setSetting: (payload: { key: string; value: string }) =>
    ipcRenderer.invoke("settings:set", payload),
  setSettings: (payload: Record<string, string>) => ipcRenderer.invoke("settings:setMany", payload),

  onUpdateStatus: (callback: (status: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, status: string) => callback(status);
    ipcRenderer.on("update:status", handler);
    return () => ipcRenderer.removeListener("update:status", handler);
  },
  onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, p: { percent: number }) => callback(p);
    ipcRenderer.on("update:download-progress", handler);
    return () => ipcRenderer.removeListener("update:download-progress", handler);
  },
  onUpdateAvailable: (callback: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => callback(info);
    ipcRenderer.on("update:available", handler);
    return () => ipcRenderer.removeListener("update:available", handler);
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, info: { version: string }) => callback(info);
    ipcRenderer.on("update:downloaded", handler);
    return () => ipcRenderer.removeListener("update:downloaded", handler);
  },
  onUpdateError: (callback: (message: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, msg: string) => callback(msg);
    ipcRenderer.on("update:error", handler);
    return () => ipcRenderer.removeListener("update:error", handler);
  },
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),

  getAppInfo: () =>
    ipcRenderer.invoke("app:info") as Promise<{
      name: string;
      version: string;
      isPackaged: boolean;
      schemaVersion: number;
    }>,

  printReceipt: (payload: Record<string, unknown>) => ipcRenderer.invoke("print:receipt", payload),
  listPrinters: () =>
    ipcRenderer.invoke("printers:list") as Promise<Array<{ vendorId: number; productId: number }>>,

  createBackup: () => ipcRenderer.invoke("backup:create"),
  restoreBackup: () => ipcRenderer.invoke("backup:restore"),

  exportCsv: (payload: { csv: string; defaultName: string }) =>
    ipcRenderer.invoke("export:csv", payload),
});
