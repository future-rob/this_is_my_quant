import React, { useMemo } from "react";
import { AnalysisResult } from "../data/types";

interface Point {
  ts: string;
  fileName: string;
  targetHits: number;
  adverseFirst: number;
  unresolved: number;
  total: number;
}

interface Props {
  results: AnalysisResult[];
}

// Very lightweight SVG line chart (no external deps) showing cumulative target vs adverse outcomes.
export const BacktestPerformanceChart: React.FC<Props> = ({ results }) => {
  const points = useMemo<Point[]>(() => {
    const arr: Point[] = [];
    let cumulativeTargets = 0;
    let cumulativeAdverse = 0;
    let lastUnresolved = 0;
    let lastTotal = 0;
    // iterate oldest -> newest for cumulative
    [...results]
      .sort((a, b) => a.fileName.localeCompare(b.fileName))
      .forEach((r) => {
        const bt =
          r.content?.analysisData?.backtest?.evaluation?.metrics ||
          r.content?.analysisData?.backtest?.metrics;
        if (bt && typeof bt.targetHits === "number") {
          cumulativeTargets = bt.targetHits; // store already absolute within file
          cumulativeAdverse = bt.adverseFirst ?? cumulativeAdverse;
          lastUnresolved = bt.unresolved ?? lastUnresolved;
          lastTotal = bt.total ?? lastTotal;
          const ts = r.content?.timestamp || r.fileName;
          arr.push({
            ts,
            fileName: r.fileName,
            targetHits: cumulativeTargets,
            adverseFirst: cumulativeAdverse,
            unresolved: lastUnresolved,
            total: lastTotal,
          });
        }
      });
    return arr;
  }, [results]);

  if (points.length < 2)
    return (
      <div className="card">
        <h4>Backtest Performance</h4>
        <div className="empty">Not enough data yet</div>
      </div>
    );

  // Prepare scaling
  const maxVal = Math.max(
    ...points.map((p) => Math.max(p.targetHits, p.adverseFirst))
  );
  const width = 380;
  const height = 140;
  const pad = 30;
  const xScale = (i: number) =>
    pad + (i / (points.length - 1)) * (width - pad * 2);
  const yScale = (v: number) =>
    height - pad - (v / (maxVal || 1)) * (height - pad * 2);

  const linePath = (key: keyof Point, color: string) => {
    return points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(p[key] as number)}`
      )
      .join(" ");
  };

  return (
    <div className="card backtest-chart">
      <h4>Backtest Performance</h4>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* axes */}
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke="#333"
        />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#333" />
        {/* target hits */}
        <path
          d={linePath("targetHits", "#2ecc71")}
          stroke="#2ecc71"
          fill="none"
          strokeWidth={2}
        />
        {/* adverse */}
        <path
          d={linePath("adverseFirst", "#e74c3c")}
          stroke="#e74c3c"
          fill="none"
          strokeWidth={2}
        />
        {/* legend */}
        <g transform={`translate(${pad},${pad - 10})`}>
          <rect x={0} y={0} width={10} height={10} fill="#2ecc71" />
          <text x={15} y={10} fontSize={10} fill="#ccc">
            Target Hits
          </text>
          <rect x={90} y={0} width={10} height={10} fill="#e74c3c" />
          <text x={105} y={10} fontSize={10} fill="#ccc">
            Adverse First
          </text>
        </g>
      </svg>
      <div className="meta-row">
        <span>Total Trades: {points[points.length - 1].total}</span>
        <span>Open: {points[points.length - 1].unresolved}</span>
        <span>
          Hit Rate:{" "}
          {(() => {
            const last = points[points.length - 1];
            const resolved = last.total - last.unresolved;
            if (!resolved) return "—";
            return ((last.targetHits / resolved) * 100).toFixed(1) + "%";
          })()}
        </span>
      </div>
    </div>
  );
};
