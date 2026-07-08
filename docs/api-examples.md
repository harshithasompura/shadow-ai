# Example API responses

Real responses captured from a live run (Cloud Run discovered live from GCP,
the other three resource types from representative fixtures). All payloads are
JSON; timestamps are ISO-8601 UTC.

Base URL in development: `http://localhost:3000`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/scan` | Run a discovery → detection → scoring → persist pass |
| `GET`  | `/api/assets` | Every discovered asset, with its detection band |
| `GET`  | `/api/agents` | Only assets scored as AI workloads |
| `GET`  | `/api/agents/{id}` | One asset with its detection and full evidence |

---

## `POST /api/scan`

Triggers the pipeline and returns a summary. Idempotent per asset - a rescan
updates existing assets in place rather than duplicating them.

```bash
curl -X POST http://localhost:3000/api/scan
```

```json
{
  "assetsDiscovered": 8,
  "agentsDetected": 4
}
```

---

## `GET /api/assets`

The full inventory. Each asset carries its latest detection so the dashboard can
show the band for **every** asset - including `NOT_AI`, which `/api/agents`
omits. Note the first asset is `REAL` (discovered live from Cloud Run) and
scored `NOT_AI` - a plain hello-world service with no AI signal.

```bash
curl http://localhost:3000/api/assets
```

```json
[
  {
    "id": "cloud-run:hello-world",
    "name": "hello-world",
    "type": "CLOUD_RUN",
    "region": "us-central1",
    "runtime": "us-docker.pkg.dev/cloudrun/container/hello",
    "serviceAccount": "507476480861-compute@developer.gserviceaccount.com",
    "labels": {},
    "environmentVariables": null,
    "source": "REAL",
    "lastSeen": "2026-07-08T15:38:41.398Z",
    "detections": [
      {
        "id": "detection:cloud-run:hello-world",
        "assetId": "cloud-run:hello-world",
        "confidence": 0,
        "status": "NOT_AI",
        "scannedAt": "2026-07-08T15:38:41.399Z"
      }
    ]
  },
  {
    "id": "cloud-function:embed-documents",
    "name": "embed-documents",
    "type": "CLOUD_FUNCTION",
    "region": "us-central1",
    "runtime": "python311",
    "serviceAccount": "embed-fn@shadow-ai.iam.gserviceaccount.com",
    "labels": { "env": "prod", "team": "search" },
    "environmentVariables": {
      "VECTOR_DB_URL": "https://pinecone.example",
      "EMBEDDING_MODEL": "text-embedding-3-large"
    },
    "source": "FIXTURE",
    "lastSeen": "2026-07-08T15:38:41.398Z",
    "detections": [
      {
        "id": "detection:cloud-function:embed-documents",
        "assetId": "cloud-function:embed-documents",
        "confidence": 100,
        "status": "AI_LIKELY",
        "scannedAt": "2026-07-08T15:38:41.399Z"
      }
    ]
  }
]
```

*(8 assets total; two shown.)*

---

## `GET /api/agents`

Only assets whose detection is an AI workload (`AI_LIKELY` or `POSSIBLE_AI`).
The four returned here span the confidence range - 100, 80, 80, and 40 - which
is what makes the graded score visible rather than binary.

```bash
curl http://localhost:3000/api/agents
```

```json
[
  {
    "id": "cloud-function:embed-documents",
    "name": "embed-documents",
    "type": "CLOUD_FUNCTION",
    "region": "us-central1",
    "runtime": "python311",
    "serviceAccount": "embed-fn@shadow-ai.iam.gserviceaccount.com",
    "labels": { "env": "prod", "team": "search" },
    "environmentVariables": {
      "VECTOR_DB_URL": "https://pinecone.example",
      "EMBEDDING_MODEL": "text-embedding-3-large"
    },
    "source": "FIXTURE",
    "lastSeen": "2026-07-08T15:38:41.398Z",
    "detections": [
      {
        "id": "detection:cloud-function:embed-documents",
        "assetId": "cloud-function:embed-documents",
        "confidence": 100,
        "status": "AI_LIKELY",
        "scannedAt": "2026-07-08T15:38:41.399Z"
      }
    ]
  },
  {
    "id": "gke:llm-inference",
    "name": "llm-inference",
    "type": "GKE",
    "region": "us-central1",
    "runtime": null,
    "serviceAccount": "gke-inference@shadow-ai.iam.gserviceaccount.com",
    "labels": { "env": "prod", "team": "ml-platform", "workload": "vllm" },
    "environmentVariables": null,
    "source": "FIXTURE",
    "lastSeen": "2026-07-08T15:38:41.398Z",
    "detections": [
      {
        "id": "detection:gke:llm-inference",
        "assetId": "gke:llm-inference",
        "confidence": 80,
        "status": "AI_LIKELY",
        "scannedAt": "2026-07-08T15:38:41.399Z"
      }
    ]
  }
]
```

*(4 agents total; two shown. The other two are `rag-chat-endpoint` at 80 and
`support-router` at 40 - see below.)*

---

## `GET /api/agents/{id}`

One asset with its detection and the **full evidence** behind the score. This is
the explainability payload: every indicator that fired, its weight, and a
human-readable reason.

The example below is the `POSSIBLE_AI` case, which is the most instructive: the
workload self-declares with an `ai=true` label but exposes no API key, model, or
framework. That single weak signal (weight `0.4`) lands it at confidence `40` -
possible, but unconfirmed.

```bash
curl http://localhost:3000/api/agents/cloud-function:support-router
```

```json
{
  "id": "cloud-function:support-router",
  "name": "support-router",
  "type": "CLOUD_FUNCTION",
  "region": "us-central1",
  "runtime": "nodejs20",
  "serviceAccount": "support-router@shadow-ai.iam.gserviceaccount.com",
  "labels": { "ai": "true", "env": "prod", "team": "cx" },
  "environmentVariables": { "QUEUE_URL": "https://tasks.example/support" },
  "source": "FIXTURE",
  "lastSeen": "2026-07-08T15:38:41.398Z",
  "detections": [
    {
      "id": "detection:cloud-function:support-router",
      "assetId": "cloud-function:support-router",
      "confidence": 40,
      "status": "POSSIBLE_AI",
      "scannedAt": "2026-07-08T15:38:41.399Z",
      "evidence": [
        {
          "id": "detection:cloud-function:support-router:evidence:0",
          "detectionId": "detection:cloud-function:support-router",
          "indicatorType": "LABEL",
          "value": "ai=true",
          "message": "Label \"ai=true\" self-declares an AI workload.",
          "weight": 0.4
        }
      ]
    }
  ]
}
```

A high-confidence agent (`embed-documents`, confidence 100) returns two
`ENV_VAR` evidence entries (`VECTOR_DB_URL`, `EMBEDDING_MODEL`), each weight
`0.9`, summed and capped at 100.

### Not found

```bash
curl -i http://localhost:3000/api/agents/does-not-exist
```

```
HTTP/1.1 404 Not Found
```

```json
{ "error": "Not found" }
```
