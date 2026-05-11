from pydantic import BaseModel, field_validator
from typing import Literal, Optional


class ReviewModel(BaseModel):
    author: str
    rating: float
    text: str


class CoordsModel(BaseModel):
    x: float
    y: float


class BusinessModel(BaseModel):
    id: str
    name: str
    category: str
    city: str
    neighborhood: str
    rating: float
    reviews: int
    price: str
    match: int
    image: str
    cover: str
    gallery: list[str]
    attributes: list[str]
    whyPicked: str
    excerpt: str
    cf: int
    cb: int = 0
    ctx: int
    pop: int
    lat: float = 39.9526
    lng: float = -75.1652
    coords: CoordsModel
    hours: str
    address: str
    tags: list[str]
    reviewList: list[ReviewModel]


class CategoryModel(BaseModel):
    name: str
    img: str
    count: int


class UserStatsModel(BaseModel):
    saved: int
    reviews: int
    cities: int
    avg_rating: float


class TasteProfileModel(BaseModel):
    italian: float
    asian: float
    cozy: float
    lively: float
    cheap: float
    special: float


class SeasonBarModel(BaseModel):
    label: str
    value: int


class UserModel(BaseModel):
    id: str
    name: str
    first_name: str
    avatar: str
    location: str
    bio: str
    member_since: str
    stats: UserStatsModel
    taste: TasteProfileModel
    saved_business_ids: list[str]
    cities_visited: list[str]
    season_taste: list[SeasonBarModel] = []


class RecommendationModel(BaseModel):
    business_id: str
    score: float
    cf: int
    cb: int = 0
    ctx: int
    pop: int


class SignalDetailsModel(BaseModel):
    cf_reasoning: str
    cb_reasoning: str = ""
    ctx_reasoning: str
    pop_reasoning: str


class ExplanationModel(BaseModel):
    business_id: str
    user_id: str
    match: int
    cf: int
    cb: int = 0
    ctx: int
    pop: int
    signal_details: SignalDetailsModel


class PaginatedBusinesses(BaseModel):
    items: list[BusinessModel]
    total: int


class SearchResponse(BaseModel):
    items: list[BusinessModel]
    total: int


class RecommendationsResponse(BaseModel):
    items: list[RecommendationModel]
    generated_at: str


class HealthResponse(BaseModel):
    status: str
    model_version: str
    loaded_at: str


class UserRegister(BaseModel):
    username: str
    password: str
    name: str

    @field_validator("username", "password", "name")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field cannot be empty")
        return v.strip()


class BusinessCreate(BaseModel):
    name: str
    category: str
    city: str
    neighborhood: str
    address: str
    price: Literal["$", "$$", "$$$", "$$$$"] = "$$"
    rating: float = 0.0
    lat: float = 39.9526
    lng: float = -75.1652

    @field_validator("name", "category", "city", "neighborhood", "address")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field cannot be empty")
        return v.strip()

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v: float) -> float:
        return max(0.0, min(5.0, v))
