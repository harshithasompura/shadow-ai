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

// Live discovery. Cloud Run is the only source that hits a real GCP API.
// Credentials come from Application Default Credentials — set
// GOOGLE_APPLICATION_CREDENTIALS to a service account key path.
export async function discoverCloudRun(): Promise<RawResource[]> {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) return []; // no project configured → nothing live to discover

  const { ServicesClient } = await import("@google-cloud/run");
  const client = new ServicesClient();

  // `locations/-` lists services across every region in one call.
  // ponytail: first page only (~100 services); switch to listServicesAsync if a
  // project outgrows it.
  const [services] = await client.listServices({
    parent: `projects/${project}/locations/-`,
  });

  // Reshape the SDK's v2 Service into the shape the Normalizer reads. Only data
  // GCP actually returned is REAL provenance.
  return services.map((s): RawResource => ({
    type: "CLOUD_RUN",
    source: "REAL",
    data: {
      name: s.name ?? "",
      serviceAccount: s.template?.serviceAccount ?? undefined,
      labels: s.labels ?? undefined,
      template: {
        containers: s.template?.containers?.map((c) => ({
          image: c.image ?? undefined,
          env: c.env
            ?.filter((e) => e.value != null)
            .map((e) => ({ name: e.name ?? "", value: e.value ?? "" })),
        })),
      },
    } satisfies CloudRunService,
  }));
}
