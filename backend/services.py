"""Bridges database rows to the pure engine and builds composite API responses."""
from __future__ import annotations

from datetime import date, timedelta

from sqlmodel import Session, select

from engine import demand, partial_fill, pricing, recovery, scoring
from engine.scoring import COMPATIBLE_THRESHOLD, MIN_FEED_SCORE, ListingInput, MatchScore, RenterInput
from models import now, Listing, ListingPhoto, Match, Offer, RenterProfile, Swipe, User


def public_user(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "university": u.university, "photo_url": u.photo_url,
            "verified": u.verified, "mode": u.mode}


def to_renter_input(p: RenterProfile, u: User) -> RenterInput:
    return RenterInput(
        id=u.id, name=u.name, university=p.university, move_in=p.move_in, move_out=p.move_out, flexibility=p.flexibility,
        max_budget=p.max_budget, max_distance_miles=p.max_distance_miles, furnished_pref=p.furnished_pref,
        parking_pref=p.parking_pref, housing_type=p.housing_type, roommates_ok=p.roommates_ok,
    )


def to_listing_input(l: Listing, photo_count: int = 0) -> ListingInput:
    return ListingInput(
        id=l.id, university=l.university, available_from=l.available_from, available_until=l.available_until,
        asking_price=l.asking_price, monthly_rent=l.monthly_rent, distance_miles=l.distance_miles, furnished=l.furnished,
        parking=l.parking, housing_type=l.housing_type, roommates=l.roommates, urgency=l.urgency,
        accepts_partial=l.accepts_partial, photo_count=photo_count, amenity_count=len(l.amenities or []),
        utilities_cost=l.utilities_cost, parking_cost=l.parking_cost, required_fees=l.required_fees,
    )


def photos_for(session: Session, listing_id: int) -> list[str]:
    rows = session.exec(select(ListingPhoto).where(ListingPhoto.listing_id == listing_id).order_by(ListingPhoto.position)).all()
    return [p.url for p in rows]


def active_renters(session: Session) -> list[tuple[User, RenterProfile]]:
    rows = session.exec(select(User, RenterProfile).join(RenterProfile, RenterProfile.user_id == User.id).where(RenterProfile.active == True)).all()  # noqa: E712
    return list(rows)


def renter_inputs(session: Session) -> list[RenterInput]:
    return [to_renter_input(p, u) for u, p in active_renters(session)]


def active_listings(session: Session) -> list[Listing]:
    return list(session.exec(select(Listing).where(Listing.status == "active")).all())


def listing_input_with_photos(session: Session, l: Listing) -> ListingInput:
    return to_listing_input(l, len(photos_for(session, l.id)))


def badges_for(l: Listing, seller: User) -> dict:
    return {
        "price_drop": l.previous_price is not None and l.previous_price > l.asking_price,
        "previous_price": l.previous_price,
        "urgency": l.urgency,
        "verified": seller.verified,
    }


def listing_card(session: Session, l: Listing, score: MatchScore | None) -> dict:
    seller = session.get(User, l.seller_id)
    li = to_listing_input(l)
    return {
        "listing": l,
        "photos": photos_for(session, l.id),
        "seller": {"id": seller.id, "name": seller.name, "verified": seller.verified, "photo_url": seller.photo_url, "university": seller.university},
        "score": score,
        "true_monthly_cost": scoring.true_monthly_cost(li),
        "badges": badges_for(l, seller),
    }


def swiped_listing_ids(session: Session, renter_id: int) -> set[int]:
    return {s.listing_id for s in session.exec(select(Swipe).where(Swipe.renter_id == renter_id, Swipe.actor == "renter")).all()}


def discover_cards(session: Session, user: User, profile: RenterProfile) -> list[dict]:
    """Core 2: renter recommendation flow."""
    r = to_renter_input(profile, user)
    skip = swiped_listing_ids(session, user.id)
    cards = []
    for l in active_listings(session):
        if l.seller_id == user.id or l.id in skip:
            continue
        s = scoring.score(r, to_listing_input(l))
        if not s.possible or s.overall < MIN_FEED_SCORE:
            continue
        cards.append(listing_card(session, l, s))
    cards.sort(key=lambda c: -c["score"].overall)
    return cards


def renter_card(u: User, p: RenterProfile, s: MatchScore, already_liked_you: bool) -> dict:
    return {
        "renter": {"id": u.id, "name": u.name, "university": u.university, "verified": u.verified, "photo_url": u.photo_url},
        "profile": p,
        "score": s,
        "already_liked_you": already_liked_you,
    }


