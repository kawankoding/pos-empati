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

  const cmd = Buffer.concat([
    Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
    bitmap,
  ]);

  printer.raw(cmd);
  printer.text("");
}

/* ------------------------------------------------------------------ */
/*  Receipt layout                                                    */
/* ------------------------------------------------------------------ */

function buildReceipt(printer: any, data: ReceiptData): void {
  const divider = "───────────────────────────";

  printer
    .font("a")
    .align("ct")
    .style("b")
    .size(1, 1)
    .text(data.storeName)
    .style("normal")
    .size(0, 0)
    .text(data.storeAddress)
    .text("")
    .text(divider)
    .align("lt")
    .text(`Tgl  : ${data.date}`)
    .text(`Kasir: ${data.cashier}`)
    .text(`ID   : ${data.txId}`)
    .text(divider);

  for (const item of data.items) {
    const lineTotal = item.qty * item.price;
    printer.text(item.name);
    printer.text(
      `  ${item.qty} x Rp ${item.price.toLocaleString("id-ID")}  =  Rp ${lineTotal.toLocaleString("id-ID")}`,
    );
  }

  printer
    .text(divider)
    .align("rt")
    .style("b")
    .text(`TOTAL    : Rp ${data.total.toLocaleString("id-ID")}`)
    .text(`BAYAR    : Rp ${data.paid.toLocaleString("id-ID")}`)
    .text(`KEMBALI  : Rp ${data.change.toLocaleString("id-ID")}`)
    .style("normal")
    .align("ct")
    .text("")
    .text("Terima kasih telah berbelanja")
    .text("")
    .feed(3)
    .cut();
}

/* ------------------------------------------------------------------ */
/*  Console fallback (development)                                     */
/* ------------------------------------------------------------------ */

function printToConsole(data: ReceiptData): void {
  console.log("\n══════════ RECEIPT ══════════");
  console.log(data.storeName);
  console.log(data.storeAddress);
  console.log("───────────────────────────");
  console.log(`Tgl  : ${data.date}`);
  console.log(`Kasir: ${data.cashier}`);
  console.log(`ID   : ${data.txId}`);
  console.log("───────────────────────────");
  for (const item of data.items) {
    const lineTotal = item.qty * item.price;
    console.log(
      `${item.name}  ${item.qty} x Rp ${item.price.toLocaleString("id-ID")} = Rp ${lineTotal.toLocaleString("id-ID")}`,
    );
  }
  console.log("───────────────────────────");
  console.log(`TOTAL    : Rp ${data.total.toLocaleString("id-ID")}`);
  console.log(`BAYAR    : Rp ${data.paid.toLocaleString("id-ID")}`);
  console.log(`KEMBALI  : Rp ${data.change.toLocaleString("id-ID")}`);
  console.log("");
  console.log("Terima kasih telah berbelanja");
  console.log("══════════════════════════════\n");
}
