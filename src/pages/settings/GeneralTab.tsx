import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Palette, Settings2, Store, Upload } from "lucide-react";
import Button from "@components/ui/Button";
import FieldInput from "@components/ui/FieldInput";
import FieldSelect from "@components/ui/FieldSelect";
import ToggleSwitch from "@components/ui/ToggleSwitch";
import { api, type SettingsMap } from "@lib/api";
import { useSettings } from "@lib/SettingsContext";
import { useToast } from "@lib/ToastContext";

const DEFAULTS: SettingsMap = {
  store_name: "Toko Empati",
  store_address: "Jl. Sudirman No. 123, Jakarta Selatan, Indonesia",
  contact_email: "contact@tokoempati.com",
  phone_number: "+62 21 555 0123",
  currency: "IDR",
  timezone: "WIB",
  language: "id",
  sound_notifications: "true",
  auto_print_receipts: "false",
};

/* ------------------------------------------------------------------ */
/*  GeneralTab                                                        */
/* ------------------------------------------------------------------ */

export default function GeneralTab() {
  const { settings, loading, reloadSettings } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();

  const [saving, setSaving] = useState(false);

  const [storeName, setStoreName] = useState(DEFAULTS.store_name);
  const [storeAddress, setStoreAddress] = useState(DEFAULTS.store_address);
  const [contactEmail, setContactEmail] = useState(DEFAULTS.contact_email);
  const [phoneNumber, setPhoneNumber] = useState(DEFAULTS.phone_number);

  const [currency, setCurrency] = useState(DEFAULTS.currency);
  const [timezone, setTimezone] = useState(DEFAULTS.timezone);
  const [language, setLanguage] = useState(DEFAULTS.language);

  const [soundNotifications, setSoundNotifications] = useState(
    DEFAULTS.sound_notifications === "true",
  );
  const [autoPrintReceipts, setAutoPrintReceipts] = useState(
    DEFAULTS.auto_print_receipts === "true",
  );

  const loadedRef = useRef<SettingsMap | null>(null);

  /* ── Populate form fields from settings context ── */
  useEffect(() => {
    if (settings) {
      loadedRef.current = settings;
      applySettings(settings);
    }
  }, [settings]);

  function applySettings(s: SettingsMap) {
    setStoreName(s.store_name ?? DEFAULTS.store_name);
    setStoreAddress(s.store_address ?? DEFAULTS.store_address);
    setContactEmail(s.contact_email ?? DEFAULTS.contact_email);
    setPhoneNumber(s.phone_number ?? DEFAULTS.phone_number);
    setCurrency(s.currency ?? DEFAULTS.currency);
    setTimezone(s.timezone ?? DEFAULTS.timezone);
    setLanguage(s.language ?? DEFAULTS.language);
    setSoundNotifications((s.sound_notifications ?? DEFAULTS.sound_notifications) === "true");
    setAutoPrintReceipts((s.auto_print_receipts ?? DEFAULTS.auto_print_receipts) === "true");
  }

  /* ── Build key-value payload from current state ── */
  const buildPayload = useCallback(
    (): SettingsMap => ({
      store_name: storeName,
      store_address: storeAddress,
      contact_email: contactEmail,
      phone_number: phoneNumber,
      currency,
      timezone,
      language,
      sound_notifications: String(soundNotifications),
      auto_print_receipts: String(autoPrintReceipts),
    }),
    [
      storeName,
      storeAddress,
      contactEmail,
      phoneNumber,
      currency,
      timezone,
      language,
      soundNotifications,
      autoPrintReceipts,
    ],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.setSettings(buildPayload());
      if (result.ok) {
        loadedRef.current = buildPayload();
        await reloadSettings();
        toastSuccess("Pengaturan berhasil disimpan.");
      } else {
        toastError(result.message || "Gagal menyimpan pengaturan.");
      }
    } catch {
      toastError("Gagal menyimpan pengaturan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (loadedRef.current) {
      applySettings(loadedRef.current);
    } else {
      applySettings(DEFAULTS);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-500">Memuat pengaturan...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Section: Store Info & Branding */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Store Information Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Store size={20} className="text-emerald-700" />
            <h3 className="text-lg font-semibold text-slate-800">Informasi Toko</h3>
          </div>

          <div className="space-y-4">
            <FieldInput
              label="Nama Toko"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Alamat Toko
              </label>
              <textarea
                rows={2}
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldInput
                label="Email Kontak"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />

              <FieldInput
                label="Nomor Telepon"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Business Branding Card */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Palette size={20} className="text-emerald-700" />
            <h3 className="text-lg font-semibold text-slate-800">Branding Bisnis</h3>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
            <img
              className="mb-4 h-32 w-auto drop-shadow-sm"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqAtE4eYTxRbK8H8nrGj43FFkPvN8CcWDhsdkgEBT-Jg-PDw9r-W2Dr8Sy8J8v1er-PpHYj7qhcwgbfwZUMaWyMKfAJyiBbFmYvpggeZRpqTSIhb2h3IUT3a17OPgZWmWjrItJgbqVUBtwilr71XFwaNtbOK7dCh8YlTKZlvKQL1Km7Ef3dHCmHdfYnbghDO-WRVvpUeg9QRcf0TMUNzt_W8dmrQWKnh1oRUpCgVigzC0hV9WwawGrB2PBD3UKTspapw61MW6AtmTf"
              alt="Logo Toko"
            />

            <div className="flex gap-3">
              <Button variant="primary" size="sm" leftIcon={<Upload size={16} />}>
                Ganti Logo
              </Button>
              <Button variant="secondary" size="sm">
                Hapus
              </Button>
            </div>

            <p className="mt-4 px-4 text-center text-xs text-slate-500">
              Ukuran disarankan: 512x512px. Format: PNG, JPG, SVG.
            </p>
          </div>
        </section>
      </div>

      {/* Section: Regional & System Preferences */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Regional Settings Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Globe size={20} className="text-emerald-700" />
            <h3 className="text-lg font-semibold text-slate-800">Pengaturan Regional</h3>
          </div>

          <div className="space-y-4">
            <FieldSelect
              label="Mata Uang"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="IDR">IDR - Indonesian Rupiah</option>
              <option value="USD">USD - US Dollar</option>
              <option value="SGD">SGD - Singapore Dollar</option>
            </FieldSelect>

            <FieldSelect
              label="Zona Waktu"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="WIB">WIB - Jakarta (UTC+7)</option>
              <option value="WITA">WITA - Makassar (UTC+8)</option>
              <option value="WIT">WIT - Jayapura (UTC+9)</option>
            </FieldSelect>

            <FieldSelect
              label="Bahasa"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="id">Indonesian (Bahasa Indonesia)</option>
              <option value="en">English (US)</option>
            </FieldSelect>
          </div>
        </section>

        {/* System Preferences Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Settings2 size={20} className="text-emerald-700" />
            <h3 className="text-lg font-semibold text-slate-800">Preferensi Sistem</h3>
          </div>

          <div className="space-y-6">
            {/* Dark Mode (Disabled) */}
            <div className="flex items-center justify-between opacity-50">
              <div>
                <p className="text-sm font-semibold text-slate-800">Mode Gelap</p>
                <p className="text-xs text-slate-500">Beralih ke tema antarmuka gelap</p>
              </div>
              <ToggleSwitch id="dark-mode" checked={false} onChange={() => {}} disabled />
            </div>

            {/* Sound Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Notifikasi Suara</p>
                <p className="text-xs text-slate-500">Putar suara untuk error dan sukses</p>
              </div>
              <ToggleSwitch
                id="sounds"
                checked={soundNotifications}
                onChange={setSoundNotifications}
              />
            </div>

            {/* Auto-print Receipts */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Cetak Struk Otomatis</p>
                <p className="text-xs text-slate-500">Cetak struk segera setelah checkout</p>
              </div>
              <ToggleSwitch
                id="autoprint"
                checked={autoPrintReceipts}
                onChange={setAutoPrintReceipts}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Sticky Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
        <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
          Batalkan Perubahan
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </div>
  );
}
