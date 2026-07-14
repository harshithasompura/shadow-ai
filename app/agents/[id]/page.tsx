// Agent detail - asset info, its Detection, and the Evidence behind the score.
// Renders persisted data only. (README > Dashboard)
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Asset, Detection, Evidence, RiskFactor } from "@/lib/types";
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

function Fact({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-36 shrink-0 text-sm text-[var(--muted)]">{k}</dt>
      <dd className={`min-w-0 flex-1 break-words text-sm ${mono ? "mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
