// Detection Engine — inspects Asset metadata, identifies AI indicators, and
// emits Evidence. Static heuristics only. (README)
//
// Boundaries (README > Architecture Principles):
//   - Never communicates with GCP.
//   - Never calculates confidence or assigns a score — the Scoring layer does.
//   - Never persists — the Persistence layer does.
// Pure function of the Asset: same input always yields the same Evidence.
import type { Asset, Detection, Evidence } from "@/lib/types";

// Indicator families this layer recognizes. Evidence.indicatorType is a plain
// string in the domain model; this union just keeps our emitters honest.
type IndicatorType = "ENV_VAR" | "LABEL" | "FRAMEWORK";

// `weight` is the fixed strength of an indicator — a property of the heuristic,
// not a confidence score. The Scoring layer aggregates weights into confidence;
// tuning these numbers is a Detection-layer concern, computing with them is not.
const WEIGHT: Record<IndicatorType, number> = {
  ENV_VAR: 0.9, // a provider API key is a strong signal
  FRAMEWORK: 0.7, // an agent framework in the runtime is a strong signal
  LABEL: 0.4, // a self-declared label is weak — anyone can set it
};

// Env var *names* that reference an AI provider or SDK. Matches the key, never
// the value (values are secrets and shouldn't be inspected or echoed).
const AI_ENV_KEY =
  /OPENAI|ANTHROPIC|CLAUDE|GEMINI|GOOGLE_API_KEY|VERTEX|COHERE|MISTRAL|GROQ|REPLICATE|TOGETHER|PERPLEXITY|HUGGINGFACE|HF_TOKEN|LANGCHAIN|LANGSMITH|LLM_/i;

// Label keys that self-declare an AI workload, e.g. ai=true, agent=true.
const AI_LABEL_KEY = /^(ai|agent|llm|ml|genai)$/i;

// Agent/LLM frameworks referenced by name in a runtime image or metadata value.
const FRAMEWORKS = ["LangChain", "LangGraph", "CrewAI", "AutoGen", "LlamaIndex", "Haystack"];

function matchFramework(text: string): string | null {
  const lower = text.toLowerCase();
  return FRAMEWORKS.find((f) => lower.includes(f.toLowerCase())) ?? null;
}

function isTruthyLabel(value: string): boolean {
  return /^(true|1|yes|enabled)$/i.test(value.trim());
}

// Inspect one Asset and produce its Detection plus the Evidence behind it.
// Evidence is empty when no indicators fire — the Asset is still analyzed.
export function detect(asset: Asset): { detection: Detection; evidence: Evidence[] } {
  const detectionId = `detection:${asset.id}`;
  const evidence: Evidence[] = [];

  const add = (indicatorType: IndicatorType, value: string, message: string) =>
    evidence.push({
      id: `${detectionId}:evidence:${evidence.length}`,
      detectionId,
      indicatorType,
      value,
      message,
      weight: WEIGHT[indicatorType],
    });

  // 1. AI-related environment variables (inspect key names only).
  for (const key of Object.keys(asset.environmentVariables ?? {})) {
    if (AI_ENV_KEY.test(key)) {
      add("ENV_VAR", key, `Environment variable "${key}" references an AI provider or SDK.`);
    }
  }

  // 2. AI/framework labels.
  for (const [key, value] of Object.entries(asset.labels ?? {})) {
    if (AI_LABEL_KEY.test(key) && isTruthyLabel(value)) {
      add("LABEL", `${key}=${value}`, `Label "${key}=${value}" self-declares an AI workload.`);
    }
    const labelFramework = matchFramework(value);
    if (labelFramework) {
      add("FRAMEWORK", `${key}=${value}`, `Label references the ${labelFramework} framework.`);
    }
  }

  // 3. Framework references in the runtime / container image.
  if (asset.runtime) {
    const runtimeFramework = matchFramework(asset.runtime);
    if (runtimeFramework) {
      add("FRAMEWORK", asset.runtime, `Runtime "${asset.runtime}" references the ${runtimeFramework} framework.`);
    }
  }

  const detection: Detection = {
    id: detectionId,
    assetId: asset.id,
    confidence: 0, // Scoring layer computes this from the evidence weights.
    status: "PENDING", // Scoring layer finalizes this.
    scannedAt: new Date(),
  };

  return { detection, evidence };
}

// Batch helper: run detection across a normalized inventory.
export function detectAll(assets: Asset[]): { detection: Detection; evidence: Evidence[] }[] {
  return assets.map(detect);
}
