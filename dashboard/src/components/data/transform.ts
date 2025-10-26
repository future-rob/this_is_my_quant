import { AnalysisResult } from "./types";

export interface TimeSeriesPoint {
  ts: string; // ISO timestamp
  fileName: string;
  finalAction?: string;
  finalConfidence?: number;
  overallTrend?: string;
  cost?: number;
  btcPrice?: number | null;
}

export interface SupportResistancePoint {
  ts: string;
  timeframe: string;
  support: number;
  resistance: number;
  strength?: number;
  confidence?: number;
  trend?: string;
}

export interface LatestSnapshotSummary {
  timestamp: string | null;
  actions: Record<string, any> | null;
}

export interface NormalizedData {
  timeSeries: TimeSeriesPoint[];
  supportResistance: SupportResistancePoint[];
  latestSnapshot?: any;
  timeframes: string[];
}

export function normalizeResults(results: AnalysisResult[]): NormalizedData {
  const timeSeries: TimeSeriesPoint[] = [];
  const supportResistance: SupportResistancePoint[] = [];
  let latest: any = null;

  const timeframeSet = new Set<string>();

  for (const r of results) {
    try {
      const content = r.content;
      const ts = content.timestamp || extractTimestamp(r.fileName);
      const meta = content.metadata || {};
      const verdict = content.finalVerdict || {};
      const finalAction = meta.finalAction || verdict.action;
      const finalConfidence = meta.finalConfidence || verdict.confidence;
      const btcPrice = meta.btcPrice ?? content.analysisData?.btcPrice;

      timeSeries.push({
        ts,
        fileName: r.fileName,
        finalAction,
        finalConfidence,
        overallTrend: meta.overallTrend,
        cost: content.analysisData?.totalCost,
        btcPrice,
      });

      const analyses =
        content.analysisData?.individualAnalyses ||
        content.analysisData?.tradingDecision?.timeframes ||
        [];

      analyses.forEach((a: any) => {
        if (!a) return;
        timeframeSet.add(a.timeframe);
        if (a.keyLevels) {
          supportResistance.push({
            ts,
            timeframe: a.timeframe,
            support: a.keyLevels.support,
            resistance: a.keyLevels.resistance,
            strength: a.strength,
            confidence: a.confidence,
            trend: a.trend,
          });
        }
      });

      if (!latest) {
        latest = content; // results already sorted newest first
      }
    } catch (e) {
      // swallow malformed file
    }
  }

  return {
    timeSeries: timeSeries.sort((a, b) => a.ts.localeCompare(b.ts)),
    supportResistance: supportResistance.sort((a, b) =>
      a.ts.localeCompare(b.ts)
    ),
    latestSnapshot: latest,
    timeframes: Array.from(timeframeSet.values()).sort(),
  };
}

function extractTimestamp(fileName: string): string {
  // file format analysis-2025-09-05T20-21-14.json -> convert to ISO
  const match = fileName.match(
    /analysis-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/
  );
  if (match) {
    return match[1].replace(/-/g, (m, offset) =>
      offset === 10 || offset === 13 ? ":" : m
    );
  }
  return new Date().toISOString();
}
