
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from engine import scoring
from models import now, Listing, Match, Message, Offer, Rating, RenterProfile, Swipe, User
from schemas import MessageIn, OfferIn, OfferRespondIn, RatingIn, SwipeIn
from services import find_or_create_match, listing_card, photos_for, public_user, renter_card, to_listing_input, to_renter_input, user_rating

router = APIRouter(tags=["social"])


def match_summary(session: Session, m: Match, me: User) -> dict:
    l = session.get(Listing, m.listing_id)
    renter = session.get(User, m.renter_id)
    seller = session.get(User, m.seller_id)
    profile = session.exec(select(RenterProfile).where(RenterProfile.user_id == m.renter_id)).first()
    score = scoring.score(to_renter_input(profile, renter), to_listing_input(l)) if profile else None
    last = session.exec(select(Message).where(Message.match_id == m.id).order_by(Message.id.desc())).first()  # type: ignore[union-attr]
    unread = len(session.exec(select(Message).where(Message.match_id == m.id, Message.sender_id != me.id, Message.read_at == None)).all())  # noqa: E711
    latest_offer = session.exec(select(Offer).where(Offer.match_id == m.id).order_by(Offer.id.desc())).first()  # type: ignore[union-attr]
    other = seller if m.renter_id == me.id else renter
    other_role = "seller" if m.renter_id == me.id else "renter"
    my_rating = session.exec(select(Rating).where(Rating.match_id == m.id, Rating.rater_id == me.id)).first()
    return {
        "match": m,
        "role": "renter" if m.renter_id == me.id else "seller",
        "listing": l,
        "photos": photos_for(session, l.id),
        "renter": {**public_user(renter), "profile": profile},
        "seller": public_user(seller),
        "other_user": {**public_user(other), "rating": user_rating(session, other.id, other_role)},
        "my_rating": my_rating,
        "score": score,
        "last_message": last,
        "unread": unread,
        "latest_offer": latest_offer,
    }


def get_match(session: Session, me: User, match_id: int) -> Match:
    m = session.get(Match, match_id)
    if m is None or me.id not in (m.renter_id, m.seller_id):
        raise HTTPException(404, "Match not found")
    return m


