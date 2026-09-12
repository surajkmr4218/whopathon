export type Mode = 'renter' | 'seller';
export type Flexibility = 'exact' | '3d' | '1w' | 'flexible';
export type Pref = 'required' | 'preferred' | 'none';
export type HousingType = 'any' | 'room' | 'apartment' | 'house';
export type Urgency = 'normal' | 'need_filled' | 'urgent';
export type Level = 'VERY HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface User {
  id: number;
  name: string;
  email: string;
  university: string;
  photo_url: string | null;
  verified: boolean;
  mode: Mode | null;
}

export interface Me {
  user: User;
  has_renter_profile: boolean;
  listing_id: number | null;
}

export interface AuthResponse extends Me {
  token: string;
}

export interface RenterProfile {
  id: number;
  user_id: number;
  city: string;
  university: string;
  move_in: string;
  move_out: string;
  flexibility: Flexibility;
  max_budget: number;
  max_distance_miles: number;
  furnished_pref: Pref;
  parking_pref: Pref;
  housing_type: HousingType;
  roommates_ok: boolean;
  active: boolean;
}

export type RenterProfileInput = Omit<RenterProfile, 'id' | 'user_id' | 'active'>;

export interface Listing {
  id: number;
  seller_id: number;
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  university: string;
  distance_miles: number;
  housing_type: Exclude<HousingType, 'any'>;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  parking: boolean;
  roommates: number;
  amenities: string[];
  description: string;
  available_from: string;
  available_until: string;
  monthly_rent: number;
  asking_price: number;
  previous_price: number | null;
  utilities_cost: number;
  parking_cost: number;
  required_fees: number;
  urgency: Urgency;
  accepts_partial: boolean;
  status: 'draft' | 'active' | 'matched' | 'closed';
}

export type ListingInput = Omit<Listing, 'id' | 'seller_id' | 'previous_price' | 'status'>;

export interface MatchScore {
  overall: number;
  date: number;
  price: number;
  location: number;
  preference: number;
  listing_coverage: number;
  seller_rank: number;
  possible: boolean;
  explanation: string[];
  date_gap_days: number;
  gap_value_usd: number;
}

export interface SellerBrief {
  id: number;
  name: string;
  verified: boolean;
  photo_url: string | null;
  university: string;
}

export interface Badges {
  price_drop: boolean;
  previous_price: number | null;
  urgency: Urgency;
  verified: boolean;
}

export interface ListingCardData {
  listing: Listing;
  photos: string[];
  seller: SellerBrief;
  score: MatchScore | null;
  true_monthly_cost: number;
  badges: Badges;
}

export interface RenterBrief {
  id: number;
  name: string;
  university: string;
  verified: boolean;
  photo_url: string | null;
}

export interface RenterCardData {
  renter: RenterBrief;
  profile: RenterProfile;
  score: MatchScore;
  already_liked_you: boolean;
}

export interface PricingRecommendation {
  days_to_vacancy: number;
  current_price: number;
  suggested_price: number;
  current_pool: number;
  predicted_pool: number;
  percent_change: number;
  should_reduce: boolean;
  explanation: string;
  median_budget: number;
  competing_median: number;
  urgency: Urgency;
}

export interface Lever {
  key: string;
  label: string;
  new_count: number;
  new_score: number;
  delta_count: number;
  delta_score: number;
}

export interface Bucket {
  label: string;
  count: number;
  level: Level;
  key: string;
}

export interface ListingPosition {
  price_bucket: string;
  price_level: Level;
  pct_can_afford: number;
  window_level: Level;
  insights: string[];
}

export interface DemandReport {
  university: string;
  total_active: number;
  median_budget: number;
  by_month: Bucket[];
  budget_buckets: Bucket[];
  furnished_pct: number;
  parking_pct: number;
  within_1mi_pct: number;
  roommates_ok_pct: number;
  housing_types: Record<string, number>;
  insights: string[];
  listing_position: ListingPosition | null;
}

export interface Member {
  renter_id: number;
  name: string;
  start: string;
  end: string;
  days: number;
  match: number;
  photo_url?: string | null;
  university?: string;
  verified?: boolean;
}

export interface Segment {
  start: string;
  end: string;
  days: number;
  renter_id: number | null;
}

export interface PartialFillOption {
  members: Member[];
  coverage_pct: number;
  covered_days: number;
  uncovered_days: number;
  listing_days: number;
  estimated_recovered_rent: number;
  avg_match: number;
  segments: Segment[];
}

export interface Dashboard {
  listing: Listing;
  photos: string[];
  rent_at_risk: number;
  daily_loss: number;
  vacancy_days: number;
  days_to_vacancy: number;
  pricing: PricingRecommendation;
  compatible_count: number;
  affordable_count: number;
  mutual_matches: number;
  recovery: { score: number; pct_can_afford: number; demand_level: Level; completeness: number; levers: Lever[] };
  demand: DemandReport;
  partial_fill_top: PartialFillOption | null;
  activity: { interested: number; offers_pending: number; new_this_week: number; price_dropped: boolean; high_demand: boolean };
}

export interface Match {
  id: number;
  listing_id: number;
  renter_id: number;
  seller_id: number;
  status: string;
  created_at: string;
}

export interface Message {
  id: number;
  match_id: number;
  sender_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Offer {
  id: number;
  match_id: number;
  created_by: number;
  monthly_price: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  created_at: string;
}

export interface MatchSummary {
  match: Match;
  role: Mode;
  listing: Listing;
  photos: string[];
  renter: User & { profile: RenterProfile | null };
  seller: User;
  other_user: User;
  score: MatchScore | null;
  last_message: Message | null;
  unread: number;
  latest_offer: Offer | null;
}

export interface SwipeResult {
  match: MatchSummary | null;
}

export interface PublicUser extends User {
  profile: RenterProfile | null;
}
