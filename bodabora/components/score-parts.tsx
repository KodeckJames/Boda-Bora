import { ScoreBar } from "@/components/ui";
import type { FlagCode, SubScores } from "@/lib/api/types";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// API sub-score fields → dictionary keys.
const SUB_SCORES = [
  ["braking", "braking"],
  ["cornering", "cornering"],
  ["acceleration", "acceleration"],
  ["night_exposure", "nightExposure"],
  ["route_risk", "routeRisk"],
] as const satisfies readonly (readonly [keyof SubScores, keyof Dictionary["common"]["subScores"]])[];

export function SubScoreBars({ scores, t }: { scores: SubScores; t: Dictionary }) {
  return (
    <div className="space-y-3">
      {SUB_SCORES.map(([field, key]) => (
        <ScoreBar key={field} label={t.common.subScores[key]} value={Math.round(scores[field])} />
      ))}
    </div>
  );
}

export const flagText = (t: Dictionary, code: FlagCode) => t.common.flags[code] ?? code;
