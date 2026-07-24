import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { api, type SettingsMap } from "./api";

type SettingsContextType = {
  settings: SettingsMap | null;
  loading: boolean;
  error: string | null;
  reloadSettings: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getSettings();
      setSettings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat pengaturan.");
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, reloadSettings: loadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
