"""End-to-end API flow against a fresh, seeded, temporary database."""
import os
import tempfile

os.environ["SUBSWIPE_DB"] = os.path.join(tempfile.mkdtemp(), "test.db")

from datetime import date, timedelta  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def auth(client, email, password="password"):
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_seed_and_demo_numbers(client):
    h = auth(client, "demo@osu.edu")
    me = client.get("/auth/me", headers=h).json()
    assert me["has_renter_profile"] and me["listing_id"] == 1

    # Discover: top card is a ~96% match and does not include my own listing
    cards = client.get("/renter/discover", headers=h).json()
    assert cards and cards[0]["score"]["overall"] >= 95
    assert all(c["listing"]["seller_id"] != 1 for c in cards)
    assert all(c["listing"]["id"] != 1 for c in cards)
    assert all(c["listing"]["university"] == "Ohio State" for c in cards)

    # Reverse matching: many students already compatible; Alex already liked
    rv = client.get("/listings/1/renters", headers=h).json()
    assert rv["count"] >= 8
    assert any(c["already_liked_you"] and c["renter"]["name"] == "Alex Chen" for c in rv["cards"])
    assert not any(c["renter"]["name"] == "Emma Wilson" for c in rv["cards"])  # seller already liked Emma

    # Dashboard: pricing recommends a cut that grows the pool; partial-fill and demand are real
    d = client.get("/listings/1/dashboard", headers=h).json()
    assert d["days_to_vacancy"] == 9
    assert d["pricing"]["should_reduce"] and d["pricing"]["suggested_price"] < 1050
    assert d["pricing"]["predicted_pool"] > d["pricing"]["current_pool"]
    assert d["partial_fill_top"]["coverage_pct"] >= 90
    assert d["demand"]["total_active"] >= 10
    assert 0 < d["recovery"]["score"] <= 100
    assert d["rent_at_risk"] == round(1100 / 30 * 92)
    assert d["mutual_matches"] == 1 and d["activity"]["offers_pending"] == 1
    assert any(l["key"] == "price" and l["new_count"] > d["affordable_count"] for l in d["recovery"]["levers"])

    pf = client.get("/listings/1/partial-fill", headers=h).json()
    assert pf["options"][0]["coverage_pct"] >= 90
    assert len(pf["options"][0]["members"]) == 2

    dm = client.get("/demand?listing_id=1", headers=h).json()
    assert dm["listing_position"]["price_bucket"] == "$900–$1,100"
    assert len(dm["by_month"]) == 6


