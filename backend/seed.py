"""Deterministic seed. All dates are relative to `today` so the demo numbers stay true.

Demo logins (password "password"):
  renter@osu.edu  - Riley Cooper, renter profile tuned for ~96% top matches
  seller@osu.edu  - Maya Thompson, owns the hero listing (urgency pricing / partial-fill demo)
Every other seeded account also uses password "password".
"""
from __future__ import annotations

from datetime import date, timedelta

from sqlmodel import Session, select

from auth import hash_password
from models import Listing, ListingPhoto, Match, Message, Meta, Offer, Rating, RenterProfile, Swipe, User

SEED_VERSION = "4"  # bump to force a re-seed on next startup

OSU, MICH, PURDUE = "Ohio State", "Michigan", "Purdue"

PHOTOS = [  # verified Unsplash house/apartment photos
    "photo-1522708323590-d24dbb6b0267", "photo-1502672260266-1c1ef2d93688", "photo-1484154218962-a197022b5858",
    "photo-1493809842364-78817add7ffb", "photo-1560448204-e02f11c3d0e2", "photo-1502005229762-cf1b2da7c5d6",
    "photo-1536376072261-38c75010e6c9", "photo-1512917774080-9991f1c4c750", "photo-1567767292278-a4f21aa2d36e",
    "photo-1556912172-45b7abe8b7e1", "photo-1554995207-c18c203602cb", "photo-1505693416388-ac5ce068fe85",
    "photo-1540518614846-7eded433c457", "photo-1513694203232-719a280e022f", "photo-1564013799919-ab600027ffc6",
    "photo-1570129477492-45c003edd2be", "photo-1568605114967-8130f3a36994", "photo-1580587771525-78b9dba3b914",
    "photo-1600596542815-ffad4c1539a9", "photo-1600585154340-be6161a56a0c", "photo-1600607687939-ce8a6c25118c",
    "photo-1600566753190-17f0baa2a6c3", "photo-1600047509807-ba8f99d2cdde", "photo-1600566753086-00f18fb6b3ea",
    "photo-1600210492486-724fe5c67fb0", "photo-1600573472592-401b489a3cdc", "photo-1600585152220-90363fe7e115",
    "photo-1600607687644-c7171b42498f", "photo-1598928506311-c55ded91a20c", "photo-1586023492125-27b2c045efd7",
    "photo-1616486338812-3dadae4b4ace", "photo-1616594039964-ae9021a400a0", "photo-1615874959474-d609969a20ed",
    "photo-1583847268964-b28dc8f51f92", "photo-1588854337115-1c67d9247e4d", "photo-1560185007-cde436f6a4d0",
    "photo-1560185127-6ed189bf02f4", "photo-1560184897-ae75f418493e", "photo-1560185893-a55cbc8c57e8",
    "photo-1522771739844-6a9f6d5f14af", "photo-1524758631624-e2822e304c36", "photo-1501183638710-841dd1904471",
    "photo-1499916078039-922301b0eb9b", "photo-1505691938895-1758d7feb511", "photo-1484101403633-562f891dc89a",
    "photo-1460317442991-0ec209397118", "photo-1545324418-cc1a3fa10c00", "photo-1502224562085-639556652f33",
    "photo-1523217582562-09d0def993a6", "photo-1605276374104-dee2a0ed3cd6", "photo-1605146769289-440113cc3d00",
    "photo-1592595896551-12b371d546d5", "photo-1613977257363-707ba9348227", "photo-1613490493576-7fde63acd811",
    "photo-1512918728675-ed5a9ecdebfd", "photo-1519643381401-22c77e60520e", "photo-1493663284031-b7e3aefcae8e",
    "photo-1556909114-f6e7ad7d3136", "photo-1556911220-bff31c812dba", "photo-1558211583-d26f610c1eb1",
    "photo-1600121848594-d8644e57abab", "photo-1600047508788-786f3865b4b9", "photo-1600585154526-990dced4db0d",
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
                amenities: list[str] | None = None, photos: tuple[int, ...] = (0, 1), desc: str = "", partial: bool = False, sqft: int | None = None) -> Listing:
        if sqft is None:  # deterministic, plausible size by type
            jitter = (len(title) * 13 + seller.id * 7) % 60
            sqft = {"room": 140, "house": 220 * max(bd, 1)}.get(htype, 380 if bd == 0 else 560 + 190 * (bd - 1)) + jitter
        l = Listing(seller_id=seller.id, title=title, square_feet=sqft, address=f"{100 + seller.id * 7} College Ave", city=city, state=state, zip=zip_,
                    university=uni, distance_miles=dist, housing_type=htype, bedrooms=bd, bathrooms=ba, furnished=furn, parking=park,
                    roommates=rm, amenities=amenities or ["WiFi included", "AC"], description=desc, available_from=T(fr), available_until=T(until),
                    monthly_rent=rent, asking_price=asking, previous_price=prev, utilities_cost=util, parking_cost=pcost, required_fees=fees,
                    urgency=urgency, accepts_partial=partial, status="active")
        session.add(l)
        session.flush()
        for pos, idx in enumerate(photos):
            session.add(ListingPhoto(listing_id=l.id, url=photo(idx), position=pos))
        return l

    # ---- demo accounts: a seller who owns the hero listing, and a renter tuned for the swipe demo ----
    demo = user("Maya Thompson", "seller@osu.edu", OSU, mode="seller")
    demo_renter = user("Riley Cooper", "renter@osu.edu", OSU, mode="renter")
    profile(demo_renter, "Columbus", OSU, 20, 80, 1000, flex="3d", dist=1.5, furn="preferred", park="none")
    hero = listing(
        demo, "Sunny 1BR steps from the Oval", OSU, "Columbus", "OH", "43201", 0.4, 9, 101, 1100, 1050, urgency="urgent",
        furn=True, park=True, util=60, amenities=["In-unit laundry", "AC", "WiFi included", "Gym"], photos=(0, 3, 4),
        desc="Bright one-bedroom two blocks from campus. Leaving for a summer internship and need to cover my lease.", sqft=720,
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


    # ---- more listings so the Discover deck is deep (mostly OSU, dates overlap the demo renter) ----
    more_sellers = [user(n, e, u, mode="seller") for n, e, u in [
        ("Nina Kowalski", "nina@osu.edu", OSU), ("Omar Haddad", "omar@osu.edu", OSU), ("Grace Liu", "grace@osu.edu", OSU),
        ("Ben Carter", "ben@osu.edu", OSU), ("Leah Fischer", "leah@osu.edu", OSU), ("Diego Ramos", "diego@osu.edu", OSU),
        ("Hannah Moore", "hannah@umich.edu", MICH), ("Kai Tanaka", "kai@purdue.edu", PURDUE),
    ]]
    S = {u.name.split()[0]: u for u in more_sellers}
    # (seller, title, uni, city, state, zip, dist, from, until, rent, asking, urgency, type, bd, ba, furn, park, roommates, util, pcost, fees, prev, amenities, desc)
    MORE = [
        (S["Nina"], "Top-floor 1BR with campus views", OSU, "Columbus", "OH", "43201", 0.5, 14, 98, 1150, 1100, "need_filled", "apartment", 1, 1, True, False, 0, 60, 0, 0, None, ["AC", "In-unit laundry", "WiFi included"], "Big windows, tons of light, 5 min walk to the Union."),
        (S["Nina"], "Room in renovated Victorian", OSU, "Columbus", "OH", "43201", 0.8, 10, 95, 900, 850, "normal", "room", 4, 2, True, True, 3, 40, 0, 0, None, ["Porch", "Washer/Dryer", "Backyard"], "Historic house, chill housemates, huge porch."),
        (S["Omar"], "Studio above the coffee shop", OSU, "Columbus", "OH", "43201", 0.3, 20, 90, 1000, 950, "urgent", "apartment", 0, 1, True, False, 0, 45, 0, 0, None, ["AC", "WiFi included"], "You will smell espresso every morning. Worth it."),
        (S["Omar"], "2BR near Lane Ave garage", OSU, "Columbus", "OH", "43201", 0.9, 5, 100, 1300, 1250, "normal", "apartment", 2, 2, True, True, 1, 70, 40, 0, None, ["Gym", "AC", "Dishwasher", "In-unit laundry"], "Own room and bath in a modern 2BR. Roommate is a quiet grad student."),
        (S["Grace"], "Sunny room in Clintonville house", OSU, "Columbus", "OH", "43202", 2.4, 12, 96, 800, 725, "need_filled", "room", 3, 1.5, False, True, 2, 40, 0, 0, 800, ["Backyard", "Washer/Dryer"], "Bike-friendly, close to the bus line. Price dropped!"),
        (S["Grace"], "Furnished 1BR on Chittenden", OSU, "Columbus", "OH", "43201", 0.4, 18, 92, 1000, 975, "urgent", "apartment", 1, 1, True, False, 0, 55, 0, 0, None, ["AC", "WiFi included", "Balcony"], "Leaving for a co-op in Seattle. Everything stays."),
        (S["Ben"], "Loft-style studio in Italian Village", OSU, "Columbus", "OH", "43215", 1.9, 25, 105, 1200, 1150, "normal", "apartment", 0, 1, True, True, 0, 65, 0, 50, None, ["Rooftop", "Gym", "In-unit laundry"], "Exposed brick, 12-ft ceilings, rooftop deck."),
        (S["Ben"], "Bedroom in 5BR house on Indianola", OSU, "Columbus", "OH", "43201", 0.7, 9, 101, 750, 700, "need_filled", "room", 5, 2, False, True, 4, 35, 0, 0, None, ["Backyard", "Washer/Dryer", "WiFi included"], "Classic campus house. Cheapest room on the street."),
        (S["Leah"], "Quiet 1BR by the river trail", OSU, "Columbus", "OH", "43212", 2.8, 15, 110, 1100, 1050, "normal", "apartment", 1, 1, True, True, 0, 60, 0, 0, None, ["AC", "Balcony", "Dishwasher"], "Run the Olentangy trail from your front door."),
        (S["Leah"], "Shared 2BR, furnished room", OSU, "Columbus", "OH", "43201", 1.2, 20, 85, 950, 900, "need_filled", "room", 2, 1, True, False, 1, 45, 0, 0, None, ["AC", "WiFi included"], "Roommate is a nursing student, rarely home."),
        (S["Diego"], "Modern 1BR at Gateway", OSU, "Columbus", "OH", "43201", 0.6, 10, 100, 1350, 1300, "normal", "apartment", 1, 1, True, True, 0, 75, 50, 0, None, ["Pool", "Gym", "In-unit laundry", "AC"], "Luxury building right on High St."),
        (S["Diego"], "Basement studio, private entrance", OSU, "Columbus", "OH", "43202", 1.6, 8, 98, 850, 800, "urgent", "apartment", 0, 1, True, True, 0, 0, 0, 0, None, ["Utilities included", "WiFi included"], "All utilities included. Cool in summer."),
        (rachel, "Room in townhouse on 4th St", OSU, "Columbus", "OH", "43201", 1.0, 22, 95, 900, 875, "normal", "room", 3, 2.5, False, True, 2, 40, 0, 0, None, ["Washer/Dryer", "Dishwasher"], "Two friendly roommates, both engineers."),
        (sam, "Bright 2BR with balcony", OSU, "Columbus", "OH", "43201", 1.3, 12, 102, 1250, 1200, "need_filled", "apartment", 2, 1, True, False, 1, 70, 0, 0, 1275, ["Balcony", "AC", "WiFi included"], "Whole apartment; you'd share with one roommate."),
        (dana, "Cozy attic room near Weinland Park", OSU, "Columbus", "OH", "43201", 0.9, 14, 90, 700, 650, "urgent", "room", 4, 1, True, False, 3, 30, 0, 0, None, ["WiFi included"], "Small but cheap and 10 min from campus."),
        (chris, "1BR garden apartment", OSU, "Columbus", "OH", "43202", 1.7, 16, 100, 1000, 950, "normal", "apartment", 1, 1, False, True, 0, 55, 0, 0, None, ["Backyard", "AC"], "Ground floor with a little patio."),
        (S["Nina"], "Studio in the Short North", OSU, "Columbus", "OH", "43215", 2.1, 20, 96, 1150, 1100, "need_filled", "apartment", 0, 1, True, False, 0, 60, 0, 75, None, ["Gym", "AC", "WiFi included"], "Galleries and restaurants downstairs."),
        (S["Omar"], "Room with private bath, Old North", OSU, "Columbus", "OH", "43202", 1.4, 11, 99, 950, 925, "normal", "room", 3, 3, True, True, 2, 45, 0, 0, None, ["Washer/Dryer", "Backyard", "Dishwasher"], "Your own bathroom. Rare on campus."),
        (S["Grace"], "Furnished 1BR, utilities included", OSU, "Columbus", "OH", "43201", 0.5, 9, 94, 1100, 1075, "urgent", "apartment", 1, 1, True, False, 0, 0, 0, 0, None, ["Utilities included", "AC", "In-unit laundry"], "One flat price, nothing extra."),
        (S["Ben"], "Big room in 3BR, parking included", OSU, "Columbus", "OH", "43201", 0.8, 13, 97, 875, 825, "need_filled", "room", 3, 2, False, True, 2, 40, 0, 0, None, ["Washer/Dryer", "WiFi included"], "Driveway parking, no permit needed."),
        (S["Leah"], "Studio near the medical center", OSU, "Columbus", "OH", "43210", 0.6, 17, 101, 1050, 1000, "normal", "apartment", 0, 1, True, True, 0, 50, 25, 0, None, ["AC", "Gym"], "Ideal for summer research at the hospital."),
        (S["Diego"], "Townhouse room, Harrison West", OSU, "Columbus", "OH", "43215", 2.6, 19, 93, 850, 800, "normal", "room", 3, 2, True, False, 2, 40, 0, 0, None, ["Washer/Dryer", "Porch"], "Quiet street, 15 min bike to campus."),
        (rachel, "1BR with home office nook", OSU, "Columbus", "OH", "43201", 1.1, 21, 104, 1200, 1150, "need_filled", "apartment", 1, 1, True, True, 0, 65, 0, 0, None, ["AC", "In-unit laundry", "Dishwasher"], "Perfect for a remote internship."),
        (sam, "Room in house with backyard fire pit", OSU, "Columbus", "OH", "43202", 1.5, 10, 98, 800, 750, "urgent", "room", 4, 2, False, True, 3, 35, 0, 0, None, ["Backyard", "Washer/Dryer"], "Summer bonfires included."),
        (dana, "Compact studio, steps to High St", OSU, "Columbus", "OH", "43201", 0.3, 15, 88, 950, 925, "normal", "apartment", 0, 1, True, False, 0, 45, 0, 0, None, ["AC", "WiFi included"], "Small, spotless, unbeatable location."),
        (chris, "2BR with in-unit laundry, share with 1", OSU, "Columbus", "OH", "43201", 0.9, 12, 100, 1100, 1050, "need_filled", "apartment", 2, 2, True, True, 1, 60, 30, 0, None, ["In-unit laundry", "AC", "Gym"], "Roommate travels most of the summer."),
        (S["Hannah"], "1BR near Central Campus", MICH, "Ann Arbor", "MI", "48104", 0.4, 12, 96, 1200, 1150, "need_filled", "apartment", 1, 1, True, False, 0, 55, 0, 0, None, ["AC", "WiFi included"], "Two blocks from the Diag."),
        (S["Hannah"], "Room in co-op house", MICH, "Ann Arbor", "MI", "48104", 0.9, 10, 100, 700, 650, "normal", "room", 6, 2, True, True, 5, 0, 0, 0, None, ["Utilities included", "Backyard"], "Shared meals, great people."),
        (jess, "Studio by the Arb", MICH, "Ann Arbor", "MI", "48104", 1.3, 18, 95, 1000, 950, "urgent", "apartment", 0, 1, True, False, 0, 50, 0, 0, None, ["AC", "Balcony"], "Trails right outside."),
        (S["Kai"], "2BR near Ross-Ade", PURDUE, "West Lafayette", "IN", "47906", 0.7, 14, 98, 1100, 1050, "need_filled", "apartment", 2, 2, True, True, 1, 60, 0, 0, None, ["Gym", "AC", "In-unit laundry"], "Own room in a quiet 2BR."),
        (S["Kai"], "Room in house on State St", PURDUE, "West Lafayette", "IN", "47906", 0.5, 9, 95, 650, 600, "urgent", "room", 4, 2, False, True, 3, 35, 0, 0, None, ["Washer/Dryer", "Porch"], "Cheapest room near campus."),
        (tyler, "Furnished studio downtown", PURDUE, "West Lafayette", "IN", "47906", 1.1, 20, 100, 900, 850, "normal", "apartment", 0, 1, True, False, 0, 45, 0, 0, None, ["AC", "WiFi included"], "Walk to everything."),
    ]
    photo_cursor = 15
    for (sl, title, uni, city, st, zp, dist, fr, until, rent, asking, urg, htype, bd, ba, furn, park, rm, util, pcost, fees, prev, amen, desc) in MORE:
        listing(sl, title, uni, city, st, zp, dist, fr, until, rent, asking, urgency=urg, htype=htype, bd=bd, ba=ba, furn=furn, park=park,
                rm=rm, util=util, pcost=pcost, fees=fees, prev=prev, amenities=amen, desc=desc,
                photos=(photo_cursor % len(PHOTOS), (photo_cursor + 1) % len(PHOTOS), (photo_cursor + 2) % len(PHOTOS)))
        photo_cursor += 3

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
    session.add(Swipe(listing_id=l4.id, renter_id=demo_renter.id, actor="renter", direction="like"))
    session.add(Swipe(listing_id=l4.id, renter_id=demo_renter.id, actor="seller", direction="like"))
    m2 = Match(listing_id=l4.id, renter_id=demo_renter.id, seller_id=sam.id)
    session.add(m2)
    session.flush()
    session.add(Message(match_id=m2.id, sender_id=sam.id, body="Hey Riley, thanks for the interest! Happy to do a video tour this week."))
    # Jordan passed on Rachel's studio (proves passes persist and are excluded).
    session.add(Swipe(listing_id=l2.id, renter_id=jordan.id, actor="renter", direction="pass"))

    # ---- five-star accountability ratings from past subleases (match_id None) ----
    everyone = session.exec(select(User)).all()
    sellers = [u for u in everyone if u.mode == "seller"]
    renters_ = [u for u in everyone if u.mode == "renter"]
    SELLER_COMMENTS = ["Super responsive and the place looked exactly like the photos.", "Handed over keys on time, no surprises.",
                       "Flexible on move-in dates, would rent from again.", "Deposit returned in full within a week.", "Honest about the roommates and utilities."]
    RENTER_COMMENTS = ["Left the place spotless.", "Paid on time every month.", "Great communication the whole summer.",
                       "Respectful of the roommates and the house rules.", "Would happily sublease to them again."]
    for i, u in enumerate(sellers):
        n = 3 + (i * 5) % 10  # 3..12 reviews
        for k in range(n):
            rater = renters_[(i * 3 + k) % len(renters_)]
            if rater.id == u.id:
                continue
            stars = 5 if (i + k) % 4 else (4 if k % 3 else 3)
            session.add(Rating(rater_id=rater.id, ratee_id=u.id, role="seller", stars=stars, comment=SELLER_COMMENTS[(i + k) % len(SELLER_COMMENTS)]))
    for i, u in enumerate(renters_):
        n = 2 + (i * 7) % 9  # 2..10 reviews
        for k in range(n):
            rater = sellers[(i + k) % len(sellers)]
            if rater.id == u.id:
                continue
            stars = 5 if (i + 2 * k) % 5 else (4 if k % 2 else 3)
            session.add(Rating(rater_id=rater.id, ratee_id=u.id, role="renter", stars=stars, comment=RENTER_COMMENTS[(i + k) % len(RENTER_COMMENTS)]))
    # Maya (demo) is a top-rated seller
    for k in range(14):
        session.add(Rating(rater_id=renters_[k % len(renters_)].id, ratee_id=demo.id, role="seller", stars=5 if k != 6 else 4, comment=SELLER_COMMENTS[k % len(SELLER_COMMENTS)]))

    session.merge(Meta(key="seed_date", value=today.isoformat()))
    session.merge(Meta(key="seed_version", value=SEED_VERSION))
    session.commit()


def ensure_seeded(keep: bool = False) -> bool:
    """Seed on first run. Re-seed when the seed date changes so relative dates stay fresh (unless keep=True)."""
    from database import create_db, drop_db, engine

    create_db()
    with Session(engine) as s:
        row = s.get(Meta, "seed_date")
        ver = s.get(Meta, "seed_version")
        if row is None:
            run(s)
            return True
        same_version = ver is not None and ver.value == SEED_VERSION
        if same_version and (keep or row.value == date.today().isoformat()):
            return False
    drop_db()
    create_db()
    with Session(engine) as s:
        run(s)
    return True
