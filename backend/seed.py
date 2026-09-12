"""Deterministic seed. All dates are relative to `today` so the demo numbers stay true.

Demo login: demo@osu.edu / password (has BOTH a renter profile and the hero listing).
Every other seeded account also uses password "password".
"""
from __future__ import annotations

from datetime import date, timedelta

from sqlmodel import Session, select

from auth import hash_password
from models import Listing, ListingPhoto, Match, Message, Meta, Offer, RenterProfile, Swipe, User

OSU, MICH, PURDUE = "Ohio State", "Michigan", "Purdue"

PHOTOS = [
    "photo-1522708323590-d24dbb6b0267", "photo-1502672260266-1c1ef2d93688", "photo-1484154218962-a197022b5858",
    "photo-1493809842364-78817add7ffb", "photo-1560448204-e02f11c3d0e2", "photo-1502005229762-cf1b2da7c5d6",
    "photo-1536376072261-38c75010e6c9", "photo-1512917774080-9991f1c4c750", "photo-1515263487990-61b07b8e8b0c",
    "photo-1567767292278-a4f21aa2d36e", "photo-1556912172-45b7abe8b7e1", "photo-1554995207-c18c203602cb",
    "photo-1505693416388-ac5ce068fe85", "photo-1540518614846-7eded433c457", "photo-1513694203232-719a280e022f",
]


def photo(i: int) -> str:
    return f"https://images.unsplash.com/{PHOTOS[i % len(PHOTOS)]}?w=800&q=80"


def avatar(seed: str) -> str:
    return f"https://api.dicebear.com/9.x/notionists/png?seed={seed}&size=200"


def seed_date(session: Session) -> str | None:
    row = session.get(Meta, "seed_date")
    return row.value if row else None


