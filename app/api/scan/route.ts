// REST API - triggers a discovery→detection→scoring→persist run. Orchestrates only. (README)
import { NextResponse } from "next/server";
import { discoverAssets } from "@/lib/discovery";
import { detectAll } from "@/lib/detection";
import { scoreAll } from "@/lib/scoring";
import { assessRisk } from "@/lib/risk";
import { saveResults } from "@/lib/persistence";

// Execute the complete pipeline and persist its results, then return a summary.
// Business logic lives in the layers; this route only wires them together.
export async function POST() {
  const assets = await discoverAssets();
  const byId = new Map(assets.map((a) => [a.id, a]));

  // Confidence (is it AI) and risk (why care) are scored on the same Evidence,
  // as two independent axes.
  const assessed = scoreAll(detectAll(assets)).map((r) => {
    const asset = byId.get(r.detection.assetId)!;
    return { ...r, risk: assessRisk(asset, r.evidence) };
  });
  await saveResults(assets, assessed);

  const agentsDetected = assessed.filter((r) => r.detection.status !== "NOT_AI").length;

  return NextResponse.json({
    assetsDiscovered: assets.length,
    agentsDetected,
  });
}
