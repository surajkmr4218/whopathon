"""Request bodies. Responses are built as plain dicts/dataclasses in the routers (see services.py)."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, EmailStr, Field, model_validator


class SignupIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=4)
    university: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MeUpdate(BaseModel):
    mode: str | None = None
    name: str | None = None
    photo_url: str | None = None


class RenterProfileIn(BaseModel):
    city: str
    university: str
    move_in: date
    move_out: date
    flexibility: str = "exact"
    max_budget: int = Field(gt=0)
    max_distance_miles: float = Field(default=2.0, ge=0.5)
    furnished_pref: str = "none"
    parking_pref: str = "none"
    housing_type: str = "any"
    roommates_ok: bool = True

    @model_validator(mode="after")
    def check_dates(self):
        if self.move_out <= self.move_in:
            raise ValueError("move_out must be after move_in")
        return self


class ListingIn(BaseModel):
    title: str
    address: str
    city: str
    state: str
    zip: str
    university: str
    distance_miles: float = Field(ge=0)
    housing_type: str = "apartment"
    bedrooms: int = 1
    bathrooms: float = 1
    furnished: bool = False
    parking: bool = False
    roommates: int = 0
    amenities: list[str] = []
    description: str = ""
    available_from: date
    available_until: date
    monthly_rent: int = Field(gt=0)
    asking_price: int = Field(gt=0)
    utilities_cost: int = 0
    parking_cost: int = 0
    required_fees: int = 0
    urgency: str = "normal"
    accepts_partial: bool = False

    @model_validator(mode="after")
    def check_dates(self):
        if self.available_until <= self.available_from:
            raise ValueError("available_until must be after available_from")
        return self


class ListingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    asking_price: int | None = None
    furnished: bool | None = None
    parking: bool | None = None
    available_from: date | None = None
    available_until: date | None = None
    urgency: str | None = None
    accepts_partial: bool | None = None
    status: str | None = None
    amenities: list[str] | None = None
    utilities_cost: int | None = None
    parking_cost: int | None = None
    required_fees: int | None = None


class ApplyPriceIn(BaseModel):
    price: int = Field(gt=0)


class SwipeIn(BaseModel):
    listing_id: int
    renter_id: int | None = None
    direction: str  # like | pass


class MessageIn(BaseModel):
    body: str = Field(min_length=1)


class OfferIn(BaseModel):
    monthly_price: int = Field(gt=0)
    start_date: date
    end_date: date


class OfferRespondIn(BaseModel):
    action: str  # accept | reject | counter
    monthly_price: int | None = None
    start_date: date | None = None
    end_date: date | None = None
