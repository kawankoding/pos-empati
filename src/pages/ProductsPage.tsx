import { useEffect, useMemo, useState } from "react";
import { Download, Pencil, RefreshCw, Search, Tag, Trash2, TrendingUp } from "lucide-react";
import ProductModal from "@components/modals/ProductModal";
import ConfirmModal from "@components/modals/ConfirmModal";
import Button from "@components/ui/Button";
import { api, type Category, type Product, type MutationResult } from "@lib/api";
import { formatIdr, formatIdrCompact } from "@lib/currency";
import { useToast } from "@lib/ToastContext";

export type ProductForm = {
  category_id: number | null;
  name: string;
  sku: string;
  buy_price: number;
  sell_price: number;
  stock: string;
};

// eslint-disable-next-line react-refresh/only-export-components
export const defaultForm: ProductForm = {
  category_id: null,
  name: "",
  sku: "",
  buy_price: 0,
  sell_price: 0,
  stock: "",
};

function computeInventoryValue(products: Product[]): string {
  const total = products.reduce((sum, p) => sum + p.sell_price * p.stock, 0);
  return formatIdrCompact(total);
}

function countLowStock(products: Product[]): number {
  return products.filter((p) => p.stock <= 10).length;
}

function getProductVisual(product: Product): string {
  const seed = product.id % 5;
  const gradients = [
    "from-emerald-100 to-emerald-50",
    "from-blue-100 to-indigo-50",
    "from-amber-100 to-orange-50",
    "from-fuchsia-100 to-pink-50",
    "from-teal-100 to-cyan-50",
  ];
  return gradients[seed] ?? gradients[0];
}

/* ------------------------------------------------------------------ */
/*  StatCard                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
  valueClassName,
  icon: Icon,
  badge,
}: {
  title: string;
  value: string;
  valueClassName?: string;
  icon?: typeof Tag;
  badge?: { icon?: typeof TrendingUp; text: string; variant?: "error" | "default" };
}) {
  return (
    <div className="shadow-level-1 rounded-xl border border-transparent bg-white p-5 transition-all hover:border-emerald-200">
      <p className="mb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
      <div className="flex items-end justify-between">
        <h3 className={`text-4xl font-bold text-slate-800 ${valueClassName ?? ""}`}>{value}</h3>
        <div className="mb-2 flex items-center gap-1">
          {badge?.icon ? (
            <badge.icon size={16} className="text-emerald-600" strokeWidth={2.5} />
          ) : null}
          {Icon ? <Icon size={22} className="text-slate-400" strokeWidth={1.8} /> : null}
          {badge?.text ? (
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                badge.variant === "error"
                  ? "bg-red-100 text-red-700"
                  : badge.icon
                    ? "text-emerald-700"
                    : "text-slate-500"
              }`}
            >
              {badge.text}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InventoryStats                                                    */
/* ------------------------------------------------------------------ */

