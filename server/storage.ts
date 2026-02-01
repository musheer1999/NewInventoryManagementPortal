import { db } from "./db";
import { 
  products, buyBills, buyBillItems, sellBills, sellBillItems, expenses,
  type Product, type BuyBill, type SellBill,
  type CreateBuyBillRequest, type CreateSellBillRequest
} from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProductByUniqueId(uniqueId: string): Promise<Product | undefined>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductHistory(id: number): Promise<any[]>;

  // Bills
  createBuyBill(bill: CreateBuyBillRequest): Promise<BuyBill>;
  createSellBill(bill: CreateSellBillRequest): Promise<SellBill>;
  
  deleteBuyBill(id: number): Promise<void>;
  deleteSellBill(id: number): Promise<void>;

  // Dashboard
  getTransactions(date: string): Promise<{ buyBills: any[], sellBills: any[] }>;
  getDashboardStats(year?: number): Promise<any>;
  getPurchaseBillsByYear(year: number): Promise<BuyBill[]>;

  // Expenses
  getExpenses(month?: string): Promise<any[]>;
  getExpense(id: number): Promise<any | undefined>;
  createExpense(expense: any): Promise<any>;
  deleteExpense(id: number): Promise<void>;
  getExpenseSummary(year?: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.name);
  }

  async getProductByUniqueId(uniqueId: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.uniqueId, uniqueId));
    return product;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductHistory(id: number): Promise<any[]> {
    const items = await db
      .select({
        billDate: buyBills.billDate,
        dealerName: buyBills.dealerName,
        buyPrice: buyBillItems.buyPrice,
        quantity: buyBillItems.quantity,
        totalCost: buyBillItems.totalCost,
        uniqueId: buyBillItems.uniqueId,
      })
      .from(buyBillItems)
      .innerJoin(buyBills, eq(buyBills.id, buyBillItems.billId))
      .where(eq(buyBillItems.productRef, id))
      .orderBy(desc(buyBills.billDate));
    return items;
  }

  async createBuyBill(req: CreateBuyBillRequest): Promise<BuyBill> {
    return await db.transaction(async (tx) => {
      // 1. Create Bill
      const totalAmount = req.items.reduce((sum, item) => sum + (item.buyPrice * item.quantity), 0);
      const gstAmount = req.gstPercentage != null ? (totalAmount * req.gstPercentage) / 100 : null;

      const [bill] = await tx.insert(buyBills).values({
        dealerName: req.dealerName ?? null,
        dealerGSTNumber: req.dealerGSTNumber ?? null,
        gstPercentage: req.gstPercentage?.toString() ?? null,
        gstAmount: gstAmount?.toFixed(2) ?? null,
        billDate: req.billDate,
        totalAmount: totalAmount.toFixed(2),
      }).returning();

      // 2. Process Items
      for (const item of req.items) {
        // Generate Unique ID if not provided: name-company-productId
        let uniqueId = item.uniqueId;
        if (!uniqueId) {
          const parts = [item.name, item.company, item.productId].filter(Boolean);
          uniqueId = parts.join("-").toLowerCase().replace(/\s+/g, '-');
        }

        // Check if product exists
        let [product] = await tx.select().from(products).where(eq(products.uniqueId, uniqueId!));

        if (!product) {
          // Create new product
          [product] = await tx.insert(products).values({
            name: item.name,
            company: item.company,
            productId: item.productId,
            uniqueId: uniqueId!,
            quantity: 0,
            averageBuyPrice: "0",
          }).returning();
        }

        // Calculate new Average Buy Price
        // ((oldAvg * oldQty) + (newPrice * newQty)) / (oldQty + newQty)
        const oldQty = product.quantity;
        const oldAvg = parseFloat(product.averageBuyPrice);
        const newQty = item.quantity;
        const newPrice = item.buyPrice;
        
        const totalValue = (oldAvg * oldQty) + (newPrice * newQty);
        const totalQty = oldQty + newQty;
        const newAvg = totalQty > 0 ? totalValue / totalQty : 0;

        // Update Product
        await tx.update(products).set({
          quantity: totalQty,
          averageBuyPrice: newAvg.toFixed(2),
        }).where(eq(products.id, product.id));

        // Insert Bill Item
        await tx.insert(buyBillItems).values({
          billId: bill.id,
          productRef: product.id,
          uniqueId: uniqueId!,
          buyPrice: item.buyPrice.toFixed(2),
          quantity: item.quantity,
          totalCost: (item.buyPrice * item.quantity).toFixed(2),
        });
      }

      return bill;
    });
  }

  async createSellBill(req: CreateSellBillRequest): Promise<SellBill> {
    return await db.transaction(async (tx) => {
      let billTotalProfit = 0;
      let billTotalAmount = 0;

      // 1. Validate Stock first (optimistic check, real check in loop)
      
      // 2. Create Bill Header
      const [bill] = await tx.insert(sellBills).values({
        customerName: req.customerName ?? null,
        customerPhone: req.customerPhone ?? null,
        customerGSTNumber: req.customerGSTNumber ?? null,
        gstPercentage: req.gstPercentage?.toString() ?? null,
        gstAmount: "0", // update later
        billDate: req.billDate,
        totalProfit: "0", // update later
        totalAmount: "0", // update later
      }).returning();

      for (const item of req.items) {
        const [product] = await tx.select().from(products).where(eq(products.uniqueId, item.uniqueId));
        if (!product) throw new Error(`Product ${item.uniqueId} not found`);
        
        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.quantity}`);
        }

        const avgBuyPrice = parseFloat(product.averageBuyPrice);
        const profitPerUnit = item.sellingPrice - avgBuyPrice;
        const totalItemProfit = profitPerUnit * item.quantity;
        const totalItemAmount = item.sellingPrice * item.quantity;

        billTotalProfit += totalItemProfit;
        billTotalAmount += totalItemAmount;

        // Update Stock
        await tx.update(products).set({
          quantity: product.quantity - item.quantity,
        }).where(eq(products.id, product.id));

        // Insert Bill Item
        await tx.insert(sellBillItems).values({
          billId: bill.id,
          productRef: product.id,
          uniqueId: product.uniqueId,
          sellingPrice: item.sellingPrice.toFixed(2),
          quantity: item.quantity,
          profitPerUnit: profitPerUnit.toFixed(2),
          totalProfit: totalItemProfit.toFixed(2),
        });
      }

      // Update Bill Totals
      const gstAmount = req.gstPercentage != null ? (billTotalAmount * req.gstPercentage) / 100 : 0;
      const [updatedBill] = await tx.update(sellBills).set({
        totalProfit: billTotalProfit.toFixed(2),
        totalAmount: billTotalAmount.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
      }).where(eq(sellBills.id, bill.id)).returning();

      return updatedBill;
    });
  }

  async deleteBuyBill(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(buyBillItems).where(eq(buyBillItems.billId, id));
      
      for (const item of items) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productRef));
        if (!product) continue;

        const newQty = product.quantity - item.quantity;
        if (newQty < 0) {
          throw new Error(`Cannot delete bill: Product ${product.name} would have negative stock.`);
        }

        // Reverse Average Buy Price calculation? 
        // Logic: (CurrentTotalVal - ItemTotalVal) / NewQty
        // CurrentTotalVal = CurrAvg * CurrQty
        const currentTotalVal = parseFloat(product.averageBuyPrice) * product.quantity;
        const itemTotalVal = parseFloat(item.totalCost);
        const remainingTotalVal = currentTotalVal - itemTotalVal;
        
        const newAvg = newQty > 0 ? remainingTotalVal / newQty : 0; // If 0 qty, avg is 0 (or strictly speaking undefined, but 0 works for reset)

        await tx.update(products).set({
          quantity: newQty,
          averageBuyPrice: newAvg.toFixed(2)
        }).where(eq(products.id, product.id));
      }

      await tx.delete(buyBillItems).where(eq(buyBillItems.billId, id));
      await tx.delete(buyBills).where(eq(buyBills.id, id));
    });
  }

  async deleteSellBill(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      const items = await tx.select().from(sellBillItems).where(eq(sellBillItems.billId, id));

      for (const item of items) {
        // Restore stock
        // Note: Profit removal happens automatically by deleting the bill record
        await tx.execute(sql`
          UPDATE ${products} 
          SET quantity = quantity + ${item.quantity}
          WHERE id = ${item.productRef}
        `);
      }

      await tx.delete(sellBillItems).where(eq(sellBillItems.billId, id));
      await tx.delete(sellBills).where(eq(sellBills.id, id));
    });
  }

  async getTransactions(date: string): Promise<{ buyBills: any[], sellBills: any[] }> {
    const buys = await db.query.buyBills.findMany({
      where: eq(buyBills.billDate, date),
      with: { items: true }
    });
    const sells = await db.query.sellBills.findMany({
      where: eq(sellBills.billDate, date),
      with: { items: true }
    });
    return { buyBills: buys, sellBills: sells };
  }

  async getDashboardStats(year?: number): Promise<any> {
    // Current Month Profit
    // Total Yearly Profit
    // Inventory Value
    
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYear = `${targetYear}-01-01`;
    const endOfYear = `${targetYear}-12-31`;

    // Inventory Value
    const allProducts = await db.select().from(products);
    const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.quantity * parseFloat(p.averageBuyPrice)), 0);

    // Profits
    const monthlyProfits = await db.select({
      profit: sql<number>`sum(${sellBills.totalProfit})`
    }).from(sellBills)
    .where(sql`${sellBills.billDate} >= ${startOfMonth}`);

    const yearlyProfits = await db.select({
      profit: sql<number>`sum(${sellBills.totalProfit})`
    }).from(sellBills)
    .where(sql`${sellBills.billDate} BETWEEN ${startOfYear} AND ${endOfYear}`);

    // Expenses adjustment
    const monthlyExpenses = await db.select({
      amount: sql<number>`sum(${expenses.amount})`
    }).from(expenses)
    .where(sql`${expenses.expenseDate} >= ${startOfMonth}`);

    const yearlyExpenses = await db.select({
      amount: sql<number>`sum(${expenses.amount})`
    }).from(expenses)
    .where(sql`${expenses.expenseDate} BETWEEN ${startOfYear} AND ${endOfYear}`);

    const mExpense = Number(monthlyExpenses[0]?.amount || 0);
    const yExpense = Number(yearlyExpenses[0]?.amount || 0);

    // Monthly Data for Chart
    // Simplified: Group by month for current year
    const chartData = await db.execute(sql`
      WITH sales AS (
        SELECT 
          TO_CHAR(${sellBills.billDate}::date, 'YYYY-MM') as month,
          SUM(${sellBills.totalProfit}) as profit,
          SUM(${sellBills.totalAmount}) as revenue
        FROM ${sellBills}
        WHERE ${sellBills.billDate} BETWEEN ${startOfYear} AND ${endOfYear}
        GROUP BY month
      ),
      exps AS (
        SELECT 
          TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') as month,
          SUM(${expenses.amount}) as amount
        FROM ${expenses}
        WHERE ${expenses.expenseDate} BETWEEN ${startOfYear} AND ${endOfYear}
        GROUP BY month
      )
      SELECT 
        COALESCE(sales.month, exps.month) as month,
        (COALESCE(sales.profit, 0) - COALESCE(exps.amount, 0)) as profit,
        COALESCE(sales.revenue, 0) as revenue
      FROM sales
      FULL OUTER JOIN exps ON sales.month = exps.month
      ORDER BY month ASC
    `);

    // Current Month Revenue
    const monthlyRevenue = await db.select({
      amount: sql<number>`sum(${sellBills.totalAmount})`
    }).from(sellBills)
    .where(sql`${sellBills.billDate} >= ${startOfMonth}`);

    // Yearly Revenue
    const yearlyRevenue = await db.select({
      amount: sql<number>`sum(${sellBills.totalAmount})`
    }).from(sellBills)
    .where(sql`${sellBills.billDate} BETWEEN ${startOfYear} AND ${endOfYear}`);

    return {
      currentMonthProfit: Number(monthlyProfits[0]?.profit || 0) - mExpense,
      totalYearlyProfit: Number(yearlyProfits[0]?.profit || 0) - yExpense,
      currentMonthRevenue: Number(monthlyRevenue[0]?.amount || 0),
      totalYearlyRevenue: Number(yearlyRevenue[0]?.amount || 0),
      currentMonthExpense: mExpense,
      totalInventoryValue,
      monthlyData: chartData.rows.map(r => ({ 
        date: r.month, 
        profit: Number(r.profit),
        revenue: Number(r.revenue)
      }))
    };
  }

  async getPurchaseBillsByYear(year: number): Promise<BuyBill[]> {
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;
    
    return await db.query.buyBills.findMany({
      where: sql`${buyBills.billDate} BETWEEN ${startOfYear} AND ${endOfYear}`,
      with: { items: true },
      orderBy: desc(buyBills.billDate)
    });
  }

  async getExpenses(month?: string): Promise<any[]> {
    if (month) {
      return await db.select().from(expenses).where(sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') = ${month}`).orderBy(desc(expenses.expenseDate));
    }
    return await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpense(id: number): Promise<any | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(req: any): Promise<any> {
    const [expense] = await db.insert(expenses).values({
      amount: req.amount.toFixed(2),
      expenseType: req.expenseType,
      expenseDate: req.expenseDate,
      description: req.description,
    }).returning();
    return expense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  async getExpenseSummary(year?: number): Promise<any> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYear = `${targetYear}-01-01`;
    const endOfYear = `${targetYear}-12-31`;

    const monthlyExpenses = await db.select({
      amount: sql<number>`sum(${expenses.amount})`
    }).from(expenses)
    .where(sql`${expenses.expenseDate} >= ${startOfMonth}`);

    const yearlyExpenses = await db.select({
      amount: sql<number>`sum(${expenses.amount})`
    }).from(expenses)
    .where(sql`${expenses.expenseDate} BETWEEN ${startOfYear} AND ${endOfYear}`);

    const chartData = await db.execute(sql`
      SELECT 
        TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') as month,
        SUM(${expenses.amount}) as amount
      FROM ${expenses}
      WHERE ${expenses.expenseDate} BETWEEN ${startOfYear} AND ${endOfYear}
      GROUP BY month
      ORDER BY month ASC
    `);

    return {
      currentMonthExpense: Number(monthlyExpenses[0]?.amount || 0),
      totalYearlyExpense: Number(yearlyExpenses[0]?.amount || 0),
      monthlyData: chartData.rows.map(r => ({ date: r.month, amount: Number(r.amount) }))
    };
  }
}

export const storage = new DatabaseStorage();
