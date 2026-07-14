// Risk Engine - a second scoring axis, parallel to Detection -> Scoring. Answers
// "why should I care about this asset", where Detection answers "is this AI".
//
// Boundaries (mirrors the Detection/Scoring purity contract):
//   - Pure function of (Asset, Evidence[]): no GCP calls, no persistence, no clock.
//   - Operates on asset metadata and Evidence, never on the Detection outcome, so
//     it is reusable for non-AI assets (a public Cloud SQL instance has risk too).
//   - Additive and explainable: the score is the sum of the factors shown beside it.
//
// The engine is generic over a list of RiskRule. Adding a future signal
// (a runtime Vertex call from Cloud Logging, a shared secret from the graph) is a
// new rule in the list - the engine, scoring, and persistence do not change.
import type { Asset, Evidence, RiskBasis, RiskFactor } from "@/lib/types";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

// A rule contributes `points` to the risk score when `applies` holds. `basis`
// declares whether the signal is directly observed or a documented heuristic.
interface RiskRule {
  id: string;
  title: string;
  points: number;
  basis: RiskBasis;
  message: string;
  applies: (asset: Asset, evidence: Evidence[]) => boolean;
}

// External AI-provider keys - egress to a third-party LLM, distinct from
// in-project Google/Vertex usage. Matched against Evidence values (env key names).
const EXTERNAL_LLM =
  /OPENAI|ANTHROPIC|CLAUDE|COHERE|MISTRAL|GROQ|REPLICATE|TOGETHER|PERPLEXITY|HUGGINGFACE|HF_TOKEN/i;

// The default Compute Engine service account is broadly privileged; a workload
// running as it (or as an admin/owner/editor identity) is over-permissioned.
const OVERPRIVILEGED_SA = /-compute@developer\.gserviceaccount\.com$|admin|owner|editor/i;

// The four factors from the assignment, expressed as configured rules. Two are
// directly observed from collected metadata; two are documented heuristics
// (see ARCHITECTURE.md #8 - resolving them for real needs the IAM and Cloud
// Logging APIs, kept out of the discovery path in this proof-of-concept).
const RULES: RiskRule[] = [
  {
    id: "external-llm",
    title: "External LLM egress",
    points: 30,
    basis: "OBSERVED",
    message: "Sends data to a third-party LLM provider (external-provider API key present).",
    applies: (_asset, evidence) =>
      evidence.some((e) => e.indicatorType === "ENV_VAR" && EXTERNAL_LLM.test(e.value)),
  },
  {
    id: "public-endpoint",
    title: "Public endpoint",
    points: 20,
    basis: "OBSERVED",
    message: "Reachable from the public internet (ingress allows all traffic).",
    applies: (asset) => asset.publicAccess === true,
  },
  {
    id: "overprivileged-sa",
    title: "Broad service account",
    points: 20,
    basis: "HEURISTIC",
    message: "Runs as the default compute or an admin-level service account (inferred from identity, not IAM policy).",
    applies: (asset) => !!asset.serviceAccount && OVERPRIVILEGED_SA.test(asset.serviceAccount),
  },
  {
    id: "no-logging",
    title: "Logging disabled",
    points: 10,
    basis: "HEURISTIC",
    message: "No logging configured, so its activity is unaudited (inferred from deployment config).",
    applies: (asset) => asset.loggingEnabled === false,
  },
];

const SCALE_CAP = 100;
const HIGH_THRESHOLD = 50;
const MEDIUM_THRESHOLD = 20;

function levelFor(score: number): RiskLevel {
  if (score >= HIGH_THRESHOLD) return "HIGH";
  if (score >= MEDIUM_THRESHOLD) return "MEDIUM";
  return "LOW";
}

// Evaluate every rule against one asset. Returns the factors that fired, the
// additive score (capped at 100; the current rule set maxes at 80, and the
// framework accepts additional weighted factors), and the banded level.
export function assessRisk(
  asset: Asset,
  evidence: Evidence[],
): { score: number; level: RiskLevel; factors: RiskFactor[] } {
  const detectionId = `detection:${asset.id}`;
  const factors: RiskFactor[] = RULES.filter((r) => r.applies(asset, evidence)).map((r) => ({
    id: `${detectionId}:risk:${r.id}`,
    detectionId,
    ruleId: r.id,
    title: r.title,
    points: r.points,
    basis: r.basis,
    message: r.message,
  }));

  const score = Math.min(SCALE_CAP, factors.reduce((sum, f) => sum + f.points, 0));
  return { score, level: levelFor(score), factors };
}
