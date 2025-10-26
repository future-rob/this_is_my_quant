import { useMemo, Fragment } from "react";
import { normalizeResults } from "../data/transform";
import { AnalysisResult } from "../data/types";

interface Props {
  results: AnalysisResult[];
}

const trendColor: Record<string, string> = {
  bullish: "#16a34a",
  neutral: "#52525b",
  bearish: "#dc2626",
};

export const TrendHeatmap = ({ results }: Props) => {
  const { supportResistance, timeframes } = useMemo(
    () => normalizeResults(results),
    [results]
  );
  // build a map ts -> timeframe -> trend via supportResistance array enriched? we didn't include trend there for each row; adjust by reading original results instead for accuracy.
  const entries: { ts: string; timeframe: string; trend: string }[] = [];
  for (const r of results) {
    const ts = r.content.timestamp || r.fileName;
    const analyses = r.content.analysisData?.individualAnalyses || [];
    analyses.forEach((a: any) =>
      entries.push({ ts, timeframe: a.timeframe, trend: a.trend })
    );
  }
  const uniqueTimestamps = Array.from(new Set(entries.map((e) => e.ts))).sort();

  // Preferred ordering so shorter intraday frames (e.g. 5m) appear first (top rows)
  const orderedTimeframes = useMemo(() => {
    const preference = [
      "1m",
      "3m",
      "5m",
      "15m",
      "30m",
      "45m",
      "1h",
      "2h",
      "3h",
      "4h",
      "6h",
      "8h",
      "12h",
      "1d",
      "2d",
      "3d",
      "1w",
      "1M",
      "3M",
      "6M",
      "1Y",
    ];
    return [...timeframes].sort((a, b) => {
      const ai = preference.indexOf(a);
      const bi = preference.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [timeframes]);

  return (
    <div className="card">
      <h3>Trend Heatmap</h3>
      <div
        className="heatmap"
        style={{
          gridTemplateColumns: `90px repeat(${uniqueTimestamps.length}, 42px)`,
        }}
      >
        <div className="header-cell">Timeframe</div>
        {uniqueTimestamps.map((ts) => {
          const timePart = ts.includes("T") ? ts.split("T")[1].slice(0, 5) : ts;
          return (
            <div key={ts} className="header-cell">
              {timePart}
            </div>
          );
        })}
        {orderedTimeframes.map((tf) => (
          <Fragment key={tf}>
            <div className="row-label">{tf}</div>
            {uniqueTimestamps.map((ts) => {
              const item = entries.find(
                (e) => e.ts === ts && e.timeframe === tf
              );
              const trend = item?.trend || "neutral";
              return (
                <div
                  key={tf + ts}
                  className="cell"
                  style={{ background: trendColor[trend] || "#444" }}
                  title={`${tf} @ ${ts}: ${trend}`}
                ></div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="legend">
        {Object.entries(trendColor).map(([k, v]) => (
          <span key={k}>
            <span className="swatch" style={{ background: v }} /> {k}
          </span>
        ))}
      </div>
    </div>
  );
};
