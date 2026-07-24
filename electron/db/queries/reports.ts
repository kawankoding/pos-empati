import { getDb } from "../index";

export const reportQueries = {
  summary(dateRange: { startDate: string; endDate: string }) {
    const db = getDb();

    // Convert local date strings to UTC datetime range.
    // created_at is stored as UTC (SQLite CURRENT_TIMESTAMP),
    // so "2025-07-16" Jakarta (UTC+7) becomes "2025-07-15 17:00:00" to "2025-07-16 16:59:59" UTC.
    const localStart = new Date(`${dateRange.startDate}T00:00:00`);
    const localEnd = new Date(`${dateRange.endDate}T23:59:59`);
    const start = localStart.toISOString().replace("T", " ").slice(0, 19);
    const end = localEnd.toISOString().replace("T", " ").slice(0, 19);

    const summary = db
      .prepare(
        `SELECT
           COUNT(*) AS transactions,
           COALESCE(SUM(total), 0) AS revenue,
           COALESCE(SUM(paid), 0) AS paid,
           COALESCE(SUM(change_amount), 0) AS change
         FROM sales
         WHERE created_at BETWEEN ? AND ?
           AND status = 'completed'`,
      )
      .get(start, end) as { transactions: number; revenue: number; paid: number; change: number };

    const topProducts = db
      .prepare(
        `SELECT
           p.id, p.name,
           COALESCE(SUM(si.qty), 0) AS qty_sold,
           COALESCE(SUM(si.subtotal), 0) AS amount,
           COALESCE(SUM(si.subtotal - COALESCE(si.buy_price, 0) * si.qty), 0) AS profit
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         JOIN sales s ON s.id = si.sale_id
         WHERE s.created_at BETWEEN ? AND ?
           AND s.status = 'completed'
         GROUP BY p.id, p.name
         ORDER BY qty_sold DESC
         LIMIT 10`,
      )
      .all(start, end);

    const profitData = db
      .prepare(
        `SELECT
           COALESCE(SUM(si.subtotal - COALESCE(si.buy_price, 0) * si.qty), 0) AS gross_profit,
           COALESCE(AVG(CASE WHEN si.qty > 0 THEN (si.price - COALESCE(si.buy_price, 0)) END), 0) AS avg_margin_per_item
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         WHERE s.created_at BETWEEN ? AND ?
           AND s.status = 'completed'`,
      )
      .get(start, end) as { gross_profit: number; avg_margin_per_item: number };

    return {
      ok: true as const,
      summary,
      topProducts,
      profit: {
        grossProfit: profitData.gross_profit,
        avgMarginPerItem: profitData.avg_margin_per_item,
        profitMarginPercentage:
          summary.revenue > 0 ? +((profitData.gross_profit / summary.revenue) * 100).toFixed(1) : 0,
      },
    };
  },
};
