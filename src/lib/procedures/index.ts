import type { Sql } from "postgres";

import {
  createOrderTransaction,
  addItemsToOrder,
  cancelOrderTransaction,
  cancelOrderItems,
} from "./orders";

import { recordPurchase } from "./purchases";

import {
  bookkeepingReport,
  cashBook,
} from "./bookkeeping";

import {
  dailySalary,
  recordDailySalary,
} from "./salary";

import {
  dashboardSummary,
  revenueLastDays,
  revenueTrend,
  expenseTrend,
  shiftRevenueRecap,
} from "./dashboard";

import { consumeBonus } from "./bonuses";

import {
  revokeUserSessions,
  adminClearDatasets,
} from "./admin";

export type ProcedureFn = (conn: Sql, params: any) => Promise<any>;

export const procedures: Record<string, ProcedureFn> = {
  create_order_transaction: createOrderTransaction,
  add_items_to_order: addItemsToOrder,
  cancel_order_transaction: cancelOrderTransaction,
  cancel_order_items: cancelOrderItems,

  record_purchase: recordPurchase,

  bookkeeping_report: bookkeepingReport,
  cash_book: cashBook,

  daily_salary: dailySalary,
  record_daily_salary: recordDailySalary,

  dashboard_summary: dashboardSummary,
  revenue_last_days: revenueLastDays,
  revenue_trend: revenueTrend,
  expense_trend: expenseTrend,
  shift_revenue_recap: shiftRevenueRecap,

  consume_bonus: consumeBonus,

  revoke_user_sessions: revokeUserSessions,
  admin_clear_datasets: adminClearDatasets,
};

export {
  createOrderTransaction,
  addItemsToOrder,
  cancelOrderTransaction,
  cancelOrderItems,
  recordPurchase,
  bookkeepingReport,
  cashBook,
  dailySalary,
  recordDailySalary,
  dashboardSummary,
  revenueLastDays,
  revenueTrend,
  expenseTrend,
  shiftRevenueRecap,
  consumeBonus,
  revokeUserSessions,
  adminClearDatasets,
};
