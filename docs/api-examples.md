# Example API responses

Real responses captured from a live run (Cloud Run discovered live from GCP, the
other three resource types from representative fixtures). All payloads are JSON;
timestamps are ISO-8601 UTC.

Each asset is scored on two independent axes: **confidence** (`confidence` +
`status` - is this AI) and **risk** (`riskScore` + `riskLevel` + `riskFactors` -
why care). See [`ARCHITECTURE.md` §7](../ARCHITECTURE.md#7-risk-scoring-architecture).

Base URL in development: `http://localhost:3000`

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST` | `/api/scan` | Run a discovery → detection → scoring → risk → persist pass |
| `GET`  | `/api/assets` | Every discovered asset, with its detection band and risk level |
| `GET`  | `/api/agents` | Only assets scored as AI workloads |
| `GET`  | `/api/agents/{id}` | One asset with its detection, full evidence, and risk factors |

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

The full inventory. Each asset carries its latest detection - both the AI band
and the risk level. The example below is the one `REAL` asset (discovered live
from Cloud Run): a plain hello-world service scored `NOT_AI`, yet `MEDIUM` risk.
Its risk comes straight from live GCP data - a public ingress and the default
compute service account - which is exactly why risk is scored for every asset,
not only AI agents.

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
    "publicAccess": true,
    "loggingEnabled": null,
    "source": "REAL",
    "lastSeen": "2026-07-14T12:18:42.624Z",
    "detections": [
      {
        "id": "detection:cloud-run:hello-world",
        "assetId": "cloud-run:hello-world",
        "confidence": 0,
        "status": "NOT_AI",
        "riskScore": 40,
        "riskLevel": "MEDIUM",
        "scannedAt": "2026-07-14T12:18:42.625Z"
      }
    ]
  }
]
```

*(8 assets total; one shown.)*

---

## `GET /api/agents`

Only assets whose detection is an AI workload (`AI_LIKELY` or `POSSIBLE_AI`). The
four span both axes: confidence 100/80/80/40, and risk from `HIGH` down to `LOW`.

```bash
curl http://localhost:3000/api/agents
```

```json
[
  {
    "id": "cloud-function:embed-documents",
    "name": "embed-documents",
    "type": "CLOUD_FUNCTION",
    "publicAccess": true,
    "loggingEnabled": false,
    "source": "FIXTURE",
    "detections": [
      {
        "confidence": 100,
        "status": "AI_LIKELY",
        "riskScore": 60,
        "riskLevel": "HIGH"
      }
    ]
  },
  {
    "id": "gke:llm-inference",
    "name": "llm-inference",
    "type": "GKE",
    "serviceAccount": "507476480861-compute@developer.gserviceaccount.com",
    "source": "FIXTURE",
    "detections": [
      {
        "confidence": 80,
        "status": "AI_LIKELY",
        "riskScore": 20,
        "riskLevel": "MEDIUM"
      }
    ]
  }
]
```

*(4 agents total; two shown, trimmed to the scored fields. `rag-chat-endpoint`
is 80 confidence / LOW risk, `support-router` is 40 confidence / LOW risk.)*

---

## `GET /api/agents/{id}`

One asset with **both ledgers**: the `evidence` behind the AI score and the
`riskFactors` behind the risk score. Every risk factor states its `basis` -
`OBSERVED` (directly collected from metadata) or `HEURISTIC` (inferred; see
ARCHITECTURE §7). This asset is the high-risk case: confidence 100 (`AI_LIKELY`)
and risk 60 (`HIGH`) from three factors.

```bash
curl http://localhost:3000/api/agents/cloud-function:embed-documents
```

```json
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
    "OPENAI_API_KEY": "sk-***",
    "EMBEDDING_MODEL": "text-embedding-3-large"
  },
  "publicAccess": true,
  "loggingEnabled": false,
  "source": "FIXTURE",
  "lastSeen": "2026-07-14T12:18:42.624Z",
  "detections": [
    {
      "id": "detection:cloud-function:embed-documents",
      "confidence": 100,
      "status": "AI_LIKELY",
      "riskScore": 60,
      "riskLevel": "HIGH",
      "scannedAt": "2026-07-14T12:18:42.626Z",
      "evidence": [
        {
          "indicatorType": "ENV_VAR",
          "value": "OPENAI_API_KEY",
          "message": "Environment variable \"OPENAI_API_KEY\" references an AI provider or SDK.",
          "weight": 0.9
        }
      ],
      "riskFactors": [
        {
          "ruleId": "external-llm",
          "title": "External LLM egress",
          "points": 30,
          "basis": "OBSERVED",
          "message": "Sends data to a third-party LLM provider (external-provider API key present)."
        },
        {
          "ruleId": "public-endpoint",
          "title": "Public endpoint",
          "points": 20,
          "basis": "OBSERVED",
          "message": "Reachable from the public internet (ingress allows all traffic)."
        },
        {
          "ruleId": "no-logging",
          "title": "Logging disabled",
          "points": 10,
          "basis": "HEURISTIC",
          "message": "No logging configured, so its activity is unaudited (inferred from deployment config)."
        }
      ]
    }
  ]
}
```

*(Evidence trimmed to one of three entries for brevity; the full response lists
all `ENV_VAR` indicators.)*

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
