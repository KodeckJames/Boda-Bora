// Placeholder data for the UI. Replace with real telematics/scoring output later.

export type RiskBand = "low" | "moderate" | "high";

export type SubScores = {
  braking: number;
  cornering: number;
  acceleration: number;
  nightExposure: number;
  routeRisk: number;
};

export type Rider = {
  id: string;
  name: string;
  phone: string;
  stage: string;
  bike: string;
  score: number;
  scoreDelta: number;
  coverage: number; // 0-100, share of shift time with trace data
  band: RiskBand;
  subScores: SubScores;
  weeklyKm: number;
  trips: number;
  nightShare: number; // % of km ridden 19:00-06:00
  flags: string[];
  trend: number[]; // last 8 weeks
};

export const riders: Rider[] = [
  {
    id: "r-001",
    name: "Brian Otieno",
    phone: "0712 345 678",
    stage: "Roysambu",
    bike: "KMFB 412X",
    score: 82,
    scoreDelta: 4,
    coverage: 94,
    band: "low",
    subScores: { braking: 85, cornering: 78, acceleration: 88, nightExposure: 72, routeRisk: 80 },
    weeklyKm: 412,
    trips: 96,
    nightShare: 18,
    flags: [],
    trend: [71, 73, 72, 76, 77, 78, 78, 82],
  },
  {
    id: "r-002",
    name: "Kevin Mwangi",
    phone: "0723 111 902",
    stage: "Githurai 45",
    bike: "KMEJ 908L",
    score: 64,
    scoreDelta: -3,
    coverage: 88,
    band: "moderate",
    subScores: { braking: 58, cornering: 66, acceleration: 61, nightExposure: 55, routeRisk: 70 },
    weeklyKm: 538,
    trips: 121,
    nightShare: 34,
    flags: ["Harsh braking cluster near Githurai roundabout"],
    trend: [68, 66, 67, 69, 65, 67, 67, 64],
  },
  {
    id: "r-003",
    name: "Dennis Kiprop",
    phone: "0701 554 210",
    stage: "Kahawa West",
    bike: "KMDX 221Q",
    score: 91,
    scoreDelta: 2,
    coverage: 97,
    band: "low",
    subScores: { braking: 93, cornering: 90, acceleration: 92, nightExposure: 88, routeRisk: 89 },
    weeklyKm: 356,
    trips: 84,
    nightShare: 8,
    flags: [],
    trend: [84, 86, 87, 88, 88, 89, 89, 91],
  },
  {
    id: "r-004",
    name: "Samuel Njoroge",
    phone: "0745 678 330",
    stage: "Roysambu",
    bike: "KMFA 077C",
    score: 79,
    scoreDelta: 11,
    coverage: 41,
    band: "moderate",
    subScores: { braking: 84, cornering: 81, acceleration: 80, nightExposure: 70, routeRisk: 74 },
    weeklyKm: 188,
    trips: 39,
    nightShare: 12,
    flags: ["Coverage gap: 23 of 39 SACCO shift hours missing trace", "Score jump with falling coverage"],
    trend: [62, 63, 61, 64, 65, 66, 68, 79],
  },
  {
    id: "r-005",
    name: "Peter Wanjala",
    phone: "0790 432 118",
    stage: "Githurai 45",
    bike: "KMEP 640Z",
    score: 47,
    scoreDelta: -6,
    coverage: 91,
    band: "high",
    subScores: { braking: 41, cornering: 38, acceleration: 52, nightExposure: 44, routeRisk: 58 },
    weeklyKm: 611,
    trips: 140,
    nightShare: 46,
    flags: ["Night riding on Thika Rd service lane", "Cornering speed above 45 km/h at Kasarani exit"],
    trend: [55, 54, 56, 53, 52, 54, 53, 47],
  },
  {
    id: "r-006",
    name: "Joseph Mutua",
    phone: "0711 908 765",
    stage: "Kahawa West",
    bike: "KMDQ 315M",
    score: 73,
    scoreDelta: 1,
    coverage: 86,
    band: "moderate",
    subScores: { braking: 75, cornering: 70, acceleration: 74, nightExposure: 68, routeRisk: 77 },
    weeklyKm: 447,
    trips: 102,
    nightShare: 22,
    flags: [],
    trend: [70, 71, 70, 72, 71, 73, 72, 73],
  },
];

