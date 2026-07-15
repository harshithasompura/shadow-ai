// Representative Cloud Functions fixture data. (README: not live-discovered)
// Provider-shaped (Cloud Functions v2 `Function`), trimmed to what we collect.
import type { RawResource } from "@/lib/types";

interface CloudFunction {
  name: string; // projects/{p}/locations/{region}/functions/{name}
  buildConfig?: { runtime?: string };
  serviceConfig?: {
    serviceAccountEmail?: string;
    environmentVariables?: Record<string, string>;
    ingressSettings?: string; // ALLOW_ALL when publicly invokable
  };
  labels?: Record<string, string>;
  loggingEnabled?: boolean;
  packages?: string[]; // AI libraries found in the image (Bonus 4, image analysis)
}

const FIXTURES: CloudFunction[] = [
  {
    // High-risk AI workload: calls an external LLM, is publicly invokable, and has
    // no logging - exercises three risk factors (two observed, one heuristic).
    name: "projects/shadow-ai/locations/us-central1/functions/embed-documents",
    buildConfig: { runtime: "python311" },
    serviceConfig: {
      serviceAccountEmail: "embed-fn@shadow-ai.iam.gserviceaccount.com",
      environmentVariables: {
        VECTOR_DB_URL: "https://pinecone.example",
        EMBEDDING_MODEL: "text-embedding-3-large",
        OPENAI_API_KEY: "sk-***",
      },
      ingressSettings: "ALLOW_ALL",
    },
    labels: { team: "search", env: "prod" },
    loggingEnabled: false,
  },
  {
    // Static config looks benign, but the image bundles langchain - only image
    // analysis reveals the hidden AI dependency. (Bonus 4)
    name: "projects/shadow-ai/locations/us-central1/functions/resize-thumbnails",
    buildConfig: { runtime: "nodejs20" },
    serviceConfig: {
      serviceAccountEmail: "media-fn@shadow-ai.iam.gserviceaccount.com",
      environmentVariables: { BUCKET: "shadow-ai-media" },
    },
    labels: { team: "media", env: "prod" },
    packages: ["sharp", "langchain", "@google-cloud/storage"],
  },
  {
    // Self-declares via an ai=true label but exposes no API key, model, or
    // framework - the sole weak signal lands it in the POSSIBLE_AI band, showing
    // the score is graded rather than binary.
    name: "projects/shadow-ai/locations/us-central1/functions/support-router",
    buildConfig: { runtime: "nodejs20" },
    serviceConfig: {
      serviceAccountEmail: "support-router@shadow-ai.iam.gserviceaccount.com",
      environmentVariables: { QUEUE_URL: "https://tasks.example/support" },
    },
    labels: { team: "cx", env: "prod", ai: "true" },
  },
];

export function discoverCloudFunctions(): RawResource[] {
  return FIXTURES.map((data) => ({ type: "CLOUD_FUNCTION", source: "FIXTURE", data }));
}
