// Resource Normalizer — turns raw provider-shaped resources into Normalized Assets.
// No AI logic, no persistence; shape only. (README)
import type { Asset, RawResource } from "@/lib/types";

// Region lives in the GCP resource path: projects/{p}/locations/{region}/...
function regionFromName(name: string): string {
  return name.match(/\/locations\/([^/]+)\//)?.[1] ?? "unknown";
}

// Short, stable id from the full resource path (last path segment).
function shortName(name: string): string {
  return name.split("/").pop() ?? name;
}

function env(list?: { name: string; value: string }[]): Record<string, string> | null {
  if (!list?.length) return null;
  return Object.fromEntries(list.map((e) => [e.name, e.value]));
}

function normalizeOne(resource: RawResource, lastSeen: Date): Asset {
  const { type, source, data } = resource;
  const base = { type, source, lastSeen };

  switch (type) {
    case "CLOUD_RUN": {
      const d = data as {
        name: string;
        serviceAccount?: string;
        labels?: Record<string, string>;
        template?: { containers?: { image?: string; env?: { name: string; value: string }[] }[] };
      };
      const container = d.template?.containers?.[0];
      return {
        ...base,
        id: `cloud-run:${shortName(d.name)}`,
        name: shortName(d.name),
        region: regionFromName(d.name),
        runtime: container?.image ?? null,
        serviceAccount: d.serviceAccount ?? null,
        labels: d.labels ?? null,
        environmentVariables: env(container?.env),
      };
    }
    case "CLOUD_FUNCTION": {
      const d = data as {
        name: string;
        buildConfig?: { runtime?: string };
        serviceConfig?: { serviceAccountEmail?: string; environmentVariables?: Record<string, string> };
        labels?: Record<string, string>;
      };
      return {
        ...base,
        id: `cloud-function:${shortName(d.name)}`,
        name: shortName(d.name),
        region: regionFromName(d.name),
        runtime: d.buildConfig?.runtime ?? null,
        serviceAccount: d.serviceConfig?.serviceAccountEmail ?? null,
        labels: d.labels ?? null,
        environmentVariables: d.serviceConfig?.environmentVariables ?? null,
      };
    }
    case "GKE": {
      const d = data as {
        name: string;
        location: string;
        resourceLabels?: Record<string, string>;
        nodeConfig?: { serviceAccount?: string };
      };
      return {
        ...base,
        id: `gke:${d.name}`,
        name: d.name,
        region: d.location,
        runtime: null, // a cluster has no single container runtime
        serviceAccount: d.nodeConfig?.serviceAccount ?? null,
        labels: d.resourceLabels ?? null,
        environmentVariables: null,
      };
    }
    case "VERTEX_AI": {
      const d = data as {
        name: string;
        displayName?: string;
        labels?: Record<string, string>;
        deployedModels?: { model?: string; serviceAccount?: string }[];
      };
      const deployed = d.deployedModels?.[0];
      return {
        ...base,
        id: `vertex-ai:${shortName(d.name)}`,
        name: d.displayName ?? shortName(d.name),
        region: regionFromName(d.name),
        runtime: deployed?.model ? shortName(deployed.model) : null,
        serviceAccount: deployed?.serviceAccount ?? null,
        labels: d.labels ?? null,
        environmentVariables: null,
      };
    }
  }
}

export function normalize(resources: RawResource[]): Asset[] {
  const lastSeen = new Date();
  return resources.map((r) => normalizeOne(r, lastSeen));
}
