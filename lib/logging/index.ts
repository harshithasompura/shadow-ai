// Cloud Logging integration (Bonus 1, MVP). Detects AI API calls that static
// config misses - e.g. a workload that pulls its key from Secret Manager at
// runtime and only reveals itself by calling Vertex AI.
//
// ponytail: reads fixture Cloud Audit Log entries, not the live Cloud Logging
// API. A production version streams from a logging sink (or `entries.list`) and
// filters `protoPayload.methodName`; the parser below is unchanged by that swap.

// Shape of a Cloud Audit Log entry, trimmed to what we read.
interface LogEntry {
  protoPayload?: { methodName?: string };
  resource?: { labels?: { workload?: string } };
}

// Vertex AI generative methods worth flagging as a runtime AI call.
const VERTEX_METHOD = /(GenerateContent|StreamGenerateContent|Predict)$/;

// Representative entries: two GenerateContent calls from a workload whose static
// metadata carries no AI signal.
const FIXTURE_ENTRIES: LogEntry[] = [
  {
    protoPayload: { methodName: "google.cloud.aiplatform.v1.PredictionService.GenerateContent" },
    resource: { labels: { workload: "internal-tools" } },
  },
  {
    protoPayload: { methodName: "google.cloud.aiplatform.v1.PredictionService.GenerateContent" },
    resource: { labels: { workload: "internal-tools" } },
  },
];

// Parse entries into runtime AI calls keyed by workload name. Deduped: repeated
// calls of the same method collapse to one signal per workload.
export function runtimeCallsByWorkload(entries: LogEntry[] = FIXTURE_ENTRIES): Map<string, string[]> {
  const byWorkload = new Map<string, Set<string>>();
  for (const e of entries) {
    const method = e.protoPayload?.methodName;
    const workload = e.resource?.labels?.workload;
    if (!method || !workload || !VERTEX_METHOD.test(method)) continue;
    const label = `Vertex AI ${method.split(".").pop()}`;
    (byWorkload.get(workload) ?? byWorkload.set(workload, new Set()).get(workload)!).add(label);
  }
  return new Map([...byWorkload].map(([k, v]) => [k, [...v]]));
}
