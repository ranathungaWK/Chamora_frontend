// src/pages/ReportPage.tsx
//
// Chamora — Performance Report page (route: /report/:appId)
// Self-contained: fetches anomaly data, summarizes client-side, renders a
// polished report, and downloads via browser print-to-PDF (no extra deps).
//
// TO WIRE UP:
//   1. Add to createBrowserRouter:  { path: "/report/:appId", element: <ReportPage /> }
//   2. Import as a named export:     import { ReportPage } from "./pages/ReportPage";
//   3. Add the "Generate Report" button on ApplicationDashboard (snippet in chat).

import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FileText, Download, ArrowLeft, AlertTriangle, Activity,
  MemoryStick, ShieldCheck, ShieldAlert, ShieldX, Loader2,
  Lightbulb, Wrench, ChevronRight,
} from "lucide-react";
import { buildApiUrl } from "../api";

// ── Detected anomalies (Anomaly Flags) endpoint ─────────────────────────────
const ANOMALIES_ENDPOINT = (appId: string) =>
  buildApiUrl(`/api/v1/anomaly-flags/application/${appId}`);

// ── Recommendations endpoint (backend RAG + Groq) ───────────────────────────
const RECOMMENDATIONS_ENDPOINT = (appId: string) =>
  buildApiUrl(`/api/v1/reports/${appId}/recommendations`);

// ── Types ───────────────────────────────────────────────────────────────────
interface Evidence {
  error_rate: number;
  has_restart: boolean;
  latency_p95: number;
  latency_std: number;
  disk_io_rate: number;
  memory_usage: number;
  restart_flag: number;
  cpu_usage_rate: number;
  failure_streak: number;
  net_throughput: number;
  memory_pressure: number;
  memory_growth_rate: number;
  cpu_container_vs_node_ratio: number;
}
interface Anomaly {
  id: string;
  application_id: number;
  config_id: number;
  window_timestamp: string;
  score: number;
  severity: string;
  root_cause: string | null;
  evidence: Evidence;
  created_at: string;
  withinTestingPeriod: boolean | null;
}

// ── Formatting helpers (the raw units are easy to misread) ───────────────────
const LATENCY_SENTINEL = 99; // latency_p95 ≈ 99.99 means timeout / no response

const fmtLatency = (s: any) => {
  const n = typeof s === "number" ? s : parseFloat(s);
  if (!Number.isFinite(n)) return "—";
  return n >= LATENCY_SENTINEL ? "timeout" : `${(n * 1000).toFixed(1)} ms`;
};
const fmtPct = (v: any) => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? `${(n * 100).toFixed(0)}%` : "—";
};

