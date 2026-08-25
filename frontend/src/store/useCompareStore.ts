import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CompareProduct {
  id: number;
  name: string;
  slug: string;
  brand: string;
  price: string;
  image: string;
  specs: Record<string, string>;
  avg_rating: number | null;
  review_count?: number;
  stock: number;
  category: { id: number; name: string; slug: string };
}

interface CompareStore {
  items: CompareProduct[];
  addItem: (product: CompareProduct) => "ok" | "limit" | "duplicate" | "category_mismatch";
  removeItem: (id: number) => void;
  clear: () => void;
  hasItem: (id: number) => boolean;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) => {
        const current = get().items;
        if (current.find((p) => p.id === product.id)) return "duplicate";
        if (current.length >= 3) return "limit";
        if (current.length > 0 && current[0]?.category.slug !== product.category.slug) return "category_mismatch";
        set({ items: [...current, product] });
        return "ok";
      },
      removeItem: (id) => set({ items: get().items.filter((p) => p.id !== id) }),
      clear: () => set({ items: [] }),
      hasItem: (id) => get().items.some((p) => p.id === id),
    }),
    { name: "nexus-compare" }
  )
);
