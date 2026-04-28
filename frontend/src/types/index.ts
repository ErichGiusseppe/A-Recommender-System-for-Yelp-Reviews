export interface Review {
  author: string;
  rating: number;
  text: string;
}

export interface Coords {
  x: number;
  y: number;
}

export type Price = "$" | "$$" | "$$$";

export type SignalKind = "cf" | "ctx" | "pop";

export interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string;
  rating: number;
  reviews: number;
  price: Price;
  match: number;
  image: string;
  cover: string;
  gallery: string[];
  attributes: string[];
  whyPicked: string;
  excerpt: string;
  cf: number;
  ctx: number;
  pop: number;
  lat?: number;
  lng?: number;
  coords: Coords;
  hours: string;
  address: string;
  tags: string[];
  reviewList: Review[];
}

export interface ScoredBusiness extends Business {
  score: number;
}

export interface Category {
  name: string;
  img: string;
  count: number;
}

export interface TasteProfile {
  italian: number;
  asian: number;
  cozy: number;
  lively: number;
  cheap: number;
  special: number;
}

export interface SignalWeights {
  cf: number;
  ctx: number;
  pop: number;
}

export interface UserStats {
  saved: number;
  reviews: number;
  cities: number;
  avg_rating: number;
}

export interface User {
  id: string;
  name: string;
  first_name: string;
  avatar: string;
  location: string;
  bio: string;
  member_since: string;
  stats: UserStats;
  taste: TasteProfile;
  saved_business_ids: string[];
  cities_visited: string[];
  season_taste?: SeasonBar[];
}

export interface Recommendation {
  business_id: string;
  score: number;
  cf: number;
  ctx: number;
  pop: number;
}

export interface Explanation {
  business_id: string;
  user_id: string;
  match: number;
  cf: number;
  ctx: number;
  pop: number;
  signal_details: {
    cf_reasoning: string;
    ctx_reasoning: string;
    pop_reasoning: string;
  };
}

export interface SeasonBar {
  label: string;
  value: number;
}
