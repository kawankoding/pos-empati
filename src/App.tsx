import AppLayout from "@components/AppLayout";
import { routes } from "@config/routes";
import { useSession } from "@lib/session";
import { SettingsProvider } from "@lib/SettingsContext";
import { ToastProvider } from "@lib/ToastContext";
import LoginPage from "@pages/LoginPage";
import { useEffect } from "react";

export default function App() {
  const { session, login, logout } = useSession();

  // Escape key closes the app (with confirmation dialog in main process)
  useEffect(() => {
    if (!session) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't intercept if a modal/dialog is open or user is in an input
      if (document.querySelector('[role="dialog"]')) return;
      if (document.activeElement?.tagName === "INPUT") return;
      if (document.activeElement?.tagName === "TEXTAREA") return;
      window.close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [session]);

  const pages = session
    ? routes.map((route) => ({
        path: route.path,
        allowedRoles: route.allowedRoles,
        noPadding: route.noPadding,
        element: route.element(session),
      }))
    : [];

  return (
    <SettingsProvider key={session ? "authed" : "unauthed"}>
      <ToastProvider>
        {!session ? (
          <LoginPage onLoginSuccess={login} />
        ) : (
          <AppLayout session={session} onLogout={logout} pages={pages} />
        )}
      </ToastProvider>
    </SettingsProvider>
  );
}
