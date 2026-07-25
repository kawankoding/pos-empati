export type Role = "admin" | "cashier";

export type AuthUser = {
  id: number;
  username: string;
  role: Role;
};

export type User = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "cashier";
  is_active: number;
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  image: string | null;
  created_at: string;
};

export type Product = {
  id: number;
  category_id: number | null;
  category_name: string | null;
  name: string;
  sku: string | null;
  image: string | null;
  buy_price: number;
  sell_price: number;
  stock: number;
};

export type PublicUser = {
  id: number;
  username: string;
  name: string;
  role: "admin" | "cashier";
  is_active: number;
  created_at: string;
};

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; message: string };

export type MutationResult = { ok: true; id?: number } | { ok: false; message: string };

export type ReportSummary = {
  transactions: number;
  revenue: number;
  paid: number;
  change: number;
};

export type TopProduct = {
  id: number;
  name: string;
  qty_sold: number;
  amount: number;
  profit: number;
};

export type ProfitSummary = {
  grossProfit: number;
  avgMarginPerItem: number;
  profitMarginPercentage: number;
};

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
  profit: number;
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

export type AppInfo = {
  name: string;
  version: string;
  isPackaged: boolean;
  schemaVersion: number;
};

export type SettingsMap = Record<string, string>;

export const api = {
  login(payload: { username: string; password: string }): Promise<LoginResult> {
    return window.api.login(payload);
  },

  setup(payload: { username: string; name: string; password: string }): Promise<LoginResult> {
    return window.api.setup(payload);
  },

  logout(): Promise<{ ok: true }> {
    return window.api.logout();
  },

  checkSession(): Promise<AuthUser | null> {
    return window.api.checkSession();
  },

  restoreSession(user: { id: number; username: string; role: string }): Promise<{ ok: true; user: AuthUser } | { ok: false }> {
    return window.api.restoreSession(user);
  },

  changePassword(payload: {
    id: number;
    currentPassword: string;
    newPassword: string;
  }): Promise<MutationResult> {
    return window.api.changePassword(payload);
  },

  listUsers(): Promise<User[]> {
    return window.api.listUsers();
  },

  createUser(payload: {
    username: string;
    name?: string;
    password: string;
    role: "admin" | "cashier";
  }): Promise<MutationResult> {
    return window.api.createUser(payload);
  },

  updateUser(payload: {
    id: number;
    username?: string;
    name?: string;
    role?: "admin" | "cashier";
    is_active?: number;
  }): Promise<MutationResult> {
    return window.api.updateUser(payload);
  },

  deleteUser(id: number): Promise<MutationResult> {
    return window.api.deleteUser(id);
  },

  listCategories(): Promise<Category[]> {
    return window.api.listCategories();
  },

  createCategory(payload: { name: string; image?: string | null }): Promise<MutationResult> {
    return window.api.createCategory(payload);
  },

  updateCategory(payload: {
    id: number;
    name: string;
    image?: string | null;
  }): Promise<MutationResult> {
    return window.api.updateCategory(payload);
  },

  deleteCategory(id: number): Promise<MutationResult> {
    return window.api.deleteCategory(id);
  },

  listProducts(): Promise<Product[]> {
    return window.api.listProducts();
  },

  createProduct(payload: {
    category_id: number | null;
    name: string;
    sku: string | null;
    image?: string | null;
    buy_price: number;
    sell_price: number;
    stock: number;
  }): Promise<MutationResult> {
    return window.api.createProduct(payload);
  },

  updateProduct(payload: {
    id: number;
    category_id: number | null;
    name: string;
    sku: string | null;
    image?: string | null;
    buy_price: number;
    sell_price: number;
    stock: number;
  }): Promise<MutationResult> {
    return window.api.updateProduct(payload);
  },

  deleteProduct(id: number): Promise<MutationResult> {
    return window.api.deleteProduct(id);
  },

  createSale(payload: {
    paid: number;
    paymentMethod?: string;
    items: Array<{ productId: number; qty: number }>;
  }): Promise<
    | { ok: true; saleId: number; total: number; changeAmount: number }
    | { ok: false; message: string }
  > {
    return window.api.createSale(payload);
  },

  listSales(): Promise<SaleRecord[]> {
    return window.api.listSales();
  },

  getSale(id: number): Promise<SaleDetail | null> {
    return window.api.getSale(id);
  },

  reportSummary(payload: { startDate: string; endDate: string }): Promise<{
    ok: true;
    summary: ReportSummary;
    profit: ProfitSummary;
    topProducts: TopProduct[];
  }> {
    return window.api.reportSummary(payload);
  },

  getSettings(): Promise<SettingsMap> {
    return window.api.getSettings();
  },

  setSetting(payload: { key: string; value: string }): Promise<MutationResult> {
    return window.api.setSetting(payload);
  },

  setSettings(payload: Record<string, string>): Promise<MutationResult> {
    return window.api.setSettings(payload);
  },

  onUpdateStatus(callback: (status: string) => void): () => void {
    return window.api.onUpdateStatus(callback);
  },
  onUpdateAvailable(callback: (info: { version: string }) => void): () => void {
    return window.api.onUpdateAvailable(callback);
  },
  onUpdateDownloadProgress(callback: (progress: { percent: number }) => void): () => void {
    return window.api.onUpdateDownloadProgress(callback);
  },
  onUpdateDownloaded(callback: (info: { version: string }) => void): () => void {
    return window.api.onUpdateDownloaded(callback);
  },
  onUpdateError(callback: (message: string) => void): () => void {
    return window.api.onUpdateError(callback);
  },
  checkForUpdates(): Promise<
    { ok: true; updateInfo: { version: string } | null } | { ok: false; message: string }
  > {
    return window.api.checkForUpdates();
  },
  installUpdate(): Promise<{ ok: true }> {
    return window.api.installUpdate();
  },

  getAppInfo(): Promise<AppInfo> {
    return window.api.getAppInfo();
  },

  printReceipt(payload: Record<string, unknown>): Promise<MutationResult> {
    return window.api.printReceipt(payload);
  },

  listPrinters(): Promise<Array<{ vendorId: number; productId: number }>> {
    return window.api.listPrinters();
  },

  createBackup(): Promise<
    { ok: true; meta: { timestamp: string; schemaVersion: number; checksum: string } }
    | { ok: false; message: string }
  > {
    return window.api.createBackup();
  },

  restoreBackup(): Promise<{ ok: true } | { ok: false; message: string }> {
    return window.api.restoreBackup();
  },

  exportCsv(payload: { csv: string; defaultName: string }): Promise<MutationResult> {
    return window.api.exportCsv(payload);
  },
};
