// Dashboard - visualizes persisted data only. Renders what the REST API returns;
// no detection, scoring, or confidence math here. (README > Dashboard)
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Asset, Detection } from "@/lib/types";
import { ConfidenceMeter, SourceTag, StatusPill, TypeLabel } from "./ui";

// Both endpoints return each Asset with its Detection(s) included.
type Agent = Asset & { detections: Detection[] };

export default function Home() {
  const [tab, setTab] = useState<"assets" | "agents">("assets");
  const [assets, setAssets] = useState<Agent[]>([]);
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

  const likely = agents.filter((a) => a.detections[0]?.status === "AI_LIKELY").length;
  const possible = agents.filter((a) => a.detections[0]?.status === "POSSIBLE_AI").length;
  const notAI = assets.filter((a) => a.detections[0]?.status === "NOT_AI").length;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Cloud AI posture</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Shadow AI Discovery Engine
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            Inventories workloads in a Google Cloud project and scores how likely each one is a
            hidden AI agent with the evidence behind every score.
          </p>
        </div>
        <button className="btn" onClick={runScan} disabled={scanning}>
          {scanning ? "Scanning…" : "Run scan"}
        </button>
      </header>

      {/* Posture summary - small, factual, not a hero. */}
      <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
        <Stat label="Assets" value={assets.length} />
        <Stat label="Agents" value={agents.length} />
        <Stat label="AI likely" value={likely} color="var(--likely)" />
        <Stat label="Possible" value={possible} color="var(--possible)" />
        <Stat label="Not AI" value={notAI} color="var(--not)" />
      </div>

      <nav className="mt-8 inline-flex gap-1 rounded-[0.8rem] bg-[var(--surface-2)] p-1 ring-1 ring-[var(--border)]">
        <button className="seg" data-on={tab === "assets"} onClick={() => setTab("assets")}>
          Assets
        </button>
        <button className="seg" data-on={tab === "agents"} onClick={() => setTab("agents")}>
          Agents
        </button>
      </nav>

      <div className="card mt-4 overflow-x-auto">
        {tab === "assets" ? (
          <table className="w-full text-sm">
            <thead>
              <Head cols={["Type", "Name", "Region", "Runtime", "Detection", "Source"]} />
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="row">
                  <Td><TypeLabel type={a.type} /></Td>
                  <Td><span className="font-medium">{a.name}</span></Td>
                  <Td><span className="mono text-xs text-[var(--muted)]">{a.region}</span></Td>
                  <Td>
                    <span className="mono text-xs text-[var(--muted)]">{a.runtime ?? "-"}</span>
                  </Td>
                  <Td>{a.detections[0] ? <StatusPill status={a.detections[0].status} /> : "-"}</Td>
                  <Td><SourceTag source={a.source} /></Td>
                </tr>
              ))}
              {assets.length === 0 && <Empty span={6} />}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <Head cols={["Name", "Status", "Confidence", "Runtime"]} />
            </thead>
            <tbody>
              {agents.map((a) => {
                const d = a.detections[0];
                return (
                  <tr key={a.id} className="row">
                    <Td>
                      <Link href={`/agents/${a.id}`} className="font-medium underline decoration-[var(--border)] underline-offset-4 hover:decoration-current">
                        {a.name}
                      </Link>
                    </Td>
                    <Td>{d ? <StatusPill status={d.status} /> : "-"}</Td>
                    <Td>{d ? <ConfidenceMeter confidence={d.confidence} status={d.status} /> : "-"}</Td>
                    <Td>
                      <span className="mono text-xs text-[var(--muted)]">{a.runtime ?? "-"}</span>
                    </Td>
                  </tr>
                );
              })}
              {agents.length === 0 && <Empty span={4} />}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .row { border-top: 1px solid var(--border); }
        .row:first-child { border-top: 0; }
        thead .row, thead tr { border: 0; }
      `}</style>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mono text-2xl tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="eyebrow mt-0.5">{label}</div>
    </div>
  );
}

function Head({ cols }: { cols: string[] }) {
  return (
    <tr>
      {cols.map((c) => (
        <th key={c} className="eyebrow px-4 py-3 text-left font-normal">
          {c}
        </th>
      ))}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>;
}

function Empty({ span }: { span: number }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-10 text-center text-sm text-[var(--muted)]">
        No results yet. Run a scan to populate the inventory.
      </td>
    </tr>
  );
}
