import { z } from 'zod';
import { 
  products, 
  buyBills, 
  sellBills,
  buyBillItems,
  sellBillItems,
  expenses
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// API Contract
export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products',
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:uniqueId',
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/products/:id/history',
      responses: {
        200: z.array(z.custom<typeof buyBillItems.$inferSelect & { billDate: string; dealerName: string | null }>()),
      }
    }
  },
  bills: {
    createPurchase: {
      method: 'POST' as const,
      path: '/api/purchase-bills',
      input: z.object({
        dealerName: z.string().optional(),
        dealerGSTNumber: z.string().optional(),
        gstPercentage: z.number().optional(),
        billDate: z.string(), // YYYY-MM-DD
        items: z.array(z.object({
          uniqueId: z.string().optional(),
          name: z.string(),
          company: z.string(),
          productId: z.string().optional(),
          buyPrice: z.number(),
          quantity: z.number(),
        })),
      }),
      responses: {
        201: z.custom<typeof buyBills.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    createSell: {
      method: 'POST' as const,
      path: '/api/sell-bills',
      input: z.object({
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        customerGSTNumber: z.string().optional(),
        gstPercentage: z.number().optional(),
        billDate: z.string(), // YYYY-MM-DD
        items: z.array(z.object({
          uniqueId: z.string(),
          sellingPrice: z.number(),
          quantity: z.number(),
        })),
      }),
      responses: {
        201: z.custom<typeof sellBills.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    deletePurchase: {
      method: 'DELETE' as const,
      path: '/api/purchase-bills/:id',
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation, // If stock goes negative
      }
    },
    deleteSell: {
      method: 'DELETE' as const,
      path: '/api/sell-bills/:id',
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses',
      input: z.object({
        month: z.string().optional(), // YYYY-MM
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses',
      input: z.object({
        amount: z.number(),
        expenseType: z.enum(['Transport', 'Rent', 'Electricity', 'Salary', 'Miscellaneous']),
        expenseDate: z.string(),
        description: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    summary: {
      method: 'GET' as const,
      path: '/api/expenses/summary',
      responses: {
        200: z.object({
          currentMonthExpense: z.number(),
          totalYearlyExpense: z.number(),
          monthlyData: z.array(z.object({ date: z.string(), amount: z.number() })),
        }),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id',
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions',
      input: z.object({
        date: z.string(), // YYYY-MM-DD
      }),
      responses: {
        200: z.object({
          buyBills: z.array(z.any()), // Type as needed
          sellBills: z.array(z.any()),
        }),
      },
    },
    purchaseBillsByYear: {
      method: 'GET' as const,
      path: '/api/purchase-bills/search',
      input: z.object({
        year: z.string(),
      }),
      responses: {
        200: z.array(z.any()),
      }
    }
  },
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          currentMonthProfit: z.number(),
          totalYearlyProfit: z.number(),
          currentMonthRevenue: z.number(),
          totalYearlyRevenue: z.number(),
          totalInventoryValue: z.number(),
          monthlyData: z.array(z.object({ 
            date: z.string(), 
            profit: z.number(),
            revenue: z.number()
          })),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
