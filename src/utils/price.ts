import https from "https";

export interface BTCPriceResult {
  price: number | null;
  source: string;
  timestamp: string;
  error?: string;
}

/**
 * Fetch current BTC/USD price from public APIs (CoinGecko primary, Binance fallback)
 * Lightweight (no external deps) and resilient with short timeouts.
 */
export async function fetchBTCPrice(timeoutMs = 4000): Promise<BTCPriceResult> {
  const timestamp = new Date().toISOString();

  const fetchJson = (url: string): Promise<any> =>
    new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error("timeout"));
      });
    });

  // 1. CoinGecko
  try {
    const cg = await fetchJson(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const price = cg?.solana?.usd;
    if (typeof price === "number") {
      return { price, source: "coingecko", timestamp };
    }
  } catch (e) {
    // swallow and try fallback
  }

  // 2. Binance fallback
  try {
    const bn = await fetchJson(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"
    );
    const price = parseFloat(bn?.price);
    if (!isNaN(price)) {
      return { price, source: "binance", timestamp };
    }
  } catch (e) {
    return {
      price: null,
      source: "unavailable",
      timestamp,
      error: (e as Error).message,
    };
  }

  return {
    price: null,
    source: "unavailable",
    timestamp,
    error: "No price fetched",
  };
}
