/**
 * Seed test data into the POS Empati database.
 *
 * Usage:
 *   npx tsx electron/db/run-seed.ts         # show current counts + seed if empty
 *   npx tsx electron/db/run-seed.ts --force  # delete existing, re-seed from scratch
 *
 * Auto-detects the database path for both dev (Electron/) and prod (pos-empati/).
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { seedCategoriesAndProducts } from "./seed";

const force = process.argv.includes("--force");

function userDataBase(): string {
  if (process.env.APPDATA) return process.env.APPDATA;
  return path.join(process.env.HOME || process.env.USERPROFILE || ".");
}

function findDbPath(): string | null {
  const base = userDataBase();
  // Check both dev-mode (Electron/) and prod (pos-empati/) paths
  for (const name of ["Electron", "pos-empati"]) {
    const p = path.join(base, name, "data", "pos.db");
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const dbPath = findDbPath();

if (!dbPath) {
  console.error("Database not found.");
  console.error("Searched under:", path.join(userDataBase(), "Electron"));
  console.error("Searched under:", path.join(userDataBase(), "pos-empati"));
  console.error("Run the app once first to create the database.");
  process.exit(1);
}

console.log("Using database:", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

try {
  const catCount = (
    db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number }
  ).count;
  const prodCount = (
    db.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number }
  ).count;

  console.log(`Current: ${catCount} categories, ${prodCount} products`);

  if (catCount > 0 && !force) {
    console.log("Categories already exist. Use --force to replace all data.");
    process.exit(0);
  }

  if (force) {
    console.log("Clearing existing data...");
    db.exec("DELETE FROM sale_items");
    db.exec("DELETE FROM sales");
    db.exec("DELETE FROM products");
    db.exec("DELETE FROM categories");
  }

  seedCategoriesAndProducts(db);
  console.log("Seeder completed successfully.");
} catch (err) {
  console.error("Seeder failed:", err);
  process.exit(1);
} finally {
  db.close();
}
