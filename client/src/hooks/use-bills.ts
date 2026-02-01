import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { API_BASE_URL } from "@/lib/api";

// Helper type for inputs
type CreatePurchaseInput = z.infer<typeof api.bills.createPurchase.input>;
type CreateSellInput = z.infer<typeof api.bills.createSell.input>;

export function useCreatePurchaseBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseInput) => {
      const res = await fetch(
        `${API_BASE_URL}${api.bills.createPurchase.path}`,
        {
          method: api.bills.createPurchase.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        }
      );

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create purchase bill");
      }

      return api.bills.createPurchase.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useCreateSellBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSellInput) => {
      const res = await fetch(
        `${API_BASE_URL}${api.bills.createSell.path}`,
        {
          method: api.bills.createSell.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        }
      );

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create sell bill");
      }

      return api.bills.createSell.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useTransactions(date?: string, year?: number) {
  return useQuery({
    queryKey: [api.transactions.list.path, date, year],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (date) queryParams.set("date", date);
      if (year) queryParams.set("year", year.toString());

      const url = `${API_BASE_URL}${api.transactions.list.path}?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) throw new Error("Failed to fetch transactions");

      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function usePurchaseBillsByYear(year: number) {
  return useQuery({
    queryKey: [api.transactions.purchaseBillsByYear.path, year],
    queryFn: async () => {
      const url = `${API_BASE_URL}${api.transactions.purchaseBillsByYear.path}?year=${year}`;
      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) throw new Error("Failed to fetch yearly purchase bills");

      return api.transactions.purchaseBillsByYear.responses[200].parse(await res.json());
    },
  });
}

export function useDeletePurchaseBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const path = buildUrl(api.bills.deletePurchase.path, { id });
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: api.bills.deletePurchase.method,
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete bill");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useDeleteSellBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const path = buildUrl(api.bills.deleteSell.path, { id });
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: api.bills.deleteSell.method,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete bill");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
