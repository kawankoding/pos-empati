import type {
  AuthUser,
  Category,
  MutationResult,
  Product,
  ProfitSummary,
  PublicUser,
  ReportSummary,
  SaleRecord,
  SettingsMap,
  TopProduct,
} from "@lib/api";

export {};

declare global {
  interface Window {
    api: {
      login: (payload: {
        username: string;
        password: string;
      }) => Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }>;

      setup: (payload: {
        username: string;
        name: string;
        password: string;
      }) => Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }>;

      logout: () => Promise<{ ok: true }>;

      checkSession: () => Promise<AuthUser | null>;
      restoreSession: (user: {
        id: number;
        username: string;
        role: string;
      }) => Promise<{ ok: true; user: AuthUser } | { ok: false }>;

      listUsers: () => Promise<PublicUser[]>;
      createUser: (payload: {
        username: string;
        name?: string;
        password: string;
        role: "admin" | "cashier";
      }) => Promise<MutationResult>;
      updateUser: (payload: {
        id: number;
        username?: string;
        name?: string;
        role?: "admin" | "cashier";
        is_active?: number;
      }) => Promise<MutationResult>;
      changePassword: (payload: {
        id: number;
        currentPassword: string;
        newPassword: string;
      }) => Promise<MutationResult>;
      deleteUser: (id: number) => Promise<MutationResult>;

      listCategories: () => Promise<Category[]>;
      createCategory: (payload: { name: string }) => Promise<MutationResult>;
      updateCategory: (payload: { id: number; name: string }) => Promise<MutationResult>;
      deleteCategory: (id: number) => Promise<MutationResult>;

      listProducts: () => Promise<Product[]>;
      createProduct: (payload: {
        category_id: number | null;
        name: string;
        sku: string | null;
        buy_price: number;
        sell_price: number;
        stock: number;
      }) => Promise<MutationResult>;
      updateProduct: (payload: {
        id: number;
        category_id: number | null;
        name: string;
        sku: string | null;
        buy_price: number;
        sell_price: number;
        stock: number;
      }) => Promise<MutationResult>;
      deleteProduct: (id: number) => Promise<MutationResult>;

      createSale: (payload: {
        paid: number;
        paymentMethod?: string;
        items: Array<{ productId: number; qty: number }>;
      }) => Promise<
        | { ok: true; saleId: number; total: number; changeAmount: number }
        | { ok: false; message: string }
      >;

      listSales: () => Promise<SaleRecord[]>;

      reportSummary: (payload: { startDate: string; endDate: string }) => Promise<{
        ok: true;
        summary: ReportSummary;
        profit: ProfitSummary;
        topProducts: TopProduct[];
      }>;

      getSettings: () => Promise<SettingsMap>;
      setSetting: (payload: { key: string; value: string }) => Promise<MutationResult>;
      setSettings: (payload: Record<string, string>) => Promise<MutationResult>;

      onUpdateStatus: (callback: (status: string) => void) => () => void;
      onUpdateAvailable: (callback: (info: { version: string }) => void) => () => void;
      onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void) => () => void;
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void;
      onUpdateError: (callback: (message: string) => void) => () => void;
      checkForUpdates: () => Promise<
        { ok: true; updateInfo: { version: string } | null } | { ok: false; message: string }
      >;
      getAppInfo: () => Promise<{
        name: string;
        version: string;
        isPackaged: boolean;
        schemaVersion: number;
      }>;

      printReceipt: (payload: Record<string, unknown>) => Promise<MutationResult>;
      listPrinters: () => Promise<Array<{ vendorId: number; productId: number }>>;
    };
  }
}
