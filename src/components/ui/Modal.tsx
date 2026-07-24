import { type ReactNode, useCallback, useEffect } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Action buttons rendered in the footer */
  footer?: ReactNode;
  /** Maximum width Tailwind class, defaults to max-w-lg */
  maxWidth?: string;
  /** Whether pressing Escape should close the modal. Default: true */
  closeOnEscape?: boolean;
  /** Whether to show the X close button in the header. Default: true */
  showCloseButton?: boolean;
};

/**
 * A persistent modal dialog.
 * - Does NOT close when clicking outside (overlay click is ignored).
 * - Supports custom title, content, and footer action buttons.
 * - Escape key and close button can be optionally disabled.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "max-w-lg",
  closeOnEscape = true,
  showCloseButton = true,
}: ModalProps) {
  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === "Escape") onClose();
    },
    [closeOnEscape, onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4"
    >
      <div
        className={`flex w-full ${maxWidth} shadow-level-2 flex-col overflow-hidden rounded-2xl bg-white`}
        style={{ maxHeight: "calc(100vh - 2rem)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-8 py-5">
          <div className="min-w-0">
            <h3 className="text-2xl font-semibold text-slate-800">{title}</h3>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 py-6">{children}</div>

        {/* Footer */}
        {footer ? (
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-8 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
