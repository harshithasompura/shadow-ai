// REST API - triggers a discovery→detection→scoring→persist run. Orchestrates only. (README)
import { NextResponse } from "next/server";
import { discoverAssets } from "@/lib/discovery";
import { detectAll } from "@/lib/detection";
import { scoreAll } from "@/lib/scoring";
import { saveResults } from "@/lib/persistence";

// Execute the complete pipeline and persist its results, then return a summary.
// Business logic lives in the layers; this route only wires them together.
export async function POST() {
  const assets = await discoverAssets();
  const scored = scoreAll(detectAll(assets));
  await saveResults(assets, scored);

  const agentsDetected = scored.filter((r) => r.detection.status !== "NOT_AI").length;

  return NextResponse.json({
    assetsDiscovered: assets.length,
    agentsDetected,
  });
}
