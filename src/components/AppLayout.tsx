import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bell, RefreshCw, Wifi } from "lucide-react";
import Sidebar from "./Sidebar";
import type { AuthUser, Role } from "@lib/api";
import { useSettings } from "@lib/SettingsContext";
import Button from "./ui/Button";
import Modal from "./ui/Modal";

type SidebarAction =
  | "pos"
  | "products"
  | "categories"
  | "sales"
  | "shopping-list"
  | "reporting"
  | "settings"
  | "logout";

const sidebarRouteMap: Record<string, string> = {
  pos: "/pos",
  products: "/products",
  categories: "/categories",
  sales: "/sales",
  "shopping-list": "/shopping-list",
  reporting: "/reporting",
  settings: "/settings",
};

function pathToAction(pathname: string): SidebarAction {
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/shopping-list")) return "shopping-list";
  if (pathname.startsWith("/reporting")) return "reporting";
  if (pathname.startsWith("/settings")) return "settings";
  return "pos";
}

type PageConfig = {
  /** Path the page is mounted at, e.g. "/pos", "/users" */
  path: string;
  /** Restrict to specific roles */
  allowedRoles: Role[];
  /** Page component */
  element: ReactNode;
  /** Remove default page padding (for full-screen pages like POS) */
  noPadding?: boolean;
};

export default function AppLayout({
  session,
  onLogout,
  pages,
}: {
  session: AuthUser;
  onLogout: () => void;
  pages: PageConfig[];
}) {
  const location = useLocation();
  const navigate = useNavigate();

  /* ── Cashier redirect ── */
  useEffect(() => {
    if (
      session.role === "cashier" &&
      location.pathname !== "/pos" &&
      !location.pathname.startsWith("/settings")
    ) {
      navigate("/pos", { replace: true });
    }
  }, [location.pathname, navigate, session.role]);

  /* ── Logout confirmation ── */
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  /* ── Store name from settings ── */
  const { settings } = useSettings();
  const storeName = settings?.store_name ?? "Toko Empati";

  const activeAction = pathToAction(location.pathname);

  const sidebarOnAction = (action: SidebarAction): void => {
    if (action === "logout") {
      setShowLogoutModal(true);
      return;
    }

    const route = sidebarRouteMap[action];
    if (route) {
      navigate(route);
    }
  };

  const currentPage = useMemo(
    () => pages.find((page) => location.pathname.startsWith(page.path)),
    [pages, location.pathname],
  );

  const noPadding = currentPage?.noPadding ?? false;

  const renderPage = (): ReactNode => {
    const page = pages.find((p) => location.pathname.startsWith(p.path));

    if (!page) {
      return <Navigate to="/pos" replace />;
    }

    if (!session) {
      return <Navigate to="/login" replace />;
    }

    if (!page.allowedRoles.includes(session.role)) {
      return <Navigate to="/pos" replace />;
    }

    return page.element;
  };

  const initials = session.username.slice(0, 2).toUpperCase();

  return (
    <div
      className="flex h-screen"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <Sidebar role={session.role} active={activeAction} onAction={sidebarOnAction} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-16 items-center justify-between border-b px-6"
          style={{ background: "#ffffff", borderColor: "#d7e1ef" }}
        >
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-emerald-700">{storeName}</h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative rounded-full p-2 transition-colors hover:bg-slate-100"
              >
                <Bell size={18} className="text-slate-500" />
                <span
                  className="absolute top-2 right-2 h-2 w-2 rounded-full"
                  style={{ background: "var(--color-error)" }}
                />
              </button>
              <button
                type="button"
                className="rounded-full p-2 transition-colors hover:bg-slate-100"
              >
                <Wifi size={18} className="text-slate-500" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 transition-colors hover:bg-slate-100"
              >
                <RefreshCw size={18} className="text-slate-500" />
              </button>
            </div>

            <div className="flex cursor-pointer items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800">{session.username}</p>
                <p className="text-xs text-slate-500">
                  {session.role === "admin" ? "Admin" : "Kasir"}
                </p>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold text-white"
                style={{
                  borderColor: "var(--color-primary)",
                  background: "var(--color-primary-strong)",
                }}
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main className={`min-w-0 flex-1 overflow-auto ${noPadding ? "p-0" : "p-6 lg:p-7"}`}>
          {renderPage()}
        </main>
      </div>

      {/* Logout confirmation modal */}
      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Konfirmasi Keluar"
        description="Apakah Anda yakin ingin keluar dari aplikasi?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={onLogout}>
              Ya, Keluar
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Anda akan kembali ke halaman login dan sesi Anda akan diakhiri.
        </p>
      </Modal>
    </div>
  );
}
