import type { Tier } from "@/lib/api/types";

// Indicative annual third-party premiums per tier, for the pilot. Each insurer prices the final quote.
export const FLAT_RATE_KSH = 14_500;
export const TIER_PREMIUM_KSH: Record<Tier, number> = { A: 6_200, B: 9_100, C: 12_800, D: 17_400 };

export const vsFlat = (premium: number) => Math.round(((premium - FLAT_RATE_KSH) / FLAT_RATE_KSH) * 100);

// Same bands as backend/src/scoring/model.ts TIERS.
export const tierOf = (score: number): Tier => (score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : "D");
