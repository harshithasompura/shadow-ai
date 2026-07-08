// Representative Vertex AI fixture data. (README: not live-discovered)
// Provider-shaped (Vertex AI `Endpoint`), trimmed to what we collect.
import type { RawResource } from "@/lib/types";

interface VertexEndpoint {
  name: string; // projects/{p}/locations/{region}/endpoints/{id}
  displayName?: string;
  labels?: Record<string, string>;
  deployedModels?: { model?: string; serviceAccount?: string }[];
}

const FIXTURES: VertexEndpoint[] = [
  {
    name: "projects/shadow-ai/locations/us-central1/endpoints/8123456789",
    displayName: "rag-chat-endpoint",
    labels: { team: "ml-platform", env: "prod" },
    deployedModels: [
      {
        model: "projects/shadow-ai/locations/us-central1/models/gemini-tuned-001",
        serviceAccount: "vertex-serving@shadow-ai.iam.gserviceaccount.com",
      },
    ],
  },
  {
    name: "projects/shadow-ai/locations/us-east4/endpoints/9987654321",
    displayName: "fraud-scoring-endpoint",
    labels: { team: "risk", env: "prod" },
    deployedModels: [
      {
        model: "projects/shadow-ai/locations/us-east4/models/xgboost-fraud-v3",
        serviceAccount: "vertex-serving@shadow-ai.iam.gserviceaccount.com",
      },
    ],
  },
];

export function discoverVertexAi(): RawResource[] {
  return FIXTURES.map((data) => ({ type: "VERTEX_AI", source: "FIXTURE", data }));
}
