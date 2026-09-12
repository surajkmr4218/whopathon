"""Seller intelligence: Rent at Risk, Rent Recovery Score, and what-if levers.

Ties the other four systems together for the dashboard.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date, timedelta

from .demand import LEVEL_VALUE, aggregate
from .partial_fill import PartialFillOption, find_combinations
from .pricing import PricingRecommendation, recommend
from .scoring import COMPATIBLE_THRESHOLD, ListingInput, MatchScore, RenterInput, days_between, score


@dataclass
class Evaluation:
    compatible_count: int
    affordable_count: int  # compatible AND can afford the asking price — what a price change actually moves
    pct_can_afford: int
    demand_level: str
    partial_top: PartialFillOption | None
    completeness: int
    score: int
    scores: dict[int, MatchScore]


@dataclass
class Lever:
    key: str
    label: str
    new_count: int
    new_score: int
    delta_count: int
    delta_score: int


def rent_at_risk(listing: ListingInput) -> tuple[int, int, int]:
    """Returns (rent_at_risk, daily_loss, vacancy_days). Labelled as an estimate in the UI."""
    vacancy_days = days_between(listing.available_from, listing.available_until)
    daily = listing.monthly_rent / 30
    return round(daily * vacancy_days), round(daily), vacancy_days


def completeness(listing: ListingInput) -> int:
    return round(100 * (0.6 * min(1, listing.photo_count / 3) + 0.4 * min(1, listing.amenity_count / 4)))


def recovery_score(compatible: int, pct_afford: int, demand_level: str, partial_available: bool, accepts_partial: bool, complete: int) -> int:
    s = 30 * min(1, compatible / 10)
    s += 25 * (pct_afford / 100)
    s += 20 * LEVEL_VALUE.get(demand_level, 0.3)
    s += 15 if (partial_available and accepts_partial) else 0
    s += 10 * (complete / 100)
    return round(s)


def evaluate(listing: ListingInput, renters: list[RenterInput], today: date) -> Evaluation:
    scores = {r.id: score(r, listing) for r in renters}
    compatible = sum(1 for s in scores.values() if s.possible and s.overall >= COMPATIBLE_THRESHOLD)
    affordable = sum(1 for r in renters if scores[r.id].possible and scores[r.id].overall >= COMPATIBLE_THRESHOLD and r.max_budget >= listing.asking_price)
    report = aggregate(renters, listing.university, today, listing)
    pct_afford = report.listing_position.pct_can_afford if report.listing_position else 0
    demand_level = report.listing_position.window_level if report.listing_position else "LOW"
    options = find_combinations(listing, renters, scores)
    partial_top = options[0] if options else None
    complete = completeness(listing)
    s = recovery_score(compatible, pct_afford, demand_level, partial_top is not None, listing.accepts_partial, complete)
    return Evaluation(compatible, affordable, pct_afford, demand_level, partial_top, complete, s, scores)


def levers(listing: ListingInput, renters: list[RenterInput], today: date, base: Evaluation, pricing: PricingRecommendation) -> list[Lever]:
    """'Make My Listing Work': re-run the real evaluation with each hypothetical change."""
    variants: list[tuple[str, str, ListingInput]] = []
    if pricing.should_reduce:
        variants.append(("price", f"Lower rent to ${pricing.suggested_price:,}", replace(listing, asking_price=pricing.suggested_price)))
    else:
        variants.append(("price", f"Lower rent by $75 to ${listing.asking_price - 75:,.0f}", replace(listing, asking_price=listing.asking_price - 75)))
    if not listing.accepts_partial:
        variants.append(("partial", "Allow partial renters", replace(listing, accepts_partial=True)))
    if not listing.furnished:
        variants.append(("furnished", "Add furniture", replace(listing, furnished=True)))
    variants.append(("dates", "Allow ±7 day flexibility on dates", replace(
        listing, available_from=listing.available_from - timedelta(days=7), available_until=listing.available_until + timedelta(days=7))))
    if not listing.parking:
        variants.append(("parking", "Include a parking spot", replace(listing, parking=True)))

    out: list[Lever] = []
    for key, label, v in variants:
        ev = evaluate(v, renters, today)
        out.append(Lever(key, label, ev.affordable_count, ev.score, ev.affordable_count - base.affordable_count, ev.score - base.score))
    return out
