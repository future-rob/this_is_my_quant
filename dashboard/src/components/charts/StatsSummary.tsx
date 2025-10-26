import { AnalysisResult } from "../data/types";

interface Props {
  latest?: AnalysisResult | null;
}

const actionColors: Record<string, string> = {
  LONG: "var(--color-long)",
  HOLD: "var(--color-hold)",
  SHORT: "var(--color-short)",
};

export const StatsSummary = ({ latest }: Props) => {
  if (!latest) return null;
  const meta = latest.content.metadata || {};
  const verdict = latest.content.finalVerdict || {};
  const action = meta.finalAction || verdict.action;
  const confidence = meta.finalConfidence || verdict.confidence;
  const trend = meta.overallTrend || verdict.overallTrend;
  const nextCheck = meta.nextCheckMinutes || verdict.nextCheckMinutes;
  const cost =
    latest.content.analysisData?.totalCost ?? latest.content.totalCost;
  const timestamp: string | undefined = latest.content.timestamp;
  const btcPrice: number | undefined =
    latest.content.metadata?.btcPrice ?? latest.content.analysisData?.btcPrice;
  const backtestMetrics =
    latest.content.analysisData?.backtest?.evaluation?.metrics ||
    latest.content.analysisData?.backtest?.metrics;

  function formatTime(ts?: string) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return (
      d.toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }) +
      " · " +
      d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    );
  }

  const items = [
    {
      label: "BTC/USD",
      value: btcPrice
        ? "$" + btcPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : "—",
    },
    {
      label: "Action",
      value: action,
      color: actionColors[action] || "var(--badge-bg)",
    },
    {
      label: "Confidence",
      value: confidence !== undefined ? confidence + "%" : "—",
    },
    { label: "Trend", value: trend },
    { label: "Next Check", value: nextCheck ? nextCheck + "m" : "—" },
    { label: "Cost", value: cost ? "$" + cost.toFixed(4) : "—" },
    { label: "Decided", value: formatTime(timestamp) },
    backtestMetrics && backtestMetrics.total !== undefined
      ? {
          label: "Resolved",
          value: `${
            backtestMetrics.total -
            backtestMetrics.unresolved -
            (backtestMetrics.unresolved ?? 0) +
            backtestMetrics.unresolved
          }`,
        }
      : null,
    backtestMetrics && backtestMetrics.unresolved !== undefined
      ? { label: "Open Trades", value: backtestMetrics.unresolved }
      : null,
    backtestMetrics && backtestMetrics.hitRate05 !== undefined
      ? {
          label: "+0.5% Hit %",
          value: Math.round(backtestMetrics.hitRate05 * 100) + "%",
        }
      : null,
    backtestMetrics && backtestMetrics.hitRate10 !== undefined
      ? {
          label: "+1% Hit %",
          value: Math.round(backtestMetrics.hitRate10 * 100) + "%",
        }
      : null,
  ];

  return (
    <div className="summary-bar card">
      {items.filter(Boolean).map((i) => {
        const item: any = i; // type narrow
        return (
          <div key={item.label} className="summary-item">
            <span className="label">{item.label}</span>
            <span className="value" style={{ background: item.color }}>
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
};
