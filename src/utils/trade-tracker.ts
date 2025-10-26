import fs from "fs";
import path from "path";
import { fetchBTCPrice } from "./price";
import { logger } from "./logger";

/**
 * A single tracked trade decision captured at time of analysis.
 */
export interface TrackedDecision {
  id: string; // unique id (timestamp based)
  timestamp: string; // ISO time created
  action: "LONG" | "SHORT" | "HOLD"; // final verdict action
  entryPrice: number | null; // actual tracked entry (live or adjusted)
  plannedEntryPrice?: number | null; // AI suggested entry (might be placeholder like 100)
  stopLoss?: number | null;
  takeProfit?: number | null;
  // Dynamic evaluation fields
  hit05?: boolean; // Reached +0.5% (LONG) or -0.5% (SHORT)
  hit10?: boolean; // Reached +1.0% or -1.0%
  adverse10?: boolean; // Went -1.0% (LONG) or +1.0% (SHORT) before target hit
  adverse20?: boolean; // Went -2.0% (LONG) or +2.0% (SHORT)
  outcome?: "TARGET_HIT" | "ADVERSE_MOVE" | "NONE"; // locked once resolved
  resolutionTimestamp?: string; // when outcome locked
  // Raw extremes observed so far since creation
  maxPrice?: number | null; // highest observed price since tracking (for LONG)
  minPrice?: number | null; // lowest observed price (for LONG); reversed semantics for SHORT stored anyway
  lastPrice?: number | null; // last evaluation price
  evaluations: Array<{
    t: string; // timestamp
    price: number | null;
  }>;
  autoAdjusted?: boolean;
  adjustmentReason?: string;
}

export interface BacktestSummaryMetrics {
  total: number;
  unresolved: number;
  targetHits: number;
  adverseFirst: number;
  avgTimeToResolutionMinutes?: number; // optional
  hitRate05?: number; // % trades that reached first target vs resolved trades
  hitRate10?: number; // % trades that reached second target vs resolved trades
}

const STORE_DIR = "analysis-results"; // co-locate with existing outputs
const STORE_FILE = path.join(STORE_DIR, "trade-tracker.json");

interface StoreShape {
  version: number;
  decisions: TrackedDecision[];
}

function loadStore(): StoreShape {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
      if (Array.isArray(data.decisions)) return data as StoreShape;
    }
  } catch (e) {
    logger.warn(
      `⚠️ Failed to load trade tracker store: ${(e as Error).message}`
    );
  }
  return { version: 1, decisions: [] };
}

function saveStore(store: StoreShape) {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    logger.error(
      `❌ Failed to save trade tracker store: ${(e as Error).message}`
    );
  }
}

/**
 * Register a new decision (called after each final verdict generation)
 */
export function trackNewDecision(params: {
  action: "LONG" | "SHORT" | "HOLD";
  marketPrice?: number | null; // live btc price at decision time
  plannedEntryPrice?: number | null; // AI supplied planned entry
  stopLoss?: number | null;
  takeProfit?: number | null;
}): TrackedDecision | null {
  if (params.action === "HOLD") return null; // we only backtest directional calls
  const store = loadStore();
  const id = `td-${Date.now()}`;
  const chosenEntry = params.marketPrice ?? params.plannedEntryPrice ?? null;
  const decision: TrackedDecision = {
    id,
    timestamp: new Date().toISOString(),
    action: params.action,
    entryPrice: chosenEntry,
    plannedEntryPrice: params.plannedEntryPrice ?? null,
    stopLoss: params.stopLoss ?? null,
    takeProfit: params.takeProfit ?? null,
    evaluations: [],
    maxPrice: null,
    minPrice: null,
    lastPrice: null,
  };
  store.decisions.push(decision);
  saveStore(store);
  return decision;
}

/**
 * Evaluate all unresolved trades against current price. A trade locks when either:
 *  - Target threshold first: price moves in favorable direction +0.5% or +1% (LONG) (-0.5% / -1% SHORT)
 *  - Adverse threshold first: price moves -1% or -2% (LONG) (+1% / +2% SHORT) before any target hit
 */
