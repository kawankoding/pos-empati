import { useEffect, useState } from "react";
import { Banknote, CreditCard, Printer, QrCode, X } from "lucide-react";
import Button from "@components/ui/Button";
import { api, type SaleDetail } from "@lib/api";
import { formatIdr } from "@lib/currency";
import { formatDateTime } from "@lib/datetime";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function PaymentBadge({ method }: { method: string }) {
  const config: Record<string, { icon: typeof Banknote; label: string; className: string }> = {
    cash: {
      icon: Banknote,
      label: "Tunai",
      className: "bg-slate-200 text-slate-700",
    },
    qris: {
      icon: QrCode,
      label: "QRIS",
      className: "bg-emerald-100 text-emerald-800",
    },
    card: {
      icon: CreditCard,
      label: "Kartu",
      className: "bg-indigo-100 text-indigo-700",
    },
  };
  const cfg = config[method] ?? config.cash;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${cfg.className}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal                                                             */
/* ------------------------------------------------------------------ */

type SaleDetailModalProps = {
  open: boolean;
  onClose: () => void;
  saleId: number | null;
};

export default function SaleDetailModal({ open, onClose, saleId }: SaleDetailModalProps) {
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printer, setPrinter] = useState<{ vendorId: number; productId: number } | null>(null);

  useEffect(() => {
    api.listPrinters().then((devices) => {
      if (devices.length > 0) setPrinter(devices[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open || saleId === null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getSale(saleId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Gagal memuat detail transaksi.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, saleId]);

  const handlePrint = () => {
    if (!detail) return;
    const { date } = formatDateTime(detail.created_at);
    void api.printReceipt({
      storeName: "Toko Empati",
      storeAddress: "",
      date: `${date} ${new Date(detail.created_at).toLocaleTimeString("id-ID")}`,
      items: detail.items.map((i) => ({
        name: i.product_name,
        qty: i.qty,
        price: i.price,
      })),
      total: detail.total,
      paid: detail.paid,
      change: detail.change_amount,
      cashier: detail.cashier_name,
      txId: `#TE-${String(detail.id).padStart(4, "0")}`,
      logoPath: "/images/toko-empati.png",
      vendorId: printer?.vendorId,
      productId: printer?.productId,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-[0px_8px_24px_rgba(0,0,0,0.15)]">
        {/* Header */}
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">Detail Transaksi</h3>
            <p className="mt-1 text-xs font-bold tracking-wider text-emerald-700">
              {detail ? `#TE-${String(detail.id).padStart(4, "0")}` : "..."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Memuat detail...</div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </div>
          ) : detail ? (
            <>
              {/* Info grid */}
              <div className="mb-6 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Tanggal &amp; Waktu
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {(() => {
                      const { date, time } = formatDateTime(detail.created_at);
                      return `${date} • ${time}`;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Kasir
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">{detail.cashier_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    Pembayaran
                  </p>
                  <div className="mt-1">
                    <PaymentBadge method={detail.payment_method} />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h4 className="mb-3 border-b border-slate-200 pb-1 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Item Dibeli
                </h4>
                <div className="space-y-3">
                  {detail.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.product_name}</p>
                        <p className="text-xs text-slate-500">
                          {formatIdr(item.price)} x {item.qty}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {formatIdr(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-slate-200 p-5">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatIdr(detail.total)}</span>
                </div>
                <div className="my-3 h-px bg-slate-200" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatIdr(detail.total)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Dibayar</span>
                  <span className="font-medium text-slate-700">{formatIdr(detail.paid)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Kembalian</span>
                  <span className="font-medium text-slate-700">
                    {formatIdr(detail.change_amount)}
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="flex items-center gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Tutup
          </Button>
          <Button
            variant="primary"
            leftIcon={<Printer size={16} />}
            onClick={handlePrint}
            disabled={!detail}
            className="flex-[2]"
          >
            Cetak Ulang Struk
          </Button>
        </footer>
      </div>
    </div>
  );
}
