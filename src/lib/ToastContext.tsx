import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastOptions = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  /** Duration in ms. 0 = persistent (must be dismissed manually). */
  duration?: number;
};

type Toast = ToastOptions & { id: string };

type ToastContextType = {
  toast: (options: ToastOptions) => string;
  success: (description: string, title?: string) => string;
  error: (description: string, title?: string) => string;
  info: (description: string, title?: string) => string;
  warning: (description: string, title?: string) => string;
  dismiss: (id: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextType | null>(null);

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6500,
};

const MAX_TOASTS = 4;

let toastId = 0;

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /* start auto-dismiss timer */
  const scheduleDismiss = useCallback((id: string, duration: number) => {
    if (duration <= 0) return;
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, duration);
    timersRef.current.set(id, timer);
  }, []);

  /* clean up timers on unmount */
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (options: ToastOptions) => {
      const id = `toast-${++toastId}`;
      const variant = options.variant ?? "info";
      const duration = options.duration ?? DEFAULT_DURATIONS[variant];

      setToasts((prev) => {
        const next = [...prev, { ...options, id, variant }];
        /* enforce MAX_TOASTS */
        while (next.length > MAX_TOASTS) {
          const removed = next.shift()!;
          const t = timersRef.current.get(removed.id);
          if (t) clearTimeout(t);
          timersRef.current.delete(removed.id);
        }
        return next;
      });

      scheduleDismiss(id, duration);
      return id;
    },
    [scheduleDismiss],
  );

  const success = useCallback(
    (desc: string, title?: string) => addToast({ description: desc, title, variant: "success" }),
    [addToast],
  );
  const error = useCallback(
    (desc: string, title?: string) => addToast({ description: desc, title, variant: "error" }),
    [addToast],
  );
  const info = useCallback(
    (desc: string, title?: string) => addToast({ description: desc, title, variant: "info" }),
    [addToast],
  );
  const warning = useCallback(
    (desc: string, title?: string) => addToast({ description: desc, title, variant: "warning" }),
    [addToast],
  );

  /* ── Variant style map ── */
  const iconMap: Record<ToastVariant, typeof CheckCircle2> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colorMap: Record<
    ToastVariant,
    { icon: string; title: string; desc: string; border: string }
  > = {
    success: {
      icon: "text-emerald-700",
      title: "text-emerald-700",
      desc: "text-emerald-900",
      border: "border-emerald-200",
    },
    error: {
      icon: "text-red-600",
      title: "text-red-600",
      desc: "text-red-900",
      border: "border-red-200",
    },
    info: {
      icon: "text-blue-600",
      title: "text-blue-600",
      desc: "text-blue-900",
      border: "border-blue-200",
    },
    warning: {
      icon: "text-amber-700",
      title: "text-amber-700",
      desc: "text-amber-900",
      border: "border-amber-200",
    },
  };

  const defaultTitle: Record<ToastVariant, string> = {
    success: "Berhasil",
    error: "Error",
    info: "Info",
    warning: "Peringatan",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning, dismiss }}>
      {children}

      {/* Toast viewport — full-screen overlay, pointer-events pass through */}
      <div aria-live="polite" className="pointer-events-none fixed inset-0 z-[60]">
        <div className="absolute top-6 right-6 flex w-full max-w-md flex-col items-end gap-3">
          {toasts.map((t) => {
            const Icon = iconMap[t.variant!];
            const c = colorMap[t.variant!];
            const displayTitle = t.title ?? defaultTitle[t.variant!];
            return (
              <div
                key={t.id}
                role={t.variant === "error" ? "alert" : "status"}
                className={`animate-toast-enter pointer-events-auto w-full max-w-[380px] rounded-2xl border bg-white p-4 shadow-[0px_8px_32px_rgba(0,0,0,0.12)] ${c.border}`}
              >
                <div className="flex items-start gap-4">
                  <Icon size={28} className={`mt-0.5 shrink-0 ${c.icon}`} strokeWidth={2.5} />
                  <div className="min-w-0 flex-1">
                    <h5 className={`text-lg leading-tight font-semibold ${c.title}`}>
                      {displayTitle}
                    </h5>
                    <p className={`mt-1 text-sm ${c.desc}`}>{t.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:text-slate-600"
                    aria-label="Tutup notifikasi"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