export async function evaluateTrades(): Promise<{
  updated: number;
  metrics: BacktestSummaryMetrics;
}> {
  const store = loadStore();
  const unresolved = store.decisions.filter(
    (d) => !d.outcome && d.action !== "HOLD"
  );
  if (unresolved.length === 0) {
    return { updated: 0, metrics: buildMetrics(store.decisions) };
  }
  // Fetch live price once
  const priceResult = await fetchBTCPrice();
  const currentPrice = priceResult.price;
  const nowIso = new Date().toISOString();

  for (const d of unresolved) {
    d.evaluations.push({ t: nowIso, price: currentPrice });
    if (currentPrice == null || d.entryPrice == null) continue; // can't evaluate

    // Auto-adjust clearly unrealistic entry (e.g., placeholder 100 vs real 100k+ market price)
    if (!d.autoAdjusted && d.entryPrice && currentPrice) {
      const ratio = currentPrice / d.entryPrice;
      if (ratio > 5) {
        d.adjustmentReason = `Adjusted entry from ${
          d.entryPrice
        } to ${currentPrice} (ratio ${ratio.toFixed(2)})`;
        d.entryPrice = currentPrice; // normalize
        d.autoAdjusted = true;
      }
    }

    // Update extremes
    if (d.maxPrice == null || currentPrice > (d.maxPrice || -Infinity))
      d.maxPrice = currentPrice;
    if (d.minPrice == null || currentPrice < (d.minPrice || Infinity))
      d.minPrice = currentPrice;
    d.lastPrice = currentPrice;

    const changePct = ((currentPrice - d.entryPrice) / d.entryPrice) * 100; // positive if price above entry

    if (d.action === "LONG") {
      // Favorable thresholds
      if (!d.hit05 && changePct >= 0.5) d.hit05 = true;
      if (!d.hit10 && changePct >= 1.0) d.hit10 = true;
      // Adverse thresholds only if no favorable achieved yet
      if (!d.hit05 && !d.hit10) {
        if (!d.adverse10 && changePct <= -1.0) d.adverse10 = true;
        if (!d.adverse20 && changePct <= -2.0) d.adverse20 = true;
      }
    } else if (d.action === "SHORT") {
      // For short, invert direction: favorable is price below entry
      if (!d.hit05 && changePct <= -0.5) d.hit05 = true;
      if (!d.hit10 && changePct <= -1.0) d.hit10 = true;
      if (!d.hit05 && !d.hit10) {
        if (!d.adverse10 && changePct >= 1.0) d.adverse10 = true;
        if (!d.adverse20 && changePct >= 2.0) d.adverse20 = true;
      }
    }

    // Determine resolution order rule: first side (target or adverse) that triggers locks outcome
    if (!d.outcome) {
      const favorableTriggered = d.hit05 || d.hit10;
      const adverseTriggered = d.adverse10 || d.adverse20;
      if (favorableTriggered || adverseTriggered) {
        d.outcome = favorableTriggered ? "TARGET_HIT" : "ADVERSE_MOVE";
        d.resolutionTimestamp = nowIso;
      }
    }
  }

  saveStore(store);
  return { updated: unresolved.length, metrics: buildMetrics(store.decisions) };
}

/** Build aggregate metrics */
function buildMetrics(all: TrackedDecision[]): BacktestSummaryMetrics {
  const directional = all.filter((d) => d.action !== "HOLD");
  const resolved = directional.filter((d) => d.outcome);
  const targetHits = resolved.filter((d) => d.outcome === "TARGET_HIT").length;
  const adverseFirst = resolved.filter(
    (d) => d.outcome === "ADVERSE_MOVE"
  ).length;
  let avgTime: number | undefined;
  if (resolved.length) {
    const ms = resolved
      .map((d) =>
        d.resolutionTimestamp
          ? new Date(d.resolutionTimestamp).getTime() -
            new Date(d.timestamp).getTime()
          : 0
      )
      .filter((v) => v > 0);
    if (ms.length) avgTime = ms.reduce((a, b) => a + b, 0) / ms.length / 60000; // minutes
  }
  const hitRate05 = resolved.length
    ? resolved.filter((d) => d.hit05).length / resolved.length
    : undefined;
  const hitRate10 = resolved.length
    ? resolved.filter((d) => d.hit10).length / resolved.length
    : undefined;
  const base: BacktestSummaryMetrics = {
    total: directional.length,
    unresolved: directional.length - resolved.length,
    targetHits,
    adverseFirst,
  };
  if (avgTime !== undefined) (base as any).avgTimeToResolutionMinutes = avgTime;
  if (hitRate05 !== undefined) (base as any).hitRate05 = hitRate05;
  if (hitRate10 !== undefined) (base as any).hitRate10 = hitRate10;
  return base;
}

/**
 * Get snapshot of store (for embedding into analysis file)
 */
export function getTradeTrackerSnapshot() {
  const store = loadStore();
  const metrics = buildMetrics(store.decisions);
  return {
    metrics,
    recent: store.decisions.slice(-10), // last 10 for brevity
  };
}
