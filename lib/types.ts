// Shared domain types. Mirror the Prisma models; used across layers so the
// pipeline passes typed data without each layer importing Prisma directly.

export type AssetType = "CLOUD_RUN" | "CLOUD_FUNCTION" | "GKE" | "VERTEX_AI";
export type Source = "REAL" | "FIXTURE";

// Raw cloud resource as collected by the Discovery layer, before normalization.
// `data` holds the provider-native payload; the Normalizer interprets it per type.
export interface RawResource {
  type: AssetType;
  source: Source;
  data: unknown; // provider-native payload; the Normalizer casts it per type
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  region: string;
  runtime?: string | null;
  serviceAccount?: string | null;
  labels?: Record<string, string> | null;
  environmentVariables?: Record<string, string> | null;
  // Security posture metadata, used by the RiskEngine. `publicAccess` is observed
  // from the provider (Cloud Run ingress); `loggingEnabled` is a config stand-in.
  // null means "not collected", so a rule that fires on `false` stays quiet.
  publicAccess?: boolean | null;
  loggingEnabled?: boolean | null;
  // Runtime AI calls observed in Cloud Logging (e.g. Vertex GenerateContent) and
  // AI libraries found in the container image. Both feed the Detection layer as
  // additional evidence sources beyond static config. (Bonus 1 & 4)
  runtimeCalls?: string[] | null;
  packages?: string[] | null;
  source: Source;
  lastSeen: Date;
}

export interface Detection {
  id: string;
  assetId: string;
  confidence: number;
  status: string;
  // Risk axis, orthogonal to the AI-confidence axis. Set by the RiskEngine.
  riskScore: number;
  riskLevel: string;
  scannedAt: Date;
}

// One contributing reason to an asset's risk score. The risk-side analogue of
// Evidence. `basis` records whether the signal was directly observed from
// metadata or produced by a documented heuristic.
export type RiskBasis = "OBSERVED" | "HEURISTIC";

export interface RiskFactor {
  id: string;
  detectionId: string;
  ruleId: string;
  title: string;
  points: number;
  basis: RiskBasis;
  message: string;
}

export interface Evidence {
  id: string;
  detectionId: string;
  indicatorType: string;
  value: string;
  message: string;
  weight: number;
}
