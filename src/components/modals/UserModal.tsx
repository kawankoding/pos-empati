import { useState } from "react";
import Button from "@components/ui/Button";
import FieldInput from "@components/ui/FieldInput";
import FieldSelect from "@components/ui/FieldSelect";
import Modal from "@components/ui/Modal";
import type { User, MutationResult } from "@lib/api";

export type UserFormState = {
  name: string;
  username: string;
  password: string;
  role: "admin" | "cashier";
  isActive: boolean;
};

function emptyForm(): UserFormState {
  return { name: "", username: "", password: "", role: "cashier", isActive: true };
}

function formFromUser(u: User): UserFormState {
  return {
    name: u.name,
    username: u.username,
    password: "",
    role: u.role as "admin" | "cashier",
    isActive: u.is_active === 1,
  };
}

type UserModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (form: UserFormState) => Promise<MutationResult>;
  initial: User | null;
};

export default function UserModal({ open, onClose, onSave, initial }: UserModalProps) {
  const isEdit = initial !== null;
  const [form, setForm] = useState<UserFormState>(initial ? formFromUser(initial) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when opening
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setForm(initial ? formFromUser(initial) : emptyForm());
      setError(null);
    }
  }

  const handleSave = async () => {
    setError(null);
    if (!form.username.trim()) {
      setError("Nama pengguna wajib diisi.");
      return;
    }
    if (!isEdit && !form.password) {
      setError("Kata sandi wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const result = await onSave(form);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onClose();
    } catch {
      setError("Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Pengguna" : "Tambah Pengguna"}
      description={
        isEdit ? "Perbarui informasi akun pengguna." : "Buat akun baru untuk mengakses sistem."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
            {isEdit ? "Simpan" : "Tambah"}
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="space-y-4">
        <FieldInput
          label="Nama Lengkap"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nama asli pengguna"
        />

        <FieldInput
          label="Nama Pengguna"
          value={form.username}
          onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
          placeholder="nama pengguna"
        />

        <FieldInput
          label={isEdit ? "Kata Sandi Baru (kosongkan jika tidak diubah)" : "Kata Sandi"}
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="••••••••"
        />

        <FieldSelect
          label="Peran"
          value={form.role}
          dropdownDirection="top"
          onChange={(e) =>
            setForm((prev) => ({ ...prev, role: e.target.value as "admin" | "cashier" }))
          }
        >
          <option value="admin">Admin</option>
          <option value="cashier">Kasir</option>
        </FieldSelect>

        {isEdit ? (
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
            />
            <span className="text-sm font-semibold text-slate-800">Akun Aktif</span>
          </label>
        ) : null}
      </div>
    </Modal>
  );
}
