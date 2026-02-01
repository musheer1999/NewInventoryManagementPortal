import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { API_BASE_URL } from "@/lib/api";

export interface DashboardStats {
  currentMonthProfit: number;
  totalYearlyProfit: number;
  currentMonthRevenue: number;
  totalYearlyRevenue: number;
  totalInventoryValue: number;
  monthlyData: {
    date: string;
    profit: number;
    revenue: number;
  }[];
}

export function useDashboardStats(year?: string) {
  return useQuery<DashboardStats>({
    queryKey: [api.dashboard.stats.path, year],
    queryFn: async () => {
      const url = year
        ? `${API_BASE_URL}${api.dashboard.stats.path}?year=${year}`
        : `${API_BASE_URL}${api.dashboard.stats.path}`;

      const res = await fetch(url, { credentials: "include" });

      if (!res.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      return res.json();
    },
  });
}
