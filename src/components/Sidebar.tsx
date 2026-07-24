import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@lib/api";
import logo from "/images/toko-empati.png";

export type SidebarAction =
  "pos" | "products" | "categories" | "sales" | "reporting" | "settings" | "logout";

type SidebarItem = {
  key: SidebarAction;
  icon: LucideIcon;
  label: string;
  roles: Role[];
};

const primaryItems: SidebarItem[] = [
  { key: "pos", icon: LayoutDashboard, label: "POS", roles: ["admin", "cashier"] },
  { key: "products", icon: Package, label: "Produk", roles: ["admin"] },
  { key: "categories", icon: Tags, label: "Kategori", roles: ["admin"] },
  { key: "sales", icon: Receipt, label: "Penjualan", roles: ["admin"] },
  { key: "reporting", icon: BarChart3, label: "Laporan", roles: ["admin"] },
];

const secondaryItems: SidebarItem[] = [
  { key: "settings", icon: Settings, label: "Pengaturan", roles: ["admin", "cashier"] },
  { key: "logout", icon: LogOut, label: "Keluar", roles: ["admin", "cashier"] },
];

export default function Sidebar({
  role,
  active,
  onAction,
}: {
  role: Role;
  active: SidebarAction;
  onAction: (action: SidebarAction) => void;
}) {
  const renderItem = (item: SidebarItem) => {
    if (!item.roles.includes(role)) return null;

    const isActive = item.key === active;
    const Icon = item.icon;

    return (
      <button
        key={item.key}
        type="button"
        title={item.label}
        aria-label={item.label}
        onClick={() => onAction(item.key)}
        className={`flex w-16 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2.5 text-[10px] leading-none font-semibold transition-all duration-200 ${
          isActive
            ? "border-l-4 border-emerald-700 bg-emerald-50 text-emerald-700"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <Icon size={18} strokeWidth={2.2} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="shadow-level-1 flex h-full w-20 shrink-0 flex-col items-center border-r border-slate-200 bg-white py-6">
      {/* Brand */}
      <div className="mb-8">
        <img
          src={logo}
          alt="Toko Empati"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Primary nav */}
      <nav className="flex flex-1 flex-col gap-2">{primaryItems.map(renderItem)}</nav>

      {/* Secondary nav */}
      <div className="mt-auto flex flex-col gap-2">{secondaryItems.map(renderItem)}</div>
    </aside>
  );
}
