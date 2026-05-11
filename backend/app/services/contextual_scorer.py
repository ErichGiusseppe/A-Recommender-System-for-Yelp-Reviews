"""
Contextual scoring — time-of-day relevance for business category tags.

CTX_SCORES mirrors the frontend CTX_BOOSTS table (Explain.tsx / ExplanationCard.tsx)
so the signal value shown in the UI matches what the backend used to compute the score.
Values are on a 0-100 scale; live_ctx_score() normalises to [0, 1] for formulas.
"""
from __future__ import annotations

CTX_SCORES: dict[str, dict[str, int]] = {
    "morning": {
        "breakfast-and-brunch": 85, "coffee-and-tea": 90, "cafes": 80,
        "bakeries": 75, "donuts": 70, "bagels": 70, "juice-bars-and-smoothies": 65,
    },
    "lunch": {
        "sandwiches": 80, "fast-food": 70, "food-trucks": 75, "tacos": 75,
        "salad": 72, "soup": 68, "poke": 72, "sushi-bars": 70,
    },
    "afternoon": {
        "coffee-and-tea": 80, "cafes": 75, "desserts": 75,
        "ice-cream-and-frozen-yogurt": 75, "bakeries": 68,
        "bubble-tea": 72, "juice-bars-and-smoothies": 65,
    },
    "dinner": {
        "italian": 80, "steakhouses": 85, "seafood": 80, "pizza": 72,
        "sushi-bars": 78, "mediterranean": 75, "japanese": 72, "mexican": 70,
        "thai": 70, "barbeque": 78, "french": 78,
    },
    "latenight": {
        "pizza": 85, "bars": 80, "fast-food": 72, "diners": 78,
        "pubs": 75, "lounges": 70, "sports-bars": 72,
    },
}


def get_time_bucket(hour: int) -> str:
    if 6  <= hour < 11: return "morning"
    if 11 <= hour < 15: return "lunch"
    if 15 <= hour < 18: return "afternoon"
    if 18 <= hour < 23: return "dinner"
    return "latenight"


def live_ctx_score(tags: list[str], hour: int) -> float:
    """Return normalised [0, 1] contextual score from business tags and current hour.

    0 = no time-of-day relevance, 1 = perfect fit (e.g. coffee shop at 8 am).
    Designed to be used as the CTX term in the hybrid formula:
        score = 0.60·CF + 0.25·CTX + 0.15·POP
    """
    scores = CTX_SCORES.get(get_time_bucket(hour), {})
    best = 0
    for tag in tags:
        if tag in scores:
            best = max(best, scores[tag])
    return best / 100.0
