import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, HardDrive, History, Upload } from "lucide-react";
import Button from "@components/ui/Button";
import { api } from "@lib/api";
import { useToast } from "@lib/ToastContext";
import ConfirmModal from "@components/modals/ConfirmModal";

type BackupMeta = {
  timestamp: string;
  schemaVersion: number;
  checksum: string;
};

export default function DataTab() {
  const { success, error: toastError, info } = useToast();
  const [backupMeta, setBackupMeta] = useState<BackupMeta | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load last backup date from settings
    api
      .getSettings()
      .then((s) => {
        if (s.backup_date) {
          setBackupMeta({
            timestamp: s.backup_date,
            schemaVersion: Number(s.backup_schema_version ?? "0"),
            checksum: s.backup_checksum ?? "",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleBackup = useCallback(async () => {
    setBackupLoading(true);
    try {
      const result = await api.createBackup();
      if (result.ok) {
        setBackupMeta(result.meta);
        // Store backup info in settings
        await api.setSetting({ key: "backup_date", value: result.meta.timestamp });
        await api.setSetting({
          key: "backup_schema_version",
          value: String(result.meta.schemaVersion),
        });
        await api.setSetting({ key: "backup_checksum", value: result.meta.checksum });
        success("Database berhasil dicadangkan.", "Backup tersimpan dengan aman.");
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Gagal membuat backup.");
    } finally {
      setBackupLoading(false);
    }
  }, [success, toastError]);

  const handleRestoreClick = () => {
    setRestoreConfirmOpen(true);
  };

  const handleRestoreConfirm = async () => {
    setRestoreConfirmOpen(false);
    setRestoreLoading(true);
    try {
      const result = await api.restoreBackup();
      if (result.ok) {
        info("Database berhasil dipulihkan. Aplikasi akan dimuat ulang.");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toastError(result.message);
      }
    } catch {
      toastError("Gagal memulihkan database.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("id-ID");
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-800">Manajemen Data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cadangkan dan pulihkan database lokal Anda dengan aman.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Backup Database */}
        <section className="shadow-level-1 flex flex-col justify-between rounded-2xl border border-emerald-100 bg-white p-6">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <HardDrive size={28} />
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Cadangkan Database</h3>
            <p className="mt-2 mb-6 text-sm text-slate-500">
              Buat salinan lokal yang aman dari seluruh database toko Anda termasuk transaksi,
              inventaris, dan log pengguna.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-xs font-semibold">
              <span className="text-slate-500">Cadangan terakhir</span>
              <span className="font-bold text-slate-800">
                {backupMeta ? formatDate(backupMeta.timestamp) : "Belum tersedia"}
              </span>
            </div>
            {backupMeta && (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-xs">
                <span className="text-slate-500">Schema</span>
                <span className="font-semibold text-slate-700">v{backupMeta.schemaVersion}</span>
              </div>
            )}
            <Button
              variant="primary"
              leftIcon={<Download size={16} />}
              fullWidth
              loading={backupLoading}
              onClick={handleBackup}
            >
              Buat Cadangan
            </Button>
          </div>
        </section>

        {/* Sync to Server — still future */}
        <section className="shadow-level-1 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Download size={28} />
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold tracking-wider text-amber-700 uppercase">
              Segera Hadir
            </span>
          </div>

          <h3 className="text-xl font-semibold text-slate-800">Sinkronkan ke Cloud</h3>
          <p className="mt-2 text-sm text-slate-500">
            Sinkronkan backup ke penyimpanan cloud untuk keamanan ekstra.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-slate-800">Status Cloud</span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Belum tersedia
              </span>
            </div>
            <Button variant="outline" fullWidth disabled>
              Segera Hadir
            </Button>
          </div>
        </section>

        {/* Restore Database */}
        <section className="shadow-level-1 relative col-span-1 overflow-hidden rounded-2xl border border-red-100 bg-white p-6 md:col-span-2">
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <History size={44} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-semibold text-slate-800">Pulihkan Database Lokal</h3>
              <p className="mt-2 text-sm text-slate-500">
                Pilih file cadangan yang dibuat sebelumnya untuk memulihkan kondisi toko. Berguna
                saat migrasi ke perangkat baru.
              </p>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-800">
                  <strong>Peringatan Penting:</strong> Memulihkan database akan menimpa seluruh data
                  lokal saat ini secara permanen. Backup otomatis dibuat sebelum pemulihan.
                </p>
              </div>
            </div>

            <div className="flex h-32 w-full shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-slate-200 md:w-56">
              <Upload size={28} className="mb-2 text-slate-400" />
              <Button
                variant="danger"
                size="sm"
                loading={restoreLoading}
                onClick={handleRestoreClick}
              >
                Pilih & Pulihkan
              </Button>
            </div>
          </div>

          <div className="pointer-events-none absolute -right-20 -bottom-20 -z-0 h-64 w-64 rounded-full bg-red-100/50 blur-3xl" />
        </section>
      </div>

      {/* Info cards */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-6">
          <h4 className="text-sm font-semibold text-slate-800">Backup Manual</h4>
          <p className="mt-2 text-sm text-slate-500">
            Backup disimpan sebagai file .db yang dapat dipindahkan ke komputer lain. Lakukan backup
            secara berkala sebelum pembaruan sistem.
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-6">
          <h4 className="text-sm font-semibold text-slate-800">Keamanan Data</h4>
          <p className="mt-2 text-sm text-slate-500">
            Setiap backup dilengkapi checksum SHA-256 untuk memverifikasi integritas data. Backup
            yang rusak atau dimodifikasi akan ditolak saat pemulihan.
          </p>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".db" className="hidden" />

      <ConfirmModal
        open={restoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        onConfirm={handleRestoreConfirm}
        title="Pulihkan Database"
        message="Yakin ingin memulihkan database? Seluruh data saat ini akan ditimpa. Backup otomatis akan dibuat sebelum pemulihan."
        confirmLabel="Pulihkan"
        variant="danger"
      />
    </div>
  );
}
