# Shadow AI Discovery Engine

A lightweight AI asset discovery platform that scans a Google Cloud project, inventories cloud workloads, identifies likely AI agents using explainable heuristics, and exposes the results through a REST API and dashboard.

## System Architecture

The system is organized as a linear processing pipeline where each layer has exactly one responsibility and communicates only with the adjacent layer.

                   Google Cloud Project
                           │
                  Service Account Auth
                           │
                           ▼
                 Discovery Layer
          ┌──────────┬──────────┬──────────┬──────────┐
          │          │          │          │
      Cloud Run   Functions    GKE     Vertex AI
          │
          ▼
             Raw Cloud Resources
                     │
                     ▼
             Resource Normalizer
                     │
                     ▼
              Normalized Assets
                     │
                     ▼
             Detection Engine
         (heuristics & indicators)
                     │
                     ▼
          Evidence Collection
                     │
                     ▼
            Confidence Scoring
                     │
                     ▼
                Persist Results
                     │
                     ▼
               Asset Inventory
              (Postgres/Prisma)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      REST API             Dashboard

Every step has one responsibility.

## Domain Model

The system models discovered infrastructure independently from AI analysis.

Assets represent cloud resources.

Detections represent the outcome of analyzing an asset.

Evidence represents both the machine-readable indicators and the human-readable explanations that contributed to a detection's confidence score.

Asset
─────
id
name
type
region
runtime
serviceAccount
labels
environmentVariables
source        (REAL | FIXTURE)
lastSeen

Detection
─────────
id
assetId
confidence     (0–100)
status         (AI_LIKELY | POSSIBLE_AI | NOT_AI)
scannedAt

Detection.status is assigned by the Scoring layer from the confidence score:

- confidence >= 70  → AI_LIKELY
- confidence >= 40  → POSSIBLE_AI
- confidence <  40  → NOT_AI

(Before scoring, a freshly detected asset carries a PENDING status.)

Evidence
────────
id
detectionId
indicatorType
value
message
weight

### Responsibility Diagram

Discovery
    │
    ├── Collect cloud resources
    └── No AI logic

Detection
    │
    ├── Identify AI indicators
    └── Produce evidence

Scoring
    │
    ├── Calculate confidence
    └── Explain reasoning

Persistence
    │
    ├── Store results
    └── Retrieve inventory

API
    │
    └── Expose data

Dashboard
    │
    └── Visualize data

### Locked Engineering Decisions

Tech stack:

- Next.js (App Router)
- TypeScript
- Prisma
- Neon Postgres
- Official Google Cloud SDKs

Resource Discovery:

- Cloud Run uses live GCP API discovery.
- Cloud Functions, GKE, and Vertex AI use representative fixture data.
- Do not expand live discovery beyond Cloud Run during this implementation.

Detection:

- Static heuristic detection only.
- Confidence scoring must be transparent and explainable.

Architecture Principles:

These principles are intentionally fixed for this implementation.

- Discovery only discovers cloud resources.
- Detection never communicates with GCP.
- Scoring only evaluates evidence.
- Persistence contains no business logic.
- API routes orchestrate but do not implement business logic.
- Dashboard only renders persisted data.

Out of scope:

- Authentication
- Background jobs
- Cloud Logging integration
- Production error handling
- Bonus features

## Personal Milestones

This prototype focuses on demonstrating:

- Cloud resource discovery
- Explainable AI workload detection
- Clean layered architecture
- Simple REST APIs
- A lightweight dashboard

It intentionally prioritizes architectural clarity over exhaustive cloud coverage.

### Production Consideration

To keep the prototype simple, detections record their own `scannedAt` timestamp rather than belonging to a separate `Scan` entity.

A production implementation would introduce a `Scan` aggregate to preserve scan history, support comparisons between scans, and enable incremental rescanning.
