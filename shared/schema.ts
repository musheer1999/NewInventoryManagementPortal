import { pgTable, text, serial, integer, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- Products ---
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  productId: text("product_id"), // Optional user-facing ID
  uniqueId: text("unique_id").notNull().unique(), // The critical unique ID
  quantity: integer("quantity").notNull().default(0),
  averageBuyPrice: numeric("average_buy_price", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Buy Bills ---
export const buyBills = pgTable("buy_bills", {
  id: serial("id").primaryKey(),
  dealerName: text("dealer_name"),
  dealerGSTNumber: text("dealer_gst_number"),
  gstPercentage: numeric("gst_percentage", { precision: 5, scale: 2 }),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }),
  billDate: date("bill_date", { mode: "string" }).notNull(), // YYYY-MM-DD
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const buyBillItems = pgTable("buy_bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => buyBills.id),
  productRef: integer("product_ref").notNull().references(() => products.id),
  uniqueId: text("unique_id").notNull(), // Snapshot for history
  buyPrice: numeric("buy_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
});

// --- Sell Bills ---
export const sellBills = pgTable("sell_bills", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  customerGSTNumber: text("customer_gst_number"),
  gstPercentage: numeric("gst_percentage", { precision: 5, scale: 2 }),
  gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }),
  billDate: date("bill_date", { mode: "string" }).notNull(), // YYYY-MM-DD
  totalProfit: numeric("total_profit", { precision: 12, scale: 2 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sellBillItems = pgTable("sell_bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").notNull().references(() => sellBills.id),
  productRef: integer("product_ref").notNull().references(() => products.id),
  uniqueId: text("unique_id").notNull(),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  profitPerUnit: numeric("profit_per_unit", { precision: 12, scale: 2 }).notNull(),
  totalProfit: numeric("total_profit", { precision: 12, scale: 2 }).notNull(),
});

// --- Expenses ---
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseType: text("expense_type").notNull(), // Transport, Rent, Electricity, Salary, Miscellaneous
  description: text("description"),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Relations ---
export const buyBillRelations = relations(buyBills, ({ many }) => ({
  items: many(buyBillItems),
}));

export const buyBillItemRelations = relations(buyBillItems, ({ one }) => ({
  bill: one(buyBills, {
    fields: [buyBillItems.billId],
    references: [buyBills.id],
  }),
  product: one(products, {
    fields: [buyBillItems.productRef],
    references: [products.id],
  }),
}));

export const sellBillRelations = relations(sellBills, ({ many }) => ({
  items: many(sellBillItems),
}));

export const sellBillItemRelations = relations(sellBillItems, ({ one }) => ({
  bill: one(sellBills, {
    fields: [sellBillItems.billId],
    references: [sellBills.id],
  }),
  product: one(products, {
    fields: [sellBillItems.productRef],
    references: [products.id],
  }),
}));

// --- Zod Schemas ---
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertBuyBillSchema = createInsertSchema(buyBills).omit({ id: true, createdAt: true });
export const insertBuyBillItemSchema = createInsertSchema(buyBillItems).omit({ id: true });
export const insertSellBillSchema = createInsertSchema(sellBills).omit({ id: true, createdAt: true });
export const insertSellBillItemSchema = createInsertSchema(sellBillItems).omit({ id: true });

// --- Types ---
export type Product = typeof products.$inferSelect;
export type BuyBill = typeof buyBills.$inferSelect;
export type BuyBillItem = typeof buyBillItems.$inferSelect;
export type SellBill = typeof sellBills.$inferSelect;
export type SellBillItem = typeof sellBillItems.$inferSelect;

// Composite Types for API
export type CreateBuyBillRequest = z.infer<typeof insertBuyBillSchema> & {
  items: (Omit<z.infer<typeof insertBuyBillItemSchema>, 'billId' | 'productRef'> & {
    name: string;
    company: string;
    productId?: string;
    // uniqueId is required but we might generate it backend side if not provided? 
    // User requirement says uniqueID is generated from name+company+productID.
    // For existing products, we just need uniqueId. For new, we need name/company/productId.
  })[];
};

export type CreateSellBillRequest = z.infer<typeof insertSellBillSchema> & {
  items: (Omit<z.infer<typeof insertSellBillItemSchema>, 'billId' | 'productRef' | 'profitPerUnit' | 'totalProfit'> & {
    // We only need quantity and sellingPrice from frontend. Profit is calc'd on backend.
  })[];
};

export type DashboardProfitStats = {
  currentMonthProfit: number;
  totalYearlyProfit: number;
  monthlyData: { date: string; profit: number }[];
};

export type InventoryStat = Product & { totalValue: number };
