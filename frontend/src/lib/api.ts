import type {
  Business,
  Category,
  User,
  TasteProfile,
  Explanation,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "lantern_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (res.status === 401) {
    // Token expired or invalid — clear and redirect to login
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("lantern_user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface ReviewSubmit {
  business_id: string;
  stars: number;
  text?: string;
}

export interface ReviewOut {
  business_id: string;
  stars: number;
  text: string;
  created_at: string;
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

export interface DemoAccount {
  user_id: string;
  name: string;
  avatar: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { user_id: string; name: string };
}

export interface BusinessCreatePayload {
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  address: string;
  price: string;
  rating: number;
  lat?: number;
  lng?: number;
}

export const api = {
  health: () => get<{ status: string }>("/health"),

  register: (data: RegisterPayload) =>
    post<AuthResponse>("/auth/register", data),

  createBusiness: (data: BusinessCreatePayload) =>
    post<import("../types").Business>("/businesses", data),

  coldStartRecs: (params: { categories: string; stars: number; price: number; limit?: number }) => {
    const qs = new URLSearchParams({
      categories: params.categories,
      stars:      String(params.stars),
      price:      String(params.price),
      limit:      String(params.limit ?? 20),
    });
    return get<RecommendationsResponse>(`/recommendations/cold-start?${qs}`);
  },

  businesses: (params?: { city?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.city)   qs.set("city",   params.city);
    if (params?.limit)  qs.set("limit",  String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    return get<PaginatedBusinesses>(`/businesses?${qs}`);
  },

  business: (id: string) => get<Business>(`/businesses/${id}`),

  categories: () => get<Category[]>("/categories"),

  cities: () => get<string[]>("/cities"),

  me: () => get<User>("/users/me"),

  listUsers: () => get<DemoAccount[]>("/users/list"),

  updateTaste: (taste: TasteProfile) =>
    post<TasteProfile>("/users/me/taste", taste),

  recommendations: (limit = 10) =>
    get<RecommendationsResponse>(`/recommendations?limit=${limit}`),

  explanation: (businessId: string) =>
    get<Explanation>(`/explanations/${businessId}`),

  search: (params: {
    q?: string;
    category?: string;
    price?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params.q)        qs.set("q",        params.q);
    if (params.category) qs.set("category", params.category);
    if (params.price)    qs.set("price",    params.price);
    if (params.limit)    qs.set("limit",    String(params.limit));
    return get<{ items: Business[]; total: number }>(`/search?${qs}`);
  },

  submitReview: (data: ReviewSubmit) =>
    post<ReviewOut>("/reviews", data),

  myReviews: () => get<ReviewOut[]>("/reviews/me"),
};
