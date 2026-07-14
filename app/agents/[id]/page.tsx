// Agent detail - asset info, its Detection, and the Evidence behind the score.
// Renders persisted data only. (README > Dashboard)
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Asset, Detection, Evidence, RiskFactor } from "@/lib/types";
import { relationships } from "@/lib/graph";
import { ConfidenceMeter, RiskPill, SourceTag, StatusPill, TypeLabel } from "../../ui";

// Detail endpoint nests Evidence and RiskFactors under each Detection.
type Agent = Asset & {
  detections: (Detection & { evidence: Evidence[]; riskFactors: RiskFactor[] })[];
};

export default function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${id}`).then((r) => (r.ok ? r.json() : null)).then(setAgent);
  }, [id]);

  if (!agent) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-[var(--muted)]">Loading…</main>;
  }

  const detection = agent.detections[0];

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link href="/" className="eyebrow hover:text-[var(--text)]">
        ← Back to inventory
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
        {detection && <StatusPill status={detection.status} />}
        {detection && <RiskPill level={detection.riskLevel} score={detection.riskScore} />}
      </div>
      <div className="mt-2">
        <TypeLabel type={agent.type} />
      </div>

      {/* Score - the headline judgement, shown large. */}
      {detection && (
        <section className="card mt-6 p-5">
          <p className="eyebrow">Confidence score</p>
          <div className="mt-3">
            <ConfidenceMeter confidence={detection.confidence} status={detection.status} size="lg" />
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Summed from {detection.evidence.length}{" "}
            {detection.evidence.length === 1 ? "indicator" : "indicators"} below. Higher-weight
            signals (an API key, a served model) move the score more than a self-declared label.
          </p>
        </section>
      )}

      {/* Evidence ledger - every reason that contributed, and by how much. */}
      {detection && (
        <section className="mt-8">
          <p className="eyebrow">Evidence · why this score</p>
          <ul className="mt-3 space-y-2">
            {detection.evidence.map((e) => (
              <li key={e.id} className="card flex items-start gap-3 p-4">
                <span className="mt-0.5 shrink-0" style={{ color: "var(--real)" }} aria-hidden>
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tag">{e.indicatorType}</span>
                    <span className="mono text-xs text-[var(--muted)]">{e.value}</span>
                  </div>
                  <p className="mt-1.5 text-sm">{e.message}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="meter w-32" style={{ ["--meter-c" as string]: "var(--faint)" }}>
                      <span style={{ width: `${e.weight * 100}%` }} />
                    </div>
                    <span className="mono text-xs text-[var(--muted)]">weight {e.weight.toFixed(2)}</span>
                  </div>
                </div>
              </li>
            ))}
            {detection.evidence.length === 0 && (
              <li className="card p-4 text-sm text-[var(--muted)]">
                No AI indicators fired. This asset was analyzed and found unlikely to be an AI workload.
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Risk ledger - why should I care. The second ledger beside the evidence. */}
      {detection && (
        <section className="mt-8">
          <p className="eyebrow">Risk factors · why should I care</p>
          {detection.riskFactors.length === 0 ? (
            <p className="card mt-3 p-4 text-sm text-[var(--muted)]">
              No risk factors fired. Score {detection.riskScore}, level {detection.riskLevel}.
            </p>
          ) : (
            (["OBSERVED", "HEURISTIC"] as const).map((basis) => {
              const group = detection.riskFactors.filter((f) => f.basis === basis);
              if (group.length === 0) return null;
              return (
                <div key={basis} className="mt-3">
                  <p className="mb-2 text-xs font-medium text-[var(--muted)]">
                    {basis === "OBSERVED" ? "Observed" : "Heuristic"}
                    <span className="text-[var(--faint)]">
                      {basis === "OBSERVED" ? " · directly collected" : " · inferred signal"}
                    </span>
                  </p>
                  <ul className="space-y-2">
                    {group.map((f) => (
                      <li key={f.id} className="card flex items-start gap-3 p-4">
                        <span className="mono mt-0.5 shrink-0 text-sm" style={{ color: "var(--likely)" }}>
                          +{f.points}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{f.title}</span>
                            <span className="tag">{basis === "OBSERVED" ? "OBSERVED" : "HEURISTIC"}</span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--muted)]">{f.message}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      )}

      {/* Dependency view - the asset's blast radius, derived from metadata. */}
      <Dependencies agent={agent} />

      {/* Asset facts. */}
      <section className="mt-8">
        <p className="eyebrow">Asset</p>
        <dl className="card mt-3 divide-y divide-[var(--border)]">
          <Fact k="Region" v={agent.region} />
          <Fact k="Runtime" v={agent.runtime ?? "-"} mono />
          <Fact k="Service account" v={agent.serviceAccount ?? "-"} mono />
          <Fact k="Provenance" v={<SourceTag source={agent.source} />} />
          <Fact
            k="Last seen"
            v={new Date(agent.lastSeen).toLocaleString()}
            mono
          />
          {agent.environmentVariables && (
            <Fact
              k="Environment"
              v={
                <div className="flex flex-col gap-1">
                  {Object.keys(agent.environmentVariables).map((key) => (
                    <span key={key} className="mono text-xs">{key}</span>
                  ))}
                </div>
              }
            />
          )}
        </dl>
      </section>
    </main>
  );
}

// Kind -> node accent. External egress (an LLM) reads as the one to notice.
const EDGE_COLOR: Record<string, string> = {
  identity: "var(--faint)",
  llm: "var(--likely)",
  vertex: "var(--possible)",
  vectorstore: "var(--possible)",
  model: "var(--not)",
};

function truncate(s: string, n = 30) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Node-link diagram: the asset hub on the left, its dependencies fanned to the
// right, one edge per relationship. Inline SVG - no graph library.
function Dependencies({ agent }: { agent: Agent }) {
  const edges = relationships(agent);
  if (edges.length === 0) return null;

  const rowH = 60;
  const padY = 16;
  const H = edges.length * rowH + padY * 2;
  const W = 660;
  const hubX = 12;
  const hubW = 210;
  const hubCx = hubX + hubW;
  const hubCy = H / 2;
  const nodeX = 392;
  const nodeW = 256;
  const cy = (i: number) => padY + i * rowH + rowH / 2;

  return (
    <section className="mt-8">
      <p className="eyebrow">Dependencies · blast radius</p>
      <div className="card mt-3 overflow-x-auto p-4">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, height: "auto" }} role="img"
          aria-label={`${agent.name} dependency graph`}>
          {/* edges */}
          {edges.map((e, i) => {
            const y = cy(i);
            const mx = (hubCx + nodeX) / 2;
            return (
              <path key={"p" + e.kind + e.target}
                d={`M ${hubCx} ${hubCy} C ${mx} ${hubCy}, ${mx} ${y}, ${nodeX} ${y}`}
                fill="none" stroke={EDGE_COLOR[e.kind]} strokeWidth={1.5} opacity={0.55} />
            );
          })}

          {/* hub node */}
          <rect x={hubX} y={hubCy - 26} width={hubW} height={52} rx={12}
            fill="var(--surface)" stroke="var(--text)" strokeWidth={1.5} />
          <text x={hubX + 16} y={hubCy - 6} fontSize={10} fill="var(--faint)"
            fontFamily="var(--font-geist-mono), monospace">{agent.type}</text>
          <text x={hubX + 16} y={hubCy + 13} fontSize={14} fill="var(--text)" fontWeight={600}>
            {truncate(agent.name, 22)}
          </text>

          {/* dependency nodes */}
          {edges.map((e, i) => {
            const y = cy(i);
            const c = EDGE_COLOR[e.kind];
            return (
              <g key={"n" + e.kind + e.target}>
                <circle cx={nodeX} cy={y} r={3} fill={c} />
                <rect x={nodeX + 12} y={y - 20} width={nodeW} height={40} rx={10}
                  fill="var(--surface)" stroke={c} strokeWidth={1.25} />
                <text x={nodeX + 26} y={y - 4} fontSize={9.5} fill={c}
                  fontFamily="var(--font-geist-mono), monospace"
                  letterSpacing="0.06em">{e.relation.toUpperCase()}</text>
                <text x={nodeX + 26} y={y + 12} fontSize={13} fill="var(--text)"
                  fontFamily="var(--font-geist-mono), monospace">{truncate(e.target)}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function Fact({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-36 shrink-0 text-sm text-[var(--muted)]">{k}</dt>
      <dd className={`min-w-0 flex-1 break-words text-sm ${mono ? "mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
