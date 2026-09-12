import os
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from engine import demand, scoring
from models import Listing, ListingPhoto, RenterProfile, User
from schemas import ApplyPriceIn, ListingIn, ListingUpdate
from services import (dashboard, listing_card, partial_fill_options, photos_for, renter_inputs, reverse_match_cards,
                      to_listing_input, to_renter_input)

router = APIRouter(tags=["listings"])
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")


def owned_listing(session: Session, user: User, listing_id: int) -> Listing:
    l = session.get(Listing, listing_id)
    if l is None:
        raise HTTPException(404, "Listing not found")
    if l.seller_id != user.id:
        raise HTTPException(403, "Not your listing")
    return l


@router.get("/listings/mine")
def mine(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rows = session.exec(select(Listing).where(Listing.seller_id == user.id).order_by(Listing.id.desc())).all()  # type: ignore[union-attr]
    return [listing_card(session, l, None) for l in rows]


@router.post("/listings")
def create(body: ListingIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    l = Listing(seller_id=user.id, **body.model_dump())
    session.add(l)
    if user.mode is None:
        user.mode = "seller"
        session.add(user)
    session.commit()
    session.refresh(l)
    _, cards = reverse_match_cards(session, l)
    compatible = sum(1 for c in cards if c["score"].overall >= scoring.COMPATIBLE_THRESHOLD)
    return {**listing_card(session, l, None), "compatible_count": compatible}


@router.get("/listings/{listing_id}")
def detail(listing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    l = session.get(Listing, listing_id)
    if l is None:
        raise HTTPException(404, "Listing not found")
    score = None
    p = session.exec(select(RenterProfile).where(RenterProfile.user_id == user.id)).first()
    if p is not None and l.seller_id != user.id:
        score = scoring.score(to_renter_input(p, user), to_listing_input(l))
    return listing_card(session, l, score)


@router.patch("/listings/{listing_id}")
def update(listing_id: int, body: ListingUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    l = owned_listing(session, user, listing_id)
    data = body.model_dump(exclude_unset=True)
    if "asking_price" in data and data["asking_price"] < l.asking_price:
        l.previous_price = l.asking_price
    for k, v in data.items():
        setattr(l, k, v)
    session.add(l)
    session.commit()
    session.refresh(l)
    return listing_card(session, l, None)


@router.post("/listings/{listing_id}/photos")
async def upload_photo(listing_id: int, request: Request, file: UploadFile = File(...), user: User = Depends(get_current_user),
                       session: Session = Depends(get_session)):
    l = owned_listing(session, user, listing_id)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOAD_DIR, name), "wb") as fh:
        fh.write(await file.read())
    url = f"{str(request.base_url).rstrip('/')}/uploads/{name}"
    position = len(photos_for(session, l.id))
    photo = ListingPhoto(listing_id=l.id, url=url, position=position)
    session.add(photo)
    session.commit()
    return {"url": url, "position": position}


@router.get("/listings/{listing_id}/renters")
def renters(listing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Core 3: Reverse Matching deck — every active renter scored against this listing."""
    l = owned_listing(session, user, listing_id)
    compatible, cards = reverse_match_cards(session, l)
    return {"count": compatible, "cards": cards}


@router.get("/listings/{listing_id}/dashboard")
def seller_dashboard(listing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    l = owned_listing(session, user, listing_id)
    return dashboard(session, l, date.today())


@router.post("/listings/{listing_id}/apply-price")
def apply_price(listing_id: int, body: ApplyPriceIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Core 1: the seller must explicitly accept a price change."""
    l = owned_listing(session, user, listing_id)
    if body.price < l.asking_price:
        l.previous_price = l.asking_price
    l.asking_price = body.price
    session.add(l)
    session.commit()
    session.refresh(l)
    return listing_card(session, l, None)


@router.get("/listings/{listing_id}/partial-fill")
def partial_fill(listing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Core 4: real multi-renter combinations computed from renter date windows."""
    l = owned_listing(session, user, listing_id)
    users = {u.id: u for u in session.exec(select(User)).all()}
    options = partial_fill_options(session, l)
    out = []
    for o in options:
        members = []
        for m in o.members:
            u = users[m.renter_id]
            members.append({**m.__dict__, "photo_url": u.photo_url, "university": u.university, "verified": u.verified})
        out.append({**o.__dict__, "members": members})
    return {"listing": l, "options": out}


@router.get("/demand")
def demand_report(university: str | None = None, listing_id: int | None = None, user: User = Depends(get_current_user),
                  session: Session = Depends(get_session)):
    """Core 5: demand intelligence aggregated from active renter profiles."""
    li = None
    if listing_id is not None:
        l = session.get(Listing, listing_id)
        if l is None:
            raise HTTPException(404, "Listing not found")
        li = to_listing_input(l)
        university = university or l.university
    university = university or user.university
    return demand.aggregate(renter_inputs(session), university, date.today(), li)
