import React from "react";
import { AnalysisResult } from "../data/types";

interface Props {
  latest?: AnalysisResult | null;
}

export const BacktestStats: React.FC<Props> = ({ latest }) => {
  if (!latest) return null;
  const metrics =
    latest.content.analysisData?.backtest?.evaluation?.metrics ||
    latest.content.analysisData?.backtest?.metrics;
  if (!metrics) return null;

  const resolved = metrics.total - metrics.unresolved;
  const hitRate = resolved ? metrics.targetHits / resolved : 0;
  const lossRate = resolved ? metrics.adverseFirst / resolved : 0;
  return (
    <div className="card backtest-stats">
      <h4>Backtest Summary</h4>
      <div className="grid">
        <Stat label="Total Trades" value={metrics.total} />
        <Stat label="Resolved" value={resolved} />
        <Stat label="Open" value={metrics.unresolved} />
        <Stat label="Target Hits" value={metrics.targetHits} />
        <Stat label="Adverse First" value={metrics.adverseFirst} />
        <Stat label="Hit Rate" value={(hitRate * 100).toFixed(1) + "%"} />
        <Stat label="Loss Rate" value={(lossRate * 100).toFixed(1) + "%"} />
        {metrics.hitRate05 !== undefined && (
          <Stat
            label="0.5% Hit%"
            value={(metrics.hitRate05 * 100).toFixed(1) + "%"}
          />
        )}
        {metrics.hitRate10 !== undefined && (
          <Stat
            label="1% Hit%"
            value={(metrics.hitRate10 * 100).toFixed(1) + "%"}
          />
        )}
        {metrics.avgTimeToResolutionMinutes !== undefined && (
          <Stat
            label="Avg Time (m)"
            value={metrics.avgTimeToResolutionMinutes.toFixed(1)}
          />
        )}
      </div>
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 10px;
        }
      `}</style>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: any }) => (
  <div className="stat-box">
    <div className="value">{value}</div>
    <div className="label">{label}</div>
    <style jsx>{`
      .stat-box {
        background: #11161e;
        padding: 8px 10px;
        border: 1px solid #1d2530;
        border-radius: 6px;
      }
      .value {
        font-weight: 600;
        font-size: 14px;
      }
      .label {
        font-size: 11px;
        opacity: 0.6;
      }
    `}</style>
  </div>
);
