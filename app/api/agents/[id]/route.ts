// REST API — exposes a single Asset with its Detection and all Evidence. (README)
import { NextResponse } from "next/server";
import { getAgent } from "@/lib/persistence";

// One Asset by id, including its Detection and every piece of Evidence.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);

  if (!agent) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(agent);
}