def reverse_match_cards(session: Session, l: Listing, include_swiped: bool = False) -> tuple[int, list[dict]]:
    """Core 3: seller recommendation flow. Scores ALL active renter profiles, not just viewers."""
    li = to_listing_input(l)
    seller_swipes = {s.renter_id for s in session.exec(select(Swipe).where(Swipe.listing_id == l.id, Swipe.actor == "seller")).all()}
    renter_likes = {s.renter_id for s in session.exec(select(Swipe).where(Swipe.listing_id == l.id, Swipe.actor == "renter", Swipe.direction == "like")).all()}
    compatible = 0
    cards = []
    for u, p in active_renters(session):
        if u.id == l.seller_id:
            continue
        s = scoring.score(to_renter_input(p, u), li)
        if not s.possible or s.overall < MIN_FEED_SCORE:
            continue
        if s.overall >= COMPATIBLE_THRESHOLD:
            compatible += 1
        if u.id in seller_swipes and not include_swiped:
            continue
        cards.append(renter_card(u, p, s, u.id in renter_likes))
    cards.sort(key=lambda c: -c["score"].seller_rank)
    return compatible, cards


def find_or_create_match(session: Session, l: Listing, renter_id: int) -> Match | None:
    """If both sides have liked, create (or return) the single match record."""
    likes = session.exec(select(Swipe).where(Swipe.listing_id == l.id, Swipe.renter_id == renter_id, Swipe.direction == "like")).all()
    if {s.actor for s in likes} != {"renter", "seller"}:
        return None
    existing = session.exec(select(Match).where(Match.listing_id == l.id, Match.renter_id == renter_id)).first()
    if existing:
        return existing
    m = Match(listing_id=l.id, renter_id=renter_id, seller_id=l.seller_id)
    session.add(m)
    session.commit()
    session.refresh(m)
    return m


def market_renters(session: Session, l: Listing) -> list[RenterInput]:
    """Active renter profiles excluding the seller's own (a seller can't rent their own place)."""
    return [r for r in renter_inputs(session) if r.id != l.seller_id]


def partial_fill_options(session: Session, l: Listing, renters: list[RenterInput] | None = None) -> list:
    renters = renters if renters is not None else market_renters(session, l)
    li = to_listing_input(l)
    scores = {r.id: scoring.score(r, li) for r in renters}
    return partial_fill.find_combinations(li, renters, scores)


def dashboard(session: Session, l: Listing, today: date) -> dict:
    """Core 1 + 5 (+3, +4) combined for the seller dashboard."""
    li = listing_input_with_photos(session, l)
    renters = market_renters(session, l)
    others = [to_listing_input(x) for x in active_listings(session) if x.id != l.id]

    rec = pricing.recommend(li, renters, others, today)
    ev = recovery.evaluate(li, renters, today)
    lv = recovery.levers(li, renters, today, ev, rec)
    rar, daily, vacancy_days = recovery.rent_at_risk(li)
    report = demand.aggregate(renters, l.university, today, li)

    matches = session.exec(select(Match).where(Match.listing_id == l.id, Match.status == "active")).all()
    match_ids = [m.id for m in matches]
    offers_pending = 0
    if match_ids:
        offers_pending = len(session.exec(select(Offer).where(Offer.match_id.in_(match_ids), Offer.status == "pending")).all())  # type: ignore[attr-defined]
    interested = len(session.exec(select(Swipe).where(Swipe.listing_id == l.id, Swipe.actor == "renter", Swipe.direction == "like")).all())
    week_ago = now() - timedelta(days=7)
    new_this_week = sum(1 for u, p in active_renters(session) if p.updated_at >= week_ago and scoring.is_possible(to_renter_input(p, u), li))

    return {
        "listing": l,
        "photos": photos_for(session, l.id),
        "rent_at_risk": rar,
        "daily_loss": daily,
        "vacancy_days": vacancy_days,
        "days_to_vacancy": rec.days_to_vacancy,
        "pricing": rec,
        "compatible_count": ev.compatible_count,
        "affordable_count": ev.affordable_count,
        "mutual_matches": len(matches),
        "recovery": {"score": ev.score, "pct_can_afford": ev.pct_can_afford, "demand_level": ev.demand_level, "completeness": ev.completeness, "levers": lv},
        "demand": report,
        "partial_fill_top": ev.partial_top,
        "activity": {
            "interested": interested,
            "offers_pending": offers_pending,
            "new_this_week": new_this_week,
            "price_dropped": l.previous_price is not None and l.previous_price > l.asking_price,
            "high_demand": ev.demand_level in ("HIGH", "VERY HIGH"),
        },
    }
