"""Core system 5: Demand Intelligence. Aggregates active renter profiles."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from statistics import median

from .scoring import ListingInput, RenterInput, overlap_days

BUDGET_BUCKETS = [("Under $900", 0, 900), ("$900–$1,100", 900, 1100), ("$1,100–$1,300", 1100, 1300), ("$1,300+", 1300, 10**9)]
LEVEL_VALUE = {"VERY HIGH": 1.0, "HIGH": 0.85, "MEDIUM": 0.6, "LOW": 0.3}


@dataclass
class Bucket:
    label: str
    count: int
    level: str
    key: str = ""


@dataclass
class ListingPosition:
    price_bucket: str
    price_level: str
    pct_can_afford: int
    window_level: str
    insights: list[str] = field(default_factory=list)


@dataclass
class DemandReport:
    university: str
    total_active: int
    median_budget: int
    by_month: list[Bucket]
    budget_buckets: list[Bucket]
    furnished_pct: int
    parking_pct: int
    within_1mi_pct: int
    roommates_ok_pct: int
    housing_types: dict[str, int]
    insights: list[str]
    listing_position: ListingPosition | None = None


def level_for(count: int, max_count: int) -> str:
    if max_count == 0 or count == 0:
        return "LOW"
    ratio = count / max_count
    if ratio >= 0.9:
        return "VERY HIGH"
    if ratio >= 0.7:
        return "HIGH"
    if ratio >= 0.35:
        return "MEDIUM"
    return "LOW"


def _month_start(d: date, offset: int) -> date:
    m = d.month - 1 + offset
    return date(d.year + m // 12, m % 12 + 1, 1)


def budget_bucket(price: float) -> str:
    for label, lo, hi in BUDGET_BUCKETS:
        if lo <= price < hi:
            return label
    return BUDGET_BUCKETS[-1][0]


def aggregate(renters: list[RenterInput], university: str, today: date, listing: ListingInput | None = None) -> DemandReport:
    profiles = [r for r in renters if r.university == university]
    n = len(profiles)
    pct = lambda k: round(100 * k / n) if n else 0  # noqa: E731

    months: list[tuple[str, str, int]] = []
    for i in range(6):
        start, end = _month_start(today, i), _month_start(today, i + 1)
        count = sum(1 for r in profiles if overlap_days(r.move_in, r.move_out, start, end) > 0)
        months.append((start.strftime("%b %Y"), start.strftime("%Y-%m"), count))
    max_m = max((c for _, _, c in months), default=0)
    by_month = [Bucket(label, c, level_for(c, max_m), key) for label, key, c in months]

    counts = {label: sum(1 for r in profiles if lo <= r.max_budget < hi) for label, lo, hi in BUDGET_BUCKETS}
    max_b = max(counts.values(), default=0)
    budget_buckets = [Bucket(label, counts[label], level_for(counts[label], max_b), label) for label, _, _ in BUDGET_BUCKETS]

    furnished = pct(sum(1 for r in profiles if r.furnished_pref in ("required", "preferred")))
    parking = pct(sum(1 for r in profiles if r.parking_pref in ("required", "preferred")))
    within = pct(sum(1 for r in profiles if r.max_distance_miles <= 1))
    roommates = pct(sum(1 for r in profiles if r.roommates_ok))
    housing: dict[str, int] = {}
    for r in profiles:
        housing[r.housing_type] = housing.get(r.housing_type, 0) + 1
    med = int(median([r.max_budget for r in profiles])) if profiles else 0

    hot = [b for b in by_month if b.level in ("HIGH", "VERY HIGH")]
    insights: list[str] = []
    if hot:
        insights.append(f"Demand near {university} {hot[0].label.split()[0]}–{hot[-1].label.split()[0]}: {hot[-1].level}")
    for b in budget_buckets:
        if b.count:
            insights.append(f"{b.label}: {b.level}")
    insights.append(f"Furnished: {furnished}% prefer it")
    insights.append(f"Parking: {parking}% require/prefer it")
    insights.append(f"Within 1 mile: {within}% prefer it")

    position = None
    if listing is not None:
        label = budget_bucket(listing.asking_price)
        blevel = next((b.level for b in budget_buckets if b.label == label), "LOW")
        afford = pct(sum(1 for r in profiles if r.max_budget >= listing.asking_price))
        window_counts = [
            sum(1 for r in profiles if overlap_days(r.move_in, r.move_out, _month_start(today, i), _month_start(today, i + 1)) > 0)
            for i in range(6)
            if overlap_days(listing.available_from, listing.available_until, _month_start(today, i), _month_start(today, i + 1)) > 0
        ]
        wl = level_for(round(sum(window_counts) / len(window_counts)) if window_counts else 0, max_m)
        position = ListingPosition(
            price_bucket=label, price_level=blevel, pct_can_afford=afford, window_level=wl,
            insights=[
                f"Your ${listing.asking_price:,.0f} sits in the {label} bucket ({blevel} demand)",
                f"{afford}% of active renters can afford your price",
                f"Demand during your dates: {wl}",
            ],
        )

    return DemandReport(
        university=university, total_active=n, median_budget=med, by_month=by_month, budget_buckets=budget_buckets,
        furnished_pct=furnished, parking_pct=parking, within_1mi_pct=within, roommates_ok_pct=roommates,
        housing_types=housing, insights=insights, listing_position=position,
    )
