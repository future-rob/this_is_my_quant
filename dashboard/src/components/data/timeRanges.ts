export type TimeRangeKey = "1H" | "6H" | "24H" | "7D" | "30D" | "ALL";

export const TIME_RANGES: { key: TimeRangeKey; label: string; ms?: number }[] =
  [
    { key: "1H", label: "Past Hour", ms: 60 * 60 * 1000 },
    { key: "6H", label: "Past 6H", ms: 6 * 60 * 60 * 1000 },
    { key: "24H", label: "Past Day", ms: 24 * 60 * 60 * 1000 },
    { key: "7D", label: "Past Week", ms: 7 * 24 * 60 * 60 * 1000 },
    { key: "30D", label: "Past Month", ms: 30 * 24 * 60 * 60 * 1000 },
    { key: "ALL", label: "All" },
  ];

export function filterResultsByRange<
  T extends { content?: any; ts?: string; fileName?: string }
>(results: T[], range: TimeRangeKey): T[] {
  if (range === "ALL") return results;
  const def = TIME_RANGES.find((r) => r.key === range);
  if (!def?.ms) return results;
  const now = Date.now();
  return results.filter((r) => {
    const ts = (r as any).ts || r?.content?.timestamp;
    if (!ts) return false;
    const time = Date.parse(ts);
    return !isNaN(time) && now - time <= def.ms!;
  });
}
