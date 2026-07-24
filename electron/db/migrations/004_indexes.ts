import type { DatabaseSync } from "node:sqlite";

export const migration004 = {
  version: 4,
  name: "Add performance indexes",
  up(db: DatabaseSync): void {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON sales(cashier_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
    `);
  },
};
