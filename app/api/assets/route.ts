// REST API — exposes persisted asset inventory. Orchestrates, no business logic. (README)
import { NextResponse } from "next/server";

// TODO: return inventory from the persistence layer in the API milestone.
export function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
