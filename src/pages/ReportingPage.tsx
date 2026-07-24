import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BarChart3,
  Calendar,
  ListFilter,
  MoreVertical,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Button from "@components/ui/Button";
import FieldInput from "@components/ui/FieldInput";
import { api, type SaleRecord } from "@lib/api";
import { todayISO, daysAgo, isToday, isWithinDays, dayOfWeekIndex } from "@lib/datetime";
import { formatIdr } from "@lib/currency";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

type DateRangePreset = "today" | "7d" | "30d" | "custom";

/* ------------------------------------------------------------------ */
/*  SparklineChart                                                    */
/* ------------------------------------------------------------------ */

function SparklineChart({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 1000;
  const height = 300;
  const padding = 40;
  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPath = `M${padding},${height - padding} L${points} L${width - padding},${height - padding} Z`;
  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sparkGradient" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGradient)" />
      <polyline
        points={points}
        fill="none"
        stroke="#006e2f"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.slice(-3).map((val, i) => {
        const idx = data.length - 3 + i;
        const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - min) / range) * (height - padding * 2);
        return <circle key={idx} cx={x} cy={y} r="6" fill="#006e2f" />;
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  KpiCard                                                           */
/* ------------------------------------------------------------------ */

function KpiCard({
  icon: Icon,
  title,
  value,
  trend,
  trendUp,
}: {
  icon: typeof Banknote;
  title: string;
  value: string;
  trend: string;
  trendUp?: boolean;
}) {
  return (
    <div className="group shadow-level-1 rounded-xl border border-transparent bg-white p-6 transition-all hover:border-emerald-400">
      <div className="mb-2 flex items-start justify-between">
        <div className="rounded-lg bg-emerald-500/10 p-2 transition-colors group-hover:bg-emerald-500">
          <Icon size={20} className="text-emerald-600 transition-colors group-hover:text-white" />
        </div>
        {trend ? (
          <span
            className={`flex items-center gap-1 text-sm font-bold ${trendUp ? "text-emerald-700" : "text-red-500"}`}
          >
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend}
          </span>
        ) : null}
      </div>
      <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
      <h3 className="mt-1 text-4xl font-bold text-slate-800">{value}</h3>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TopSellersList                                                    */
/* ------------------------------------------------------------------ */

function getProductGradient(id: number): string {
  const gradients = [
    "from-emerald-100 to-emerald-50",
    "from-blue-100 to-indigo-50",
    "from-amber-100 to-orange-50",
    "from-fuchsia-100 to-pink-50",
    "from-teal-100 to-cyan-50",
  ];
  return gradients[id % gradients.length] ?? gradients[0];
}

type TopProduct = { id: number; name: string; qty_sold: number; amount: number; profit: number };

function TopSellersList({ products, maxAmount }: { products: TopProduct[]; maxAmount: number }) {
  const barMax = maxAmount || 1;
  return (
    <div className="space-y-4">
      {products.slice(0, 4).map((item) => {
        const pct = Math.round((item.amount / barMax) * 100);
        return (
          <div
            key={item.id}
            className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-slate-50"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${getProductGradient(item.id)} text-xs font-bold text-slate-700`}
            >
              {item.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{formatIdr(item.amount)}</p>
              <p className="text-xs text-slate-500">{item.qty_sold} terjual</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ReportingPage  — same query as SalesPage                          */
/* ------------------------------------------------------------------ */

export default function ReportingPage() {
  const today = todayISO();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Fetch all sales — SAME query as SalesPage
  const loadSales = async () => {
    setSalesError(null);
    try {
      const data = await api.listSales();
      setSales(data);
    } catch {
      setSalesError("Gagal memuat data penjualan.");
    }
  };

  useEffect(() => {
    void loadSales();
  }, []);

  const applyPreset = (p: DateRangePreset) => {
    setPreset(p);
    const end = todayISO();
    setEndDate(end);
    if (p === "today") setStartDate(end);
    else if (p === "7d") setStartDate(daysAgo(6));
    else if (p === "30d") setStartDate(daysAgo(29));
  };

  // Filter by date — SAME helpers as SalesPage
  const dateFiltered = useMemo(() => {
    if (preset === "today") return sales.filter((s) => isToday(s.created_at));
    if (preset === "7d") return sales.filter((s) => isWithinDays(s.created_at, 7));
    if (preset === "30d") return sales.filter((s) => isWithinDays(s.created_at, 30));
    if (preset === "custom")
      return sales.filter((s) => {
        const d = new Date(s.created_at + "Z");
        const sd = new Date(startDate + "T00:00:00");
        const ed = new Date(endDate + "T23:59:59");
        return d >= sd && d <= ed;
      });
    return sales;
  }, [sales, preset, startDate, endDate]);

  // Only completed sales for revenue
  const completed = useMemo(
    () => dateFiltered.filter((s) => s.status === "completed"),
    [dateFiltered],
  );

  // Summary — SAME logic as SalesPage
  const revenue = completed.reduce((sum, s) => sum + s.total, 0);
  const transactions = completed.length;
  const avgOrderValue = transactions > 0 ? revenue / transactions : 0;

  // Top products & profit from the backend report query
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [profit, setProfit] = useState({
    grossProfit: 0,
    avgMarginPerItem: 0,
    profitMarginPercentage: 0,
  });
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadDetail = async (start: string, end: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const result = await api.reportSummary({ startDate: start, endDate: end });
      setTopProducts(result.topProducts);
      setProfit(result.profit);
    } catch {
      setDetailError("Gagal memuat laporan detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail(startDate, endDate);
  }, [startDate, endDate]);

  const maxTopAmount = useMemo(
    () => Math.max(1, ...topProducts.map((p) => p.amount)),
    [topProducts],
  );

  // Real chart data — daily totals grouped by day of week
  const chartData = useMemo(() => {
    // Initialize 7 slots: Sen, Sel, Rab, Kam, Jum, Sab, Min
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];

    for (const sale of completed) {
      const idx = dayOfWeekIndex(sale.created_at);
      dailyTotals[idx] += sale.total;
    }

    return dailyTotals;
  }, [completed]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Dasbor Laporan Penjualan</h2>
          <p className="text-sm text-slate-500">Analisis performa bisnis Anda.</p>
        </div>
        <div className="flex flex-wrap items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["today", "7d", "30d"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${preset === key ? "bg-emerald-500 text-emerald-900" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {key === "today" ? "Hari Ini" : key === "7d" ? "7 Hari" : "30 Hari"}
            </button>
          ))}
          <div className="mx-1 h-6 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => applyPreset("custom")}
            className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${preset === "custom" ? "bg-emerald-500 text-emerald-900" : "text-slate-500 hover:bg-slate-100"}`}
          >
            <Calendar size={14} /> Kustom
          </button>
        </div>
      </div>

      {/* Error banners */}
      {salesError ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
          <p className="mb-3 text-sm text-red-700">{salesError}</p>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void loadSales()}
          >
            Coba Lagi
          </Button>
        </div>
      ) : null}

      {!salesError ? (
        <>
          {/* KPI Cards — computed from same listSales query */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <KpiCard
              icon={Banknote}
              title="Total Pendapatan"
              value={formatIdr(revenue)}
              trend={`${profit.profitMarginPercentage}%`}
              trendUp={profit.profitMarginPercentage >= 0}
            />
            <KpiCard
              icon={ShoppingBag}
              title="Total Pesanan"
              value={String(transactions)}
              trend={transactions > 0 ? "Aktif" : ""}
              trendUp
            />
            <KpiCard
              icon={BarChart3}
              title="Rata-rata Pesanan"
              value={formatIdr(avgOrderValue)}
              trend={profit.grossProfit > 0 ? `${formatIdr(profit.grossProfit)} laba` : ""}
              trendUp
            />
          </div>

          <div className="grid grid-cols-12 gap-5">
            <div className="shadow-level-1 col-span-12 flex flex-col rounded-xl bg-white p-6 lg:col-span-8">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-semibold text-slate-800">Tren Penjualan</h4>
                  <p className="text-sm text-slate-500">Performa harian semua outlet</p>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreVertical size={18} />
                </Button>
              </div>
              <div className="relative min-h-[350px] flex-1">
                <SparklineChart data={chartData} />
                <div className="mt-2 flex justify-between px-6 text-xs text-slate-500">
                  <span>Sen</span>
                  <span>Sel</span>
                  <span>Rab</span>
                  <span>Kam</span>
                  <span>Jum</span>
                  <span>Sab</span>
                  <span>Min</span>
                </div>
              </div>
            </div>

            <div className="shadow-level-1 col-span-12 flex flex-col rounded-xl bg-white p-6 lg:col-span-4">
              <div className="mb-6 flex items-center justify-between">
                <h4 className="text-xl font-semibold text-slate-800">Penjualan Teratas</h4>
                <span className="text-sm font-semibold text-emerald-600">Lihat Semua</span>
              </div>
              {detailError ? (
                <div className="py-4 text-center">
                  <p className="mb-3 text-sm text-red-700">{detailError}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshCw size={14} />}
                    onClick={() => void loadDetail(startDate, endDate)}
                  >
                    Coba Lagi
                  </Button>
                </div>
              ) : detailLoading ? (
                <p className="py-8 text-center text-sm text-slate-500">Memuat data produk...</p>
              ) : topProducts.length > 0 ? (
                <TopSellersList products={topProducts} maxAmount={maxTopAmount} />
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">Belum ada data penjualan.</p>
              )}
              <div className="mt-auto border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Margin Laba</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {profit.profitMarginPercentage}%
                  </p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.abs(profit.profitMarginPercentage))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="shadow-level-1 col-span-12 overflow-hidden rounded-xl bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h4 className="text-xl font-semibold text-slate-800">Produk Teratas</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-sm font-semibold text-slate-500">Produk</th>
                      <th className="px-6 py-3 text-sm font-semibold text-slate-500">
                        Jml Terjual
                      </th>
                      <th className="px-6 py-3 text-sm font-semibold text-slate-500">Pendapatan</th>
                      <th className="px-6 py-3 text-sm font-semibold text-slate-500">Laba</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {detailError ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center">
                          <p className="mb-3 text-sm text-red-700">{detailError}</p>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RefreshCw size={14} />}
                            onClick={() => void loadDetail(startDate, endDate)}
                          >
                            Coba Lagi
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      topProducts.map((item) => {
                        const isTop = item.amount === maxTopAmount;
                        const isHighProfit = item.profit > item.amount * 0.3;
                        return (
                          <tr key={item.id} className="transition-colors hover:bg-white">
                            <td className="px-6 py-3 text-sm font-medium text-emerald-700">
                              {item.name}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-500">{item.qty_sold}</td>
                            <td className="px-6 py-3 text-sm text-slate-800">
                              {formatIdr(item.amount)}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-emerald-700">
                              {formatIdr(item.profit)}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-bold tracking-tight uppercase ${isTop ? "bg-emerald-500/20 text-emerald-900" : isHighProfit ? "bg-blue-500/20 text-blue-800" : "bg-slate-100 text-slate-600"}`}
                              >
                                {isTop ? "Terlaris" : isHighProfit ? "Margin Tinggi" : "Aktif"}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    {!detailError && topProducts.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                          Tidak ada data penjualan pada rentang tanggal yang dipilih.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {preset === "custom" && (
        <div className="surface-card">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FieldInput
              label="Tanggal Mulai"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <FieldInput
              label="Tanggal Akhir"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="primary"
                fullWidth
                onClick={() => void loadDetail(startDate, endDate)}
              >
                Muat Laporan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
