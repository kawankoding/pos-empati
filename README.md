# POS Empati

**Aplikasi Point of Sale (POS) offline-first untuk ritel Indonesia.**

Dibangun dengan Electron, React, dan SQLite. Berjalan sepenuhnya di perangkat lokal tanpa perlu koneksi internet — cocok untuk toko ritel, kafe, dan usaha kecil-menengah di Indonesia.

---

## Fitur

- **POS (Point of Sale)** — antarmuka kasir cepat dengan pencarian produk, kategori, dan manajemen keranjang
- **Manajemen Produk** — tambah, edit, hapus produk dengan harga beli/jual, stok, SKU, dan kategori
- **Manajemen Kategori** — kelompokkan produk untuk checkout lebih cepat
- **Riwayat Penjualan** — lihat, filter, dan ekspor laporan penjualan ke CSV
- **Manajemen Pengguna** — kelola akun admin dan kasir dengan peran berbeda
- **Laporan** — ringkasan penjualan, produk terlaris, dan laba rugi
- **Cetak Struk** — dukungan printer thermal Epson-compatible via USB
- **Backup & Restore** — cadangkan dan pulihkan database dengan verifikasi checksum
- **Pengaturan Toko** — nama toko, alamat, mata uang, zona waktu, bahasa
- **Tahan Pesanan** — parkir keranjang untuk dilanjutkan nanti
- **Offline-first** — semua data tersimpan lokal, tidak perlu koneksi internet

---

## Teknologi

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Lucide Icons |
| Backend | Electron 43, Node.js SQLite (`node:sqlite`) |
| Database | SQLite (WAL mode, transactional) |
| Testing | Vitest |
| Packaging | Electron Builder |
| Printer | ESC/POS thermal printer via `escpos-usb` |

---

## Persyaratan Sistem

- **Node.js** >= 22.12.0
- **npm** >= 10.x
- **OS**: macOS, Windows, atau Linux

---

## Instalasi & Pengembangan

```bash
# Clone repositori
git clone https://github.com/your-org/pos-empati.git
cd pos-empati

# Install dependencies
npm install

# Jalankan mode pengembangan
npm run dev
```

Mode pengembangan akan menjalankan:
1. Vite dev server (renderer React)
2. TypeScript watch compiler (main process Electron)
3. Electron (jendela aplikasi)

---

## Build & Packaging

```bash
# Build untuk arsitektur saat ini
npm run build && npm run package

# Build untuk arsitektur spesifik
npm run package -- --arm64   # Apple Silicon
npm run package -- --x64     # Intel

# Build tanpa installer (folder saja)
npm run package:dir
```

Hasil build akan tersedia di folder `release/`.

---

## Struktur Proyek

```
pos-empati/
├── electron/              # Main process Electron
│   ├── db/                # Database SQLite
│   │   ├── migrations/    # Migrasi database
│   │   └── queries/       # Query modules
│   ├── ipc.ts             # IPC handlers
│   ├── main.ts            # Entry point Electron
│   ├── preload.ts         # Preload bridge
│   ├── auth.ts            # Session management
│   ├── printer.ts         # Thermal printer
│   └── updater.ts         # Auto-updater
├── src/                   # Renderer React
│   ├── components/        # Komponen UI
│   │   ├── modals/        # Modal dialogs
│   │   └── ui/            # UI primitives
│   ├── lib/               # Utility & context
│   ├── pages/             # Halaman aplikasi
│   │   └── settings/      # Halaman pengaturan
│   └── types/             # Type declarations
├── tests/                 # Automated tests
│   └── db/                # Database tests
├── public/images/         # Assets
└── electron-builder.yml   # Konfigurasi packaging
```

---

## Testing

```bash
# Jalankan semua tes
npm test

# Watch mode
npm run test:watch

# Dengan coverage
npm run test:coverage
```

---

## Scripts

| Script | Fungsi |
|---|---|
| `npm run dev` | Jalankan mode pengembangan |
| `npm run build` | Build untuk produksi |
| `npm run test` | Jalankan tes |
| `npm run lint` | Cek kode dengan ESLint |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run package` | Build + package installer |
| `npm run format` | Format kode dengan Prettier |

---

## Lisensi

ISC License

---

## Kontak & Dukungan

- Email: muh.amirul.ihsan@gmail.com
- Website: www.amirul.id