export function getRider(id: string) {
  return riders.find((r) => r.id === id);
}

export const currentRider = riders[1];

export type RiskEvent = {
  id: string;
  type: "Harsh braking" | "Sharp cornering" | "Rapid acceleration" | "Blackspot pass";
  time: string;
  day: string;
  place: string;
  severity: "low" | "medium" | "high";
  speedKmh: number;
  // position on the stylised route map, 0-100
  x: number;
  y: number;
};

export const riskEvents: RiskEvent[] = [
  { id: "e1", type: "Harsh braking", time: "18:42", day: "Mon", place: "Githurai 45 roundabout", severity: "high", speedKmh: 52, x: 74, y: 22 },
  { id: "e2", type: "Harsh braking", time: "19:05", day: "Tue", place: "Githurai 45 roundabout", severity: "high", speedKmh: 48, x: 72, y: 25 },
  { id: "e3", type: "Sharp cornering", time: "07:16", day: "Wed", place: "Kasarani exit ramp", severity: "medium", speedKmh: 41, x: 46, y: 50 },
  { id: "e4", type: "Blackspot pass", time: "20:30", day: "Thu", place: "Roysambu footbridge", severity: "medium", speedKmh: 44, x: 34, y: 60 },
  { id: "e5", type: "Rapid acceleration", time: "12:11", day: "Fri", place: "Kahawa West stage", severity: "low", speedKmh: 30, x: 58, y: 36 },
  { id: "e6", type: "Harsh braking", time: "19:21", day: "Sat", place: "Githurai 45 roundabout", severity: "high", speedKmh: 55, x: 75, y: 20 },
  { id: "e7", type: "Sharp cornering", time: "21:02", day: "Sat", place: "Allsops interchange", severity: "medium", speedKmh: 39, x: 16, y: 78 },
];

export const blackspots = [
  { name: "Githurai 45 roundabout", x: 74, y: 22 },
  { name: "Roysambu footbridge", x: 34, y: 60 },
  { name: "Allsops interchange", x: 16, y: 78 },
  { name: "Kasarani exit ramp", x: 46, y: 50 },
];

export type Trip = {
  id: string;
  day: string;
  start: string;
  from: string;
  to: string;
  km: number;
  mins: number;
  events: number;
  score: number;
};

export const recentTrips: Trip[] = [
  { id: "t-118", day: "Today", start: "18:40", from: "Githurai 45", to: "Roysambu", km: 7.2, mins: 19, events: 2, score: 58 },
  { id: "t-117", day: "Today", start: "16:05", from: "Kahawa West", to: "Githurai 45", km: 5.1, mins: 14, events: 0, score: 81 },
  { id: "t-116", day: "Today", start: "13:22", from: "Roysambu", to: "TRM", km: 2.4, mins: 8, events: 0, score: 86 },
  { id: "t-115", day: "Yesterday", start: "20:47", from: "Kasarani", to: "Githurai 45", km: 6.8, mins: 18, events: 3, score: 49 },
  { id: "t-114", day: "Yesterday", start: "07:10", from: "Githurai 45", to: "Pangani", km: 11.6, mins: 31, events: 1, score: 72 },
];

// Hour-of-day risk for heatmap: 7 days x 24 hours, 0-1
export const hourlyRisk: number[][] = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const evening = h >= 18 && h <= 21 ? 0.55 + ((d * 7 + h) % 5) * 0.08 : 0;
    const morning = h >= 6 && h <= 8 ? 0.25 + ((d + h) % 3) * 0.08 : 0;
    const base = h >= 5 && h <= 22 ? 0.08 + ((d * 3 + h) % 4) * 0.03 : 0;
    return Math.min(1, base + evening + morning);
  }),
);

