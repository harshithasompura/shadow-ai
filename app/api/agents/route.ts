// REST API - exposes detected AI workloads with confidence and status. (README)
import { NextResponse } from "next/server";
import { getAgents } from "@/lib/persistence";

// Only AI workloads. The persistence layer includes each Asset's Detection,
// which carries the confidence and status the endpoint must expose.
export async function GET() {
  return NextResponse.json(await getAgents());
}