const parseTs = (ts: string) => {
  // "2026-06-08 07:32:28.674489+00" → safe across browsers
  const cleaned = ts.replace(" ", "T").replace(/\.\d+/, "").replace("+00", "Z");
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
};
const fmtTime = (ts: string) => {
  const d = parseTs(ts);
  return d
    ? d.toLocaleString(undefined, {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : ts;
};

// ── Testing window vs baseline comparison ────────────────────────────────────
// NaN-safe: ignore missing / null / non-numeric values so one bad record
// doesn't poison an average.
const num = (v: any): number | null => {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const mean = (xs: any[]) => {
  const vals = xs.map(num).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((s, n) => s + n, 0) / vals.length : 0;
};

function verdictFor(cur: number, base: number, threshold = 10) {
  // all metrics here are "higher is worse"
  if (base === 0 && cur === 0) return { verdict: "stable" as const, pct: 0 };
  if (base === 0) return { verdict: "regressed" as const, pct: null };
  const pct = ((cur - base) / Math.abs(base)) * 100;
  const verdict =
    pct >= threshold ? ("regressed" as const)
    : pct <= -threshold ? ("improved" as const)
    : ("stable" as const);
  return { verdict, pct };
}

function compareCycles(current: Anomaly[], baseline: Anomaly[]) {
  // latency: exclude timeout sentinels (99.99) so the mean isn't blown out
  const avgLatency = (xs: Anomaly[]) =>
    mean(xs.map((a) => a.evidence.latency_p95).filter((v) => v < LATENCY_SENTINEL));
  const timeouts = (xs: Anomaly[]) =>
    xs.filter((a) => a.evidence.latency_p95 >= LATENCY_SENTINEL).length;
  const restarts = (xs: Anomaly[]) =>
    xs.filter((a) => a.evidence.restart_flag >= 1).length;

  const rows = [
    {
      label: "Error rate",
      cur: mean(current.map((a) => a.evidence.error_rate)),
      base: mean(baseline.map((a) => a.evidence.error_rate)),
      fmt: fmtPct,
    },
    {
      label: "Memory pressure",
      cur: mean(current.map((a) => a.evidence.memory_pressure)),
      base: mean(baseline.map((a) => a.evidence.memory_pressure)),
      fmt: fmtPct,
    },
    {
      label: "Latency p95 (avg)",
      cur: avgLatency(current),
      base: avgLatency(baseline),
      fmt: (v: number) => (v ? `${(v * 1000).toFixed(0)} ms` : "—"),
      note: timeouts(current) > 0 ? `${timeouts(current)} timeouts` : undefined,
    },
    {
      label: "Critical rate",
      cur: current.length ? current.filter((a) => a.severity === "CRITICAL").length / current.length : 0,
      base: baseline.length ? baseline.filter((a) => a.severity === "CRITICAL").length / baseline.length : 0,
      fmt: fmtPct,
    },
    {
      label: "Restarts",
      cur: restarts(current),
      base: restarts(baseline),
      fmt: (v: number) => String(Math.round(v)),
    },
  ];

  return rows.map((r) => ({ ...r, ...verdictFor(r.cur, r.base) }));
}
type CycleRow = ReturnType<typeof compareCycles>[number];

// Treat the data as two cycles. Prefer the testing-period flag if it actually
// splits the data; otherwise split on the largest time gap (which separates
// distinct test runs / clusters); otherwise fall back to most-recent-20% vs rest.
function isWithinTesting(a: Anomaly): boolean {
  // tolerate both camelCase and snake_case serialisations from the API
  const v: any = (a as any).withinTestingPeriod ?? (a as any).within_testing_period;
  return v === true;
}

function splitCycles(anomalies: Anomaly[]):
  { current: Anomaly[]; baseline: Anomaly[]; method: string } | null {
  const within = anomalies.filter(isWithinTesting);
  const without = anomalies.filter((a) => !isWithinTesting(a));
  if (within.length >= 3 && without.length >= 3)
    return { current: within, baseline: without, method: "testing period vs baseline" };

  const dated = anomalies
    .map((a) => ({ a, t: parseTs(a.window_timestamp)?.getTime() ?? NaN }))
    .filter((x) => !isNaN(x.t))
    .sort((p, q) => p.t - q.t);
  if (dated.length < 6) return null;

  // largest gap between consecutive windows
  let gapIdx = -1, gapSize = -1;
  for (let i = 1; i < dated.length; i++) {
    const g = dated[i].t - dated[i - 1].t;
    if (g > gapSize) { gapSize = g; gapIdx = i; }
  }
  if (gapIdx < 3 || dated.length - gapIdx < 3)
    gapIdx = Math.floor(dated.length * 0.8); // fallback: recent 20% vs rest

  return {
    baseline: dated.slice(0, gapIdx).map((x) => x.a),
    current: dated.slice(gapIdx).map((x) => x.a),
    method: "recent cycle vs earlier baseline",
  };
}

// ── Summarization (all client-side) ──────────────────────────────────────────
function summarize(anomalies: Anomaly[]) {
  const all = anomalies;
  const total = all.length;

  // Severity counts across ALL detections (this is what the report surfaces).
  const sevCounts: Record<string, number> = {};
  for (const a of all) sevCounts[a.severity] = (sevCounts[a.severity] || 0) + 1;
  const critical = sevCounts["CRITICAL"] || 0;
  const warning = sevCounts["WARNING"] || 0;

  // Rank by score desc, then by evidence signal (since most scores cluster at
  // 0.8, the evidence weight is what actually surfaces the interesting windows).
  const ranked = [...all].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const w = (e: Evidence) => e.error_rate + e.restart_flag + e.memory_pressure;
    return w(b.evidence) - w(a.evidence);
  });

  const peakMemPressure = all.reduce(
    (m, a) => Math.max(m, num(a.evidence?.memory_pressure) ?? 0), 0);
  const anyErrors = all.some((a) => (num(a.evidence?.error_rate) ?? 0) >= 1);
  const anyTimeouts = all.some((a) => (num(a.evidence?.latency_p95) ?? 0) >= LATENCY_SENTINEL);
  const restarts = all.filter((a) => (num(a.evidence?.restart_flag) ?? 0) >= 1).length;

  const health =
    critical > 0
      ? { label: "Action needed", tone: "critical" as const }
      : warning > 0
      ? { label: "Degraded", tone: "warn" as const }
      : { label: "Stable", tone: "ok" as const };

  // Overall time window across all detections.
  const times = all
    .map((a) => parseTs(a.window_timestamp)?.getTime())
    .filter((t): t is number => typeof t === "number");
  const window =
    times.length > 0
      ? `${fmtTime(new Date(Math.min(...times)).toISOString())} – ${fmtTime(
          new Date(Math.max(...times)).toISOString())}`
      : "—";

  // Two-cycle comparison (test cycle comparison).
  const split = splitCycles(all);
  const comparison = split ? compareCycles(split.current, split.baseline) : [];
  const comparisonMethod = split?.method ?? "";

  const summary =
    total === 0
      ? "No anomaly detections were recorded for this application."
      : `${total.toLocaleString()} anomaly detections were recorded ` +
        `(${critical.toLocaleString()} critical, ${warning.toLocaleString()} warning). ` +
        (anyTimeouts ? "Several windows show request timeouts with no response. " : "") +
        (anyErrors ? "Error rate reached 100% in the most severe windows" +
          (restarts > 0 ? ` with ${restarts} container restart${restarts > 1 ? "s" : ""} observed. ` : ". ") : "") +
        `Peak memory pressure reached ${fmtPct(peakMemPressure)} — the dominant stress signal across the run.`;

  return { all, total, ranked, peakMemPressure, anyErrors, restarts,
    critical, warning, health, sevCounts, window, summary,
    comparison, comparisonMethod };
}
type Summary = ReturnType<typeof summarize>;

// ── Small presentational pieces ──────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: "bg-rose-500",
  WARNING: "bg-amber-400",
};

