// Persistence layer — stores pipeline results, retrieves inventory. No business
// logic; only Prisma queries. (README > Responsibility Diagram: Persistence)
//
// Boundaries (README > Architecture Principles):
//   - Never discovers, normalizes, detects, or scores.
//   - Never imports GCP SDKs or Next.js request/response objects.
import { Prisma } from "@prisma/client";
import type { Asset, Detection, Evidence } from "@/lib/types";
import { prisma } from "./prisma";

// One scored asset: the Scoring layer's output for a single Asset.
type ScoredResult = { detection: Detection; evidence: Evidence[] };

// Nullable Json columns store DB NULL when the metadata is absent, so an update
// clears a value that a prior scan had set. (Plain null isn't valid for Json.)
const json = (v: Record<string, string> | null | undefined) => v ?? Prisma.DbNull;

// Asset columns, shared by upsert create/update. `type`/`source` are enums whose
// string literals match the Prisma-generated types.
function assetData(a: Asset) {
  return {
    name: a.name,
    type: a.type,
    region: a.region,
    runtime: a.runtime ?? null,
    serviceAccount: a.serviceAccount ?? null,
    labels: json(a.labels),
    environmentVariables: json(a.environmentVariables),
    source: a.source,
    lastSeen: a.lastSeen,
  };
}

// Persist a completed pipeline run: every Asset with its latest Detection and
// Evidence.
//
// `results` is the output of scoreAll(); it carries Detection + Evidence but not
// the Asset, so the assets are passed alongside (the orchestrator holds both).
//
//   - Assets match on their stable id (see normalizer), so repeated scans update
//     metadata in place instead of inserting duplicates.
//   - History is out of scope (README), so an asset's previous Detection and
//     Evidence are deleted and replaced with this scan's (cascade removes the old
//     Evidence with the old Detection).
// Uses the batch (array) form of $transaction rather than the interactive
// callback form: Neon's pooled connection drops the long-lived interactive
// transaction between round-trips, surfacing as Prisma P2028 "Transaction not
// found". The batch form sends all operations as one atomic unit, so there is no
// open transaction spanning multiple awaits.
export async function saveResults(assets: Asset[], results: ScoredResult[]): Promise<void> {
  const byAssetId = new Map(results.map((r) => [r.detection.assetId, r]));

  // Ordered operations: per asset, upsert → delete old Detection(s) → create the
  // new Detection with nested Evidence. $transaction([]) runs them in sequence.
  const operations = [];
  for (const asset of assets) {
    const result = byAssetId.get(asset.id);
    if (!result) continue; // detectAll produces a Detection per Asset; defensive only.
    const { detection, evidence } = result;

    operations.push(
      prisma.asset.upsert({
        where: { id: asset.id },
        create: { id: asset.id, ...assetData(asset) },
        update: assetData(asset),
      }),
      prisma.detection.deleteMany({ where: { assetId: asset.id } }),
      prisma.detection.create({
        data: {
          id: detection.id,
          assetId: asset.id,
          confidence: detection.confidence,
          status: detection.status,
          scannedAt: detection.scannedAt,
          evidence: {
            create: evidence.map((e) => ({
              id: e.id,
              indicatorType: e.indicatorType,
              value: e.value,
              message: e.message,
              weight: e.weight,
            })),
          },
        },
      }),
    );
  }

  await prisma.$transaction(operations);
}

// Every persisted Asset.
export function getAssets() {
  return prisma.asset.findMany();
}

// Only Assets whose Detection represents an AI workload (anything but NOT_AI),
// each with its Detection summary. One Detection per Asset — history is replaced.
export function getAgents() {
  return prisma.asset.findMany({
    where: { detections: { some: { status: { in: ["AI_LIKELY", "POSSIBLE_AI"] } } } },
    include: { detections: true },
  });
}

// A single Asset with its Detection and all Evidence, or null if not found.
export function getAgent(id: string) {
  return prisma.asset.findUnique({
    where: { id },
    include: { detections: { include: { evidence: true } } },
  });
}
