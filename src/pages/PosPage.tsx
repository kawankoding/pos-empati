import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Printer, Save, X } from "lucide-react";
import Button from "@components/ui/Button";
import FieldCurrency from "@components/ui/FieldCurrency";
import { api, type AuthUser, type Category, type Product } from "@lib/api";
import { formatIdr } from "@lib/currency";
import { useToast } from "@lib/ToastContext";
import { useSettings } from "@lib/SettingsContext";
import { formatDateTime } from "@lib/datetime";
import logo from "/images/toko-empati.png";

type CartItem = {
  product: Product;
  qty: number;
};

type ParkedCart = {
  items: CartItem[];
  paid: number;
  timestamp: string;
};

type LastReceipt = {
  items: { name: string; qty: number; price: number }[];
  total: number;
  paid: number;
  change: number;
  cashier: string;
  txId: string;
  date: string;
  storeName: string;
  storeAddress: string;
};

const PARKED_CART_KEY = "pos_empati_parked_cart";
const LAST_RECEIPT_KEY = "pos_empati_last_receipt";

function loadJsonFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
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

export default function PosPage({ session }: { session: AuthUser }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paid, setPaid] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [lastAddedProductId, setLastAddedProductId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [parkedCart, setParkedCart] = useState<ParkedCart | null>(() => {
    const cart = loadJsonFromStorage<ParkedCart>(PARKED_CART_KEY);
    // Clean up old parked cart data that might be missing timestamp
    if (cart && !cart.timestamp) {
      localStorage.removeItem(PARKED_CART_KEY);
      return null;
    }
    return cart;
  });

  const { success, error: toastError, info, warning } = useToast();
  const { settings } = useSettings();
  const [printer, setPrinter] = useState<{ vendorId: number; productId: number } | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const loadData = async (): Promise<void> => {
    const [categoriesData, productsData] = await Promise.all([
      api.listCategories(),
      api.listProducts(),
    ]);
    setCategories(categoriesData);
    setProducts(productsData);
  };

  useEffect(() => {
    void loadData();
    setPage(1);
    api
      .listPrinters()
      .then((devices) => {
        if (devices.length > 0) setPrinter(devices[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, search]);

  const parkCart = (): void => {
    if (cart.length === 0) return;
    const data: ParkedCart = { items: cart, paid, timestamp: new Date().toISOString() };
    localStorage.setItem(PARKED_CART_KEY, JSON.stringify(data));
    setParkedCart(data);
    setCart([]);
    setPaid(0);
    info("Pesanan ditahan.", "Anda dapat melanjutkan nanti.");
  };

  const resumeCart = (): void => {
    if (!parkedCart) return;
    setCart(parkedCart.items);
    setPaid(parkedCart.paid);
    localStorage.removeItem(PARKED_CART_KEY);
    setParkedCart(null);
    info("Pesanan dilanjutkan.");
  };

  const discardCart = (): void => {
    localStorage.removeItem(PARKED_CART_KEY);
    setParkedCart(null);
    info("Pesanan ditahan dihapus.");
  };

  const reprintReceipt = async (): Promise<void> => {
    const receipt = loadJsonFromStorage<LastReceipt>(LAST_RECEIPT_KEY);
    if (!receipt) {
      warning("Belum ada struk terakhir.");
      return;
    }
    try {
      await api.printReceipt({
        ...receipt,
        logoPath: "/images/toko-empati.png",
        vendorId: printer?.vendorId,
        productId: printer?.productId,
      });
      success("Struk dicetak ulang.");
    } catch {
      toastError("Gagal mencetak ulang struk.");
    }
  };

  const visibleProducts = useMemo(() => {
    const loweredSearch = search.toLowerCase();
    return products.filter((product) => {
      const categoryMatch = selectedCategory === "all" || product.category_id === selectedCategory;
      const searchMatch =
        product.name.toLowerCase().includes(loweredSearch) ||
        (product.sku ?? "").toLowerCase().includes(loweredSearch) ||
        (product.category_name ?? "").toLowerCase().includes(loweredSearch);
      return categoryMatch && searchMatch;
    });
  }, [products, search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = visibleProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sell_price * item.qty, 0),
    [cart],
  );

  const tax = 0;
  const total = subtotal + tax;
  const paidAmount = paid;
  const changeAmount = Math.max(0, paidAmount - total);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const addToCart = (product: Product): void => {
    setLastAddedProductId(product.id);
    setTimeout(() => setLastAddedProductId(null), 320);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (!existing) return [...prev, { product, qty: 1 }];
      const nextQty = existing.qty + 1;
      if (nextQty > product.stock) {
        toastError(`Stok ${product.name} hanya ${product.stock}.`);
        return prev;
      }
      return prev.map((item) =>
        item.product.id === product.id ? { ...item, qty: nextQty } : item,
      );
    });
  };

  const updateQty = (productId: number, qty: number): void => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        if (qty > item.product.stock) return item;
        return { ...item, qty };
      }),
    );
  };

  const checkout = async (printAfterPay?: boolean): Promise<void> => {
    if (processing) return;
    if (cart.length === 0) {
      info("Keranjang kosong.");
      return;
    }
    if (paidAmount < total) {
      warning("Jumlah dibayar kurang dari total.");
      return;
    }
    setProcessing(true);
    try {
      const result = await api.createSale({
        paid: paidAmount,
        items: cart.map((item) => ({ productId: item.product.id, qty: item.qty })),
      });
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      success(
        `Transaksi #${result.saleId} selesai.`,
        `Kembalian: ${formatIdr(result.changeAmount)}`,
      );

      const { date } = formatDateTime(new Date().toISOString());
      const receiptData: LastReceipt = {
        storeName: settings?.store_name ?? "Toko Empati",
        storeAddress: settings?.store_address ?? "",
        date: `${date} ${new Date().toLocaleTimeString("id-ID")}`,
        items: cart.map((item) => ({
          name: item.product.name,
          qty: item.qty,
          price: item.product.sell_price,
        })),
        total: result.total,
        paid: paidAmount,
        change: result.changeAmount,
        cashier: session.username,
        txId: `#TE-${String(result.saleId).padStart(4, "0")}`,
      };
      localStorage.setItem(LAST_RECEIPT_KEY, JSON.stringify(receiptData));

      // Print if user clicked "Bayar & Cetak" or auto-print is enabled
      if (printAfterPay || settings?.auto_print_receipts === "true") {
        void api.printReceipt({
          ...receiptData,
          logoPath: "/images/toko-empati.png",
          vendorId: printer?.vendorId,
          productId: printer?.productId,
        });
      }
      setCart([]);
      setPaid(0);
      await loadData();
    } catch {
      toastError("Gagal memproses transaksi. Silakan coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="flex h-full min-h-0 overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b border-slate-200 bg-white">
            {/* Search box — left side */}
            <div className="shrink-0 border-r border-slate-200 px-5 py-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk..."
                className="input-base w-[220px]"
              />
            </div>
            {/* Scrollable category pills */}
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-5 py-3">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${selectedCategory === "all" ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Semua Produk
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition ${selectedCategory === category.id ? "bg-emerald-700 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-5 overflow-y-auto p-5 lg:grid-cols-3 2xl:grid-cols-4">
            {pagedProducts.map((product) => {
              const isPulse = lastAddedProductId === product.id;
              const initials = product.name.slice(0, 2).toUpperCase();
              const outOfStock = product.stock <= 0;
              const lowStock = product.stock > 0 && product.stock <= 10;

              return (
                <div
                  key={product.id}
                  className={`group overflow-hidden rounded-xl border bg-white transition-all ${isPulse ? "scale-[0.99] border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"}`}
                >
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={() => addToCart(product)}
                    className="flex w-full flex-col text-left disabled:cursor-not-allowed"
                  >
                    {/* Image area with monogram + price */}
                    <div
                      className={`relative aspect-[4/3] bg-gradient-to-br ${getProductVisual(product)}`}
                    >
                      {/* Out of stock overlay */}
                      {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                          <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                            Habis
                          </span>
                        </div>
                      )}
                      {/* Monogram */}
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl font-extrabold text-slate-700/20 select-none">
                          {initials}
                        </span>
                      </div>
                      {/* Price badge */}
                      <div className="absolute top-2 right-2">
                        <span className="inline-block rounded-lg bg-white/95 px-2.5 py-1 text-sm font-extrabold text-red-600 shadow-sm backdrop-blur-sm">
                          {formatIdr(product.sell_price)}
                        </span>
                      </div>
                    </div>

                    {/* Info area */}
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <h3 className="line-clamp-2 text-sm leading-snug font-bold text-slate-800">
                        {product.name}
                      </h3>
                      {/* Category + stock row */}
                      <div className="flex items-center gap-2">
                        {product.category_name && (
                          <span className="inline-block max-w-[120px] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {product.category_name}
                          </span>
                        )}
                        <span
                          className={`ml-auto flex items-center gap-1 text-xs font-semibold ${outOfStock ? "text-red-500" : lowStock ? "text-amber-600" : "text-emerald-600"}`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${outOfStock ? "bg-red-500" : lowStock ? "bg-amber-500" : "bg-emerald-500"}`}
                          />
                          Stok {product.stock}
                        </span>
                      </div>
                      {/* Add to cart button */}
                      <span
                        className={`mt-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition-colors ${outOfStock ? "bg-slate-100 text-slate-400" : "bg-emerald-600 text-white group-hover:bg-emerald-700"}`}
                      >
                        {outOfStock ? "Stok Habis" : "+ Keranjang"}
                      </span>
                    </div>
                  </button>
                </div>
              );
            })}
            {pagedProducts.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
                Produk tidak ditemukan.
              </div>
            ) : null}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 border-t border-slate-200 bg-white px-5 py-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-sm font-semibold transition-colors ${
                    p === safePage
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}
        </section>
        <aside className="flex min-h-0 w-[390px] flex-col border-l border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Pesanan Saat Ini</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {itemCount} Item
              </span>
            </div>
            {parkedCart && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <Pause className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-semibold">
                    Pesanan Ditahan ({parkedCart.items.reduce((sum, i) => sum + i.qty, 0)} item)
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-600">
                  {parkedCart.timestamp
                    ? `${formatDateTime(parkedCart.timestamp).date} ${new Date(parkedCart.timestamp).toLocaleTimeString("id-ID")}`
                    : "Disimpan sebelumnya"}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={resumeCart}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Lanjutkan
                  </button>
                  <button
                    type="button"
                    onClick={discardCart}
                    className="flex-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Pelanggan
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
              >
                Kode Promo
              </button>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-emerald-50"
              >
                <div
                  className={`h-12 w-12 flex-shrink-0 rounded-lg bg-gradient-to-br ${getProductVisual(item.product)} flex items-center justify-center text-xs font-bold text-slate-700`}
                >
                  {item.product.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-sm font-bold text-slate-800">
                      {item.product.name}
                    </h4>
                    <span className="text-sm font-bold text-slate-800">
                      {formatIdr(item.product.sell_price * item.qty)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, item.qty - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-sm hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.product.id, item.qty + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-sm hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQty(item.product.id, 0)}
                      className="text-xs font-semibold text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                Keranjang kosong.
              </div>
            ) : null}
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5">
            <div className="mb-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-800">{formatIdr(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pajak</span>
                <span className="font-medium text-slate-800">{formatIdr(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="text-lg font-bold text-slate-800">Total</span>
                <span className="text-lg font-bold text-emerald-700">{formatIdr(total)}</span>
              </div>
            </div>
            <div className="mb-3">
              <FieldCurrency
                label="Jumlah Dibayar"
                value={paid}
                onChange={setPaid}
                placeholder="0"
              />
            </div>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">Kembalian</span>
              <span className="font-semibold text-slate-800">{formatIdr(changeAmount)}</span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void reprintReceipt()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200"
              >
                <Printer className="h-4 w-4" />
                Struk
              </button>
              <button
                type="button"
                onClick={parkCart}
                disabled={cart.length === 0}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                Tahan
              </button>
            </div>
            <Button
              type="button"
              variant="primary"
              size="lg"
              loading={processing}
              disabled={cart.length === 0 || paidAmount < total}
              onClick={() => setConfirmOpen(true)}
              fullWidth
            >
              Bayar {formatIdr(total)}
            </Button>
          </div>
        </aside>
      </div>

      {/* Payment Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="animate-in fade-in zoom-in w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_8px_24px_rgba(0,0,0,0.15)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Toko Empati" className="h-10 w-10 rounded-lg object-contain" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Konfirmasi Pembayaran</h2>
                  <p className="text-xs font-semibold text-slate-500">
                    {cart.length} item &bull; {itemCount} unit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Summary */}
            <div className="border-b border-slate-100 bg-slate-50 p-5">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-6">
                <div className="flex flex-col items-center text-center">
                  <span className="mb-1 text-xs font-bold tracking-widest text-emerald-700 uppercase">
                    TOTAL PEMBAYARAN
                  </span>
                  <span className="text-4xl font-bold tracking-tight text-emerald-700">
                    {formatIdr(total)}
                  </span>
                  <div className="mt-5 grid w-full grid-cols-2 gap-4 border-t border-emerald-200 pt-5">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <span className="text-xs font-semibold text-slate-500">Dibayar</span>
                      <span className="mt-1 block text-2xl font-bold text-slate-800">
                        {formatIdr(paidAmount)}
                      </span>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white p-4">
                      <span className="text-xs font-semibold text-slate-500">Kembalian</span>
                      <span className="mt-1 block text-2xl font-bold text-red-600">
                        {formatIdr(changeAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 p-5">
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  void checkout(true);
                }}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-emerald-700 text-lg font-semibold text-white shadow-lg shadow-emerald-700/20 transition-all hover:bg-emerald-800 active:scale-95"
              >
                <Printer className="h-5 w-5" />
                Bayar &amp; Cetak Struk
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false);
                    void checkout(false);
                  }}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 transition-all hover:border-emerald-500 active:scale-95"
                >
                  <Save className="h-4 w-4" />
                  Bayar Saja
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-200 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-300 active:scale-95"
                >
                  Batal
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 py-3 text-center">
              <p className="text-xs text-slate-400">POS Empati &bull; Toko Empati</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
