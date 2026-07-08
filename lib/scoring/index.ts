// Confidence Scoring — evaluates Evidence, calculates a confidence score, and
// finalizes the Detection status. (README > Responsibility Diagram: Scoring)
//
// Boundaries (README > Architecture Principles):
//   - Only evaluates Evidence — never inspects the Asset.
//   - Never generates Evidence or performs heuristic detection.
//   - Never calls Discovery/Normalizer, never persists, never exposes routes.
// Pure function of (Detection, Evidence[]): same input always yields the same
// output. Inputs are not mutated; a new Detection is returned.
import type { Detection, Evidence } from "@/lib/types";

// Detection statuses this layer assigns. Detection.status is a plain string in
// the domain model; this union keeps the mapping honest.
export type ScoredStatus = "AI_LIKELY" | "POSSIBLE_AI" | "NOT_AI";

// Evidence.weight is a 0–1 indicator strength set by the Detection layer.
// Confidence is simply the summed weights scaled to a 0–100 percentage — an
// additive model that is trivial to explain: each indicator adds its weight.
const SCALE = 100;

// Status thresholds over the final 0–100 confidence. Simple and documented:
//   >= 70  strong signal(s) fired            -> AI_LIKELY
//   >= 40  a moderate signal or a weak stack -> POSSIBLE_AI
//   <  40  little or nothing fired           -> NOT_AI
const AI_LIKELY_THRESHOLD = 70;
const POSSIBLE_AI_THRESHOLD = 40;

function statusFor(confidence: number): ScoredStatus {
  if (confidence >= AI_LIKELY_THRESHOLD) return "AI_LIKELY";
  if (confidence >= POSSIBLE_AI_THRESHOLD) return "POSSIBLE_AI";
  return "NOT_AI";
}

// Score one Detection against its Evidence. Returns the updated Detection and
// the original Evidence unchanged.
export function score(
  detection: Detection,
  evidence: Evidence[],
): { detection: Detection; evidence: Evidence[] } {
  const total = evidence.reduce((sum, e) => sum + e.weight, 0);
  const confidence = Math.min(SCALE, Math.round(total * SCALE));

  return {
    detection: { ...detection, confidence, status: statusFor(confidence) },
    evidence,
  };
}

// Batch helper: score a Detection-plus-Evidence set produced by detectAll.
export function scoreAll(
  results: { detection: Detection; evidence: Evidence[] }[],
): { detection: Detection; evidence: Evidence[] }[] {
  return results.map((r) => score(r.detection, r.evidence));
}
