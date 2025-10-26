import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { SupportResistancePoint } from "../data/transform";

interface Props {
  data: SupportResistancePoint[];
}

export const SupportResistanceChart = ({ data }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const timeframes = Array.from(new Set(data.map((d) => d.timeframe)));
  if (!data.length) return null;

  function toggle(tf: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tf)) next.delete(tf);
      else next.add(tf);
      return next;
    });
  }

  const active = selected.size
    ? timeframes.filter((tf) => selected.has(tf))
    : timeframes;
  const filtered = data.filter((d) => active.includes(d.timeframe));

  // compress to unique timestamps with nested timeframe values
  const byTs: Record<string, any> = {};
  for (const row of filtered) {
    byTs[row.ts] ||= { ts: row.ts };
    byTs[row.ts][`${row.timeframe}_support`] = row.support;
    byTs[row.ts][`${row.timeframe}_resistance`] = row.resistance;
  }
  const chartData = Object.values(byTs).sort((a: any, b: any) =>
    a.ts.localeCompare(b.ts)
  );

  return (
    <div className="card">
      <h3>Support / Resistance Levels</h3>
      <div className="tf-toggle">
        {timeframes.map((tf) => (
          <button
            key={tf}
            className={selected.has(tf) ? "active" : ""}
            onClick={() => toggle(tf)}
          >
            {tf}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          margin={{ left: 12, right: 30, top: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="ts"
            tickFormatter={(v: string) => v.split("T")[1]?.slice(0, 8)}
            stroke="#888"
            minTickGap={32}
          />
          <YAxis stroke="#888" />
          <Tooltip
            contentStyle={{ background: "#111", border: "1px solid #333" }}
          />
          <Legend />
          {active.map((tf) => (
            <>
              <Line
                key={tf + "s"}
                type="monotone"
                dataKey={`${tf}_support`}
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
              />
              <Line
                key={tf + "r"}
                type="monotone"
                dataKey={`${tf}_resistance`}
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
              />
            </>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <p className="subtitle">
        Green = support, Red = resistance. Use buttons to focus timeframes.
      </p>
    </div>
  );
};
