// REST API — triggers a discovery→detection→scoring→persist run. Orchestrates only. (README)
import { NextResponse } from "next/server";

// TODO: orchestrate the pipeline in the API milestone.
export function POST() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
