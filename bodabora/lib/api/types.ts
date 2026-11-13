// Response shapes of the Boda Bora API (backend/src/routes). Dates arrive as ISO strings.

export type Role = "rider" | "sacco_admin" | "insurer_analyst" | "admin";
export type Language = "en" | "sw";
export type Tier = "A" | "B" | "C" | "D";
export type Severity = "low" | "medium" | "high";
export type EventType = "harsh_braking" | "sharp_cornering" | "rapid_acceleration" | "blackspot_pass";

// Weekly score flags (scoring/model.ts) plus the ones the SACCO flags endpoint adds.
export type FlagCode =
  | "no_shift_records"
  | "low_coverage"
  | "night_hours_underrecorded"
  | "score_up_coverage_down"
  | "high_risk_score"
  | "below_insurer_confidence";

export type Profile = { user_id: string; email: string | null; name: string | null; role: Role | null; language: Language | null };

export type RiderRecord = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  sacco_id: string | null;
  stage_id: string | null;
  bike_reg: string | null;
};

export type Me = { profile: Profile; rider: RiderRecord | null; sacco_ids: string[]; insurer_ids: string[] };

export type SubScores = {
  braking: number;
  cornering: number;
  acceleration: number;
  night_exposure: number;
  route_risk: number;
};

export type ScoreRow = SubScores & {
  score: number;
  coverage: number | null; // 0–1; null = no SACCO shift records to check against
  confidence: number; // 0–1
};

export type RiderScore = {
  current: (ScoreRow & { week_start: string; delta: number | null; tier: Tier }) | null;
  history: { week_start: string; score: number; coverage: number | null; confidence: number; distance_km: number; flags: FlagCode[] }[];
};

export type RiderDetail = {
  id: string;
  name: string;
  phone: string;
  bike_reg: string | null;
  sacco_id: string | null;
  sacco_name: string | null;
  stage_id: string | null;
  stage_name: string | null;
  linked: boolean;
};

export type LineString = { type: "LineString"; coordinates: [number, number][] };

export type RiderWeek = {
  week_start: string;
  score: (ScoreRow & { distance_km: number; trip_count: number; event_count: number; flags: FlagCode[]; tier: Tier }) | null;
  events: {
    id: string;
    type: EventType;
    severity: Severity;
    occurred_at: string;
    speed_kmh: number | null;
    magnitude_g: number | null;
    blackspot: string | null;
    lat: number | null;
    lng: number | null;
  }[];
  hourly_risk: number[][]; // 7 days (Mon–Sun) × 24 hours, severity-weighted counts
  trips: { id: string; started_at: string; ended_at: string; distance_m: number; night_m: number; score: number | null; path: LineString | null }[];
  coverage_by_day: { shift_hours: number; recorded_hours: number }[];
};

export type TripSummary = {
  id: string;
  started_at: string;
  ended_at: string;
  distance_m: number;
  max_speed_kmh: number | null;
  score: number | null;
  events: number;
};

export type CoachingMessage = {
  id: string;
  week_start: string;
  focus: string | null;
  source: "ai" | "template";
  status: "published" | "read" | string;
  created_at: string;
  language: Language;
  message: string;
};

export type Sacco = { id: string; name: string; county: string | null; stages: { id: string; name: string }[] };

export type FleetRider = {
  id: string;
  name: string;
  phone: string;
  bike_reg: string | null;
  stage_name: string | null;
  linked: boolean;
  score: number | null;
  delta: number | null;
  coverage: number | null;
  confidence: number | null;
  week_start: string | null;
  tier: Tier | null;
  trend: { week_start: string; score: number }[];
  flags: FlagCode[];
};

export type Fleet = {
  stats: { riders: number; scored: number; avg_score: number | null; avg_coverage: number | null; flagged: number };
  riders: FleetRider[];
};

export type FlaggedRider = {
  rider_id: string;
  name: string;
  week_start: string;
  score: number;
  coverage: number | null;
  confidence: number;
  reasons: FlagCode[];
};

export type Insurer = { id: string; name: string };

export type InsurerTiers = {
  eligible_riders: number;
  below_confidence: number;
  min_confidence: number;
  tiers: { tier: Tier; min_score: number; riders: number; avg_score: number | null }[];
};

export type Distribution = { riders: number; buckets: { from: number; to: number; riders: number }[] };

export type QuoteStatus = "pending" | "quoted" | "referred" | "declined";

export type ScoreSnapshot = ScoreRow & { week_start: string; tier: Tier };

export type InsurerQuote = {
  id: string;
  status: QuoteStatus;
  rider_id: string;
  rider_name: string;
  sacco_name: string | null;
  score_snapshot: ScoreSnapshot;
  current_score: number | null;
  current_confidence: number | null;
  premium_ksh: number | null;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
  eligible: boolean;
};

export type Consent = { id: string; insurer_id: string | null; insurer_name: string | null; granted_at: string; revoked_at: string | null };

export type RiderQuote = {
  id: string;
  insurer_id: string;
  insurer_name: string;
  status: QuoteStatus;
  premium_ksh: number | null;
  created_at: string;
  decided_at: string | null;
};
