# SubSwipe

A two-sided student sublease marketplace that behaves like a matching app first. Renters and sellers swipe, mutual interest creates a match, and five core systems run on real seeded data:

```
Demand Heatmap -> Urgency Pricing -> Reverse Matching -> Date Match + Swiping -> Partial-Fill Matching
```

| Layer | Stack |
|---|---|
| Mobile | React Native · Expo SDK 57 · TypeScript · Expo Router · Reanimated · Gesture Handler · React Query |
| Backend | FastAPI · SQLModel · SQLite · JWT auth |

The full PRD is in `SubSwipe_PRD_20_Page.pdf`.

## Run it

### 1. Backend

```bash
cd backend
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The database seeds itself on first start (13 renters, 13 listings, matches, messages, an offer). Dates are relative to *today*, so the demo numbers stay true; the DB re-seeds automatically on a new day (set `SUBSWIPE_KEEP_DB=1` to keep your data). `POST /dev/reset` re-seeds on demand. API docs: http://localhost:8000/docs

Tests:

```bash
cd backend && uv run pytest -q
```

### 2. Mobile app

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with **Expo Go** on your phone (same Wi-Fi as your Mac), or press `i` for the iOS Simulator.

The app finds the backend automatically by reusing the Expo dev server's host (your Mac's LAN IP) on port 8000. To point it somewhere else, copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`. If your phone can't connect, check that macOS Firewall allows Python and run `ipconfig getifaddr en0` to confirm the IP.

## Demo account

| Email | Password | Has |
|---|---|---|
| `demo@osu.edu` | `password` | a renter profile **and** the hero listing (switch modes from Profile / Listing tabs) |

Every other seeded account (e.g. `alex@osu.edu`, `rachel@osu.edu`) also uses `password`.

## Demo sequence (matches PRD §18)

1. **Log in** with the demo account → lands on **Discover** (renter mode). Top cards are 96–97% matches. Tap a card for the match breakdown, true cost and date-gap hint. Swipe right on one.
2. **Profile tab → Switch to seller mode**.
3. **Renters tab** shows *"N verified students are currently looking for a place like yours"* — reverse matching over every active renter, including ones who never saw the listing. **Alex Chen** already liked it; swipe right → **It's a Match**.
4. **Dashboard**: Rent at Risk and daily loss, urgency pricing (**$1,050 → $975**, pool 4 → 7 renters, seller must tap *Apply* or *Keep current*), Rent Recovery Score with real what-if levers, demand insights, and the Better Together card.
5. **Partial fill**: Priya (first half) + Marcus (second half) cover **95%** of the vacancy, with estimated recovered rent computed from asking price × covered days.
6. **Demand heatmap**: month-by-month demand, budget buckets with "you are here", and preference percentages, all aggregated from live renter profiles. The same data feeds the price recommendation.
7. Matches → chat (polls every 3s) → offers (make / accept / reject / counter).

## Layout

```
backend/
  engine/        the five core systems as pure, tested functions
    scoring.py      date / price / location / preference → overall match + explanation
    pricing.py      urgency pricing recommendation
    partial_fill.py two-renter combinations
    demand.py       demand aggregation
    recovery.py     rent at risk, rent recovery score, what-if levers
  routers/       auth, renter, listings (dashboard, partial-fill, demand), social (swipes, matches, messages, offers), dev
  services.py    DB rows → engine inputs → API responses
  seed.py        deterministic demo data (dates relative to today)
mobile/
  app/           Expo Router screens: auth, onboarding, (renter) tabs, (seller) tabs, listing, match, chat, offer, partial-fill, demand
  src/api        fetch client, TS types mirroring the API, React Query hooks
  src/components SwipeDeck, ListingCard, RenterCard, MatchScore, seller intelligence cards, DemandHeatmap
```

## Scoring rules (backend/engine/scoring.py)

- `overall = 0.40·date + 0.25·price + 0.20·location + 0.15·preferences`
- Date score: share of the renter's requested days covered by the listing, with flexibility (±3d / ±1w / flexible) absorbing small gaps. Zero overlap or a different university → impossible, never shown.
- Price score: 100 at or under budget, then a smooth decay ($20 over on $1,000 → 95).
- Required preferences (furnished/parking must-haves) penalise more than nice-to-haves.
- Seller deck orders by `0.75·overall + 0.25·vacancy coverage` so short stays don't outrank long ones.
