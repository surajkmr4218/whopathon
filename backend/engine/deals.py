"""Deal score: is this listing priced well vs similar places near the same campus?

market $/sqft (median of comparable active listings) × this listing's square feet = expected price.
Compare to asking price and map to a 1–10 score with a plain-language label (SeatGeek style).
"""
from __future__ import annotations

from dataclasses import dataclass
from statistics import median

from .scoring import ListingInput


@dataclass
class DealScore:
    score: int            # 1..10
    label: str            # Great deal / Good deal / Fair price / Above market
    asking_per_sqft: float
    market_per_sqft: float
    expected_price: int
    diff_pct: int         # +12 => 12% below market (good), -8 => 8% above market
    comparables: int
    square_feet: int
    basis: str            # what the comparables were


def label_for(score: int) -> str:
    if score >= 8:
        return "Great deal"
    if score >= 6:
        return "Good deal"
    if score >= 4:
        return "Fair price"
    return "Above market"


def _size_class(l: ListingInput) -> str:
    if l.housing_type == "room":
        return "room"
    return "studio" if l.bedrooms == 0 else ("1br" if l.bedrooms == 1 else "2br+")


def _size_label(l: ListingInput) -> str:
    return {"room": "rooms", "studio": "studios", "1br": "1BR apartments", "2br+": f"{l.bedrooms}BR+ {l.housing_type}s"}[_size_class(l)]


def score_deal(listing: ListingInput, others: list[ListingInput]) -> DealScore | None:
    if listing.square_feet <= 0:
        return None
    pool = [o for o in others if o.id != listing.id and o.university == listing.university and o.square_feet > 0]
    # Compare like with like: studios vs studios, 1BR vs 1BR, rooms vs rooms. Fall back to wider pools when thin.
    tiers = [
        ([o for o in pool if o.housing_type == listing.housing_type and _size_class(o) == _size_class(listing)], f"{_size_label(listing)} near {listing.university}"),
        ([o for o in pool if o.housing_type == listing.housing_type], f"{listing.housing_type}s near {listing.university}"),
        (pool, f"places near {listing.university}"),
    ]
    comps, basis = next(((c, b) for c, b in tiers if len(c) >= 2), (pool, tiers[-1][1]))
    if not comps:
        return None
    market = median(o.asking_price / o.square_feet for o in comps)
    asking_rate = listing.asking_price / listing.square_feet
    expected = market * listing.square_feet
    diff = (expected - listing.asking_price) / expected  # positive = cheaper than market
    score = max(1, min(10, round(5.5 + diff * 25)))     # 20% under market => 10, at market => 6, 20% over => 1
    return DealScore(
        score=score, label=label_for(score), asking_per_sqft=round(asking_rate, 2), market_per_sqft=round(market, 2),
        expected_price=round(expected), diff_pct=round(diff * 100), comparables=len(comps), square_feet=listing.square_feet, basis=basis,
    )