def test_full_two_sided_flow(client):
    today = date.today()
    # New renter signs up (.edu => verified) and creates a profile
    r = client.post("/auth/signup", json={"name": "Test Renter", "email": "test.renter@osu.edu", "password": "secret", "university": "Ohio State"})
    assert r.status_code == 200 and r.json()["user"]["verified"]
    rh = {"Authorization": f"Bearer {r.json()['token']}"}
    p = client.put("/renter/profile", headers=rh, json={
        "city": "Columbus", "university": "Ohio State", "move_in": str(today + timedelta(days=15)), "move_out": str(today + timedelta(days=95)),
        "flexibility": "3d", "max_budget": 1100, "max_distance_miles": 1.5, "furnished_pref": "preferred", "parking_pref": "none",
        "housing_type": "any", "roommates_ok": True})
    assert p.status_code == 200
    assert client.get("/auth/me", headers=rh).json()["user"]["mode"] == "renter"

    cards = client.get("/renter/discover", headers=rh).json()
    hero = next(c for c in cards if c["listing"]["id"] == 1)
    assert hero["true_monthly_cost"] == 1050 + 60
    assert hero["score"]["explanation"]

    # Renter passes one, likes the hero listing; passed card never returns
    passed = cards[-1]["listing"]["id"]
    assert client.post("/swipes", headers=rh, json={"listing_id": passed, "direction": "pass"}).json()["match"] is None
    assert client.post("/swipes", headers=rh, json={"listing_id": 1, "direction": "like"}).json()["match"] is None
    ids = [c["listing"]["id"] for c in client.get("/renter/discover", headers=rh).json()]
    assert passed not in ids and 1 not in ids

    # Save is separate from like
    client.post("/renter/saved/2", headers=rh)
    assert [c["listing"]["id"] for c in client.get("/renter/saved", headers=rh).json()] == [2]

    # Seller (demo) sees the renter flagged as already-liked and swipes right -> match
    sh = auth(client, "demo@osu.edu")
    client.patch("/auth/me", headers=sh, json={"mode": "seller"})
    rv = client.get("/listings/1/renters", headers=sh).json()
    card = next(c for c in rv["cards"] if c["renter"]["name"] == "Test Renter")
    assert card["already_liked_you"]
    res = client.post("/swipes", headers=sh, json={"listing_id": 1, "renter_id": card["renter"]["id"], "direction": "like"}).json()
    assert res["match"] is not None
    match_id = res["match"]["match"]["id"]
    # Swiping again does not duplicate the match
    again = client.post("/swipes", headers=sh, json={"listing_id": 1, "renter_id": card["renter"]["id"], "direction": "like"}).json()
    assert again["match"]["match"]["id"] == match_id
    assert not any(c["renter"]["name"] == "Test Renter" for c in client.get("/listings/1/renters", headers=sh).json()["cards"])

    # Both sides see the match; messaging + read state
    assert any(m["match"]["id"] == match_id for m in client.get("/matches", headers=sh).json())
    assert any(m["match"]["id"] == match_id for m in client.get("/matches", headers=rh).json())
    client.post(f"/matches/{match_id}/messages", headers=rh, json={"body": "Hi! Still available?"})
    assert next(m for m in client.get("/matches", headers=sh).json() if m["match"]["id"] == match_id)["unread"] == 1
    msgs = client.get(f"/matches/{match_id}/messages", headers=sh).json()
    assert msgs[0]["read_at"] is not None

    # Offer -> counter -> accept
    o = client.post(f"/matches/{match_id}/offers", headers=rh, json={"monthly_price": 950, "start_date": str(today + timedelta(days=15)), "end_date": str(today + timedelta(days=95))}).json()
    c = client.post(f"/offers/{o['id']}/respond", headers=sh, json={"action": "counter", "monthly_price": 1000}).json()
    assert c["status"] == "pending" and c["monthly_price"] == 1000
    assert client.get(f"/matches/{match_id}/offers", headers=sh).json()[1]["status"] == "countered"
    a = client.post(f"/offers/{c['id']}/respond", headers=rh, json={"action": "accept"}).json()
    assert a["status"] == "accepted"

    # Apply suggested price -> PRICE DROP badge on renter cards
    d = client.get("/listings/1/dashboard", headers=sh).json()
    client.post("/listings/1/apply-price", headers=sh, json={"price": d["pricing"]["suggested_price"]})
    detail = client.get("/listings/1", headers=rh).json()
    assert detail["badges"]["price_drop"] and detail["badges"]["previous_price"] == 1050

    # Mode switch back keeps the same account
    assert client.patch("/auth/me", headers=sh, json={"mode": "renter"}).json()["user"]["mode"] == "renter"


def test_seller_onboarding_returns_compatible_count(client):
    today = date.today()
    r = client.post("/auth/signup", json={"name": "New Seller", "email": "new.seller@osu.edu", "password": "secret", "university": "Ohio State"})
    h = {"Authorization": f"Bearer {r.json()['token']}"}
    l = client.post("/listings", headers=h, json={
        "title": "Test place", "address": "1 Main St", "city": "Columbus", "state": "OH", "zip": "43201", "university": "Ohio State",
        "distance_miles": 0.8, "housing_type": "apartment", "furnished": True, "parking": True, "available_from": str(today + timedelta(days=10)),
        "available_until": str(today + timedelta(days=100)), "monthly_rent": 1000, "asking_price": 900, "urgency": "need_filled"})
    assert l.status_code == 200, l.text
    assert l.json()["compatible_count"] >= 5
    assert client.get("/auth/me", headers=h).json()["user"]["mode"] == "seller"
    assert client.get(f"/listings/{l.json()['listing']['id']}/renters", headers=h).json()["count"] >= 5
