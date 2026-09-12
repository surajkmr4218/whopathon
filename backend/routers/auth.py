from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from auth import create_token, get_current_user, hash_password, verify_password
from database import get_session
from models import Listing, RenterProfile, User
from schemas import LoginIn, MeUpdate, SignupIn
from services import public_user

router = APIRouter(prefix="/auth", tags=["auth"])


def me_payload(session: Session, user: User) -> dict:
    profile = session.exec(select(RenterProfile).where(RenterProfile.user_id == user.id)).first()
    listing = session.exec(select(Listing).where(Listing.seller_id == user.id, Listing.status != "closed").order_by(Listing.id.desc())).first()  # type: ignore[union-attr]
    return {"user": public_user(user), "has_renter_profile": profile is not None, "listing_id": listing.id if listing else None}


@router.post("/signup")
def signup(body: SignupIn, session: Session = Depends(get_session)):
    email = body.email.lower()
    if session.exec(select(User).where(User.email == email)).first():
        raise HTTPException(400, "An account with that email already exists")
    user = User(name=body.name, email=email, password_hash=hash_password(body.password), university=body.university,
                verified=email.endswith(".edu"), photo_url=f"https://api.dicebear.com/9.x/notionists/png?seed={body.name.split()[0]}&size=200")
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"token": create_token(user.id), **me_payload(session, user)}


@router.post("/login")
def login(body: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_token(user.id), **me_payload(session, user)}


@router.get("/me")
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return me_payload(session, user)


@router.patch("/me")
def update_me(body: MeUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if body.mode is not None:
        if body.mode not in ("renter", "seller"):
            raise HTTPException(400, "mode must be renter or seller")
        user.mode = body.mode
    if body.name:
        user.name = body.name
    if body.photo_url:
        user.photo_url = body.photo_url
    session.add(user)
    session.commit()
    session.refresh(user)
    return me_payload(session, user)
