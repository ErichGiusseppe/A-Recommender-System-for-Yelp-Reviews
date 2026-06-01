import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Business, Category, User } from "../types";
import type { ReviewOut } from "../lib/api";
import { BUSINESSES, CATEGORIES, USER } from "../data/mock";
import { useNeighborhood } from "../contexts/NeighborhoodContext";
import { useAuth } from "../contexts/AuthContext";

function useApiCall<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  deps: unknown[] = []
): { data: T; loading: boolean; error: string | null } {
  const [data, setData]       = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => { if (!cancelled) { setData(result); setError(null); } })
      .catch(() => { if (!cancelled) setError(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

export function useBusinesses() {
  const { city, neighborhood } = useNeighborhood();
  const { token } = useAuth();
  return useApiCall<Business[]>(
    () => api.businesses({
      city:         city         || undefined,
      neighborhood: neighborhood || undefined,
      limit: 50,
    }).then((r) => r.items),
    BUSINESSES,
    [city, neighborhood, token]
  );
}

export function useBusiness(id: string | undefined) {
  const fallback = BUSINESSES.find((b) => b.id === id) ?? BUSINESSES[0];
  return useApiCall<Business>(
    () => api.business(id ?? "otello"),
    fallback
  );
}

export function useCategories() {
  return useApiCall<Category[]>(() => api.categories(), CATEGORIES);
}

export function useMe() {
  const { token } = useAuth();
  return useApiCall<User>(() => api.me(), USER, [token]);
}

export function useMyReviews() {
  const { token } = useAuth();
  return useApiCall<ReviewOut[]>(() => api.myReviews(), [], [token]);
}

export function useSavedBusinesses(ids: string[]) {
  const key = ids.join(",");
  return useApiCall<Business[]>(
    async () => {
      if (!ids.length) return [];
      const results = await Promise.all(ids.map((id) => api.business(id).catch(() => null)));
      return results.filter(Boolean) as Business[];
    },
    [],
    [key]
  );
}
