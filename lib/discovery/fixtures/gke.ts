// Representative GKE fixture data. (README: not live-discovered)
// Provider-shaped (GKE `Cluster`), trimmed to what we collect. A cluster has no
// container image/env of its own, so runtime is absent - the Normalizer leaves it null.
import type { RawResource } from "@/lib/types";

interface GkeCluster {
  name: string;
  location: string;
  resourceLabels?: Record<string, string>;
  nodeConfig?: { serviceAccount?: string };
}

const FIXTURES: GkeCluster[] = [
  {
    name: "llm-inference",
    location: "us-central1",
    resourceLabels: { team: "ml-platform", env: "prod", workload: "vllm" },
    nodeConfig: { serviceAccount: "gke-inference@shadow-ai.iam.gserviceaccount.com" },
  },
  {
    name: "internal-tools",
    location: "us-east1",
    resourceLabels: { team: "infra", env: "prod" },
    nodeConfig: { serviceAccount: "default" },
  },
];

export function discoverGke(): RawResource[] {
  return FIXTURES.map((data) => ({ type: "GKE", source: "FIXTURE", data }));
}
