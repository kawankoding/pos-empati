declare module "escpos" {
  interface Adapter {
    open(cb: (err: Error | null) => void): void;
    write(data: Buffer, cb: (err: Error | null) => void): void;
    close(cb?: (err: Error | null) => void): void;
  }

  interface PrintOptions {
    encoding?: string;
  }

  class Printer {
    constructor(adapter: Adapter, options?: PrintOptions);
    font(family: "a" | "b"): this;
    align(align: "lt" | "ct" | "rt"): this;
    style(type: "normal" | "b" | "u" | "u2" | "bi" | "biu"): this;
    size(width: number, height: number): this;
    text(content: string): this;
    feed(lines?: number): this;
    cut(partial?: boolean, feed?: number): void;
    flush(cb?: (err: Error | null) => void): void;
    close(cb?: (err: Error | null) => void): void;
  }

  export = Printer;
}

declare module "escpos-usb" {
  interface USBPrinter {
    deviceDescriptor: {
      idVendor: number;
      idProduct: number;
    };
  }

  class USB {
    constructor(vendorId?: number, productId?: number);
    open(cb: (err: Error | null) => void): void;
    close(cb?: (err: Error | null) => void): void;
  }

  function findPrinter(): USBPrinter[];

  export = USB;
  export { findPrinter };
}
