// gets the analysis results from the API
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { normalizeResults } from "./transform";
import { AnalysisResult } from "./types";
import { ActionConfidenceChart } from "../charts/ActionConfidenceChart";
import { SupportResistanceChart } from "../charts/SupportResistanceChart";
import { TrendHeatmap } from "../charts/TrendHeatmap";
import { StrengthConfidenceRadar } from "../charts/StrengthConfidenceRadar";
import { SignalDistribution } from "../charts/SignalDistribution";
import { StatsSummary } from "../charts/StatsSummary";
import { TIME_RANGES, TimeRangeKey, filterResultsByRange } from "./timeRanges";
import { ScreenshotGallery } from "../charts/ScreenshotGallery";
import { ChatPanel } from "../charts/ChatPanel";
import { BacktestPerformanceChart } from "../charts/BacktestPerformanceChart";
import { BacktestStats } from "../charts/BacktestStats";
import { OpenTradesTable } from "../charts/OpenTradesTable";

export const GetAnalysisResults = () => {
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [range, setRange] = useState<TimeRangeKey>("6H");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await axios.get("/api/get-analysis-results");
        setResults(response.data.results);
      } catch (err) {
        setError("Failed to fetch analysis results");
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
    const id = setInterval(fetchResults, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, []);

  const filteredResults = useMemo(
    () => filterResultsByRange(results, range),
    [results, range]
  );
  const normalized = useMemo(
    () => normalizeResults(filteredResults),
    [filteredResults]
  );
  const latest = results[0] || null; // keep latest overall for summary

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dash-header">
        <h2>Quant Decision Dashboard</h2>
        <div className="actions">
          <div className="range-buttons">
            {TIME_RANGES.map((r) => (
              <button
                key={r.key}
                className={range === r.key ? "active" : ""}
                onClick={() => setRange(r.key)}
              >
                {r.key}
              </button>
            ))}
          </div>
          <button onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? "Hide Raw" : "Show Raw"}
          </button>
        </div>
      </div>
      <StatsSummary latest={latest} />
      <div className="grid responsive">
        <div className="span-2">
          <TrendHeatmap results={filteredResults} />
        </div>
        <ActionConfidenceChart data={normalized.timeSeries} />
        <SupportResistanceChart data={normalized.supportResistance} />
        <StrengthConfidenceRadar latest={latest} />
        <SignalDistribution latest={latest} />
        <BacktestPerformanceChart results={filteredResults} />
        <BacktestStats latest={latest} />
        <OpenTradesTable />
        <ScreenshotGallery />
        <div className="span-2">
          <ChatPanel />
        </div>
      </div>
      {showRaw && (
        <div className="raw-section">
          <h3>Raw JSON Files</h3>
          <ul className="raw-list">
            {results.map((r) => (
              <li key={r.fileName}>
                <details>
                  <summary>{r.fileName}</summary>
                  <pre>{JSON.stringify(r.content, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
