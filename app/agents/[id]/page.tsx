// Agent detail — asset info, its Detection, and the Evidence behind the score.
// Renders persisted data only. (README > Dashboard)
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Asset, Detection, Evidence } from "@/lib/types";

// Detail endpoint nests Evidence under each Detection.
type Agent = Asset & { detections: (Detection & { evidence: Evidence[] })[] };

const th = "px-3 py-2 text-left font-medium text-zinc-500";
const td = "px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 align-top";

export default function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${id}`).then((r) => (r.ok ? r.json() : null)).then(setAgent);
  }, [id]);

  if (!agent) {
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm text-zinc-500">Loading…</main>
    );
  }

  const detection = agent.detections[0];

  return (
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/" className="text-sm text-zinc-500 underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-xl font-semibold">{agent.name}</h1>

      <h2 className="mt-6 text-sm font-medium text-zinc-500">Asset</h2>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {[
            ["Type", agent.type],
            ["Region", agent.region],
            ["Runtime", agent.runtime ?? "—"],
            ["Service account", agent.serviceAccount ?? "—"],
            ["Source", agent.source],
          ].map(([k, v]) => (
            <tr key={k}>
              <td className={`${td} w-40 text-zinc-500`}>{k}</td>
              <td className={td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {detection && (
        <>
          <h2 className="mt-6 text-sm font-medium text-zinc-500">Detection</h2>
          <table className="mt-2 w-full text-sm">
            <tbody>
              <tr>
                <td className={`${td} w-40 text-zinc-500`}>Confidence</td>
                <td className={td}>{detection.confidence}</td>
              </tr>
              <tr>
                <td className={`${td} w-40 text-zinc-500`}>Status</td>
                <td className={td}>{detection.status}</td>
              </tr>
            </tbody>
          </table>

          <h2 className="mt-6 text-sm font-medium text-zinc-500">Evidence</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr>
                <th className={th}>Indicator</th>
                <th className={th}>Value</th>
                <th className={th}>Message</th>
                <th className={th}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {detection.evidence.map((e) => (
                <tr key={e.id}>
                  <td className={td}>{e.indicatorType}</td>
                  <td className={td}>{e.value}</td>
                  <td className={td}>{e.message}</td>
                  <td className={td}>{e.weight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
