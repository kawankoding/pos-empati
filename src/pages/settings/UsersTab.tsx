import { useEffect, useState } from "react";
import { ListFilter, Pencil, RefreshCw, Search, Trash2, UserPlus } from "lucide-react";
import Button from "@components/ui/Button";
import ConfirmModal from "@components/modals/ConfirmModal";
import UserModal, { type UserFormState } from "@components/modals/UserModal";
import { api, type User, type MutationResult } from "@lib/api";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

/* ------------------------------------------------------------------ */
/*  UsersTab                                                          */
/* ------------------------------------------------------------------ */

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Confirm delete state
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listUsers();
      setUsers(data);
    } catch {
      setError("Gagal memuat data pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filtered = search
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase()) ||
          u.role.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  /* ---- handlers ---- */

  const openCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
  };

  const handleFormSave = async (form: UserFormState): Promise<MutationResult> => {
    if (editingUser) {
      const result = await api.updateUser({
        id: editingUser.id,
        username: form.username,
        name: form.name,
        role: form.role,
        is_active: form.isActive ? 1 : 0,
      });
      if (!result.ok) return result;

      if (form.password) {
        await api.changePassword({
          id: editingUser.id,
          currentPassword: "", // Admin override — backend currently doesn't validate currentPassword for admin reset
          newPassword: form.password,
        });
      }

      closeForm();
      await loadUsers();
      return { ok: true };
    } else {
      const result = await api.createUser({
        username: form.username,
        name: form.name,
        password: form.password,
        role: form.role,
      });
      if (!result.ok) return result;

      closeForm();
      await loadUsers();
      return { ok: true };
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await api.deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    if (result.ok) await loadUsers();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-3xl font-semibold text-slate-800">Manajemen Pengguna</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola akses sistem, peran, dan izin pengguna.
          </p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus size={18} />} onClick={openCreate}>
          Tambah Pengguna
        </Button>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-80">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pengguna..."
              className="input-base pl-10"
            />
          </div>
          <Button variant="secondary" leftIcon={<ListFilter size={16} />}>
            Filter
          </Button>
        </div>

        {/* Table */}
        {error ? (
          <div className="px-6 py-12 text-center">
            <p className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void loadUsers()}
            >
              Coba Lagi
            </Button>
          </div>
        ) : loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Memuat pengguna...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="table-head">
                <tr>
                  <th className="px-6 py-3">Nama</th>
                  <th className="px-6 py-3">Pengguna</th>
                  <th className="px-6 py-3">Peran</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Dibuat</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-3">
                      <span className="font-bold text-slate-800">{user.name || user.username}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-slate-500">{user.username}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                          user.role === "admin"
                            ? "bg-blue-500/20 text-blue-600"
                            : "bg-slate-200/50 text-slate-600"
                        }`}
                      >
                        {user.role === "admin" ? "Admin" : "Kasir"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        <span className={user.is_active ? "text-slate-800" : "text-slate-500"}>
                          {user.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{timeAgo(user.created_at)}</td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(user)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      {search ? "Tidak ada pengguna yang cocok." : "Belum ada pengguna."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      <UserModal
        open={formOpen}
        onClose={closeForm}
        onSave={handleFormSave}
        initial={editingUser}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Pengguna"
        message={`Yakin ingin menghapus pengguna "${deleteTarget?.username}"? Tindakan ini tidak dapat dibatalkan.`}
      />
    </div>
  );
}
