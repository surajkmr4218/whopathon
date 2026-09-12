from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import JSON, Column, UniqueConstraint
from sqlmodel import Field, SQLModel


def now() -> datetime:
    """Naive UTC timestamp (SQLite friendly)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(SQLModel, table=True):
    __tablename__ = "users"
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    password_hash: str
    university: str
    photo_url: str | None = None
    verified: bool = False
    mode: str | None = None  # renter | seller
    created_at: datetime = Field(default_factory=now)


class RenterProfile(SQLModel, table=True):
    __tablename__ = "renter_profiles"
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", unique=True, index=True)
    city: str
    university: str
    move_in: date
    move_out: date
    flexibility: str = "exact"  # exact | 3d | 1w | flexible
    max_budget: int
    max_distance_miles: float = 2.0
    furnished_pref: str = "none"  # required | preferred | none
    parking_pref: str = "none"
    housing_type: str = "any"  # any | room | apartment | house
    roommates_ok: bool = True
    active: bool = True
    updated_at: datetime = Field(default_factory=now)


class Listing(SQLModel, table=True):
    __tablename__ = "listings"
    id: int | None = Field(default=None, primary_key=True)
    seller_id: int = Field(foreign_key="users.id", index=True)
    title: str
    address: str
    city: str
    state: str
    zip: str
    university: str
    distance_miles: float
    housing_type: str = "apartment"  # room | apartment | house
    bedrooms: int = 1
    bathrooms: float = 1
    furnished: bool = False
    parking: bool = False
    roommates: int = 0
    amenities: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    description: str = ""
    available_from: date
    available_until: date
    monthly_rent: int  # seller's obligation
    asking_price: int
    previous_price: int | None = None
    utilities_cost: int = 0
    parking_cost: int = 0
    required_fees: int = 0
    urgency: str = "normal"  # normal | need_filled | urgent
    accepts_partial: bool = False
    square_feet: int = 0
    status: str = "active"  # draft | active | matched | closed
    created_at: datetime = Field(default_factory=now)


class ListingPhoto(SQLModel, table=True):
    __tablename__ = "listing_photos"
    id: int | None = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="listings.id", index=True)
    url: str
    position: int = 0


class Swipe(SQLModel, table=True):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("listing_id", "renter_id", "actor"),)
    id: int | None = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="listings.id", index=True)
    renter_id: int = Field(foreign_key="users.id", index=True)
    actor: str  # renter | seller
    direction: str  # like | pass
    created_at: datetime = Field(default_factory=now)


class SavedListing(SQLModel, table=True):
    __tablename__ = "saved_listings"
    __table_args__ = (UniqueConstraint("user_id", "listing_id"),)
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    listing_id: int = Field(foreign_key="listings.id")


class Match(SQLModel, table=True):
    __tablename__ = "matches"
    id: int | None = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="listings.id", index=True)
    renter_id: int = Field(foreign_key="users.id", index=True)
    seller_id: int = Field(foreign_key="users.id", index=True)
    status: str = "active"  # active | archived | closed
    created_at: datetime = Field(default_factory=now)


class Offer(SQLModel, table=True):
    __tablename__ = "offers"
    id: int | None = Field(default=None, primary_key=True)
    match_id: int = Field(foreign_key="matches.id", index=True)
    created_by: int = Field(foreign_key="users.id")
    monthly_price: int
    start_date: date
    end_date: date
    status: str = "pending"  # pending | accepted | rejected | countered
    created_at: datetime = Field(default_factory=now)


class Message(SQLModel, table=True):
    __tablename__ = "messages"
    id: int | None = Field(default=None, primary_key=True)
    match_id: int = Field(foreign_key="matches.id", index=True)
    sender_id: int = Field(foreign_key="users.id")
    body: str
    created_at: datetime = Field(default_factory=now)
    read_at: datetime | None = None


class Rating(SQLModel, table=True):
    """Five-star accountability rating one user leaves for another after a sublease/match."""
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("match_id", "rater_id"),)
    id: int | None = Field(default=None, primary_key=True)
    match_id: int | None = Field(default=None, foreign_key="matches.id", index=True)  # None for seeded past subleases
    rater_id: int = Field(foreign_key="users.id", index=True)
    ratee_id: int = Field(foreign_key="users.id", index=True)
    role: str  # role of the ratee: renter | seller
    stars: int
    comment: str = ""
    created_at: datetime = Field(default_factory=now)


class Meta(SQLModel, table=True):
    __tablename__ = "meta"
    key: str = Field(primary_key=True)
    value: str