function HealthBadge({ health }: { health: Summary["health"] }) {
  const map = {
    critical: { cls: "bg-rose-100 text-rose-700 ring-rose-200", Icon: ShieldX },
    warn: { cls: "bg-amber-100 text-amber-700 ring-amber-200", Icon: ShieldAlert },
    ok: { cls: "bg-emerald-100 text-emerald-700 ring-emerald-200", Icon: ShieldCheck },
  }[health.tone];
  const { Icon } = map;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1
      text-sm font-semibold ring-1 ${map.cls}`}>
      <Icon className="h-4 w-4" /> {health.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center
        rounded-lg ${accent}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function CycleComparison({ rows, method }: { rows: CycleRow[]; method?: string }) {
  const V = {
    regressed: { cls: "bg-rose-100 text-rose-700", label: "Regressed", arrow: "▲" },
    improved:  { cls: "bg-emerald-100 text-emerald-700", label: "Improved", arrow: "▼" },
    stable:    { cls: "bg-slate-100 text-slate-600", label: "Stable", arrow: "—" },
  };
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">
        Test cycle comparison
      </h2>
      <p className="mb-4 text-xs text-slate-400">
        {method ? method[0].toUpperCase() + method.slice(1) + "." : "Two cycles compared across key signals."}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
              <th className="py-2 pr-4 font-medium">Metric</th>
              <th className="py-2 pr-4 font-medium">Baseline</th>
              <th className="py-2 pr-4 font-medium">Current</th>
              <th className="py-2 pr-4 font-medium">Δ</th>
              <th className="py-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = V[r.verdict];
              return (
                <tr key={r.label} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-4 font-medium text-slate-700">
                    {r.label}
                    {r.note && (
                      <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-xs
                        font-medium text-rose-600">{r.note}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500">{r.fmt(r.base)}</td>
                  <td className="py-2.5 pr-4 font-semibold text-slate-800">{r.fmt(r.cur)}</td>
                  <td className="py-2.5 pr-4 text-slate-600">
                    {r.pct === null ? "new" : `${r.pct > 0 ? "+" : ""}${r.pct.toFixed(0)}%`}
                  </td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2
                      py-0.5 text-xs font-semibold ${v.cls}`}>
                      {v.arrow} {v.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── Recommendations (backend RAG + Groq) ─────────────────────────────────────
interface Recommendation {
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  observation: string;
  likely_cause: string;
  actions: string[];
  addresses: string;
}

// Build the compact findings payload the backend turns into recommendations.
function buildFindings(appId: string, s: Summary) {
  const row = (label: string) => s.comparison.find((r) => r.label === label);
  const memRow = row("Memory pressure");
  const latRow = row("Latency p95 (avg)");
  const restartRow = row("Restarts");
  const timeouts = s.all.filter(
    (a) => (num(a.evidence?.latency_p95) ?? 0) >= LATENCY_SENTINEL).length;

  return {
    app_id: Number(appId) || appId,
    totals: { detections: s.total, critical: s.critical, warning: s.warning },
    signals: {
      peak_memory_pressure: s.peakMemPressure,
      baseline_memory_pressure: memRow ? memRow.base : undefined,
      max_error_rate: s.anyErrors ? 1 : 0,
      timeouts,
      restarts: s.restarts,
      restarts_new_vs_baseline: restartRow
        ? restartRow.verdict === "regressed" && restartRow.base === 0
        : undefined,
      latency_p95_regression_pct:
        latRow && latRow.pct != null ? Math.round(latRow.pct) : undefined,
    },
    top_incidents: s.ranked.slice(0, 4).map((a) => ({
      when: fmtTime(a.window_timestamp),
      severity: a.severity,
      error_rate: num(a.evidence?.error_rate) ?? undefined,
      latency_p95: num(a.evidence?.latency_p95) ?? undefined,
      memory_pressure: num(a.evidence?.memory_pressure) ?? undefined,
      restart: (num(a.evidence?.restart_flag) ?? 0) >= 1,
    })),
  };
}

const PRIORITY_STYLE: Record<string, { dot: string; badge: string }> = {
  critical: { dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
  high: { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700" },
  medium: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700" },
  low: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
};

function RecommendationCard({ r }: { r: Recommendation }) {
  const st = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.medium;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${st.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{r.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.badge}`}>
              {r.priority}
            </span>
          </div>
          {r.observation && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-500">What we saw: </span>
              {r.observation}
            </p>
          )}
          {r.likely_cause && (
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-500">Likely cause: </span>
              {r.likely_cause}
            </p>
          )}
          {r.actions?.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold
                uppercase tracking-wide text-slate-400">
                <Wrench className="h-3.5 w-3.5" /> Recommended actions
              </div>
              <ul className="space-y-1.5">
                {r.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-400" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.addresses && (
            <div className="mt-3 inline-block rounded bg-slate-50 px-2 py-0.5 text-xs
              font-medium text-slate-500">
              Targets: {r.addresses}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationsSection({ appId, findings }: {
  appId: string; findings: ReturnType<typeof buildFindings>;
}) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [source, setSource] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(RECOMMENDATIONS_ENDPOINT(appId), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(findings),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          setRecs(data.recommendations ?? []);
          setSource(data.source ?? "");
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message ?? "Could not load recommendations");
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-slate-900">Actionable recommendations</h2>
        {source === "fallback" && (
          <span className="ml-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            offline mode
          </span>
        )}
      </div>

      {err ? (
        <p className="text-sm text-slate-500">
          Recommendations are unavailable right now ({err}). The rest of the report is unaffected.
        </p>
      ) : !recs ? (
        <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Analysing the issues and drafting recommendations…
        </div>
      ) : recs.length === 0 ? (
        <p className="text-sm text-slate-500">No recommendations were generated.</p>
      ) : (
        <div className="space-y-3">
          {recs.map((r, i) => <RecommendationCard key={i} r={r} />)}
        </div>
      )}
    </section>
  );
}


export function ReportPage() {
  const { appId = "" } = useParams();
  const [anomalies, setAnomalies] = useState<Anomaly[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appName, setAppName] = useState<string>("");

  useEffect(() => {
    if (!appId) return;
    const token = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
    Promise.all([
      fetch(buildApiUrl("/api/v1/application/me"), {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(buildApiUrl(`/api/v1/dashboard/${appId}`), {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([apps, dash]) => {
      if (Array.isArray(apps)) {
        const found = apps.find((a: any) => String(a.id) === String(appId));
        if (found && found.name) {
          setAppName(found.name);
          return;
        }
      }
      if (dash && dash.app_name) {
        setAppName(dash.app_name);
      }
    });
  }, [appId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("access_token") || localStorage.getItem("token") || "";
        const res = await fetch(ANOMALIES_ENDPOINT(appId), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        const list: Anomaly[] = Array.isArray(data)
          ? data : data.items ?? data.results ?? [];
        if (!cancelled) setAnomalies(list);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load report data");
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);

  const s = useMemo(
    () => (anomalies ? summarize(anomalies) : null), [anomalies]);

  if (error)
    return <CenteredMessage title="Couldn't generate report" body={error} appId={appId} />;
  if (!anomalies || !s)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating report…
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Print rules: only the report prints */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #chamora-report, #chamora-report * { visibility: visible; }
          #chamora-report { position: absolute; inset: 0; margin: 0; }
          .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      {/* Action bar (not printed) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between
        border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
        <Link to={`/application/${appId}`}
          className="inline-flex items-center gap-2 text-sm font-medium
          text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700">
          <Download className="h-4 w-4" /> Download PDF
        </button>
      </div>

      <div id="chamora-report" className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200/80 p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                <FileText className="h-4 w-4 text-blue-600" /> Chamora · Performance Report
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{appName || `Application #${appId}`}</h1>
              <p className="mt-1 text-sm text-slate-600">
                Detection window: {s.window}
              </p>
            </div>
            <HealthBadge health={s.health} />
          </div>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-700">
            {s.summary}
          </p>
          <div className="mt-4 text-xs text-slate-500">
            Generated {new Date().toLocaleString()}
          </div>
        </div>

        {/* Highlight cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Activity} accent="bg-blue-600"
            label="Total detections" value={s.total.toLocaleString()}
            sub="anomaly windows" />
          <StatCard icon={ShieldX} accent="bg-rose-500"
            label="Critical" value={s.critical.toLocaleString()}
            sub={`${s.total ? Math.round((s.critical / s.total) * 100) : 0}% of detections`} />
          <StatCard icon={ShieldAlert} accent="bg-amber-500"
            label="Warning" value={s.warning.toLocaleString()}
            sub={`${s.total ? Math.round((s.warning / s.total) * 100) : 0}% of detections`} />
          <StatCard icon={MemoryStick} accent="bg-indigo-600"
            label="Peak memory pressure" value={fmtPct(s.peakMemPressure)}
            sub="baseline ≈ 4%" />
        </div>

        {/* Severity distribution */}
        {s.total > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Detections by severity
            </h2>
            <div className="space-y-3">
              {Object.entries(s.sevCounts).sort().map(([sev, n]) => (
                <div key={sev} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-medium text-slate-500">{sev}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${SEV_COLOR[sev] ?? "bg-slate-400"}`}
                      style={{ width: `${(n / s.total) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-slate-700">{n}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Test cycle comparison */}
        {s.comparison.length > 0 && (
          <CycleComparison rows={s.comparison} method={s.comparisonMethod} />
        )}

        {/* Actionable recommendations (backend RAG + Groq) */}
        {s.total > 0 && (
          <RecommendationsSection appId={appId} findings={buildFindings(appId, s)} />
        )}

        {/* Top incidents */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Most significant detections
          </h2>
          {s.ranked.length === 0 ? (
            <p className="text-sm text-slate-500">No detections found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                    <th className="py-2 pr-4 font-medium">When</th>
                    <th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 pr-4 font-medium">Score</th>
                    <th className="py-2 pr-4 font-medium">Latency p95</th>
                    <th className="py-2 pr-4 font-medium">Errors</th>
                    <th className="py-2 pr-4 font-medium">Mem pressure</th>
                    <th className="py-2 font-medium">Restart</th>
                  </tr>
                </thead>
                <tbody>
                  {s.ranked.slice(0, 8).map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2.5 pr-4 text-slate-600">
                        {fmtTime(a.window_timestamp)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs
                          font-semibold text-white ${SEV_COLOR[a.severity] ?? "bg-slate-400"}`}>
                          {a.severity}</span>
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-slate-700">
                        {a.score.toFixed(2)}</td>
                      <td className={`py-2.5 pr-4 ${
                        a.evidence.latency_p95 >= LATENCY_SENTINEL
                          ? "font-semibold text-rose-600" : "text-slate-600"}`}>
                        {fmtLatency(a.evidence.latency_p95)}</td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {fmtPct(a.evidence.error_rate)}</td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {fmtPct(a.evidence.memory_pressure)}</td>
                      <td className="py-2.5 text-slate-600">
                        {a.evidence.restart_flag >= 1 ? "Yes" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Chamora — AI Performance Intelligence Engine · Report for {appName || `Application #${appId}`}
        </p>
      </div>
    </div>
  );
}

function CenteredMessage({ title, body, appId }: {
  title: string; body: string; appId: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-amber-500" />
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>
      <Link to={`/application/${appId}`}
        className="mt-4 text-sm font-medium text-indigo-600 hover:underline">
        ← Back to dashboard
      </Link>
    </div>
  );
}