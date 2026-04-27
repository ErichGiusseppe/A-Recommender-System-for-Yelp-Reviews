import type {
  Business,
  Category,
  User,
  TasteProfile,
  Explanation,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface PaginatedBusinesses {
  items: Business[];
  total: number;
}

export interface RecommendationItem {
  business_id: string;
  score: number;
  cf: number;
  ctx: number;
  pop: number;
}

export interface RecommendationsResponse {
  items: RecommendationItem[];
  generated_at: string;
}

export const api = {
  health: () => get<{ status: string }>("/health"),

  businesses: (params?: { city?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.city) qs.set("city", params.city);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return get<PaginatedBusinesses>(`/businesses?${qs}`);
  },

  business: (id: string) => get<Business>(`/businesses/${id}`),

  categories: () => get<Category[]>("/categories"),

  me: () => get<User>("/users/me"),

  updateTaste: (taste: TasteProfile) =>
    post<TasteProfile>("/users/me/taste", taste),

  recommendations: (userId = "camila", limit = 10) =>
    get<RecommendationsResponse>(
      `/recommendations?user_id=${userId}&limit=${limit}`
    ),

  explanation: (businessId: string, userId = "camila") =>
    get<Explanation>(`/explanations/${businessId}?user_id=${userId}`),

  search: (params: {
    q?: string;
    category?: string;
    price?: string;
    attribute?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    if (params.price) qs.set("price", params.price);
    if (params.attribute) qs.set("attribute", params.attribute);
    if (params.limit) qs.set("limit", String(params.limit));
    return get<{ items: Business[]; total: number }>(`/search?${qs}`);
  },
};
