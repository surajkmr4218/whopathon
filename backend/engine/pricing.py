"""Core system 1: Urgency Pricing. Deterministic, rule based, demand driven."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from statistics import median

from .scoring import ListingInput, RenterInput, date_score

MAX_DISCOUNT = {"normal": 0.05, "need_filled": 0.12, "urgent": 0.20}
URGENCY_LABEL = {"normal": "Normal", "need_filled": "Need It Filled", "urgent": "Urgent"}


@dataclass
class PricingRecommendation:
    days_to_vacancy: int
    current_price: int
    suggested_price: int
    current_pool: int
    predicted_pool: int
    percent_change: int
    should_reduce: bool
    explanation: str
    median_budget: int
    competing_median: int
    urgency: str


def round25(x: float) -> int:
    return int(round(x / 25.0) * 25)


def _date_ok(listing: ListingInput, renters: list[RenterInput]) -> list[RenterInput]:
    return [
        r for r in renters
        if r.university == listing.university
        and date_score(r.move_in, r.move_out, listing.available_from, listing.available_until, r.flexibility) >= 50
    ]


def pool_at_price(listing: ListingInput, renters: list[RenterInput], price: float) -> int:
    """Renters whose dates work AND who can afford `price`. This is the pricing pool."""
    return sum(1 for r in _date_ok(listing, renters) if r.max_budget >= price)


def recommend(listing: ListingInput, renters: list[RenterInput], competing: list[ListingInput], today: date) -> PricingRecommendation:
    days = max(0, (listing.available_from - today).days)
    date_ok = _date_ok(listing, renters)
    asking = listing.asking_price
    current_pool = sum(1 for r in date_ok if r.max_budget >= asking)

    median_budget = median([r.max_budget for r in date_ok]) if date_ok else asking
    comp = [c.asking_price for c in competing if c.id != listing.id and c.university == listing.university]
    competing_median = median(comp) if comp else asking

    urgency = listing.urgency if listing.urgency in MAX_DISCOUNT else "normal"
    triggered = (
        urgency == "urgent"
        or (urgency == "need_filled" and (days <= 30 or current_pool < 10))
        or (urgency == "normal" and (days <= 14 or current_pool < 5))
    )
    if triggered:
        target = round25(0.6 * median_budget + 0.4 * competing_median)
        floor = max(round25(asking * (1 - MAX_DISCOUNT[urgency])), round25(0.6 * listing.monthly_rent))
        suggested = max(target, floor)
        suggested = min(suggested, int(asking))
    else:
        suggested = int(asking)

    should_reduce = suggested < asking
    predicted_pool = sum(1 for r in date_ok if r.max_budget >= suggested)
    if current_pool:
        pct = round((predicted_pool - current_pool) / current_pool * 100)
    else:
        pct = 100 if predicted_pool else 0

    if should_reduce:
        gained = predicted_pool - current_pool
        explanation = (
            f"{days} days until vacancy and urgency is {URGENCY_LABEL[urgency]}. "
            f"Median budget of {len(date_ok)} date-compatible renters is ${median_budget:,.0f} and comparable listings ask ${competing_median:,.0f}. "
            f"At ${suggested:,.0f}, {gained} more renter{'s' if gained != 1 else ''} can afford your place."
        )
    else:
        explanation = (
            f"Your price is competitive: {current_pool} date-compatible renter{'s' if current_pool != 1 else ''} can already afford ${asking:,.0f} "
            f"(median budget ${median_budget:,.0f})."
        )

    return PricingRecommendation(
        days_to_vacancy=days, current_price=int(asking), suggested_price=int(suggested),
        current_pool=current_pool, predicted_pool=predicted_pool, percent_change=pct,
        should_reduce=should_reduce, explanation=explanation,
        median_budget=int(median_budget), competing_median=int(competing_median), urgency=urgency,
    )
