"""
Contextual re-ranking — ported from notebooks/03_contexto.ipynb.

Applied at request time on pre-computed SVD++ top-N candidates.
Tags in business dicts use hyphen-separated lowercase (e.g. "coffee-&-tea").
"""
from __future__ import annotations

TIME_CONTEXT: dict[str, dict] = {
    "morning": {
        "boost_categories": {
            "breakfast-and-brunch": 1.5, "coffee-and-tea": 1.5, "cafes": 1.4,
            "bakeries": 1.4, "bagels": 1.3, "donuts": 1.3,
            "juice-bars-and-smoothies": 1.2,
        }
    },
    "lunch": {
        "boost_categories": {
            "restaurants": 1.2, "sandwiches": 1.4, "salad": 1.3, "soup": 1.2,
            "fast-food": 1.2, "food-trucks": 1.3, "tacos": 1.3, "poke": 1.3,
            "sushi-bars": 1.2,
        }
    },
    "afternoon": {
        "boost_categories": {
            "coffee-and-tea": 1.4, "cafes": 1.3, "desserts": 1.4,
            "ice-cream-and-frozen-yogurt": 1.4, "bakeries": 1.2,
            "bubble-tea": 1.3, "juice-bars-and-smoothies": 1.2,
        }
    },
    "dinner": {
        "boost_categories": {
            "restaurants": 1.2, "italian": 1.3, "sushi-bars": 1.3,
            "japanese": 1.2, "mexican": 1.2, "thai": 1.2, "steakhouses": 1.4,
            "seafood": 1.3, "mediterranean": 1.2, "pizza": 1.2,
            "barbeque": 1.3, "french": 1.3,
        }
    },
    "late_night": {
        "boost_categories": {
            "pizza": 1.5, "fast-food": 1.4, "bars": 1.4, "pubs": 1.3,
            "sports-bars": 1.3, "lounges": 1.2, "food-trucks": 1.2,
            "diners": 1.3,
        }
    },
}


def get_time_bucket(hour: int) -> str:
    if 6 <= hour < 11:  return "morning"
    if 11 <= hour < 15: return "lunch"
    if 15 <= hour < 18: return "afternoon"
    if 18 <= hour < 23: return "dinner"
    return "late_night"


def context_score_by_hour(tags: list[str], hour: int) -> float:
    """Return the highest time-based category boost [1.0–1.5] for a business."""
    boost_dict = TIME_CONTEXT[get_time_bucket(hour)]["boost_categories"]
    boost = 1.0
    for tag in tags:
        if tag in boost_dict:
            boost = max(boost, boost_dict[tag])
    return boost


def contextual_rerank(businesses: list[dict], hour: int) -> list[dict]:
    """
    Re-sort businesses using time-of-day category boosts.

    The boost is used only for ranking order — match is kept at its model-computed
    value so it stays consistent with cf/ctx/pop in the ExplanationCard.
    """
    def sort_key(b: dict) -> tuple:
        tags  = b.get("tags") or []
        boost = context_score_by_hour(tags, hour)
        return (-round(b.get("match", 50) * boost), -b.get("rating", 0))

    return sorted(businesses, key=sort_key)
