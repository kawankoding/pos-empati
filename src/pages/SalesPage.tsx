import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  QrCode,
  Receipt,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { api, type SaleRecord } from "@lib/api";
import { isToday, isYesterday, isWithinDays, todayDisplay, formatDateTime } from "@lib/datetime";
import { formatIdr } from "@lib/currency";
import { useToast } from "@lib/ToastContext";
import Button from "@components/ui/Button";
import FieldSelect from "@components/ui/FieldSelect";
import SaleDetailModal from "@components/modals/SaleDetailModal";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type SaleStatus = "completed" | "refunded" | "pending";
type DatePreset = "today" | "yesterday" | "7d" | "all";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Payment Method Badge                                               */
/* ------------------------------------------------------------------ */

function PaymentBadge({ method }: { method: string }) {
  const config: Record<string, { icon: typeof Banknote; label: string; className: string }> = {
    cash: { icon: Banknote, label: "Tunai", className: "bg-slate-200 text-slate-700" },
    qris: { icon: QrCode, label: "QRIS", className: "bg-emerald-100 text-emerald-800" },
    card: { icon: CreditCard, label: "Kartu", className: "bg-indigo-100 text-indigo-700" },
  };

  const cfg = config[method] ?? config.cash;
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${cfg.className}`}
    >
      <Icon size={14} strokeWidth={2.2} />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-800",
    refunded: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };

  const label: Record<string, string> = {
    completed: "Selesai",
    refunded: "Dikembalikan",
    pending: "Tertunda",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${config[status] ?? config.completed}`}
    >
      {label[status] ?? status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  SalesPage                                                         */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 5;

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [statusFilter, setStatusFilter] = useState<"all" | SaleStatus>("all");
  const [cashierFilter, setCashierFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  const { success, error: toastError } = useToast();

  const loadSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listSales();
      setSales(data);
    } catch {
      setError("Gagal memuat data penjualan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSales();
  }, []);

  const cashiers = useMemo(() => {
    const names = new Set(sales.map((s) => s.cashier_name));
    return Array.from(names).sort();
  }, [sales]);

  // Filter by date preset
  const dateFiltered = useMemo(() => {
    if (datePreset === "today") return sales.filter((s) => isToday(s.created_at));
    if (datePreset === "yesterday") return sales.filter((s) => isYesterday(s.created_at));
    if (datePreset === "7d") return sales.filter((s) => isWithinDays(s.created_at, 7));
    return sales; // "all"
  }, [sales, datePreset]);

  // Filter by status + cashier
  const filteredSales = useMemo(() => {
    let result = dateFiltered;

    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (cashierFilter !== "all") {
      result = result.filter((s) => s.cashier_name === cashierFilter);
    }
    return result;
  }, [dateFiltered, statusFilter, cashierFilter]);

  // Summary — same logic both pages use
  const summary = useMemo(() => {
    const completed = filteredSales.filter((s) => s.status === "completed");
    const totalSales = completed.reduce((sum, s) => sum + s.total, 0);
    const totalTransactions = completed.length;
    const totalProfit = completed.reduce((sum, s) => sum + (s.profit ?? 0), 0);
    return { totalSales, totalTransactions, totalProfit };
  }, [filteredSales]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSales = filteredSales.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleViewSale = (saleId: number) => {
    setSelectedSaleId(saleId);
  };

  const handleExport = async () => {
    if (filteredSales.length === 0) {
      toastError("Tidak ada data untuk diekspor.");
      return;
    }

    setExporting(true);
    try {
      // Build CSV
      const headers = [
        "ID Transaksi",
        "Tanggal",
        "Waktu",
        "Kasir",
        "Metode Pembayaran",
        "Total",
        "Dibayar",
        "Kembalian",
        "Status",
      ];

      const rows = filteredSales.map((sale) => {
        const { date, time } = formatDateTime(sale.created_at);
        const txId = `#TE-${String(sale.id).padStart(4, "0")}`;
        const method =
          sale.payment_method === "cash"
            ? "Tunai"
            : sale.payment_method === "qris"
              ? "QRIS"
              : sale.payment_method === "card"
                ? "Kartu"
                : sale.payment_method;
        const status =
          sale.status === "completed"
            ? "Selesai"
            : sale.status === "refunded"
              ? "Dikembalikan"
              : "Tertunda";

        return [
          txId,
          date,
          time,
          sale.cashier_name,
          method,
          String(sale.total),
          String(sale.paid),
          String(sale.change_amount),
          status,
        ];
      });

      const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const csv =
        headers.map(escapeCsv).join(",") +
        "\n" +
        rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

      const today = new Date().toISOString().slice(0, 10);
      const result = await api.exportCsv({
        csv,
        defaultName: `laporan-penjualan-${today}.csv`,
      });

      if (result.ok) {
        success("Laporan berhasil diekspor.");
      } else if (result.message !== "Dibatalkan.") {
        toastError(result.message);
      }
    } catch {
      toastError("Gagal mengekspor laporan.");
    } finally {
      setExporting(false);
    }
  };

  const paginationButtons = useMemo(() => {
    const buttons: Array<{ label: string; page: number; active: boolean; ellipsis?: boolean }> = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push({ label: String(i), page: i, active: i === safePage });
      }
    } else {
      buttons.push({ label: "1", page: 1, active: safePage === 1 });
      if (safePage > 3) buttons.push({ label: "...", page: -1, active: false, ellipsis: true });
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) {
        buttons.push({ label: String(i), page: i, active: i === safePage });
      }
      if (safePage < totalPages - 2)
        buttons.push({ label: "...", page: -1, active: false, ellipsis: true });
      buttons.push({
        label: String(totalPages),
        page: totalPages,
        active: safePage === totalPages,
      });
    }

    return buttons;
  }, [safePage, totalPages]);

  const showFrom = filteredSales.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const showTo = Math.min(safePage * ITEMS_PER_PAGE, filteredSales.length);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Penjualan</h2>
          <p className="text-sm text-slate-500">Lihat riwayat transaksi penjualan.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <Banknote size={24} className="text-emerald-700" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Total Penjualan Hari Ini
            </p>
            <h3 className="text-2xl font-bold text-slate-800">{formatIdr(summary.totalSales)}</h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100">
            <Receipt size={24} className="text-purple-700" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Total Transaksi
            </p>
            <h3 className="text-2xl font-bold text-slate-800">
              {summary.totalTransactions} Pesanan
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <TrendingUp size={24} className="text-amber-700" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Total Keuntungan
            </p>
            <h3 className="text-2xl font-bold text-slate-800">{formatIdr(summary.totalProfit)}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <FieldSelect
            label="Tanggal"
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value as DatePreset);
              setCurrentPage(1);
            }}
          >
            <option value="today">Hari Ini, {todayDisplay()}</option>
            <option value="yesterday">Kemarin</option>
            <option value="7d">7 Hari Terakhir</option>
            <option value="all">Semua</option>
          </FieldSelect>
          <FieldSelect
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | SaleStatus);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Status</option>
            <option value="completed">Selesai</option>
            <option value="refunded">Dikembalikan</option>
            <option value="pending">Tertunda</option>
          </FieldSelect>
          <FieldSelect
            label="Kasir"
            value={cashierFilter}
            onChange={(e) => {
              setCashierFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Semua Kasir</option>
            {cashiers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FieldSelect>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="py-2"
          leftIcon={<Download size={16} />}
          loading={exporting}
          onClick={handleExport}
        >
          {exporting ? "Mengekspor..." : "Ekspor Laporan"}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-sm">
        {error ? (
          <div className="px-5 py-8 text-center">
            <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void loadSales()}
            >
              Coba Lagi
            </Button>
          </div>
        ) : loading ? (
          <div className="px-5 py-16 text-center text-sm text-slate-500">Memuat transaksi...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      ID Transaksi
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Tanggal &amp; Waktu
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Kasir
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Metode Pembayaran
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Total
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Margin
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      Status
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((sale) => {
                    const { date, time } = formatDateTime(sale.created_at);
                    const txId = `#TE-${sale.id.toString().padStart(4, "0")}`;
                    return (
                      <tr
                        key={sale.id}
                        className="group cursor-pointer transition-colors hover:bg-slate-50"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-800">{txId}</td>
                        <td className="px-5 py-3 text-slate-500">
                          {date} &bull; {time}
                        </td>
                        <td className="px-5 py-3 text-slate-700">{sale.cashier_name}</td>
                        <td className="px-5 py-3">
                          <PaymentBadge method={sale.payment_method} />
                        </td>
                        <td
                          className={`px-5 py-3 font-semibold ${sale.status === "refunded" ? "text-red-600" : "text-slate-800"}`}
                        >
                          {formatIdr(sale.total)}
                        </td>
                        <td className="px-5 py-3 font-semibold text-emerald-700">
                          {formatIdr(sale.profit ?? 0)}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={sale.status} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewSale(sale.id)}
                            className="rounded-full p-2 text-slate-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedSales.length === 0 && error === null && !loading && (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">
                        Tidak ada transaksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <span className="text-xs text-slate-500">
                Menampilkan {showFrom} sampai {showTo} dari {filteredSales.length} entri
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => handlePageChange(safePage - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft size={16} />
                </button>
                {paginationButtons.map((btn, i) =>
                  btn.ellipsis ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-sm text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={btn.page}
                      type="button"
                      onClick={() => handlePageChange(btn.page)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${btn.active ? "bg-emerald-700 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
                    >
                      {btn.label}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => handlePageChange(safePage + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <SaleDetailModal
        open={selectedSaleId !== null}
        onClose={() => setSelectedSaleId(null)}
        saleId={selectedSaleId}
      />
    </div>
  );
}