def run(session: Session, today: date | None = None) -> None:
    today = today or date.today()
    T = lambda d: today + timedelta(days=d)  # noqa: E731
    pw = hash_password("password")

    def user(name: str, email: str, uni: str, mode: str | None = None) -> User:
        u = User(name=name, email=email, password_hash=pw, university=uni, verified=email.endswith(".edu"), mode=mode, photo_url=avatar(name.split()[0]))
        session.add(u)
        session.flush()
        return u

    def profile(u: User, city: str, uni: str, mi: int, mo: int, budget: int, flex: str = "exact", dist: float = 2.0,
                furn: str = "preferred", park: str = "none", htype: str = "any", rm: bool = True) -> RenterProfile:
        p = RenterProfile(user_id=u.id, city=city, university=uni, move_in=T(mi), move_out=T(mo), flexibility=flex, max_budget=budget,
                          max_distance_miles=dist, furnished_pref=furn, parking_pref=park, housing_type=htype, roommates_ok=rm)
        session.add(p)
        session.flush()
        return p

    def listing(seller: User, title: str, uni: str, city: str, state: str, zip_: str, dist: float, fr: int, until: int, rent: int,
                asking: int, urgency: str = "normal", htype: str = "apartment", bd: int = 1, ba: float = 1, furn: bool = True,
                park: bool = False, rm: int = 0, util: int = 50, pcost: int = 0, fees: int = 0, prev: int | None = None,
                amenities: list[str] | None = None, photos: tuple[int, ...] = (0, 1), desc: str = "", partial: bool = False) -> Listing:
        l = Listing(seller_id=seller.id, title=title, address=f"{100 + seller.id * 7} College Ave", city=city, state=state, zip=zip_,
                    university=uni, distance_miles=dist, housing_type=htype, bedrooms=bd, bathrooms=ba, furnished=furn, parking=park,
                    roommates=rm, amenities=amenities or ["WiFi included", "AC"], description=desc, available_from=T(fr), available_until=T(until),
                    monthly_rent=rent, asking_price=asking, previous_price=prev, utilities_cost=util, parking_cost=pcost, required_fees=fees,
                    urgency=urgency, accepts_partial=partial, status="active")
        session.add(l)
        session.flush()
        for pos, idx in enumerate(photos):
            session.add(ListingPhoto(listing_id=l.id, url=photo(idx), position=pos))
        return l

    # ---- demo account: renter profile + hero listing ----
    demo = user("Maya Thompson", "demo@osu.edu", OSU, mode="renter")
    profile(demo, "Columbus", OSU, 20, 80, 1000, flex="3d", dist=1.5, furn="preferred", park="none")
    hero = listing(
        demo, "Sunny 1BR steps from the Oval", OSU, "Columbus", "OH", "43201", 0.4, 9, 101, 1100, 1050, urgency="urgent",
        furn=True, park=True, util=60, amenities=["In-unit laundry", "AC", "WiFi included", "Gym"], photos=(0, 3, 4),
        desc="Bright one-bedroom two blocks from campus. Leaving for a summer internship and need to cover my lease.",
    )

    # ---- other sellers + listings ----
    rachel = user("Rachel Green", "rachel@osu.edu", OSU, mode="seller")
    l2 = listing(rachel, "Cozy studio on Neil Ave", OSU, "Columbus", "OH", "43201", 1.5, 15, 90, 1000, 950, urgency="need_filled",
                 furn=True, park=True, util=40, amenities=["AC", "WiFi included", "Dishwasher"], photos=(1, 5), desc="Quiet studio with everything you need for the summer.")
    sam = user("Sam Okafor", "sam@osu.edu", OSU, mode="seller")
    l3 = listing(sam, "Room in 3BR house near High St", OSU, "Columbus", "OH", "43202", 0.9, 5, 95, 950, 900, urgency="normal", htype="room",
                 bd=3, ba=2, furn=False, park=True, rm=2, util=45, prev=1000, amenities=["Backyard", "Washer/Dryer", "WiFi included"], photos=(6, 7),
                 desc="Chill roommates, big backyard. Price just dropped.")
    l4 = listing(sam, "Modern 2BR at The Wellington", OSU, "Columbus", "OH", "43201", 0.7, 12, 100, 1250, 1200, urgency="normal", bd=2, ba=2,
                 furn=True, park=True, util=70, pcost=50, amenities=["Pool", "Gym", "In-unit laundry", "AC"], photos=(8, 9, 10))
    dana = user("Dana Whitfield", "dana@osu.edu", OSU, mode="seller")
    l5 = listing(dana, "Bright apartment on Lane Ave", OSU, "Columbus", "OH", "43201", 1.1, 20, 110, 1050, 1000, urgency="need_filled", furn=True,
                 park=False, util=55, amenities=["AC", "WiFi included", "Balcony"], photos=(11, 12))
    l6 = listing(dana, "Basement room, utilities included", OSU, "Columbus", "OH", "43202", 1.8, 0, 120, 900, 800, urgency="normal", htype="room",
                 bd=1, furn=True, park=True, rm=1, util=0, amenities=["Utilities included", "WiFi included"], photos=(13,))
    chris = user("Chris Park", "chris@osu.edu", OSU, mode="seller")
    l7 = listing(chris, "Loft near Short North", OSU, "Columbus", "OH", "43215", 2.2, 30, 100, 1150, 1100, urgency="urgent", furn=True, park=False,
                 util=65, fees=75, amenities=["Rooftop", "AC", "In-unit laundry"], photos=(14, 0), desc="Walkable to everything. Required $75 move-in fee.")
    l8 = listing(chris, "Sublet in 4BR townhouse", OSU, "Columbus", "OH", "43201", 0.6, 9, 70, 925, 875, urgency="need_filled", htype="house",
                 bd=4, ba=2, furn=False, park=True, rm=3, util=40, amenities=["Washer/Dryer", "Backyard"], photos=(2, 6))
    jess = user("Jess Alvarez", "jess@umich.edu", MICH, mode="seller")
    l9 = listing(jess, "Studio near the Diag", MICH, "Ann Arbor", "MI", "48104", 0.5, 10, 95, 1100, 1050, urgency="need_filled", furn=True,
                 park=False, util=50, amenities=["AC", "WiFi included"], photos=(3, 8))
    l10 = listing(jess, "Room in Kerrytown house", MICH, "Ann Arbor", "MI", "48104", 1.2, 14, 100, 850, 800, urgency="normal", htype="room",
                  bd=3, furn=False, park=True, rm=2, util=40, amenities=["Porch", "Washer/Dryer"], photos=(7, 12))
    tyler = user("Tyler Brooks", "tyler@purdue.edu", PURDUE, mode="seller")
    l11 = listing(tyler, "1BR at Chauncey Square", PURDUE, "West Lafayette", "IN", "47906", 0.3, 12, 90, 950, 900, urgency="urgent", furn=True,
                  park=True, util=45, amenities=["Gym", "AC", "WiFi included"], photos=(9, 4))
    l12 = listing(tyler, "Room in quiet 2BR", PURDUE, "West Lafayette", "IN", "47906", 1.4, 20, 110, 700, 650, urgency="normal", htype="room",
                  bd=2, furn=True, park=False, rm=1, util=30, amenities=["WiFi included"], photos=(5,))
    l13 = listing(rachel, "Shared 2BR, own room", OSU, "Columbus", "OH", "43201", 1.0, 40, 130, 1000, 950, urgency="normal", htype="room",
                  bd=2, furn=True, park=False, rm=1, util=45, amenities=["AC", "WiFi included", "Dishwasher"], photos=(10, 13))

    # ---- renters (OSU heavy; tuned for the demo numbers) ----
    alex = user("Alex Chen", "alex@osu.edu", OSU, mode="renter")
    profile(alex, "Columbus", OSU, 12, 95, 1100, flex="3d", dist=1.0, furn="preferred", park="preferred", htype="apartment")
    priya = user("Priya Patel", "priya@osu.edu", OSU, mode="renter")
    profile(priya, "Columbus", OSU, 12, 50, 900, flex="exact", dist=1.5, furn="preferred", park="none")
    marcus = user("Marcus Johnson", "marcus@osu.edu", OSU, mode="renter")
    profile(marcus, "Columbus", OSU, 51, 100, 950, flex="3d", dist=2.0, furn="required", park="none")
    sofia = user("Sofia Rossi", "sofia@osu.edu", OSU, mode="renter")
    profile(sofia, "Columbus", OSU, 9, 101, 1250, flex="1w", dist=1.0, furn="required", park="required", htype="apartment")
    jordan = user("Jordan Lee", "jordan@osu.edu", OSU, mode="renter")
    profile(jordan, "Columbus", OSU, 20, 80, 875, flex="flexible", dist=2.5, furn="none", park="none", rm=False)
    emma = user("Emma Wilson", "emma@osu.edu", OSU, mode="renter")
    profile(emma, "Columbus", OSU, 30, 101, 1000, flex="3d", dist=1.5, furn="preferred", park="required")
    liam = user("Liam Nguyen", "liam@osu.edu", OSU, mode="renter")
    profile(liam, "Columbus", OSU, 5, 70, 925, flex="1w", dist=2.0, furn="none", park="none", htype="room")
    ava = user("Ava Martinez", "ava@osu.edu", OSU, mode="renter")
    profile(ava, "Columbus", OSU, 45, 120, 1150, flex="3d", dist=1.0, furn="preferred", park="preferred")
    noah = user("Noah Kim", "noah@osu.edu", OSU, mode="renter")
    profile(noah, "Columbus", OSU, 9, 55, 800, flex="flexible", dist=3.0, furn="none", park="none")
    olivia = user("Olivia Brown", "olivia@osu.edu", OSU, mode="renter")
    profile(olivia, "Columbus", OSU, 62, 101, 975, flex="1w", dist=1.5, furn="preferred", park="none")
    ethan = user("Ethan Davis", "ethan@umich.edu", MICH, mode="renter")
    profile(ethan, "Ann Arbor", MICH, 15, 90, 1000, flex="3d", dist=1.0, furn="preferred", park="none")
    mia = user("Mia Garcia", "mia@purdue.edu", PURDUE, mode="renter")
    profile(mia, "West Lafayette", PURDUE, 10, 80, 850, flex="exact", dist=1.0, furn="required", park="none")
    zoe = user("Zoe Carter", "zoe@gmail.com", OSU, mode="renter")  # unverified (non-.edu)
    profile(zoe, "Columbus", OSU, 25, 90, 1050, flex="3d", dist=2.0, furn="preferred", park="none")

    # ---- swipes / matches / messages / offers ----
    # Alex already liked the hero listing -> seller right-swipe creates an instant match in the demo.
    session.add(Swipe(listing_id=hero.id, renter_id=alex.id, actor="renter", direction="like"))
    # Emma <-> hero: mutual match with a pending offer (seller inbox is not empty).
    session.add(Swipe(listing_id=hero.id, renter_id=emma.id, actor="renter", direction="like"))
    session.add(Swipe(listing_id=hero.id, renter_id=emma.id, actor="seller", direction="like"))
    m1 = Match(listing_id=hero.id, renter_id=emma.id, seller_id=demo.id)
    session.add(m1)
    session.flush()
    session.add(Message(match_id=m1.id, sender_id=emma.id, body="Hi Maya! Your place looks perfect for my summer research position. Is parking really included?"))
    session.add(Message(match_id=m1.id, sender_id=demo.id, body="Yes! One reserved spot in the back lot. When would you want to move in?"))
    session.add(Offer(match_id=m1.id, created_by=emma.id, monthly_price=1000, start_date=T(30), end_date=T(101), status="pending"))
    # Demo renter <-> Sam's Wellington listing: match with a message (renter inbox is not empty).
    session.add(Swipe(listing_id=l4.id, renter_id=demo.id, actor="renter", direction="like"))
    session.add(Swipe(listing_id=l4.id, renter_id=demo.id, actor="seller", direction="like"))
    m2 = Match(listing_id=l4.id, renter_id=demo.id, seller_id=sam.id)
    session.add(m2)
    session.flush()
    session.add(Message(match_id=m2.id, sender_id=sam.id, body="Hey Maya, thanks for the interest! Happy to do a video tour this week."))
    # Jordan passed on Rachel's studio (proves passes persist and are excluded).
    session.add(Swipe(listing_id=l2.id, renter_id=jordan.id, actor="renter", direction="pass"))

    session.merge(Meta(key="seed_date", value=today.isoformat()))
    session.commit()


def ensure_seeded(keep: bool = False) -> bool:
    """Seed on first run. Re-seed when the seed date changes so relative dates stay fresh (unless keep=True)."""
    from database import create_db, drop_db, engine

    create_db()
    with Session(engine) as s:
        row = s.get(Meta, "seed_date")
        if row is None:
            run(s)
            return True
        if keep or row.value == date.today().isoformat():
            return False
    drop_db()
    create_db()
    with Session(engine) as s:
        run(s)
    return True
