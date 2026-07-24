import { useState } from "react";
import { CloudUpload } from "lucide-react";
import FieldCurrency from "@components/ui/FieldCurrency";
import FieldInput from "@components/ui/FieldInput";
import FieldSelect from "@components/ui/FieldSelect";
import Button from "@components/ui/Button";
import Modal from "@components/ui/Modal";
import type { Category, MutationResult } from "@lib/api";
import type { ProductForm } from "@pages/ProductsPage";

type ProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (form: ProductForm) => Promise<MutationResult>;
  initialForm: ProductForm;
  editingId: number | null;
  categories: Category[];
  maxWidth?: string;
};

export default function ProductModal({
  open,
  onClose,
  onSubmit,
  initialForm,
  editingId,
  categories,
  maxWidth,
}: ProductModalProps) {
  const [form, setForm] = useState<ProductForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync form state when the dialog opens with new initial values
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(initialForm);
      setFormError(null);
    }
  }

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Nama produk wajib diisi.");
      return;
    }

    const buyPrice = form.buy_price;
    const sellPrice = form.sell_price;
    const stock = Number(form.stock || 0);

    if (buyPrice < 0 || sellPrice < 0 || stock < 0) {
      setFormError("Harga beli, harga jual, dan stok tidak boleh negatif.");
      return;
    }

    if (sellPrice < buyPrice) {
      setFormError("Harga jual tidak boleh lebih rendah dari harga beli.");
      return;
    }

    setSaving(true);
    try {
      const result = await onSubmit({
        ...form,
        buy_price: buyPrice,
        sell_price: sellPrice,
        stock: String(stock),
      });
      if (!result.ok) {
        setFormError(result.message);
        return;
      }
      onClose();
    } catch {
      setFormError("Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      title={editingId ? "Edit Produk" : "Produk Baru"}
      description={
        editingId
          ? "Perbarui item di katalog inventaris."
          : "Tambah item baru ke katalog inventaris."
      }
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Batal
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void handleSubmit()}>
            {editingId ? "Simpan" : "Tambah Produk"}
          </Button>
        </>
      }
    >
      {formError ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FieldInput
          label="SKU / Barcode"
          value={form.sku}
          onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))}
          placeholder="TEA-ORG-001"
        />

        <FieldInput
          label="Nama Produk"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Organic Green Tea"
        />

        <FieldSelect
          label="Kategori"
          value={form.category_id ?? ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              category_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">Tanpa Kategori</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </FieldSelect>

        <FieldCurrency
          label="Harga Beli"
          value={form.buy_price}
          onChange={(val) => setForm((prev) => ({ ...prev, buy_price: val }))}
          placeholder="0"
        />

        <FieldCurrency
          label="Harga Jual"
          value={form.sell_price}
          onChange={(val) => setForm((prev) => ({ ...prev, sell_price: val }))}
          placeholder="0"
        />

        <FieldInput
          label="Stok Awal"
          type="number"
          min={0}
          step="1"
          value={form.stock}
          onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
          placeholder="0"
        />
      </div>

      <div className="mt-6 space-y-2">
        <label className="label-sm">Gambar Produk</label>
        <div className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-8 py-6 transition-colors hover:border-emerald-400">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
            <CloudUpload size={24} className="text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Klik untuk unggah atau seret file</p>
          <p className="mt-1 text-xs text-slate-500">PNG, JPG atau WebP (Maks. 5MB)</p>
        </div>
      </div>
    </Modal>
  );
}
