import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { TimeSeriesPoint } from "../data/transform";

interface Props {
  data: TimeSeriesPoint[];
}

const actionColor: Record<string, string> = {
  LONG: "#16a34a",
  HOLD: "#eab308",
  SHORT: "#dc2626",
};

function ActionDot(props: any) {
  const { cx, cy, payload } = props;
  const c = actionColor[payload.finalAction] || "#6366f1";
  return (
    <circle cx={cx} cy={cy} r={5} stroke="#111" strokeWidth={1} fill={c} />
  );
}

export const ActionConfidenceChart = ({ data }: Props) => {
  if (!data.length) return null;
  return (
    <div className="card">
      <h3>Final Action & Confidence Over Time</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ left: 12, right: 20, top: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="ts"
            tickFormatter={(v) => v.split("T")[1]?.slice(0, 8)}
            minTickGap={32}
            stroke="#888"
          />
          <YAxis yAxisId="conf" domain={[0, 100]} stroke="#888" />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #333" }}
            formatter={(val: any, name: any, p: any) => [
              val,
              name === "finalConfidence" ? "Confidence" : "Action",
            ]}
          />
          <Legend />
          <Line
            yAxisId="conf"
            type="monotone"
            dataKey="finalConfidence"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={<ActionDot />}
          />
          {["LONG", "HOLD", "SHORT"].map((a) => {
            const indices = data
              .map((d, i) => (d.finalAction === a ? i : null))
              .filter((i) => i !== null) as number[];
            if (!indices.length) return null;
            return indices.map((i) => {
              const d = data[i];
              return (
                <ReferenceArea
                  key={a + i}
                  x1={d.ts}
                  x2={d.ts}
                  stroke={actionColor[a]}
                  strokeOpacity={0.6}
                />
              );
            });
          })}
        </LineChart>
      </ResponsiveContainer>
      <p className="subtitle">
        Dot color encodes action; line shows confidence %.
      </p>
    </div>
  );
};
