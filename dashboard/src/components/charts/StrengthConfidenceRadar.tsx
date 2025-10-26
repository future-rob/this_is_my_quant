import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AnalysisResult } from "../data/types";

interface Props {
  latest?: AnalysisResult | null;
}

export const StrengthConfidenceRadar = ({ latest }: Props) => {
  if (!latest) return null;
  const analyses = latest.content.analysisData?.individualAnalyses || [];
  const data = analyses.map((a: any) => ({
    timeframe: a.timeframe,
    strength: a.strength,
    confidence: a.confidence,
  }));
  if (!data.length) return null;
  return (
    <div className="card">
      <h3>Strength vs Confidence (Latest)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} outerRadius={100}>
          <PolarGrid stroke="#333" />
          <PolarAngleAxis dataKey="timeframe" stroke="#999" />
          <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#666" />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #333" }}
          />
          <Radar
            name="Strength"
            dataKey="strength"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.4}
          />
          <Radar
            name="Confidence"
            dataKey="confidence"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