export const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// SACCO shift hours vs hours with trace coverage, per day
export const shiftCoverage = [
  { day: "Mon", shift: 10, traced: 9.4 },
  { day: "Tue", shift: 11, traced: 10.1 },
  { day: "Wed", shift: 9, traced: 8.2 },
  { day: "Thu", shift: 10, traced: 9.0 },
  { day: "Fri", shift: 12, traced: 10.6 },
  { day: "Sat", shift: 12, traced: 10.3 },
  { day: "Sun", shift: 6, traced: 5.2 },
];

export const coachingMessage = {
  sw: "Kevin, wiki hii breki zako za ghafla zimeongezeka karibu na mzunguko wa Githurai 45 kati ya saa 12:30 na saa 1:30 jioni (mara 3). Punguza mwendo hadi 30 km/h ukikaribia mzunguko, na uache nafasi ya mita 10 nyuma ya matatu. Ukifanya hivi wiki ijayo, alama yako inaweza kupanda hadi 70.",
  en: "Kevin, your harsh braking rose this week near the Githurai 45 roundabout between 6:30 and 7:30 pm (3 times). Slow to 30 km/h on approach and keep 10 metres behind matatus. Do this next week and your score could rise to 70.",
  focus: "Githurai 45 roundabout · 18:30–19:30",
};

export const fleetStats = {
  riders: 48,
  avgScore: 71,
  avgCoverage: 87,
  flagged: 6,
  incidentsThisMonth: 2,
};

export const insurerTiers = [
  { band: "Tier A", range: "85–100", riders: 214, premium: 6200, base: 14500, claimRate: 2.1 },
  { band: "Tier B", range: "70–84", riders: 486, premium: 9100, base: 14500, claimRate: 4.8 },
  { band: "Tier C", range: "55–69", riders: 371, premium: 12800, base: 14500, claimRate: 8.9 },
  { band: "Tier D", range: "0–54", riders: 142, premium: 17400, base: 14500, claimRate: 15.6 },
];

export const scoreDistribution = [
  { bucket: "30", count: 12 },
  { bucket: "40", count: 41 },
  { bucket: "50", count: 89 },
  { bucket: "60", count: 233 },
  { bucket: "70", count: 318 },
  { bucket: "80", count: 296 },
  { bucket: "90", count: 224 },
];

export const quoteQueue = [
  { rider: "Dennis Kiprop", sacco: "Kahawa West Riders", score: 91, coverage: 97, weeks: 12, status: "Eligible" },
  { rider: "Brian Otieno", sacco: "Roysambu Boda SACCO", score: 82, coverage: 94, weeks: 9, status: "Eligible" },
  { rider: "Samuel Njoroge", sacco: "Roysambu Boda SACCO", score: 79, coverage: 41, weeks: 6, status: "Low confidence" },
  { rider: "Joseph Mutua", sacco: "Kahawa West Riders", score: 73, coverage: 86, weeks: 10, status: "Eligible" },
  { rider: "Kevin Mwangi", sacco: "Githurai Stage Welfare", score: 64, coverage: 88, weeks: 8, status: "Eligible" },
  { rider: "Peter Wanjala", sacco: "Githurai Stage Welfare", score: 47, coverage: 91, weeks: 11, status: "Refer" },
];

export const subScoreLabels: Record<keyof SubScores, { en: string; sw: string }> = {
  braking: { en: "Braking", sw: "Breki" },
  cornering: { en: "Cornering", sw: "Kona" },
  acceleration: { en: "Acceleration", sw: "Kuongeza mwendo" },
  nightExposure: { en: "Night hours", sw: "Saa za usiku" },
  routeRisk: { en: "Route risk", sw: "Hatari ya njia" },
};
