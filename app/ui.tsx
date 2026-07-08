// Shared presentational primitives for the dashboard. Pure rendering - no data
// fetching, no business logic (README > Dashboard).
import type { ReactNode } from "react";

const BAND: Record<string, { cls: string; label: string }> = {
  AI_LIKELY: { cls: "pill--likely", label: "AI likely" },
  POSSIBLE_AI: { cls: "pill--possible", label: "Possible AI" },
  NOT_AI: { cls: "pill--not", label: "Not AI" },
};

function bandColor(status: string): string {
  if (status === "AI_LIKELY") return "var(--likely)";
  if (status === "POSSIBLE_AI") return "var(--possible)";
  return "var(--not)";
}

export function StatusPill({ status }: { status: string }) {
  const b = BAND[status] ?? { cls: "pill--not", label: status };
  return <span className={`pill ${b.cls}`}>{b.label}</span>;
}

// The signature element: score as width, band as hue. Explainable at a glance.
export function ConfidenceMeter({
  confidence,
  status,
  size = "sm",
}: {
  confidence: number;
  status: string;
  size?: "sm" | "lg";
}) {
  const color = bandColor(status);
  return (
    <div className="flex items-center gap-3">
      <div className={`meter ${size === "lg" ? "w-full" : "w-24"}`} style={{ ["--meter-c" as string]: color }}>
        <span style={{ width: `${confidence}%` }} />
      </div>
      <span
        className={`mono ${size === "lg" ? "text-2xl" : "text-sm"} tabular-nums`}
        style={{ color }}
      >
        {confidence}
      </span>
    </div>
  );
}

export function SourceTag({ source }: { source: string }) {
  return <span className={`tag ${source === "REAL" ? "tag--real" : ""}`}>{source}</span>;
}

// Small monochrome glyphs per resource type (Lucide-style paths, inlined to
// avoid a dependency for four icons).
const PATHS: Record<string, ReactNode> = {
  CLOUD_RUN: <path d="M17.5 19a4.5 4.5 0 1 0 0-9h-1.8A6 6 0 1 0 5 15.6" />,
  CLOUD_FUNCTION: <path d="M7 20s2-1 2-4-2-4-2-4m10 0s-2 1-2 4 2 4 2 4M4 12h16" />,
  GKE: <path d="M12 2 4 6v6l8 4 8-4V6l-8-4Zm0 8v6m-8-4 8 4 8-4" />,
  VERTEX_AI: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />,
};

export function TypeIcon({ type }: { type: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ color: "var(--faint)", flexShrink: 0 }}
    >
      {PATHS[type] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

export function TypeLabel({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <TypeIcon type={type} />
      <span className="mono text-xs">{type}</span>
    </span>
  );
}
