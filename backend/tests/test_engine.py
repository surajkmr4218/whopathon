from datetime import date, timedelta

from engine import deals, demand, partial_fill, pricing, recovery, scoring
from engine.scoring import ListingInput, RenterInput

TODAY = date(2026, 5, 11)


def renter(**kw) -> RenterInput:
    base = dict(id=1, name="R", university="OSU", move_in=date(2026, 6, 3), move_out=date(2026, 8, 9), flexibility="exact",
                max_budget=1100, max_distance_miles=2, furnished_pref="preferred", parking_pref="none", housing_type="any", roommates_ok=True)
    base.update(kw)
    return RenterInput(**base)


def listing(**kw) -> ListingInput:
    base = dict(id=1, university="OSU", available_from=date(2026, 5, 28), available_until=date(2026, 8, 12), asking_price=1050,
                monthly_rent=1100, distance_miles=0.4, furnished=True, parking=True, housing_type="apartment", roommates=0, urgency="urgent")
    base.update(kw)
    return ListingInput(**base)


# ---- date score (PRD p.5, p.13) ----
def test_full_containment_scores_100():
    assert scoring.date_score(date(2026, 6, 3), date(2026, 8, 9), date(2026, 5, 28), date(2026, 8, 12), "exact") == 100


def test_partial_overlap_scores_proportionally():
    s = scoring.date_score(date(2026, 6, 1), date(2026, 7, 1), date(2026, 6, 16), date(2026, 8, 1), "exact")
    assert s == 50


def test_flexibility_absorbs_small_gap():
    exact = scoring.date_score(date(2026, 6, 1), date(2026, 7, 1), date(2026, 6, 4), date(2026, 8, 1), "exact")
    flex = scoring.date_score(date(2026, 6, 1), date(2026, 7, 1), date(2026, 6, 4), date(2026, 8, 1), "3d")
    assert exact == 90 and flex == 100


def test_no_overlap_is_zero_and_impossible():
    r = renter(move_in=date(2026, 9, 1), move_out=date(2026, 10, 1))
    assert scoring.date_score(r.move_in, r.move_out, date(2026, 5, 28), date(2026, 8, 12), "flexible") == 0
    assert not scoring.is_possible(r, listing())
    assert scoring.score(r, listing()).overall == 0


def test_different_university_is_impossible():
    assert not scoring.is_possible(renter(university="Michigan"), listing())


# ---- price score (PRD p.13: $20 over should not collapse) ----
def test_price_score_smooth():
    assert scoring.price_score(1000, 1000) == 100
    assert scoring.price_score(1020, 1000) == 95
    assert scoring.price_score(1200, 1000) == 50
    assert scoring.price_score(1500, 1000) == 0


def test_overall_weights_and_explanation():
    s = scoring.score(renter(), listing())
    assert s.overall >= 95
    assert s.date == 100
    assert "$50 under budget" in s.explanation
    assert "Furnished" in s.explanation and "Parking included" in s.explanation
    assert any("0.4 mi" in e for e in s.explanation)


def test_preference_required_penalises_more_than_preferred():
    l = listing(furnished=False)
    req = scoring.preference_score(renter(furnished_pref="required"), l)
    pref = scoring.preference_score(renter(furnished_pref="preferred"), l)
    assert req < pref < 100


def test_date_gap_hint():
    s = scoring.score(renter(move_in=date(2026, 6, 5), move_out=date(2026, 8, 12)), listing(available_from=date(2026, 6, 1)))
    assert s.date_gap_days == 4
    assert s.gap_value_usd == round(1050 / 30 * 4)


# ---- urgency pricing (PRD p.4, p.17) ----
def pool_renters():
    budgets = [850, 900, 925, 950, 975, 1000, 1050, 1100, 1200]
    return [renter(id=i, max_budget=b) for i, b in enumerate(budgets, start=1)]


def test_pricing_recommends_lower_price_and_bigger_pool():
    comp = [listing(id=2, asking_price=950), listing(id=3, asking_price=900)]
    rec = pricing.recommend(listing(), pool_renters(), comp, date(2026, 5, 19))
    assert rec.days_to_vacancy == 9
    assert rec.should_reduce
    assert rec.suggested_price < 1050
    assert rec.predicted_pool > rec.current_pool
    assert rec.percent_change > 0
    assert "more renter" in rec.explanation


def test_pricing_never_raises_price_and_handles_empty_pool():
    rec = pricing.recommend(listing(), [], [], TODAY)
    assert rec.suggested_price <= 1050
    assert rec.current_pool == 0 and rec.predicted_pool == 0


def test_normal_urgency_with_healthy_pool_keeps_price():
    rec = pricing.recommend(listing(urgency="normal"), pool_renters() + [renter(id=99, max_budget=1500), renter(id=98, max_budget=1300)], [], date(2026, 4, 1))
    assert not rec.should_reduce
    assert "competitive" in rec.explanation


