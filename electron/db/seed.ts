import type { DatabaseSync } from "node:sqlite";

export function seedInitialAdmin(_db: DatabaseSync): void {
  // Admin creation is now handled by the first-run setup flow.
  // This function intentionally left as a no-op.
}

export function seedSettings(db: DatabaseSync): void {
  const row = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };

  if (row.count === 0) {
    const defaults: Record<string, string> = {
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

    db.exec("BEGIN");
    try {
      const stmt = db.prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      );
      for (const [key, value] of Object.entries(defaults)) {
        stmt.run(key, value);
      }
      db.exec("COMMIT");
      console.log("[seed] Default settings created");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}

export function seedCategoriesAndProducts(db: DatabaseSync): void {
  const count = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (count.count > 0) return;

  const categories = [
    "Makanan Ringan",
    "Minuman",
    "Rokok & Tembakau",
    "Bumbu Dapur",
    "Mie & Pasta",
    "Kebersihan & Rumah Tangga",
    "Perawatan Diri",
    "Susu & Olahan",
  ];

  const products: Array<{
    category: string;
    name: string;
    buyPrice: number;
    sellPrice: number;
    stock: number;
  }> = [
    // Makanan Ringan
    {
      category: "Makanan Ringan",
      name: "Chitato Sapi Panggang 60g",
      buyPrice: 12000,
      sellPrice: 15000,
      stock: 40,
    },
    {
      category: "Makanan Ringan",
      name: "Qtela Original 60g",
      buyPrice: 9000,
      sellPrice: 12000,
      stock: 50,
    },
    {
      category: "Makanan Ringan",
      name: "Taro Net 45g",
      buyPrice: 5000,
      sellPrice: 7000,
      stock: 60,
    },
    {
      category: "Makanan Ringan",
      name: "Pilus Garuda 100g",
      buyPrice: 8000,
      sellPrice: 11000,
      stock: 35,
    },
    { category: "Makanan Ringan", name: "Oreo 133g", buyPrice: 8000, sellPrice: 10000, stock: 30 },
    {
      category: "Makanan Ringan",
      name: "Beng Beng 30g",
      buyPrice: 2000,
      sellPrice: 3000,
      stock: 100,
    },
    {
      category: "Makanan Ringan",
      name: "Roti Tawar Sari Roti",
      buyPrice: 12000,
      sellPrice: 15000,
      stock: 20,
    },
    {
      category: "Makanan Ringan",
      name: "Kacang Garuda 150g",
      buyPrice: 15000,
      sellPrice: 19000,
      stock: 25,
    },
    {
      category: "Makanan Ringan",
      name: "Wafer Tango 120g",
      buyPrice: 7500,
      sellPrice: 10000,
      stock: 40,
    },

    // Minuman
    { category: "Minuman", name: "Aqua 600ml", buyPrice: 2500, sellPrice: 4000, stock: 100 },
    {
      category: "Minuman",
      name: "Teh Botol Sosro 350ml",
      buyPrice: 3500,
      sellPrice: 5000,
      stock: 48,
    },
    {
      category: "Minuman",
      name: "Kopi Kenangan Mantan 250ml",
      buyPrice: 7000,
      sellPrice: 10000,
      stock: 24,
    },
    {
      category: "Minuman",
      name: "Pocari Sweat 500ml",
      buyPrice: 7500,
      sellPrice: 10000,
      stock: 30,
    },
    { category: "Minuman", name: "Coca Cola 390ml", buyPrice: 5000, sellPrice: 7000, stock: 48 },
    { category: "Minuman", name: "Sprite 390ml", buyPrice: 5000, sellPrice: 7000, stock: 48 },
    { category: "Minuman", name: "Fanta 390ml", buyPrice: 5000, sellPrice: 7000, stock: 48 },
    {
      category: "Minuman",
      name: "Nutrisari Jeruk 30g",
      buyPrice: 1500,
      sellPrice: 2500,
      stock: 80,
    },
    {
      category: "Minuman",
      name: "Good Day Cappuccino 25g",
      buyPrice: 1500,
      sellPrice: 2500,
      stock: 72,
    },
    { category: "Minuman", name: "You C1000 140ml", buyPrice: 6000, sellPrice: 8000, stock: 36 },

    // Rokok & Tembakau
    {
      category: "Rokok & Tembakau",
      name: "Sampoerna Mild 16",
      buyPrice: 28000,
      sellPrice: 32000,
      stock: 30,
    },
    {
      category: "Rokok & Tembakau",
      name: "Marlboro Merah 20",
      buyPrice: 38000,
      sellPrice: 43000,
      stock: 20,
    },
    {
      category: "Rokok & Tembakau",
      name: "Djarum Super 12",
      buyPrice: 18000,
      sellPrice: 21000,
      stock: 25,
    },
    {
      category: "Rokok & Tembakau",
      name: "Gudang Garam Surya 16",
      buyPrice: 25000,
      sellPrice: 29000,
      stock: 20,
    },
    {
      category: "Rokok & Tembakau",
      name: "LA Bold 16",
      buyPrice: 26000,
      sellPrice: 30000,
      stock: 20,
    },
    {
      category: "Rokok & Tembakau",
      name: "Esse Change 20",
      buyPrice: 27000,
      sellPrice: 31000,
      stock: 15,
    },
    {
      category: "Rokok & Tembakau",
      name: "U Bold 16",
      buyPrice: 24000,
      sellPrice: 28000,
      stock: 25,
    },

    // Bumbu Dapur
    {
      category: "Bumbu Dapur",
      name: "Royco Ayam 200g",
      buyPrice: 9000,
      sellPrice: 12000,
      stock: 30,
    },
    {
      category: "Bumbu Dapur",
      name: "Masako Sapi 100g",
      buyPrice: 3000,
      sellPrice: 5000,
      stock: 50,
    },
    {
      category: "Bumbu Dapur",
      name: "Kecap Bango 135ml",
      buyPrice: 5000,
      sellPrice: 8000,
      stock: 40,
    },
    {
      category: "Bumbu Dapur",
      name: "Saos Sambal ABC 135ml",
      buyPrice: 4000,
      sellPrice: 7000,
      stock: 40,
    },
    {
      category: "Bumbu Dapur",
      name: "Garam Dolpin 250g",
      buyPrice: 2000,
      sellPrice: 4000,
      stock: 60,
    },
    {
      category: "Bumbu Dapur",
      name: "Gula Pasir Gulaku 1kg",
      buyPrice: 15000,
      sellPrice: 18000,
      stock: 25,
    },
    {
      category: "Bumbu Dapur",
      name: "Minyak Goreng Bimoli 1L",
      buyPrice: 20000,
      sellPrice: 24000,
      stock: 20,
    },
    { category: "Bumbu Dapur", name: "Terasi ABC 20g", buyPrice: 1500, sellPrice: 3000, stock: 50 },
    {
      category: "Bumbu Dapur",
      name: "Santan Kara 200ml",
      buyPrice: 7000,
      sellPrice: 10000,
      stock: 30,
    },

    // Mie & Pasta
    {
      category: "Mie & Pasta",
      name: "Indomie Goreng 85g",
      buyPrice: 2700,
      sellPrice: 3500,
      stock: 120,
    },
    {
      category: "Mie & Pasta",
      name: "Indomie Soto 70g",
      buyPrice: 2700,
      sellPrice: 3500,
      stock: 100,
    },
    {
      category: "Mie & Pasta",
      name: "Mie Sedap Goreng 90g",
      buyPrice: 2700,
      sellPrice: 3500,
      stock: 100,
    },
    {
      category: "Mie & Pasta",
      name: "Pop Mie Ayam 72g",
      buyPrice: 4500,
      sellPrice: 6000,
      stock: 48,
    },
    {
      category: "Mie & Pasta",
      name: "Ladang Lima Spaghetti 225g",
      buyPrice: 8000,
      sellPrice: 11000,
      stock: 20,
    },

    // Kebersihan & Rumah Tangga
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Sunlight 400ml",
      buyPrice: 8000,
      sellPrice: 11000,
      stock: 30,
    },
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Rinso Cair 400ml",
      buyPrice: 10000,
      sellPrice: 14000,
      stock: 24,
    },
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Bayclin 500ml",
      buyPrice: 5000,
      sellPrice: 8000,
      stock: 30,
    },
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Super Pell 400ml",
      buyPrice: 12000,
      sellPrice: 16000,
      stock: 20,
    },
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Tisu Paseo 250 sheet",
      buyPrice: 10000,
      sellPrice: 14000,
      stock: 24,
    },
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Kapur Barus Bagus 4pcs",
      buyPrice: 3000,
      sellPrice: 5000,
      stock: 50,
    },
    {
      category: "Kebersihan & Rumah Tangga",
      name: "Pengharum Ruangan Stella",
      buyPrice: 10000,
      sellPrice: 14000,
      stock: 18,
    },

    // Perawatan Diri
    {
      category: "Perawatan Diri",
      name: "Lifebuoy Sabun Mandi 70g",
      buyPrice: 3000,
      sellPrice: 5000,
      stock: 72,
    },
    {
      category: "Perawatan Diri",
      name: "Pepsodent 120g",
      buyPrice: 8000,
      sellPrice: 11000,
      stock: 36,
    },
    {
      category: "Perawatan Diri",
      name: "Clear Shampoo 170ml",
      buyPrice: 13000,
      sellPrice: 17000,
      stock: 20,
    },
    {
      category: "Perawatan Diri",
      name: "Rexona Roll On 50ml",
      buyPrice: 12000,
      sellPrice: 15000,
      stock: 24,
    },
    {
      category: "Perawatan Diri",
      name: "Ciptadent 120g",
      buyPrice: 5000,
      sellPrice: 8000,
      stock: 40,
    },
    {
      category: "Perawatan Diri",
      name: "Biore Body Foam 200ml",
      buyPrice: 18000,
      sellPrice: 23000,
      stock: 15,
    },
    {
      category: "Perawatan Diri",
      name: "Softex 20 pads",
      buyPrice: 8000,
      sellPrice: 12000,
      stock: 30,
    },

    // Susu & Olahan
    {
      category: "Susu & Olahan",
      name: "Ultra Milk 250ml",
      buyPrice: 5000,
      sellPrice: 7000,
      stock: 60,
    },
    {
      category: "Susu & Olahan",
      name: "Frisian Flag Kental Manis 375g",
      buyPrice: 12000,
      sellPrice: 15000,
      stock: 24,
    },
    {
      category: "Susu & Olahan",
      name: "Dancow 400g",
      buyPrice: 35000,
      sellPrice: 42000,
      stock: 12,
    },
    {
      category: "Susu & Olahan",
      name: "Cimory Yogurt 200ml",
      buyPrice: 8000,
      sellPrice: 11000,
      stock: 24,
    },
    {
      category: "Susu & Olahan",
      name: "Keju Kraft Cheddar 170g",
      buyPrice: 18000,
      sellPrice: 23000,
      stock: 15,
    },
    {
      category: "Susu & Olahan",
      name: "Greenfields Full Cream 1L",
      buyPrice: 20000,
      sellPrice: 25000,
      stock: 12,
    },
  ];

  db.exec("BEGIN");
  try {
    const insertCat = db.prepare("INSERT INTO categories (name) VALUES (?)");
    const catMap = new Map<string, number>();

    for (const name of categories) {
      const result = insertCat.run(name);
      catMap.set(name, Number(result.lastInsertRowid));
    }

    const insertProd = db.prepare(
      "INSERT INTO products (category_id, name, buy_price, sell_price, stock) VALUES (?, ?, ?, ?, ?)",
    );

    for (const p of products) {
      const catId = catMap.get(p.category);
      if (catId != null) {
        insertProd.run(catId, p.name, p.buyPrice, p.sellPrice, p.stock);
      }
    }

    db.exec("COMMIT");
    console.log(`[seed] ${categories.length} categories, ${products.length} products created`);
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
