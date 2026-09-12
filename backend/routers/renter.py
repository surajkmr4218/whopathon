
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import get_current_user
from database import get_session
from models import now, Listing, RenterProfile, SavedListing, User
from schemas import RenterProfileIn
from services import discover_cards, listing_card, to_listing_input, to_renter_input
from engine import scoring

router = APIRouter(prefix="/renter", tags=["renter"])


def get_profile(session: Session, user: User) -> RenterProfile:
    p = session.exec(select(RenterProfile).where(RenterProfile.user_id == user.id)).first()
    if p is None:
        raise HTTPException(404, "Create your renter profile first")
    return p


@router.get("/profile")
def profile(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return get_profile(session, user)


@router.put("/profile")
def upsert_profile(body: RenterProfileIn, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    p = session.exec(select(RenterProfile).where(RenterProfile.user_id == user.id)).first()
    if p is None:
        p = RenterProfile(user_id=user.id, **body.model_dump())
    else:
        for k, v in body.model_dump().items():
            setattr(p, k, v)
        p.updated_at = now()
    if user.mode is None:
        user.mode = "renter"
        session.add(user)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


@router.get("/discover")
def discover(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Core 2: ranked listing cards for this renter, minus anything already swiped."""
    return discover_cards(session, user, get_profile(session, user))


@router.get("/saved")
def saved(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    p = get_profile(session, user)
    r = to_renter_input(p, user)
    rows = session.exec(select(Listing).join(SavedListing, SavedListing.listing_id == Listing.id).where(SavedListing.user_id == user.id)).all()
    return [listing_card(session, l, scoring.score(r, to_listing_input(l))) for l in rows]


@router.post("/saved/{listing_id}")
def save(listing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if session.get(Listing, listing_id) is None:
        raise HTTPException(404, "Listing not found")
    if not session.exec(select(SavedListing).where(SavedListing.user_id == user.id, SavedListing.listing_id == listing_id)).first():
        session.add(SavedListing(user_id=user.id, listing_id=listing_id))
        session.commit()
    return {"saved": True}


@router.delete("/saved/{listing_id}")
def unsave(listing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    row = session.exec(select(SavedListing).where(SavedListing.user_id == user.id, SavedListing.listing_id == listing_id)).first()
    if row:
        session.delete(row)
        session.commit()
    return {"saved": False}