# ---- partial fill (PRD p.7) ----
def test_two_renter_combo_covers_most_of_window():
    l = listing(available_from=date(2026, 5, 20), available_until=date(2026, 8, 20))
    a = renter(id=1, name="A", move_in=date(2026, 5, 25), move_out=date(2026, 6, 30))
    b = renter(id=2, name="B", move_in=date(2026, 7, 1), move_out=date(2026, 8, 18))
    c = renter(id=3, name="C", move_in=date(2026, 6, 20), move_out=date(2026, 7, 20))  # overlaps both, must not pair with them
    scores = {r.id: scoring.score(r, l) for r in (a, b, c)}
    opts = partial_fill.find_combinations(l, [a, b, c], scores)
    assert opts, "expected a combination"
    top = opts[0]
    assert [m.name for m in top.members] == ["A", "B"]
    assert top.coverage_pct >= 90
    assert top.covered_days == 36 + 48
    assert top.estimated_recovered_rent == round(1050 / 30 * 84)
    gaps = [s for s in top.segments if s.renter_id is None]
    assert sum(g.days for g in gaps) == top.uncovered_days


def test_partial_fill_rejects_heavy_overlap_and_needs_two():
    l = listing(available_from=date(2026, 5, 20), available_until=date(2026, 8, 20))
    a = renter(id=1, move_in=date(2026, 5, 25), move_out=date(2026, 7, 30))
    b = renter(id=2, move_in=date(2026, 6, 1), move_out=date(2026, 8, 18))
    assert partial_fill.find_combinations(l, [a, b], {}) == []
    assert partial_fill.find_combinations(l, [a], {}) == []


# ---- demand (PRD p.8) ----
def test_demand_aggregates_and_positions_listing():
    rs = pool_renters() + [renter(id=50, university="Michigan", max_budget=800)]
    rep = demand.aggregate(rs, "OSU", TODAY, listing())
    assert rep.total_active == 9
    assert rep.median_budget == 975
    assert len(rep.by_month) == 6 and rep.by_month[0].label.startswith("May")
    assert rep.furnished_pct == 100
    assert rep.listing_position is not None
    assert rep.listing_position.price_bucket == "$900–$1,100"
    assert rep.listing_position.pct_can_afford == round(100 * 3 / 9)
    assert any(b.level in ("HIGH", "VERY HIGH") for b in rep.by_month)


# ---- recovery + levers (PRD p.10, p.12) ----
def test_rent_at_risk_and_recovery_levers():
    l = listing(photo_count=3, amenity_count=4)
    rar, daily, days = recovery.rent_at_risk(l)
    assert days == 76 and daily == 37 and rar == round(1100 / 30 * 76)
    rs = pool_renters()
    ev = recovery.evaluate(l, rs, date(2026, 5, 19))
    assert 0 <= ev.score <= 100
    rec = pricing.recommend(l, rs, [], date(2026, 5, 19))
    lv = recovery.levers(l, rs, date(2026, 5, 19), ev, rec)
    keys = [x.key for x in lv]
    assert "price" in keys and "partial" in keys and "dates" in keys
    price_lever = next(x for x in lv if x.key == "price")
    assert price_lever.new_count >= ev.affordable_count


# ---- deal score (market $/sqft x square feet) ----
def test_deal_score_uses_market_rate_per_sqft():
    comps = [listing(id=2, asking_price=1000, square_feet=500), listing(id=3, asking_price=1200, square_feet=600), listing(id=4, asking_price=900, square_feet=450)]
    # market = $2.00/sqft. 600 sqft => expected $1,200.
    great = deals.score_deal(listing(id=1, asking_price=960, square_feet=600), comps)   # 20% under market
    fair = deals.score_deal(listing(id=1, asking_price=1200, square_feet=600), comps)   # at market
    bad = deals.score_deal(listing(id=1, asking_price=1440, square_feet=600), comps)    # 20% over
    assert great and great.score == 10 and great.label == "Great deal" and great.expected_price == 1200 and great.diff_pct == 20
    assert fair and fair.score == 6 and fair.label == "Good deal"
    assert bad and bad.score == 1 and bad.label == "Above market"
    assert great.market_per_sqft == 2.0 and great.comparables == 3


def test_deal_score_falls_back_and_handles_missing_sqft():
    comps = [listing(id=2, asking_price=1000, square_feet=500, housing_type="room")]
    assert deals.score_deal(listing(id=1, asking_price=900, square_feet=0), comps) is None
    d = deals.score_deal(listing(id=1, asking_price=900, square_feet=500), comps)
    assert d is not None and "places near" in d.basis
    assert deals.score_deal(listing(id=1, asking_price=900, square_feet=500), []) is None


def test_deal_score_compares_same_size_class():
    studios = [listing(id=2, asking_price=900, square_feet=400, bedrooms=0), listing(id=3, asking_price=1000, square_feet=420, bedrooms=0)]
    big = [listing(id=4, asking_price=1400, square_feet=1000, bedrooms=2), listing(id=5, asking_price=1500, square_feet=1100, bedrooms=2)]
    d = deals.score_deal(listing(id=1, asking_price=950, square_feet=410, bedrooms=0), studios + big)
    assert d is not None and d.comparables == 2 and d.basis.startswith("studios")
    assert 4 <= d.score <= 7  # at market for studios, not "above market" vs cheap-per-sqft 2BRs
