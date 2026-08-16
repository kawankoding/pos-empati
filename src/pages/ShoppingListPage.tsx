import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Circle,
  ListChecks,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Button from "@components/ui/Button";
import FieldInput from "@components/ui/FieldInput";
import FieldSelect from "@components/ui/FieldSelect";
import Modal from "@components/ui/Modal";
import ConfirmModal from "@components/modals/ConfirmModal";
import { api, type MutationResult, type Product, type ShoppingList, type ShoppingListDetail, type ShoppingListItem } from "@lib/api";
import { useToast } from "@lib/ToastContext";
import { useSettings } from "@lib/SettingsContext";
import { formatDate, formatDateTime, todayDisplay } from "@lib/datetime";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_LIST_NAME = () => `Daftar Belanja ${todayDisplay()}`;

function SummaryChip({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "emerald" | "blue" | "amber";
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${toneClasses[tone]}`}>
      {icon}
      <div className="leading-tight">
        <p className="text-[10px] font-semibold tracking-wide uppercase opacity-80">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ShoppingListPage                                                  */
/* ------------------------------------------------------------------ */

export default function ShoppingListPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ShoppingListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { success, error: toastError, info, warning } = useToast();
  const { settings } = useSettings();
  const [printer, setPrinter] = useState<{ vendorId: number; productId: number } | null>(null);
  const [printing, setPrinting] = useState(false);

  // Create list dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState(DEFAULT_LIST_NAME());

  // Rename list inline
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState("");

  // Confirmation dialogs
  const [deleteListTarget, setDeleteListTarget] = useState<ShoppingList | null>(null);
  const [removeItemTarget, setRemoveItemTarget] = useState<ShoppingListItem | null>(null);

  // Add-item form
  const [formProductId, setFormProductId] = useState("");
  const [formCustomName, setFormCustomName] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formNote, setFormNote] = useState("");

  const selectedIdRef = useRef<number | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  /* ── Data loading ── */
  const loadLists = useCallback(async (selectId?: number | null): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [listsData, productsData] = await Promise.all([
        api.listShoppingLists(),
        api.listProducts(),
      ]);
      setLists(listsData);
      setProducts(productsData);

      let targetId: number | null = selectId ?? null;
      if (selectId === undefined) {
        const keep = selectedIdRef.current;
        targetId = keep && listsData.some((l) => l.id === keep) ? keep : (listsData[0]?.id ?? null);
      } else if (selectId !== null && !listsData.some((l) => l.id === selectId)) {
        targetId = listsData[0]?.id ?? null;
      }

      setSelectedId(targetId);
      setDetail(targetId != null ? await api.getShoppingList(targetId) : null);
    } catch {
      setError("Gagal memuat daftar belanja.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadDetail = useCallback(async (): Promise<void> => {
    const id = selectedIdRef.current;
    if (id == null) return;
    try {
      const [nextDetail, listsData] = await Promise.all([
        api.getShoppingList(id),
        api.listShoppingLists(),
      ]);
      setDetail(nextDetail);
      setLists(listsData);
    } catch {
      toastError("Gagal memuat item daftar belanja.");
    }
  }, [toastError]);

  useEffect(() => {
    void loadLists();
    api
      .listPrinters()
      .then((devices) => {
        if (devices.length > 0) setPrinter(devices[0]);
      })
      .catch(() => {});
  }, [loadLists]);

  /* ── List actions ── */
  const selectList = async (id: number): Promise<void> => {
    if (id === selectedIdRef.current) return;
    setSelectedId(id);
    setRenaming(false);
    const next = await api.getShoppingList(id);
    setDetail(next);
  };

  const handleCreateList = async (): Promise<MutationResult> => {
    if (!newListName.trim()) {
      return { ok: false, message: "Nama daftar belanja wajib diisi." };
    }
    const result = await api.createShoppingList({ name: newListName.trim() });
    if (!result.ok) return result;
    success("Daftar belanja berhasil dibuat.");
    setCreateOpen(false);
    setNewListName(DEFAULT_LIST_NAME());
    await loadLists(result.id);
    return { ok: true };
  };

  const startRename = (): void => {
    if (!detail) return;
    setRenameName(detail.name);
    setRenaming(true);
  };

  const saveRename = async (): Promise<void> => {
    if (!detail) return;
    if (!renameName.trim()) {
      toastError("Nama daftar belanja wajib diisi.");
      return;
    }
    const result = await api.updateShoppingList({ id: detail.id, name: renameName.trim() });
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    success("Nama daftar belanja diperbarui.");
    setRenaming(false);
    await loadLists(detail.id);
  };

  const handleDeleteListConfirm = async (): Promise<void> => {
    if (!deleteListTarget) return;
    const result = await api.deleteShoppingList(deleteListTarget.id);
    if (!result.ok) {
      toastError(result.message);
      setDeleteListTarget(null);
      return;
    }
    success("Daftar belanja dihapus.");
    setDeleteListTarget(null);
    await loadLists(null);
  };

  /* ── Item actions ── */
  const handleAddItem = async (): Promise<void> => {
    if (!detail) return;
    const productId = formProductId ? Number(formProductId) : null;
    let name = formCustomName.trim();
    if (productId != null) {
      const product = products.find((p) => p.id === productId);
      name = product?.name ?? "";
    }
    if (!name) {
      toastError("Nama item wajib diisi.");
      return;
    }
    const qty = Number(formQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toastError("Jumlah harus lebih dari nol.");
      return;
    }
    const result = await api.addShoppingListItem({
      listId: detail.id,
      productId,
      name,
      qty,
      note: formNote.trim(),
    });
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    success("Item berhasil ditambahkan.");
    setFormProductId("");
    setFormCustomName("");
    setFormQty("1");
    setFormNote("");
    await reloadDetail();
  };

  const toggleItem = async (item: ShoppingListItem): Promise<void> => {
    const result = await api.updateShoppingListItem({
      id: item.id,
      checked: item.checked === 1 ? 0 : 1,
    });
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    await reloadDetail();
  };

  const commitQty = async (item: ShoppingListItem, qty: number): Promise<void> => {
    if (qty <= 0 || qty === item.qty) return;
    const result = await api.updateShoppingListItem({ id: item.id, qty });
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    await reloadDetail();
  };

  const handleRemoveItemConfirm = async (): Promise<void> => {
    if (!removeItemTarget) return;
    const result = await api.removeShoppingListItem(removeItemTarget.id);
    if (!result.ok) {
      toastError(result.message);
      setRemoveItemTarget(null);
      return;
    }
    success("Item dihapus dari daftar.");
    setRemoveItemTarget(null);
    await reloadDetail();
  };

  const handleClearChecked = async (): Promise<void> => {
    if (!detail) return;
    if (detail.checked_count === 0) {
      info("Tidak ada item yang sudah selesai.");
      return;
    }
    const result = await api.clearCheckedShoppingListItems(detail.id);
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    success("Item selesai dihapus dari daftar.");
    await reloadDetail();
  };

  /* ── Printing ── */
  const handlePrint = async (): Promise<void> => {
    if (!detail) return;
    if (detail.items.length === 0) {
      warning("Daftar belanja masih kosong.");
      return;
    }
    setPrinting(true);
    try {
      const { date, time } = formatDateTime(new Date().toISOString());
      const result = await api.printShoppingList({
        storeName: settings?.store_name ?? "Toko Empati",
        storeAddress: settings?.store_address ?? "",
        date: `${date} ${time}`,
        listName: detail.name,
        items: detail.items.map((i) => ({
          name: i.name,
          qty: i.qty,
          note: i.note,
          checked: i.checked === 1,
        })),
        logoPath: "/images/toko-empati.png",
        vendorId: printer?.vendorId,
        productId: printer?.productId,
      });
      if (result.ok) {
        success("Daftar belanja dikirim ke printer.");
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Gagal mencetak daftar belanja.");
    } finally {
      setPrinting(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="flex h-full min-h-0 gap-5">
      {/* ══════════ Left panel: list of shopping lists ══════════ */}
      <aside className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-level-1">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-800">Daftar Belanja</h3>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setCreateOpen(true)}
          >
            Baru
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {loading && lists.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">Memuat...</div>
          ) : lists.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <ListChecks size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Belum ada daftar belanja</p>
              <p className="mt-1 text-xs text-slate-500">Buat daftar untuk restock barang.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                leftIcon={<Plus size={14} />}
                onClick={() => setCreateOpen(true)}
              >
                Buat Daftar
              </Button>
            </div>
          ) : (
            <ul className="space-y-1">
              {lists.map((list) => {
                const active = list.id === selectedId;
                return (
                  <li key={list.id}>
                    <div
                      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
                        active ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-slate-50"
                      }`}
                      onClick={() => void selectList(list.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            active ? "text-emerald-800" : "text-slate-700"
                          }`}
                        >
                          {list.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {list.pending_count > 0 ? `${list.pending_count} belum` : "Selesai semua"} ·{" "}
                          {formatDate(list.created_at)}
                        </p>
                      </div>
                      {list.pending_count > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          {list.pending_count}
                        </span>
                      ) : (
                        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                      )}
                      <button
                        type="button"
                        title="Hapus daftar"
                        aria-label={`Hapus daftar ${list.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteListTarget(list);
                        }}
                        className="shrink-0 rounded-md p-1 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* ══════════ Right panel: selected list detail ══════════ */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-level-1">
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void loadLists()}
            >
              Coba Lagi
            </Button>
          </div>
        ) : !detail ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <ListChecks size={40} className="mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Pilih atau buat daftar belanja</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Daftar belanja membantu Anda mencatat barang yang perlu dibeli untuk restock stok
              toko.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  {renaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveRename();
                          if (e.key === "Escape") setRenaming(false);
                        }}
                        className="input-base w-72!"
                      />
                      <Button size="sm" onClick={() => void saveRename()}>
                        Simpan
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                        Batal
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-800">{detail.name}</h2>
                      <button
                        type="button"
                        title="Ubah nama"
                        aria-label="Ubah nama daftar"
                        onClick={startRename}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-700"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  )}
                  <p className="mt-0.5 text-xs text-slate-400">
                    Dibuat {formatDate(detail.created_at)} · {detail.item_count} item
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <SummaryChip
                    icon={<ListChecks size={16} />}
                    label="Total"
                    value={detail.item_count}
                    tone="blue"
                  />
                  <SummaryChip
                    icon={<Circle size={16} />}
                    label="Belum"
                    value={detail.pending_count}
                    tone="amber"
                  />
                  <SummaryChip
                    icon={<CheckCircle2 size={16} />}
                    label="Selesai"
                    value={detail.checked_count}
                    tone="emerald"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<X size={14} />}
                    onClick={() => void handleClearChecked()}
                  >
                    Bersihkan Selesai
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={printing}
                    leftIcon={<Printer size={14} />}
                    onClick={() => void handlePrint()}
                  >
                    Cetak
                  </Button>
                </div>
              </div>
            </div>

            {/* Add item form */}
            <div className="shrink-0 border-b border-slate-200 bg-slate-50/60 px-6 py-4">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
                <div className="md:col-span-3">
                  <FieldSelect
                    label="Produk"
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    searchable
                    searchPlaceholder="Cari produk..."
                    placeholder="Pilih produk..."
                    className="w-full"
                  >
                    <option value="">— Item manual (ketik nama) —</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.stock > 0 ? `(stok ${p.stock})` : "(habis)"}
                      </option>
                    ))}
                  </FieldSelect>
                </div>
                <div className="md:col-span-4">
                  <FieldInput
                    label="Nama Item"
                    placeholder="Contoh: Sabun Mandi 200ml"
                    value={formCustomName}
                    onChange={(e) => setFormCustomName(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldInput
                    label="Jumlah"
                    type="number"
                    min={1}
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                  />
                </div>
                <div className="md:col-span-3">
                  <FieldInput
                    label="Catatan (opsional)"
                    placeholder="Contoh: merk A, ukuran besar"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={() => void handleAddItem()}>Tambah Item</Button>
              </div>
            </div>

            {/* Items table */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {detail.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList size={36} className="mb-3 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Daftar masih kosong</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Tambahkan barang yang perlu dibeli menggunakan form di atas.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white text-[11px] tracking-wide text-slate-400 uppercase">
                    <tr className="border-b border-slate-200">
                      <th className="px-6 py-3 font-semibold">Item</th>
                      <th className="w-24 px-4 py-3 font-semibold">Jumlah</th>
                      <th className="w-64 px-4 py-3 font-semibold">Catatan</th>
                      <th className="w-14 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => {
                      const done = item.checked === 1;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-100 transition-colors ${
                            done ? "bg-emerald-50/40" : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                title={done ? "Tandai belum" : "Tandai selesai"}
                                aria-label={`Tandai ${item.name} ${done ? "belum" : "selesai"}`}
                                onClick={() => void toggleItem(item)}
                                className="shrink-0 rounded-full transition-transform hover:scale-110"
                              >
                                {done ? (
                                  <CheckCircle2 size={22} className="text-emerald-600" />
                                ) : (
                                  <Circle size={22} className="text-slate-300 hover:text-emerald-500" />
                                )}
                              </button>
                              <span
                                className={`font-semibold ${
                                  done ? "text-slate-400 line-through" : "text-slate-700"
                                }`}
                              >
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={1}
                              defaultValue={item.qty}
                              onBlur={(e) => void commitQty(item, Number(e.target.value))}
                              className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="block truncate text-xs text-slate-500">
                              {item.note || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              title="Hapus item"
                              aria-label={`Hapus ${item.name}`}
                              onClick={() => setRemoveItemTarget(item)}
                              className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </section>

      {/* ══════════ Modals ══════════ */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Daftar Belanja"
        description="Buat daftar baru untuk mencatat barang yang perlu dibeli."
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => void handleCreateList()}>
              Buat
            </Button>
          </>
        }
      >
        <FieldInput
          label="Nama Daftar"
          autoFocus
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleCreateList();
          }}
        />
      </Modal>

      <ConfirmModal
        open={deleteListTarget !== null}
        onClose={() => setDeleteListTarget(null)}
        onConfirm={() => void handleDeleteListConfirm()}
        title="Hapus Daftar Belanja"
        message={`Yakin ingin menghapus daftar "${deleteListTarget?.name}" beserta semua itemnya? Tindakan ini tidak dapat dibatalkan.`}
      />

      <ConfirmModal
        open={removeItemTarget !== null}
        onClose={() => setRemoveItemTarget(null)}
        onConfirm={() => void handleRemoveItemConfirm()}
        title="Hapus Item"
        message={`Yakin ingin menghapus "${removeItemTarget?.name}" dari daftar belanja?`}
      />
    </div>
  );
}
