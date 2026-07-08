// Cloud Run discovery — the only live GCP API source. (README locked decision)
// Collects raw Cloud Run services. No normalization, no AI logic.
import type { RawResource } from "@/lib/types";

// Provider-shaped (Cloud Run Admin v2 `Service`), trimmed to what we collect.
interface CloudRunService {
  name: string; // projects/{p}/locations/{region}/services/{name}
  serviceAccount?: string;
  labels?: Record<string, string>;
  template?: {
    containers?: { image?: string; env?: { name: string; value: string }[] }[];
  };
}

// ponytail: stub stands in for the SDK until creds are wired. The live path is
// one call — drop it in at the marked seam and delete STUB_SERVICES.
const STUB_SERVICES: CloudRunService[] = [
  {
    name: "projects/shadow-ai/locations/us-central1/services/support-agent",
    serviceAccount: "support-agent@shadow-ai.iam.gserviceaccount.com",
    labels: { team: "cx", env: "prod" },
    template: {
      containers: [
        {
          image: "us-docker.pkg.dev/shadow-ai/agents/support-agent:latest",
          env: [
            { name: "OPENAI_API_KEY", value: "sk-***" },
            { name: "MODEL", value: "gpt-4o" },
          ],
        },
      ],
    },
  },
  {
    name: "projects/shadow-ai/locations/us-central1/services/billing-web",
    serviceAccount: "billing-web@shadow-ai.iam.gserviceaccount.com",
    labels: { team: "payments", env: "prod" },
    template: {
      containers: [{ image: "us-docker.pkg.dev/shadow-ai/web/billing:1.4.2", env: [] }],
    },
  },
];

export async function discoverCloudRun(): Promise<RawResource[]> {
  const project = process.env.GOOGLE_CLOUD_PROJECT;

  if (project) {
    // TODO(live): wire the official SDK once creds are configured:
    //   const { ServicesClient } = await import("@google-cloud/run");
    //   const client = new ServicesClient();
    //   const [live] = await client.listServices({ parent: `projects/${project}/locations/-` });
    //   return live.map((data) => ({ type: "CLOUD_RUN", source: "REAL", data }));
    // Only data actually returned by GCP is REAL.
  }

  // No live query happened — this is stub data, so its provenance is FIXTURE.
  return STUB_SERVICES.map((data) => ({ type: "CLOUD_RUN", source: "FIXTURE", data }));
}