@router.post("/swipes")
def swipe(body: SwipeIn, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if body.direction not in ("like", "pass"):
        raise HTTPException(400, "direction must be like or pass")
    l = session.get(Listing, body.listing_id)
    if l is None:
        raise HTTPException(404, "Listing not found")
    if l.seller_id == me.id:
        actor, renter_id = "seller", body.renter_id
        if renter_id is None:
            raise HTTPException(400, "renter_id required for seller swipes")
    else:
        actor, renter_id = "renter", me.id
    existing = session.exec(select(Swipe).where(Swipe.listing_id == l.id, Swipe.renter_id == renter_id, Swipe.actor == actor)).first()
    if existing:
        existing.direction = body.direction
        existing.created_at = now()
        session.add(existing)
    else:
        session.add(Swipe(listing_id=l.id, renter_id=renter_id, actor=actor, direction=body.direction))
    session.commit()
    match = find_or_create_match(session, l, renter_id) if body.direction == "like" else None
    return {"match": match_summary(session, match, me) if match else None}


@router.get("/likes")
def my_likes(me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Right-swipes that have not become a match yet, so a like is never lost from view."""
    matched = {(m.listing_id, m.renter_id) for m in session.exec(select(Match)).all()}
    if me.mode == "seller":
        listing = session.exec(select(Listing).where(Listing.seller_id == me.id, Listing.status != "closed").order_by(Listing.id.desc())).first()  # type: ignore[union-attr]
        if listing is None:
            return {"role": "seller", "listings": [], "renters": []}
        li = to_listing_input(listing)
        likes = session.exec(select(Swipe).where(Swipe.listing_id == listing.id, Swipe.actor == "seller", Swipe.direction == "like").order_by(Swipe.id.desc())).all()  # type: ignore[union-attr]
        renter_likes = {s.renter_id for s in session.exec(select(Swipe).where(Swipe.listing_id == listing.id, Swipe.actor == "renter", Swipe.direction == "like")).all()}
        cards = []
        for sw in likes:
            if (listing.id, sw.renter_id) in matched:
                continue
            u = session.get(User, sw.renter_id)
            p = session.exec(select(RenterProfile).where(RenterProfile.user_id == sw.renter_id)).first()
            if u and p:
                cards.append(renter_card(session, u, p, scoring.score(to_renter_input(p, u), li), sw.renter_id in renter_likes))
        return {"role": "seller", "listings": [], "renters": cards}
    profile = session.exec(select(RenterProfile).where(RenterProfile.user_id == me.id)).first()
    r = to_renter_input(profile, me) if profile else None
    likes = session.exec(select(Swipe).where(Swipe.renter_id == me.id, Swipe.actor == "renter", Swipe.direction == "like").order_by(Swipe.id.desc())).all()  # type: ignore[union-attr]
    cards = []
    for sw in likes:
        if (sw.listing_id, me.id) in matched:
            continue
        l = session.get(Listing, sw.listing_id)
        if l:
            cards.append(listing_card(session, l, scoring.score(r, to_listing_input(l)) if r else None))
    return {"role": "renter", "listings": cards, "renters": []}


@router.get("/matches")
def matches(me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if me.mode == "seller":
        rows = session.exec(select(Match).where(Match.seller_id == me.id, Match.status == "active").order_by(Match.id.desc())).all()  # type: ignore[union-attr]
    else:
        rows = session.exec(select(Match).where(Match.renter_id == me.id, Match.status == "active").order_by(Match.id.desc())).all()  # type: ignore[union-attr]
    return [match_summary(session, m, me) for m in rows]


@router.get("/matches/{match_id}")
def match_detail(match_id: int, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return match_summary(session, get_match(session, me, match_id), me)


@router.get("/matches/{match_id}/messages")
def list_messages(match_id: int, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    m = get_match(session, me, match_id)
    rows = session.exec(select(Message).where(Message.match_id == m.id).order_by(Message.id)).all()
    changed = False
    for msg in rows:
        if msg.sender_id != me.id and msg.read_at is None:
            msg.read_at = now()
            session.add(msg)
            changed = True
    if changed:
        session.commit()
    return rows


@router.post("/matches/{match_id}/messages")
def send_message(match_id: int, body: MessageIn, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    m = get_match(session, me, match_id)
    msg = Message(match_id=m.id, sender_id=me.id, body=body.body.strip())
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return msg


@router.get("/matches/{match_id}/offers")
def list_offers(match_id: int, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    m = get_match(session, me, match_id)
    return session.exec(select(Offer).where(Offer.match_id == m.id).order_by(Offer.id.desc())).all()  # type: ignore[union-attr]


@router.post("/matches/{match_id}/offers")
def create_offer(match_id: int, body: OfferIn, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    m = get_match(session, me, match_id)
    if body.end_date <= body.start_date:
        raise HTTPException(400, "end_date must be after start_date")
    for o in session.exec(select(Offer).where(Offer.match_id == m.id, Offer.status == "pending")).all():
        o.status = "countered"
        session.add(o)
    offer = Offer(match_id=m.id, created_by=me.id, **body.model_dump())
    session.add(offer)
    session.commit()
    session.refresh(offer)
    return offer


@router.post("/offers/{offer_id}/respond")
def respond_offer(offer_id: int, body: OfferRespondIn, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    offer = session.get(Offer, offer_id)
    if offer is None:
        raise HTTPException(404, "Offer not found")
    m = get_match(session, me, offer.match_id)
    if offer.created_by == me.id:
        raise HTTPException(400, "You cannot respond to your own offer")
    if offer.status != "pending":
        raise HTTPException(400, "Offer is no longer pending")
    if body.action == "accept":
        offer.status = "accepted"
        l = session.get(Listing, m.listing_id)
        l.status = "matched"
        session.add(l)
        session.add(offer)
        session.commit()
        session.refresh(offer)
        return offer
    if body.action == "reject":
        offer.status = "rejected"
        session.add(offer)
        session.commit()
        session.refresh(offer)
        return offer
    if body.action == "counter":
        if body.monthly_price is None:
            raise HTTPException(400, "monthly_price required to counter")
        offer.status = "countered"
        session.add(offer)
        counter = Offer(match_id=m.id, created_by=me.id, monthly_price=body.monthly_price,
                        start_date=body.start_date or offer.start_date, end_date=body.end_date or offer.end_date)
        session.add(counter)
        session.commit()
        session.refresh(counter)
        return counter
    raise HTTPException(400, "action must be accept, reject or counter")


@router.post("/matches/{match_id}/rating")
def rate_match(match_id: int, body: RatingIn, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Five-star accountability rating for the other side of a match (one per match per rater; re-rating overwrites)."""
    m = get_match(session, me, match_id)
    ratee_id = m.seller_id if me.id == m.renter_id else m.renter_id
    role = "seller" if me.id == m.renter_id else "renter"
    r = session.exec(select(Rating).where(Rating.match_id == m.id, Rating.rater_id == me.id)).first()
    if r is None:
        r = Rating(match_id=m.id, rater_id=me.id, ratee_id=ratee_id, role=role, stars=body.stars, comment=body.comment.strip())
    else:
        r.stars, r.comment = body.stars, body.comment.strip()
    session.add(r)
    session.commit()
    session.refresh(r)
    return {"rating": r, "summary": user_rating(session, ratee_id, role)}


@router.get("/users/{user_id}/ratings")
def user_ratings(user_id: int, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(Rating).where(Rating.ratee_id == user_id).order_by(Rating.id.desc())).all()  # type: ignore[union-attr]
    users = {u.id: u for u in session.exec(select(User)).all()}
    return {
        "summary": user_rating(session, user_id),
        "as_seller": user_rating(session, user_id, "seller"),
        "as_renter": user_rating(session, user_id, "renter"),
        "reviews": [{**r.model_dump(), "rater_name": users[r.rater_id].name if r.rater_id in users else "Student"} for r in rows],
    }


@router.get("/users/{user_id}")
def user_detail(user_id: int, me: User = Depends(get_current_user), session: Session = Depends(get_session)):
    u = session.get(User, user_id)
    if u is None:
        raise HTTPException(404, "User not found")
    profile = session.exec(select(RenterProfile).where(RenterProfile.user_id == u.id)).first()
    return {**public_user(u), "profile": profile, "rating": user_rating(session, u.id),
            "rating_as_renter": user_rating(session, u.id, "renter"), "rating_as_seller": user_rating(session, u.id, "seller")}
