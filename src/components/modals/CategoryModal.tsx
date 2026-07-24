import { useState } from "react";
import Button from "@components/ui/Button";
import FieldInput from "@components/ui/FieldInput";
import Modal from "@components/ui/Modal";
import type { MutationResult } from "@lib/api";

type CategoryModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<MutationResult>;
  initialName: string;
};

export default function CategoryModal({ open, onClose, onSave, initialName }: CategoryModalProps) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when opening
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(initialName);
      setError(null);
    }
  }

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await onSave(name.trim());
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onClose();
    } catch {
      setError("Gagal menyimpan kategori.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialName ? "Edit Kategori" : "Buat Kategori"}
      description="Beri nama kategori yang jelas."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!name.trim()}
            onClick={() => void handleSave()}
          >
            {initialName ? "Simpan" : "Buat Kategori"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <FieldInput
        label="Nama Kategori"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="contoh: Minuman"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) void handleSave();
        }}
      />
    </Modal>
  );
}
