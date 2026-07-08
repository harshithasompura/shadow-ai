// Dashboard — visualizes persisted data only. Renders what the REST API returns;
// no detection, scoring, or confidence math here. (README > Dashboard)
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Asset, Detection } from "@/lib/types";

// Agents endpoint returns each Asset with its Detection(s) included.
type Agent = Asset & { detections: Detection[] };

const th = "px-3 py-2 text-left font-medium text-zinc-500";
const td = "px-3 py-2 border-t border-zinc-200 dark:border-zinc-800";

export default function Home() {
  const [tab, setTab] = useState<"assets" | "agents">("assets");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(async () => {
    const [a, g] = await Promise.all([
      fetch("/api/assets").then((r) => r.json()),
      fetch("/api/agents").then((r) => r.json()),
    ]);
    setAssets(a);
    setAgents(g);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const [a, g] = await Promise.all([
        fetch("/api/assets").then((r) => r.json()),
        fetch("/api/agents").then((r) => r.json()),
      ]);
      if (active) {
        setAssets(a);
        setAgents(g);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function runScan() {
    setScanning(true);
    await fetch("/api/scan", { method: "POST" });
    await refresh();
    setScanning(false);
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shadow AI Discovery Engine</h1>
        <button
          onClick={runScan}
          disabled={scanning}
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          {scanning ? "Scanning…" : "Run Scan"}
        </button>
      </div>

      <nav className="mt-6 flex gap-4 text-sm">
        <button
          onClick={() => setTab("assets")}
          className={tab === "assets" ? "font-medium" : "text-zinc-500"}
        >
          Assets ({assets.length})
        </button>
        <button
          onClick={() => setTab("agents")}
          className={tab === "agents" ? "font-medium" : "text-zinc-500"}
        >
          Agents ({agents.length})
        </button>
      </nav>

      {tab === "assets" ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Type</th>
              <th className={th}>Region</th>
              <th className={th}>Runtime</th>
              <th className={th}>Source</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td className={td}>{a.name}</td>
                <td className={td}>{a.type}</td>
                <td className={td}>{a.region}</td>
                <td className={td}>{a.runtime ?? "—"}</td>
                <td className={td}>{a.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Confidence</th>
              <th className={th}>Status</th>
              <th className={th}>Region</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td className={td}>
                  <Link href={`/agents/${a.id}`} className="underline">
                    {a.name}
                  </Link>
                </td>
                <td className={td}>{a.detections[0]?.confidence ?? "—"}</td>
                <td className={td}>{a.detections[0]?.status ?? "—"}</td>
                <td className={td}>{a.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
