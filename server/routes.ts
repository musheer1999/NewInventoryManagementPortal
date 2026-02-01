import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProductByUniqueId(req.params.uniqueId);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.get(api.products.history.path, async (req, res) => {
    const history = await storage.getProductHistory(Number(req.params.id));
    res.json(history);
  });

  // Bills
  app.post(api.bills.createPurchase.path, async (req, res) => {
    try {
      const input = api.bills.createPurchase.input.parse(req.body);
      const bill = await storage.createBuyBill(input);
      res.status(201).json(bill);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || "Validation Error" });
    }
  });

  app.post(api.bills.createSell.path, async (req, res) => {
    try {
      const input = api.bills.createSell.input.parse(req.body);
      const bill = await storage.createSellBill(input);
      res.status(201).json(bill);
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || "Validation Error" });
    }
  });

  app.delete(api.bills.deletePurchase.path, async (req, res) => {
    try {
      await storage.deleteBuyBill(Number(req.params.id));
      res.json({ message: "Bill deleted" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.delete(api.bills.deleteSell.path, async (req, res) => {
    try {
      await storage.deleteSellBill(Number(req.params.id));
      res.json({ message: "Bill deleted" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  // Dashboard & Transactions
  app.get(api.transactions.list.path, async (req, res) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: "Date required" });
    const data = await storage.getTransactions(date);
    res.json(data);
  });

  app.get(api.transactions.purchaseBillsByYear.path, async (req, res) => {
    const year = Number(req.query.year);
    if (!year) return res.status(400).json({ message: "Year required" });
    const data = await storage.getPurchaseBillsByYear(year);
    res.json(data);
  });

  app.get(api.dashboard.stats.path, async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const stats = await storage.getDashboardStats(year);
    res.json(stats);
  });

  // Expenses
  app.get(api.expenses.list.path, async (req, res) => {
    const expenses = await storage.getExpenses(req.query.month as string);
    res.json(expenses);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(input);
      res.status(201).json(expense);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get(api.expenses.summary.path, async (req, res) => {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const summary = await storage.getExpenseSummary(year);
    res.json(summary);
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    await storage.deleteExpense(Number(req.params.id));
    res.json({ message: "Expense deleted" });
  });

  return httpServer;
}
