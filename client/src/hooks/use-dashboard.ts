import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

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
      const url = year ? `${api.dashboard.stats.path}?year=${year}` : api.dashboard.stats.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      console.log("Dashboard stats raw response:", data);
      return data;
    },
  });
}
