import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// --- Hooks for Products ---

export function useProducts() {
  return useQuery({
    queryKey: [api.products.list.path],
    queryFn: async () => {
      const res = await fetch(api.products.list.path);
      if (!res.ok) throw new Error("Failed to fetch products");
      return api.products.list.responses[200].parse(await res.json());
    },
  });
}

export function useProduct(uniqueId: string) {
  return useQuery({
    queryKey: [api.products.get.path, uniqueId],
    queryFn: async () => {
      if (!uniqueId) return null;
      const url = buildUrl(api.products.get.path, { uniqueId });
      const res = await fetch(url);
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch product");
      
      return api.products.get.responses[200].parse(await res.json());
    },
    enabled: !!uniqueId,
  });
}

export function useProductHistory(id: number) {
  return useQuery({
    queryKey: [api.products.history.path, id],
    queryFn: async () => {
      const url = buildUrl(api.products.history.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch product history");
      return api.products.history.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
