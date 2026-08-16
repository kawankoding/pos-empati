import { type ReactNode } from "react";
import CategoriesPage from "@pages/CategoriesPage";
import PosPage from "@pages/PosPage";
import ProductsPage from "@pages/ProductsPage";
import ReportingPage from "@pages/ReportingPage";
import SalesPage from "@pages/SalesPage";
import ShoppingListPage from "@pages/ShoppingListPage";
import SettingsPage from "@pages/settings/SettingsPage";
import type { AuthUser, Role } from "@lib/api";

export type PageConfig = {
  path: string;
  allowedRoles: Role[];
  noPadding?: boolean;
  element: (session: AuthUser) => ReactNode;
};

export const routes: PageConfig[] = [
  {
    path: "/pos",
    allowedRoles: ["admin", "cashier"],
    noPadding: true,
    element: (session) => <PosPage session={session} />,
  },
  {
    path: "/categories",
    allowedRoles: ["admin"],
    element: () => <CategoriesPage />,
  },
  {
    path: "/products",
    allowedRoles: ["admin"],
    element: () => <ProductsPage />,
  },
  {
    path: "/sales",
    allowedRoles: ["admin"],
    element: () => <SalesPage />,
  },
  {
    path: "/shopping-list",
    allowedRoles: ["admin"],
    element: () => <ShoppingListPage />,
  },
  {
    path: "/reporting",
    allowedRoles: ["admin"],
    element: () => <ReportingPage />,
  },
  {
    path: "/settings",
    allowedRoles: ["admin", "cashier"],
    element: (session) => <SettingsPage role={session.role} />,
  },
];
