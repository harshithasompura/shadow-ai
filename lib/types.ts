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
  source: Source;
  lastSeen: Date;
}

export interface Detection {
  id: string;
  assetId: string;
  confidence: number;
  status: string;
  scannedAt: Date;
}

export interface Evidence {
  id: string;
  detectionId: string;
  indicatorType: string;
  value: string;
  message: string;
  weight: number;
}
