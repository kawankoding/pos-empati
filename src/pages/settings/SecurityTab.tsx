import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import Button from "@components/ui/Button";
import FieldInput from "@components/ui/FieldInput";
import ToggleSwitch from "@components/ui/ToggleSwitch";

type AuditEntry = {
  date: string;
  ip: string;
  device: string;
  success: boolean;
};

const auditLog: AuditEntry[] = [
  { date: "24 Okt 2023, 10:24", ip: "192.168.1.45", device: "Chrome / Windows", success: true },
  { date: "23 Okt 2023, 16:15", ip: "192.168.1.45", device: "Safari / iOS", success: true },
  { date: "22 Okt 2023, 21:10", ip: "103.45.12.1", device: "Firefox / Linux", success: false },
];

export default function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);

  const handleUpdatePassword = () => {
    // TODO: wire to API
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold text-slate-800">Pengaturan Keamanan</h2>
        <p className="mt-1 text-sm text-slate-500">
          Kelola keamanan akun, kata sandi, dan sesi aktif Anda.
        </p>
      </div>

      {/* Top row: Password + 2FA/Sessions */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Change Password */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-xl font-semibold text-slate-800">Ubah Kata Sandi</h3>

          <div className="space-y-4">
            <FieldInput
              label="Kata Sandi Saat Ini"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />

            <FieldInput
              label="Kata Sandi Baru"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />

            <FieldInput
              label="Konfirmasi Kata Sandi Baru"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              variant="primary"
              fullWidth
              disabled={!currentPassword || !newPassword || !confirmPassword}
              onClick={handleUpdatePassword}
            >
              Perbarui Kata Sandi
            </Button>
          </div>
        </div>

        {/* Right column stack */}
        <div className="space-y-6">
          {/* Two-Factor Auth */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-800">Autentikasi Dua Faktor</h3>
              <ToggleSwitch id="2fa" checked={twoFactor} onChange={setTwoFactor} />
            </div>
            <p className="text-sm text-slate-500">
              Tambahkan lapisan keamanan ekstra ke akun Anda dengan mewajibkan lebih dari sekadar
              kata sandi untuk masuk.
            </p>
          </div>

          {/* Session Management */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-semibold text-slate-800">Manajemen Sesi</h3>
            <p className="mb-4 text-sm text-slate-500">Anda saat ini masuk di 2 perangkat.</p>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                <div className="flex items-center gap-2">
                  <Monitor size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold">Windows PC • Chrome</p>
                    <p className="text-xs text-slate-500">Sesi Saat Ini</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                <div className="flex items-center gap-2">
                  <Smartphone size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold">iPhone 13 • Safari</p>
                    <p className="text-xs text-slate-500">Aktif terakhir: 2 jam lalu</p>
                  </div>
                </div>
              </div>
            </div>

            <Button variant="danger" fullWidth>
              Keluar dari semua perangkat lain
            </Button>
          </div>
        </div>
      </div>

      {/* Security Audit Log */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <h3 className="text-xl font-semibold text-slate-800">Log Audit Keamanan</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="table-head">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Alamat IP</th>
                <th className="px-6 py-3">Perangkat</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {auditLog.map((entry, i) => (
                <tr key={i}>
                  <td className="px-6 py-3 text-slate-500">{entry.date}</td>
                  <td className="px-6 py-3 text-slate-500">{entry.ip}</td>
                  <td className="px-6 py-3">{entry.device}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`font-bold ${entry.success ? "text-emerald-700" : "text-red-500"}`}
                    >
                      {entry.success ? "Berhasil" : "Gagal"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
