import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AnalysisResult } from "../data/types";

interface Props {
  latest?: AnalysisResult | null;
}

const COLORS = [
  "#6366f1",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#0ea5e9",
  "#a855f7",
];

export const SignalDistribution = ({ latest }: Props) => {
  if (!latest) return null;
  const analyses = latest.content.analysisData?.individualAnalyses || [];
  const counts: Record<string, number> = {};
  analyses.forEach((a: any) =>
    (a.signals || []).forEach((s: string) => {
      counts[s] = (counts[s] || 0) + 1;
    })
  );
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
  if (!data.length) return null;
  return (
    <div className="card">
      <h3>Signal Distribution (Latest)</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={100}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #333" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