function InventoryStats({ products, categories }: { products: Product[]; categories: Category[] }) {
  const totalProducts = products.length;
  const lowStock = countLowStock(products);
  const inventoryValue = computeInventoryValue(products);
  const activeCategories = categories.length;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
      <StatCard
        title="Total Produk"
        value={String(totalProducts)}
        badge={{ icon: TrendingUp, text: `${products.length > 0 ? "+" : ""}${products.length}` }}
      />
      <StatCard
        title="Stok Menipis"
        value={String(lowStock)}
        valueClassName={lowStock > 0 ? "text-red-600" : undefined}
        badge={{ text: "PERLU AKSI", variant: "error" }}
      />
      <StatCard title="Nilai Inventaris" value={inventoryValue} badge={{ text: "IDR" }} />
      <StatCard title="Kategori Aktif" value={String(activeCategories)} icon={Tag} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProductsPage                                                      */
/* ------------------------------------------------------------------ */

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialForm, setInitialForm] = useState<ProductForm>(defaultForm);
  const [search, setSearch] = useState("");
  const [showLowStock, setShowLowStock] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [exporting, setExporting] = useState(false);

  const { success, error: toastError } = useToast();

  // Filter products by search and low-stock toggle
  const filteredProducts = useMemo(() => {
    let result = products;

    if (showLowStock) {
      result = result.filter((p) => p.stock <= 10);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.category_name ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [products, search, showLowStock]);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, categoriesData] = await Promise.all([
        api.listProducts(),
        api.listCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch {
      setError("Gagal memuat data produk.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openCreateDialog = () => {
    setEditingId(null);
    setInitialForm(defaultForm);
    setDialogOpen(true);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setInitialForm({
      category_id: product.category_id,
      name: product.name,
      sku: product.sku ?? "",
      buy_price: product.buy_price,
      sell_price: product.sell_price,
      stock: String(product.stock),
    });
    setDialogOpen(true);
  };

  const handleFormSubmit = async (form: ProductForm): Promise<MutationResult> => {
    const payload = {
      category_id: form.category_id,
      name: form.name,
      sku: form.sku.trim() || null,
      buy_price: form.buy_price,
      sell_price: form.sell_price,
      stock: Number(form.stock),
    };

    const result = editingId
      ? await api.updateProduct({ id: editingId, ...payload })
      : await api.createProduct(payload);

    if (!result.ok) {
      return result;
    }

    success(editingId ? "Produk berhasil diperbarui." : "Produk berhasil dibuat.");
    setDialogOpen(false);
    setEditingId(null);
    await loadData();
    return { ok: true };
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await removeProduct(deleteTarget.id);
    setDeleteTarget(null);
  };

  const removeProduct = async (id: number) => {
    const result = await api.deleteProduct(id);
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    success("Produk berhasil dihapus.");
    await loadData();
  };

  const handleExport = async () => {
    const data = showLowStock
      ? products.filter((p) => p.stock <= 10)
      : search.trim()
        ? filteredProducts
        : products;

    if (data.length === 0) {
      toastError("Tidak ada data untuk diekspor.");
      return;
    }

    setExporting(true);
    try {
      const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const headers = [
        "Nama Produk",
        "SKU",
        "Kategori",
        "Harga Beli",
        "Harga Jual",
        "Stok",
        "Laba Per Unit",
      ];

      const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

      const rows = data.map((p) => [
        p.name,
        p.sku ?? "",
        categoryMap[p.category_id ?? -1] ?? "Tanpa Kategori",
        String(p.buy_price),
        String(p.sell_price),
        String(p.stock),
        String(p.sell_price - p.buy_price),
      ]);

      const csv =
        headers.map(escapeCsv).join(",") +
        "\n" +
        rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
      const result = await api.exportCsv({
        csv,
        defaultName: `produk-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      if (result.ok) success("Data produk berhasil diekspor.");
      else if (result.message !== "Dibatalkan.") toastError(result.message);
    } catch {
      toastError("Gagal mengekspor data produk.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Produk</h2>
          <p className="text-sm text-slate-500">Kelola produk toko.</p>
        </div>
        <Button variant="primary" onClick={openCreateDialog}>
          Tambah Produk
        </Button>
      </div>

      {/* Error banner */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
          <p className="mb-3 text-sm text-red-700">{error}</p>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void loadData()}
          >
            Coba Lagi
          </Button>
        </div>
      ) : null}

      <InventoryStats products={products} categories={categories} />

      {/* Products table */}
      {loading ? (
        <div className="table-wrap py-12 text-center text-sm text-slate-500">Memuat produk...</div>
      ) : error ? null : (
        <div className="table-wrap">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLowStock(false)}
                className={`chip ${!showLowStock ? "active" : ""}`}
              >
                Semua Produk
              </button>
              <button
                type="button"
                onClick={() => setShowLowStock(true)}
                className={`chip ${showLowStock ? "active" : ""}`}
              >
                Stok Menipis
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari produk, SKU, atau kategori..."
                  className="input-base pl-10"
                />
              </div>
              <Button
                variant="secondary"
                leftIcon={<Download size={16} />}
                loading={exporting}
                onClick={handleExport}
              >
                {exporting ? "Mengekspor..." : "Ekspor"}
              </Button>
            </div>
          </div>

          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="table-head">
                <th className="px-5 py-3">Gambar</th>
                <th className="px-5 py-3">Nama Produk</th>
                <th className="px-5 py-3">Kategori</th>
                <th className="px-5 py-3 text-right">Harga Jual</th>
                <th className="px-5 py-3">Status Stok</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map((product) => {
                const profitPerUnit = product.sell_price - product.buy_price;
                const categoryName =
                  product.category_name ??
                  categoryMap[product.category_id ?? -1] ??
                  "Tanpa Kategori";
                const lowStock = product.stock <= 10;

                return (
                  <tr key={product.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div
                        className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${getProductVisual(product)}`}
                      >
                        <span className="text-sm font-bold text-slate-700">
                          {product.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-slate-800">{product.name}</p>
                      <p className="text-xs text-slate-500">
                        {product.sku ? `SKU: ${product.sku}` : "Tanpa SKU"}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="chip active">{categoryName}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatIdr(product.sell_price)}
                      </span>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Beli: {formatIdr(product.buy_price)} • Laba:&nbsp;
                        <span className={profitPerUnit >= 0 ? "text-emerald-600" : "text-red-600"}>
                          {formatIdr(profitPerUnit)}
                        </span>
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${lowStock ? "bg-red-500" : "bg-emerald-500"}`}
                        />
                        <span
                          className={`text-sm ${lowStock ? "font-bold text-red-600" : "text-slate-700"}`}
                        >
                          {lowStock
                            ? `Stok Menipis (${product.stock})`
                            : `Tersedia (${product.stock})`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(product)}>
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(product)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
                    {search.trim()
                      ? "Produk tidak ditemukan."
                      : 'Belum ada produk. Klik "Tambah Produk" untuk menambah item pertama.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <p className="text-xs text-slate-500">
              Menampilkan {filteredProducts.length} dari {products.length}
            </p>
          </div>
        </div>
      )}

      {/* Product form modal */}
      <ProductModal
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingId(null);
        }}
        onSubmit={handleFormSubmit}
        initialForm={initialForm}
        editingId={editingId}
        categories={categories}
        maxWidth="max-w-3xl"
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
        title="Hapus Produk"
        message={`Yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
