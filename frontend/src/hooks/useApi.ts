import { useState, useEffect } from "react";
import { api } from "../lib/api";
import type { Business, Category, User } from "../types";
import { BUSINESSES, CATEGORIES, USER } from "../data/mock";

// Generic hook that falls back to mock data if the API is unreachable
function useApiCall<T>(
  fetcher: () => Promise<T>,
  fallback: T
): { data: T; loading: boolean; error: string | null } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Silently fall back to mock data — no API yet
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}

export function useBusinesses() {
  return useApiCall<Business[]>(
    () => api.businesses({ limit: 50 }).then((r) => r.items),
    BUSINESSES
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
  return useApiCall<Category[]>(
    () => api.categories(),
    CATEGORIES
  );
}

export function useMe() {
  return useApiCall<User>(
    () => api.me(),
    USER
  );
}
