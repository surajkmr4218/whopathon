"""Core system 4: Partial-Fill Matching. Combine two renters to cover one vacancy."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from itertools import combinations

from .scoring import ListingInput, MatchScore, RenterInput, days_between

MIN_COVERAGE = 0.5


@dataclass
class Member:
    renter_id: int
    name: str
    start: date
    end: date
    days: int
    match: int


@dataclass
class Segment:
    start: date
    end: date
    days: int
    renter_id: int | None  # None = uncovered gap


@dataclass
class PartialFillOption:
    members: list[Member]
    coverage_pct: int
    covered_days: int
    uncovered_days: int
    listing_days: int
    estimated_recovered_rent: int
    avg_match: int
    segments: list[Segment] = field(default_factory=list)


def find_combinations(
    listing: ListingInput,
    renters: list[RenterInput],
    scores: dict[int, MatchScore],
    max_overlap_days: int = 3,
    top_n: int = 3,
) -> list[PartialFillOption]:
    L0, L1 = listing.available_from, listing.available_until
    total = days_between(L0, L1)
    if total == 0:
        return []

    cands: list[tuple[RenterInput, date, date]] = []
    for r in renters:
        if r.university != listing.university:
            continue
        s, e = max(r.move_in, L0), min(r.move_out, L1)
        if days_between(s, e) > 0:
            cands.append((r, s, e))
    if len(cands) < 2:
        return []

    options: list[PartialFillOption] = []

    for a, b in combinations(cands, 2):
        (ra, sa, ea), (rb, sb, eb) = sorted([a, b], key=lambda c: c[1])
        ov = (min(ea, eb) - sb).days  # negative => gap between the two windows
        if ov > max_overlap_days:
            continue
        b_start = max(sb, ea)  # clip second renter to start after the first ends
        b_days = days_between(b_start, eb)
        if b_days == 0:
            continue
        a_days = days_between(sa, ea)
        union = a_days + b_days
        coverage = union / total
        if coverage < MIN_COVERAGE:
            continue

        segs: list[Segment] = []
        if sa > L0:
            segs.append(Segment(L0, sa, days_between(L0, sa), None))
        segs.append(Segment(sa, ea, a_days, ra.id))
        if b_start > ea:
            segs.append(Segment(ea, b_start, days_between(ea, b_start), None))
        segs.append(Segment(b_start, eb, b_days, rb.id))
        if eb < L1:
            segs.append(Segment(eb, L1, days_between(eb, L1), None))

        ma = scores[ra.id].overall if ra.id in scores else 0
        mb = scores[rb.id].overall if rb.id in scores else 0
        options.append(PartialFillOption(
            members=[Member(ra.id, ra.name, sa, ea, a_days, ma), Member(rb.id, rb.name, b_start, eb, b_days, mb)],
            coverage_pct=round(coverage * 100), covered_days=union, uncovered_days=total - union, listing_days=total,
            estimated_recovered_rent=round(listing.asking_price / 30 * union), avg_match=round((ma + mb) / 2), segments=segs,
        ))

    options.sort(key=lambda o: (-o.coverage_pct, -o.estimated_recovered_rent, -o.avg_match))
    return options[:top_n]
