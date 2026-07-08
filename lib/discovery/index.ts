// Discovery layer — collects cloud resources and hands normalized Assets to the
// next stage. No AI logic, no persistence. (README)
import type { Asset, RawResource } from "@/lib/types";
import { normalize } from "@/lib/normalizer";
import { discoverCloudRun } from "./cloud-run";
import { discoverCloudFunctions } from "./fixtures/cloud-functions";
import { discoverGke } from "./fixtures/gke";
import { discoverVertexAi } from "./fixtures/vertex-ai";

// Collect raw resources from every source. Cloud Run is live; the rest are fixtures.
export async function discoverRawResources(): Promise<RawResource[]> {
  const cloudRun = await discoverCloudRun();
  return [...cloudRun, ...discoverCloudFunctions(), ...discoverGke(), ...discoverVertexAi()];
}

// Discovery's output to the adjacent layer: normalized Assets.
export async function discoverAssets(): Promise<Asset[]> {
  return normalize(await discoverRawResources());
}
