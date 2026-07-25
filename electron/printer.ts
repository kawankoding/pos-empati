/* eslint-disable @typescript-eslint/no-explicit-any */
/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type ReceiptData = {
  storeName: string;
  storeAddress: string;
  date: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  paid: number;
  change: number;
  cashier: string;
  txId: string;
  logoPath?: string;
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export async function printReceipt(
  data: ReceiptData,
  vendorId?: number,
  productId?: number,
): Promise<void> {
  if (!vendorId || !productId) {
    printToConsole(data);
    return;
  }

  let escpos: any;
  let USB: any;
  try {
    escpos = require("escpos");
    USB = require("escpos-usb");
  } catch {
    printToConsole(data);
    return;
  }

  return new Promise((resolve, reject) => {
    const device = new USB(vendorId, productId);

    device.open(async (err: Error | null) => {
      if (err) {
        device.close();
        return reject(new Error("Printer tidak ditemukan. Periksa koneksi USB."));
      }

      try {
        const printer = new escpos(device, { encoding: "GB18030" });

        // Print logo if available
        if (data.logoPath) {
          try {
            await printLogo(printer, data.logoPath);
          } catch {
            // Logo is optional — skip on error
          }
        }

        buildReceipt(printer, data);

        printer.flush(() => {
          printer.close();
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Logo printing via ESC/POS raster bit image command                 */
/* ------------------------------------------------------------------ */

async function printLogo(printer: any, logoPath: string): Promise<void> {
  const sharp = require("sharp");
  const path = require("path");

  // Resize logo to receipt width (384px = ~48mm at 8dots/mm)
  const { data, info } = await sharp(logoPath)
    .resize(384, undefined, { fit: "inside" })
    .greyscale()
    .threshold(128)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;

  // Each byte represents 8 horizontal pixels (1 = black, 0 = white)
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap = Buffer.alloc(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // pixel value: 0 = black (print), 255 = white (skip)
      const pixel = data[y * width + x];
      if (pixel < 128) {
        // Print this pixel (set bit)
        const byteIdx = y * bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        bitmap[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  // Send GS v 0 m xL xH yL yH + bitmap data
  // m = 0 (normal), xL/xH = bytesPerRow, yL/yH = height
  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  const cmd = Buffer.concat([Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]), bitmap]);

  printer.raw(cmd);
  printer.text("");
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return n.toLocaleString("id-ID");
}

const LINE_WIDTH = 32; // Font A (~12 dots/char on 58mm)
const LINE_WIDTH_B = 42; // Font B (~9 dots/char on 58mm)

/** Left-align label, right-align amount within given width */
function line(label: string, amount: string, width = LINE_WIDTH): string {
  const padded = label.padEnd(width - amount.length, " ");
  return padded + amount;
}

function divider(width = LINE_WIDTH): string {
  return "─".repeat(width);
}

/* ------------------------------------------------------------------ */
/*  Receipt layout                                                    */
/* ------------------------------------------------------------------ */

function buildReceipt(printer: any, data: ReceiptData): void {
  const div = divider();

  // ── Header ──
  printer
    .font("a")
    .align("ct")
    .style("b")
    .size(1, 1)
    .text(data.storeName)
    .style("normal")
    .size(0, 0);

  if (data.storeAddress) {
    printer.text(data.storeAddress);
  }

  printer
    .text("")
    .text(div)
    .align("lt")
    .text(`Tgl  : ${data.date}`)
    .text(`Kasir: ${data.cashier}`)
    .text(`ID   : ${data.txId}`)
    .text(div);

  // ── Items ──
  printer.font("b");
  for (const item of data.items) {
    const lineTotal = item.qty * item.price;
    printer.text(item.name);
    const detail = `  ${item.qty} x ${fmt(item.price)}`;
    printer.text(line(detail, fmt(lineTotal), LINE_WIDTH_B));
  }
  printer.font("a");

  // ── Totals ──
  printer.text(div);

  // Right-align amounts using manual column spacing
  printer.text(line("TOTAL", `Rp ${fmt(data.total)}`));
  printer.text(line("BAYAR", `Rp ${fmt(data.paid)}`));
  printer.text(line("KEMBALI", `Rp ${fmt(data.change)}`));

  // ── Footer ──
  printer.align("ct").text("").text("Terima kasih telah").text("berbelanja").text("").feed(1).cut();
}

/* ------------------------------------------------------------------ */
/*  Console fallback (development)                                     */
/* ------------------------------------------------------------------ */

function printToConsole(data: ReceiptData): void {
  const div = "───────────────────────────";

  console.log("\n══════════ RECEIPT ══════════");
  console.log(data.storeName);
  if (data.storeAddress) console.log(data.storeAddress);
  console.log(div);
  console.log(`Tgl  : ${data.date}`);
  console.log(`Kasir: ${data.cashier}`);
  console.log(`ID   : ${data.txId}`);
  console.log(div);
  for (const item of data.items) {
    const lineTotal = item.qty * item.price;
    console.log(item.name);
    console.log(`  ${item.qty} x ${fmt(item.price)}  =  ${fmt(lineTotal)}`);
  }
  console.log(div);
  console.log(line("TOTAL", `Rp ${fmt(data.total)}`));
  console.log(line("BAYAR", `Rp ${fmt(data.paid)}`));
  console.log(line("KEMBALI", `Rp ${fmt(data.change)}`));
  console.log("");
  console.log("Terima kasih telah berbelanja");
  console.log("══════════════════════════════\n");
}
