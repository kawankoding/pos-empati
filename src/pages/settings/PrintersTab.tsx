import { useEffect, useState } from "react";
import { Printer, RefreshCw, Usb } from "lucide-react";
import Button from "@components/ui/Button";
import { api } from "@lib/api";

type PrinterDevice = {
  vendorId: number;
  productId: number;
};

const PRINTER_NAMES: Record<string, string> = {
  "1208:514": "Epson TM-T88 Series",
  "1208:3605": "Epson TM-T20 Series",
  "5380:6": "Bixolon SRP Series",
  "1054:20497": "Xprinter XP Series",
};

export default function PrintersTab() {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadPrinters = async () => {
    setLoading(true);
    setError(null);
    try {
      const devices = await api.listPrinters();
      setPrinters(devices);
    } catch {
      setError("Gagal mendeteksi printer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrinters();
  }, []);

  const handleTestPrint = async (vendorId: number, productId: number) => {
    setTestResult(null);
    const result = await api.printReceipt({
      vendorId,
      productId,
      storeName: "POS Empati",
      storeAddress: "Test Print",
      date: new Date().toLocaleString("id-ID"),
      items: [{ name: "Item Uji Coba", qty: 1, price: 0 }],
      total: 0,
      paid: 0,
      change: 0,
      cashier: "System",
      txId: "#TE-TEST",
      logoPath: "/images/toko-empati.png",
    });
    if (result.ok) {
      setTestResult("Test print berhasil dikirim.");
    } else {
      setTestResult(`Gagal: ${result.message}`);
    }
    setTimeout(() => setTestResult(null), 4000);
  };

  const formatVidPid = (vendorId: number, productId: number) =>
    `0x${vendorId.toString(16).padStart(4, "0")}:0x${productId.toString(16).padStart(4, "0")}`;

  const getPrinterName = (vendorId: number, productId: number) => {
    const key = `${vendorId}:${productId}`;
    return PRINTER_NAMES[key] ?? `USB Printer ${formatVidPid(vendorId, productId)}`;
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-semibold text-slate-800">Pengaturan Printer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Deteksi printer thermal USB dan uji cetak struk.
        </p>
      </div>

      {/* Detected printers */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer size={20} className="text-emerald-700" />
            <h3 className="text-lg font-semibold text-slate-800">Printer Terdeteksi</h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={loadPrinters}
          >
            Pindai Ulang
          </Button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Memindai printer...</div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-center">
            <p className="mb-3 text-sm text-red-700">{error}</p>
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => void loadPrinters()}
            >
              Coba Lagi
            </Button>
          </div>
        ) : printers.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Usb size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada printer terdeteksi</p>
            <p className="mt-1 text-xs text-slate-500">
              Pastikan printer thermal terhubung via USB dan telah menyala.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {printers.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Usb size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {getPrinterName(p.vendorId, p.productId)}
                    </p>
                    <p className="text-xs text-slate-500">
                      VID:PID {formatVidPid(p.vendorId, p.productId)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleTestPrint(p.vendorId, p.productId)}
                >
                  Uji Cetak
                </Button>
              </div>
            ))}
          </div>
        )}

        {testResult ? (
          <p
            className={`mt-4 rounded-md px-3 py-2 text-sm ${
              testResult.startsWith("Test")
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {testResult}
          </p>
        ) : null}
      </section>

      {/* Paper size info */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Informasi</h3>
        <div className="mt-4 space-y-2 text-sm text-slate-500">
          <p>• Printer yang didukung: Epson TM-T82, TM-T88, TM-T20, Bixolon SRP, Xprinter XP</p>
          <p>• Ukuran kertas: 80mm (standar) atau 58mm</p>
          <p>• Koneksi: USB (vendor ID standar Epson: 0x04B8)</p>
          <p>• Pengaturan auto-print dapat diaktifkan di tab Umum &rarr; Cetak Struk Otomatis</p>
        </div>
      </section>
    </div>
  );
}
