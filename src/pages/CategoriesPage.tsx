import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  FolderTree,
  Pencil,
  Plus,
  PlusCircle,
  RefreshCw,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Button from "@components/ui/Button";
import CategoryModal from "@components/modals/CategoryModal";
import ConfirmModal from "@components/modals/ConfirmModal";
import { api, type Category, type MutationResult } from "@lib/api";
import { useToast } from "@lib/ToastContext";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}h lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

function getCategoryVisual(id: number): string {
  const gradients = [
    "from-emerald-100 to-emerald-50",
    "from-blue-100 to-indigo-50",
    "from-amber-100 to-orange-50",
    "from-fuchsia-100 to-pink-50",
    "from-teal-100 to-cyan-50",
  ];
  return gradients[id % gradients.length] ?? gradients[0];
}

/* ------------------------------------------------------------------ */
/*  CategoriesPage                                                    */
/* ------------------------------------------------------------------ */

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { success, error: toastError } = useToast();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listCategories();
      setCategories(data);
    } catch {
      setError("Gagal memuat data kategori.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const openCreate = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async (name: string): Promise<MutationResult> => {
    if (!name) return { ok: false, message: "Nama tidak boleh kosong." };

    if (editingCategory) {
      const result = await api.updateCategory({ id: editingCategory.id, name });
      if (!result.ok) return result;
      success("Kategori berhasil diperbarui.");
    } else {
      const result = await api.createCategory({ name });
      if (!result.ok) return result;
      success("Kategori berhasil dibuat.");
    }

    closeDialog();
    await loadCategories();
    return { ok: true };
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await removeCategory(deleteTarget.id);
    setDeleteTarget(null);
  };

  const removeCategory = async (id: number) => {
    const result = await api.deleteCategory(id);
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    success("Kategori berhasil dihapus.");
    await loadCategories();
  };

  // Derive stats from real data
  const mostRecent = useMemo(
    () =>
      categories.length > 0
        ? categories.reduce((a, b) => (a.created_at > b.created_at ? a : b))
        : null,
    [categories],
  );

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Manajemen Kategori</h2>
          <p className="mt-1 text-sm text-slate-500">
            Atur produk ke dalam grup untuk checkout lebih cepat.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={openCreate}>
            Tambah Kategori
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="shadow-level-1 flex items-center gap-6 rounded-xl bg-white p-6">
          <div className="rounded-lg bg-emerald-500/10 p-4">
            <FolderTree size={28} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Kategori</p>
            <p className="text-xl font-semibold text-slate-800">{categories.length}</p>
          </div>
        </div>
        <div className="shadow-level-1 flex items-center gap-6 rounded-xl bg-white p-6">
          <div className="rounded-lg bg-blue-500/10 p-4">
            <ShoppingBag size={28} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Kategori Aktif</p>
            <p className="text-xl font-semibold text-slate-800">{categories.length}</p>
          </div>
        </div>
        <div className="shadow-level-1 flex items-center gap-6 rounded-xl bg-white p-6">
          <div className="rounded-lg bg-slate-200/50 p-4">
            <TrendingUp size={28} className="text-slate-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Terbaru</p>
            <p className="text-xl font-semibold text-slate-800">{mostRecent?.name ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
          <p className="mb-3 text-sm text-red-700">{error}</p>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => void loadCategories()}
          >
            Coba Lagi
          </Button>
        </div>
      ) : null}

      {/* ── Category Grid ── */}
      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Memuat kategori...</div>
      ) : error ? null : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group shadow-level-1 relative overflow-hidden rounded-xl border-2 border-transparent bg-white transition-all hover:border-emerald-400"
            >
              {/* Thumbnail */}
              <div
                className={`flex h-40 items-center justify-center bg-gradient-to-br ${getCategoryVisual(cat.id)}`}
              >
                <span className="text-4xl font-bold text-slate-700/40">
                  {cat.name.slice(0, 2).toUpperCase()}
                </span>
              </div>

              {/* Card body */}
              <div className="p-6">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-xl font-bold text-slate-800">{cat.name}</h3>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={12} />
                  Diperbarui {timeAgo(cat.created_at)}
                </div>
              </div>

              {/* Hover action overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-4 bg-emerald-500/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => openEdit(cat)}
                  className="rounded-full bg-white p-3 shadow-lg transition-all hover:bg-emerald-700 hover:text-white"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(cat)}
                  className="rounded-full bg-white p-3 shadow-lg transition-all hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* ── Create New Category card ── */}
          <button
            type="button"
            onClick={openCreate}
            className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 p-6 transition-all hover:border-emerald-400 hover:bg-slate-50"
          >
            <div className="rounded-full bg-slate-100 p-4 transition-colors group-hover:bg-emerald-500/20">
              <PlusCircle size={36} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-800">Buat Kategori Baru</p>
              <p className="text-sm text-slate-500">Tambah grup untuk produk Anda</p>
            </div>
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          Belum ada kategori. Klik tombol di atas untuk membuat kategori pertama.
        </div>
      ) : null}

      {/* ── Create / Edit Modal ── */}
      <CategoryModal
        open={dialogOpen}
        onClose={closeDialog}
        onSave={handleSave}
        initialName={editingCategory?.name ?? ""}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
        title="Hapus Kategori"
        message={`Yakin ingin menghapus kategori "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
