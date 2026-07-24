import { useCallback, useMemo, useState } from "react";
import {
  Database,
  Info,
  Printer,
  Shield,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@lib/api";
import AboutTab from "./AboutTab";
import DataTab from "./DataTab";
import GeneralTab from "./GeneralTab";
import PrintersTab from "./PrintersTab";
import SecurityTab from "./SecurityTab";
import UsersTab from "./UsersTab";

const STORAGE_KEY = "pos_empati_settings_tab";

type SettingsTab = "general" | "data" | "printers" | "users" | "security" | "about";

type TabDef = {
  key: SettingsTab;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  roles: Role[];
};

const allTabs: TabDef[] = [
  { key: "general", icon: SlidersHorizontal, label: "Umum", roles: ["admin"] },
  { key: "data", icon: Database, label: "Data & Penyimpanan", roles: ["admin"] },
  { key: "printers", icon: Printer, label: "Printer", roles: ["admin"] },
  { key: "users", icon: Users, label: "Pengguna", roles: ["admin"] },
  { key: "security", icon: Shield, label: "Keamanan", roles: ["admin", "cashier"] },
  { key: "about", icon: Info, label: "Tentang", roles: ["admin", "cashier"] },
];

export default function SettingsPage({ role }: { role: Role }) {
  const visibleTabs = useMemo(() => allTabs.filter((t) => t.roles.includes(role)), [role]);

  const defaultTab = role === "cashier" ? "security" : "general";

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && visibleTabs.some((t) => t.key === stored)) {
      return stored as SettingsTab;
    }
    return defaultTab;
  });

  const handleTabChange = useCallback((tab: SettingsTab) => {
    localStorage.setItem(STORAGE_KEY, tab);
    setActiveTab(tab);
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Tabs sidebar */}
      <nav className="flex shrink-0 flex-col gap-1 lg:w-56">
        {visibleTabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                tab.disabled
                  ? "cursor-not-allowed opacity-40 hover:bg-slate-100"
                  : isActive
                    ? "border-l-4 border-emerald-700 bg-emerald-50 text-emerald-700"
                    : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {activeTab === "general" ? (
          <GeneralTab />
        ) : activeTab === "data" ? (
          <DataTab />
        ) : activeTab === "printers" ? (
          <PrintersTab />
        ) : activeTab === "users" ? (
          <UsersTab />
        ) : activeTab === "security" ? (
          <SecurityTab />
        ) : activeTab === "about" ? (
          <AboutTab />
        ) : null}
      </div>
    </div>
  );
}
