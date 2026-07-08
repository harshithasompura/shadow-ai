// REST API — exposes persisted asset inventory. Orchestrates, no business logic. (README)
import { NextResponse } from "next/server";
import { getAssets } from "@/lib/persistence";

// Every persisted Asset, straight from the persistence layer.
export async function GET() {
  return NextResponse.json(await getAssets());
}
