import React from "react";
import useSWR from "swr";

interface TrackedDecision {
  id: string;
  timestamp: string;
  action: "LONG" | "SHORT" | "HOLD";
  entryPrice: number | null;
  plannedEntryPrice?: number | null;
  lastPrice?: number | null;
  maxPrice?: number | null;
  minPrice?: number | null;
  hit05?: boolean;
  hit10?: boolean;
  adverse10?: boolean;
  adverse20?: boolean;
  outcome?: string;
  resolutionTimestamp?: string;
  autoAdjusted?: boolean;
  adjustmentReason?: string;
}

interface TradeStore {
  decisions: TrackedDecision[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export const OpenTradesTable: React.FC = () => {
  const { data } = useSWR<{ store: { decisions: TrackedDecision[] } | null }>(
    "/api/get-trade-tracker",
    fetcher,
    { refreshInterval: 15000 }
  );

  const decisions = data?.store?.decisions || [];
  const directional: TrackedDecision[] = decisions.filter(
    (d: TrackedDecision) => d.action !== "HOLD"
  );
  const open: TrackedDecision[] = directional.filter(
    (d: TrackedDecision) => !d.outcome
  );
  const resolved: TrackedDecision[] = directional.filter(
    (d: TrackedDecision) => !!d.outcome
  );

  function pctChange(entry: number | null, current: number | null) {
    if (!entry || !current) return null;
    return ((current - entry) / entry) * 100;
  }

  function row(d: TrackedDecision) {
    const now = d.resolutionTimestamp || new Date().toISOString();
    const ageMin = Math.round(
      (new Date(now).getTime() - new Date(d.timestamp).getTime()) / 60000
    );
    const unrealized = pctChange(d.entryPrice, d.lastPrice ?? null);
    const favorable =
      d.action === "LONG" ? unrealized : unrealized && -unrealized;
    const status = d.outcome
      ? d.outcome === "TARGET_HIT"
        ? "✅ Target"
        : "❌ Adverse"
      : "⏳ Open";
    return (
      <tr key={d.id}>
        <td>{d.action}</td>
        <td>
          {d.entryPrice ? d.entryPrice.toLocaleString() : "—"}
          {d.autoAdjusted && (
            <span className="adj" title={d.adjustmentReason || "auto adjusted"}>
              *
            </span>
          )}
          {d.plannedEntryPrice && d.plannedEntryPrice !== d.entryPrice && (
            <span className="planned" title="Planned AI entry">
              ({d.plannedEntryPrice})
            </span>
          )}
        </td>
        <td>{d.lastPrice ? d.lastPrice.toLocaleString() : "—"}</td>
        <td>
          {unrealized !== null
            ? (unrealized >= 0 ? "+" : "") + unrealized.toFixed(2) + "%"
            : "—"}
        </td>
        <td>{ageMin}m</td>
        <td>{status}</td>
        <td>
          {d.hit10 || d.hit05 ? "🎯" : d.adverse10 || d.adverse20 ? "⚠️" : ""}
        </td>
      </tr>
    );
  }

  // Aggregate metrics
  const totalResolvedReturn = resolved
    .map((d: TrackedDecision) => {
      if (!d.entryPrice || !d.lastPrice) return 0;
      const pct = ((d.lastPrice - d.entryPrice) / d.entryPrice) * 100;
      return d.action === "SHORT" ? -pct : pct;
    })
    .reduce((a: number, b: number) => a + b, 0);
  const avgResolved = resolved.length
    ? totalResolvedReturn / resolved.length
    : 0;

  return (
    <div className="card open-trades-table">
      <h4>Trades & PnL</h4>
      <div className="trade-stats-row">
        <div>
          <strong>Open:</strong> {open.length}
        </div>
        <div>
          <strong>Resolved:</strong> {resolved.length}
        </div>
        <div>
          <strong>Net % (Resolved):</strong> {totalResolvedReturn.toFixed(2)}%
        </div>
        <div>
          <strong>Avg % / Trade:</strong> {avgResolved.toFixed(2)}%
        </div>
      </div>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Side</th>
              <th>Entry</th>
              <th>Last</th>
              <th>PnL%</th>
              <th>Age</th>
              <th>Status</th>
              <th>Flags</th>
            </tr>
          </thead>
          <tbody>
            {open.slice(-20).map(row)}
            {resolved.slice(-10).map(row)}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .table-wrapper {
          max-height: 260px;
          overflow: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th,
        td {
          padding: 4px 6px;
          border-bottom: 1px solid #222;
        }
        th {
          text-align: left;
          position: sticky;
          top: 0;
          background: #0f1218;
        }
        tr:hover {
          background: #161b23;
        }
        .trade-stats-row {
          display: flex;
          gap: 18px;
          font-size: 12px;
          margin-bottom: 8px;
        }
      `}</style>
      <style jsx>{`
        td .planned {
          opacity: 0.55;
          margin-left: 4px;
          font-size: 10px;
        }
        td .adj {
          color: #ffb347;
          margin-left: 3px;
          cursor: help;
        }
      `}</style>
    </div>
  );
};
