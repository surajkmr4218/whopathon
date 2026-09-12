"""Core system 2: Date Match Score + overall compatibility.

Pure functions. No database, no date.today(). Used by the renter Discover deck,
the seller Reverse Matching deck, Urgency Pricing, Partial-Fill and the dashboard.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

FLEX_DAYS = {"exact": 0, "3d": 3, "1w": 7, "flexible": 14}
WEIGHTS = {"date": 0.40, "price": 0.25, "location": 0.20, "preference": 0.15}
MIN_FEED_SCORE = 30        # below this a card never shows in a deck
COMPATIBLE_THRESHOLD = 50  # the single definition of a "compatible renter"


@dataclass
class RenterInput:
    id: int
    university: str
    move_in: date
    move_out: date
    flexibility: str
    max_budget: float
    max_distance_miles: float
    furnished_pref: str   # required | preferred | none
    parking_pref: str     # required | preferred | none
    housing_type: str     # any | room | apartment | house
    roommates_ok: bool
    name: str = ""


@dataclass
class ListingInput:
    id: int
    university: str
    available_from: date
    available_until: date
    asking_price: float
    monthly_rent: float
    distance_miles: float
    furnished: bool
    parking: bool
    housing_type: str
    roommates: int
    urgency: str = "normal"
    accepts_partial: bool = False
    photo_count: int = 0
    amenity_count: int = 0
    utilities_cost: float = 0
    parking_cost: float = 0
    required_fees: float = 0
    square_feet: int = 0
    bedrooms: int = 1


@dataclass
class MatchScore:
    overall: int
    date: int
    price: int
    location: int
    preference: int
    listing_coverage: int
    seller_rank: float
    possible: bool
    explanation: list[str] = field(default_factory=list)
    date_gap_days: int = 0
    gap_value_usd: int = 0


def days_between(start: date, end: date) -> int:
    """Exclusive-end day count used everywhere in the engine."""
    return max(0, (end - start).days)


def overlap_days(a_start: date, a_end: date, b_start: date, b_end: date) -> int:
    return days_between(max(a_start, b_start), min(a_end, b_end))


def date_score(move_in: date, move_out: date, avail_from: date, avail_until: date, flexibility: str) -> int:
    requested = days_between(move_in, move_out)
    if requested == 0:
        return 0
    overlap = overlap_days(move_in, move_out, avail_from, avail_until)
    if overlap == 0:
        return 0
    uncovered = requested - overlap
    effective = max(0, uncovered - FLEX_DAYS.get(flexibility, 0))
    return round(100 * (1 - effective / requested))


def price_score(asking: float, budget: float) -> int:
    if budget <= 0:
        return 0
    if asking <= budget:
        return 100
    over = (asking - budget) / budget
    return max(0, round(100 - 250 * over))


def location_score(distance: float, max_distance: float) -> int:
    max_distance = max(0.5, max_distance)
    if distance <= max_distance:
        return round(100 - 20 * (distance / max_distance))
    return max(0, round(80 - 80 * ((distance - max_distance) / max_distance)))


def preference_score(r: RenterInput, l: ListingInput) -> int:
    score = 100
    if not l.furnished:
        score -= {"required": 50, "preferred": 15}.get(r.furnished_pref, 0)
    if not l.parking:
        score -= {"required": 50, "preferred": 15}.get(r.parking_pref, 0)
    if r.housing_type != "any" and r.housing_type != l.housing_type:
        score -= 30
    if not r.roommates_ok and l.roommates > 0:
        score -= 40
    return max(0, score)


def is_possible(r: RenterInput, l: ListingInput) -> bool:
    return r.university == l.university and overlap_days(r.move_in, r.move_out, l.available_from, l.available_until) > 0


def true_monthly_cost(l: ListingInput) -> float:
    return l.asking_price + l.utilities_cost + l.parking_cost + l.required_fees


def score(r: RenterInput, l: ListingInput) -> MatchScore:
    possible = is_possible(r, l)
    d = date_score(r.move_in, r.move_out, l.available_from, l.available_until, r.flexibility) if possible else 0
    p = price_score(l.asking_price, r.max_budget)
    loc = location_score(l.distance_miles, r.max_distance_miles)
    pref = preference_score(r, l)
    overall = round(WEIGHTS["date"] * d + WEIGHTS["price"] * p + WEIGHTS["location"] * loc + WEIGHTS["preference"] * pref)
    if not possible:
        overall = 0
    listing_days = days_between(l.available_from, l.available_until)
    ov = overlap_days(r.move_in, r.move_out, l.available_from, l.available_until)
    coverage = round(100 * ov / listing_days) if listing_days else 0
    seller_rank = 0.75 * overall + 0.25 * coverage

    gap = abs((l.available_from - r.move_in).days) + abs((l.available_until - r.move_out).days)
    gap_value = round(l.asking_price / 30 * gap) if 0 < gap <= 14 else 0

    return MatchScore(
        overall=overall, date=d, price=p, location=loc, preference=pref,
        listing_coverage=coverage, seller_rank=seller_rank, possible=possible,
        explanation=explain(r, l, d, ov),
        date_gap_days=gap if gap <= 14 else 0, gap_value_usd=gap_value,
    )


def explain(r: RenterInput, l: ListingInput, d: int, overlap: int) -> list[str]:
    out: list[str] = []
    requested = days_between(r.move_in, r.move_out)
    if d >= 100:
        out.append("Dates fully covered")
    elif d >= 90:
        out.append("Dates nearly perfectly align")
    elif d > 0:
        out.append(f"{overlap} of {requested} requested days covered")
    else:
        out.append("No date overlap")
    diff = r.max_budget - l.asking_price
    if diff > 0:
        out.append(f"${diff:,.0f} under budget")
    elif diff == 0:
        out.append("Right at your budget")
    else:
        out.append(f"${-diff:,.0f} over budget")
    if l.furnished:
        out.append("Furnished")
    elif r.furnished_pref == "required":
        out.append("Not furnished (you require it)")
    if l.parking:
        out.append("Parking included")
    elif r.parking_pref == "required":
        out.append("No parking (you require it)")
    out.append(f"{l.distance_miles:g} mi from campus")
    if l.roommates:
        out.append(f"{l.roommates} roommate{'s' if l.roommates > 1 else ''}")
    return out
