import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { logger, createStepLogger } from "../utils/logger";
import { playTradingAlert, TradingAction } from "../utils/sound-effects";
import {
  trackNewDecision,
  evaluateTrades,
  getTradeTrackerSnapshot,
} from "../utils/trade-tracker";

/**
 * Vision analysis configuration
 */
export interface VisionAnalysisConfig {
  screenshotsDir?: string;
  timeframes?: string[];
  model?: string;
  detail?: "low" | "high" | "auto";
  maxTokens?: number;
  temperature?: number;
  outputDir?: string;
  saveJson?: boolean;
  saveText?: boolean;
  soundEffects?: boolean;
  soundVolume?: number;
  injectPrice?: boolean; // fetch and inject live BTC price context
}

/**
 * Backtest configuration for testing vision analysis accuracy
 */
export interface BacktestConfig {
  testDataDir: string; // Root directory containing trend folders (bullish/bearish/neutral/sideways)
  model?: string;
  detail?: "low" | "high" | "auto";
  maxTokens?: number;
  temperature?: number;
  outputDir?: string;
  saveResults?: boolean;
  expectedTrends?: Array<"bullish" | "bearish" | "neutral" | "sideways">; // Trends to test (auto-discovered if not specified)
  timeframes?: string[]; // Timeframes to test (auto-discovered if not specified)
  maxImagesPerCategory?: number; // Limit images per category for faster testing
  verbose?: boolean; // Detailed logging
  concurrency?: number; // Number of parallel API calls (default: 10)
  progressInterval?: number; // Progress logging interval (default: 5)
}

/**
 * Chart analysis result for a single timeframe
 */
export interface ChartAnalysis {
  timeframe: string;
  trend: "bullish" | "bearish" | "neutral" | "sideways";
  strength: number; // 1-10 scale
  keyLevels: {
    support?: number;
    resistance?: number;
  };
  indicators: {
    volume: "high" | "medium" | "low";
    bollinger: "squeeze" | "expansion" | "neutral";
    momentum: "increasing" | "decreasing" | "stable";
  };
  signals: string[];
  confidence: number; // 1-10 scale
  analysis: string;
}

/**
 * Multi-timeframe trading decision
 */
export interface TradingDecision {
  action: "long" | "short" | "hold" | "close";
  confidence: number; // 1-10 scale
  reasoning: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  timeframes: ChartAnalysis[];
  overallTrend: "bullish" | "bearish" | "neutral";
  marketStructure: string;
  warnings: string[];
}

/**
 * Final comprehensive analysis
 */
export interface ComprehensiveAnalysis {
  executiveSummary: string;
  marketOverview: string;
  quantitativeMetrics: {
    bullishSignals: number;
    bearishSignals: number;
    neutralSignals: number;
    avgConfidence: number;
    timeframeAlignment: number; // 1-10 scale
  };
  riskAssessment: {
    riskLevel: "low" | "medium" | "high";
    keyRisks: string[];
    riskMitigation: string[];
  };
  strategicRecommendations: {
    primary: string;
    alternative: string;
    timeHorizon: string;
    positionSizing: string;
  };
  nextSteps: string[];
}

/**
 * Final trading verdict - definitive decision
 */
export interface TradingVerdict {
  action: "HOLD" | "LONG" | "SHORT";
  confidence: number; // 1-100 percentage
  positionSize: number; // 1-100 percentage of portfolio
  timeHorizon: "short" | "medium" | "long"; // short=intraday, medium=days, long=weeks
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  keyReason: string; // Single sentence reasoning
  nextCheckMinutes: number; // Minutes until next analysis (2-60 range)
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  criticalWarnings: string[];
}

/**
 * Vision analysis result
 */
export interface VisionAnalysisResult {
  success: boolean;
  tradingDecision?: TradingDecision;
  individualAnalyses: ChartAnalysis[];
  comprehensiveAnalysis?: ComprehensiveAnalysis;
  finalVerdict?: TradingVerdict;
  totalCost?: number;
  btcPrice?: number | null;
  btcPriceSource?: string | null;
  btcPriceTimestamp?: string | null;
  backtest?: BacktestResult; // Include backtest results if available
  error?: string;
}

/**
 * Individual backtest prediction result
 */
export interface BacktestPrediction {
  imagePath: string;
  timeframe: string;
  expectedTrend: "bullish" | "bearish" | "neutral" | "sideways";
  predictedTrend: "bullish" | "bearish" | "neutral" | "sideways";
  confidence: number; // 1-10 scale
  strength: number; // 1-10 scale
  correct: boolean;
  analysis: string;
  processingTime: number; // milliseconds
}

/**
 * Backtest accuracy metrics for a specific category
 */
export interface BacktestCategoryMetrics {
  category: "bullish" | "bearish" | "neutral" | "sideways";
  totalImages: number;
  correctPredictions: number;
  accuracy: number; // 0-1 percentage
  avgConfidence: number; // 1-10 scale
  avgStrength: number; // 1-10 scale
  predictions: BacktestPrediction[];
}

/**
 * Confusion matrix entry
 */
export interface ConfusionMatrixEntry {
  expected: "bullish" | "bearish" | "neutral" | "sideways";
  predicted: "bullish" | "bearish" | "neutral" | "sideways";
  count: number;
}

/**
 * Complete backtest result
 */
export interface BacktestResult {
  success: boolean;
  testDataDir: string;
  totalImages: number;
  correctPredictions: number;
  overallAccuracy: number; // 0-1 percentage
  totalCost: number;
  totalProcessingTime: number; // milliseconds
  categoryMetrics: BacktestCategoryMetrics[];
  confusionMatrix: ConfusionMatrixEntry[];
  timeframeBreakdown: {
    timeframe: string;
    totalImages: number;
    correctPredictions: number;
    accuracy: number;
  }[];
  modelUsed: string;
  detailLevel: string;
  timestamp: string;
  error?: string;
}

/**
 * Extract and parse JSON from LLM response with robust error handling
 */
const extractAndParseJSON = (
  content: string,
  contextDescription: string
): any => {
  try {
    // First try to find JSON blocks with ```json markers
    const jsonBlockMatch = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch (e) {
        // Continue to other methods if this fails
      }
    }

    // Try to find any JSON object in the response
    const jsonMatch = content.match(/{[\s\S]*}/);
    if (!jsonMatch || !jsonMatch[0]) {
      throw new Error(`No JSON object found in ${contextDescription} response`);
    }

    let jsonString = jsonMatch[0];

    // Clean up common JSON formatting issues
    jsonString = jsonString
      .replace(/,\s*}/g, "}") // Remove trailing commas before closing braces
      .replace(/,\s*]/g, "]") // Remove trailing commas before closing brackets
      .replace(/(["']?)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):/g, '"$2":') // Ensure property names are quoted
      .replace(/:\s*'([^']*)'/g, ': "$1"') // Convert single quotes to double quotes for string values
      .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)(\s*[,}])/g, ': "$1"$2'); // Quote unquoted string values

    // Try parsing the cleaned JSON
    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      // Log the problematic JSON for debugging
      logger.error(`❌ Failed to parse JSON in ${contextDescription}:`);
      logger.error(`Raw content length: ${content.length}`);
      logger.error(
        `JSON match: ${jsonString.substring(0, 500)}${
          jsonString.length > 500 ? "..." : ""
        }`
      );
      logger.error(`Parse error: ${(parseError as Error).message}`);

      throw new Error(
        `Invalid JSON in ${contextDescription}: ${
          (parseError as Error).message
        }`
      );
    }
  } catch (error) {
    logger.error(
      `❌ JSON extraction failed for ${contextDescription}: ${
        (error as Error).message
      }`
    );
    throw error;
  }
};

/**
 * Initialize OpenRouter client (compatible with OpenAI SDK)
 */
const initializeOpenAI = (): OpenAI => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/future-rob/this_is_my_quant", // Optional: for rankings
      "X-Title": "Jupiter Exchange Vision AI", // Optional: for rankings
    },
  });
};

/**
 * Generate timestamp string for filenames
 */
const generateTimestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
};

/**
 * Save analysis results to JSON file
 */
const saveAnalysisToJson = (
  result: VisionAnalysisResult,
  outputDir: string
): string => {
  const timestamp = generateTimestamp();
  const filename = `analysis-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save structured data
  const jsonData: any = {
    timestamp: new Date().toISOString(),
    success: result.success,
    analysisData: {
      individualAnalyses: result.individualAnalyses,
      tradingDecision: result.tradingDecision,
      finalVerdict: result.finalVerdict,
      totalCost: result.totalCost,
      btcPrice: result.btcPrice,
      btcPriceSource: result.btcPriceSource,
      btcPriceTimestamp: result.btcPriceTimestamp,
      // backtest field appended later if present on result
    },
    metadata: {
      timeframes: result.individualAnalyses.map((a) => a.timeframe),
      overallTrend: result.tradingDecision?.overallTrend,
      confidence: result.tradingDecision?.confidence,
      finalAction: result.finalVerdict?.action,
      finalConfidence: result.finalVerdict?.confidence,
      nextCheckMinutes: result.finalVerdict?.nextCheckMinutes,
      btcPrice: result.btcPrice,
      btcPriceSource: result.btcPriceSource,
    },
  };

  if ((result as any).backtest) {
    jsonData.analysisData.backtest = (result as any).backtest;
  }

  fs.writeFileSync(filepath, JSON.stringify(jsonData, null, 2));
  return filepath;
};

/**
 * Save analysis results to text report
 */
const saveAnalysisToText = (
  result: VisionAnalysisResult,
  outputDir: string
): string => {
  const timestamp = generateTimestamp();
  const filename = `analysis-${timestamp}.txt`;
  const filepath = path.join(outputDir, filename);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let report = "";

  // Header
  report += `VISION AI ANALYSIS REPORT\n`;
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `${"=".repeat(50)}\n\n`;

  if (!result.success) {
    report += `❌ ANALYSIS FAILED\n`;
    report += `Error: ${result.error}\n`;
    fs.writeFileSync(filepath, report);
    return filepath;
  }

  // Summary
  report += `📈 ANALYSIS SUMMARY\n`;
  report += `Timeframes Analyzed: ${result.individualAnalyses.length}\n`;
  if (result.totalCost) {
    report += `Total Cost: $${result.totalCost.toFixed(4)}\n`;
  }
  report += `\n`;

  // Individual analyses
  result.individualAnalyses.forEach((analysis) => {
    report += `🕐 ${analysis.timeframe.toUpperCase()} ANALYSIS\n`;
    report += `${"-".repeat(30)}\n`;
    report += `Trend: ${analysis.trend.toUpperCase()}\n`;
    report += `Strength: ${analysis.strength}/10\n`;
    report += `Confidence: ${analysis.confidence}/10\n`;

    if (analysis.keyLevels.support || analysis.keyLevels.resistance) {
      report += `Key Levels:\n`;
      if (analysis.keyLevels.support) {
        report += `  Support: $${analysis.keyLevels.support.toLocaleString()}\n`;
      }
      if (analysis.keyLevels.resistance) {
        report += `  Resistance: $${analysis.keyLevels.resistance.toLocaleString()}\n`;
      }
    }

    report += `Indicators:\n`;
    report += `  Volume: ${analysis.indicators.volume}\n`;
    report += `  Bollinger: ${analysis.indicators.bollinger}\n`;
    report += `  Momentum: ${analysis.indicators.momentum}\n`;

    if (analysis.signals.length > 0) {
      report += `Signals: ${analysis.signals.join(", ")}\n`;
    }

    report += `Analysis: ${analysis.analysis}\n\n`;
  });

  // Trading decision
  if (result.tradingDecision) {
    const decision = result.tradingDecision;
    report += `🎯 TRADING DECISION\n`;
    report += `${"=".repeat(30)}\n`;
    report += `Action: ${decision.action.toUpperCase()}\n`;
    report += `Confidence: ${decision.confidence}/10\n`;
    report += `Overall Trend: ${decision.overallTrend}\n`;

    if (decision.entryPrice) {
      report += `Entry Price: $${decision.entryPrice.toLocaleString()}\n`;
    }
    if (decision.stopLoss) {
      report += `Stop Loss: $${decision.stopLoss.toLocaleString()}\n`;
    }
    if (decision.takeProfit) {
      report += `Take Profit: $${decision.takeProfit.toLocaleString()}\n`;
    }
    if (decision.riskReward) {
      report += `Risk/Reward: 1:${decision.riskReward}\n`;
    }

    report += `\nMarket Structure: ${decision.marketStructure}\n`;
    report += `\nReasoning: ${decision.reasoning}\n`;

    if (decision.warnings.length > 0) {
      report += `\nWarnings:\n`;
      decision.warnings.forEach((warning) => {
        report += `  • ${warning}\n`;
      });
    }
    report += `\n`;
  }

  // Final verdict
  if (result.finalVerdict) {
    const verdict = result.finalVerdict;
    report += `⚡ FINAL TRADING VERDICT\n`;
    report += `${"=".repeat(30)}\n`;
    report += `ACTION: ${verdict.action}\n`;
    report += `CONFIDENCE: ${verdict.confidence}%\n`;
    report += `POSITION SIZE: ${verdict.positionSize}% of portfolio\n`;
    report += `TIME HORIZON: ${verdict.timeHorizon.toUpperCase()}\n`;
    report += `RISK LEVEL: ${verdict.riskLevel}\n`;
    report += `NEXT CHECK: ${verdict.nextCheckMinutes} minutes\n`;
    report += `\nKEY REASON: ${verdict.keyReason}\n`;

    if (verdict.action !== "HOLD") {
      report += `\nEXECUTION DETAILS:\n`;
      if (verdict.entryPrice) {
        report += `  Entry: $${verdict.entryPrice.toLocaleString()}\n`;
      }
      if (verdict.stopLoss) {
        report += `  Stop Loss: $${verdict.stopLoss.toLocaleString()}\n`;
      }
      if (verdict.takeProfit) {
        report += `  Take Profit: $${verdict.takeProfit.toLocaleString()}\n`;
      }
    }

    if (verdict.criticalWarnings.length > 0) {
      report += `\nCRITICAL WARNINGS:\n`;
      verdict.criticalWarnings.forEach((warning) => {
        report += `  • ${warning}\n`;
      });
    }

    report += `\n🚀 EXECUTE: ${verdict.action} ${verdict.positionSize}% (${verdict.confidence}% confidence)\n`;
    report += `${"=".repeat(30)}\n\n`;
  }

  report += `${"=".repeat(50)}\n`;
  report += `End of Report\n`;

  fs.writeFileSync(filepath, report);
  return filepath;
};

/**
 * Convert image to base64
 */
const imageToBase64 = (imagePath: string): string => {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString("base64");
};

/**
 * Get chart analysis prompt for a specific timeframe
 */
const getChartAnalysisPrompt = (timeframe: string): string => {
  return `
You are an expert cryptocurrency trader and technical analyst. Analyze this ${timeframe} chart image for SOLUSD perpetual futures trading.

CRITICAL ANALYSIS RULES:
1. Begin with PRICE STRUCTURE — identify if price is making higher highs/higher lows (bullish), lower highs/lower lows (bearish), or range-bound (sideways/neutral).
2. Distinguish between CURRENT MOVE and HIGHER-TIMEFRAME TREND — a short-term bounce within a long-term downtrend is still countertrend.
3. Detect the MARKET REGIME — is volatility contracting (squeeze/compression) or expanding (trend/impulse)?
4. Interpret Bollinger Bands correctly: squeeze = consolidation (not directional), expansion = trending.
5. Oversold + bullish divergence = potential bullish reversal (NOT continuation bearish).
6. “Sideways” = tight consolidation; “Neutral” = mixed directional signals.
7. Evaluate PATTERN GEOMETRY (flag, wedge, triangle, H&S, etc.) and whether it’s forming, breaking out, or invalidating.
8. Assess CONFLUENCE between volume trends, momentum direction, and structural breakout.
9. Define SETUP CONTEXT — breakout, reversal, continuation, or consolidation.
10. Specify entry confirmation conditions, invalidation levels, and potential targets.

Respond in **valid JSON only**, using the following structure exactly:

{
  "timeframe": "${timeframe}",
  "trend": "bullish" | "bearish" | "neutral" | "sideways",
  "strength": 1-10,
  "multiTimeframe": {
    "higherTrend": "bullish" | "bearish" | "neutral",
    "alignment": "aligned" | "countertrend"
  },
  "regime": "low-volatility" | "high-volatility" | "transition",
  "pattern": {
    "type": "flag" | "wedge" | "triangle" | "head-and-shoulders" | "none",
    "phase": "forming" | "breakout" | "invalidated"
  },
  "keyLevels": {
    "support": null,
    "resistance": null
  },
  "indicators": {
    "volume": "low" | "medium" | "high",
    "bollinger": "squeeze" | "expansion" | "neutral",
    "momentum": "increasing" | "decreasing" | "stable"
  },
  "confluence": {
    "momentumVolumeAlignment": "strong" | "weak" | "none"
  },
  "signals": ["breakout confirmation", "volume spike"],
  "riskReward": {
    "entry": null,
    "stopLoss": null,
    "target": null,
    "ratio": null
  },
  "quantMetrics": {
    "predictedReturn5d": null,
    "predictedVolatility": null
  },
  "confidence": 1-10,
  "analysis": "Detailed technical analysis text here"
}

JSON RULES:
- Use only valid double-quoted strings and integers (no decimals for strength/confidence).
- Use null when unknown.
- Do not include text before or after the JSON object.

Focus on actionable, high-quality insights for perpetual futures trading. Evaluate setups probabilistically, emphasizing structure, volatility regime, and risk–reward context.
`;
};

/**
 * Get multi-timeframe decision prompt
 */
const getMultiTimeframePrompt = (analyses: ChartAnalysis[]): string => {
  const analysesText = analyses
    .map(
      (a) =>
        `${a.timeframe}: ${a.trend} (strength: ${a.strength}/10, confidence: ${a.confidence}/10)\n` +
        `Signals: ${a.signals.join(", ")}\n` +
        `Analysis: ${a.analysis}\n`
    )
    .join("\n---\n");

  return `
You are an expert cryptocurrency trader making a multi-timeframe trading decision for SOLUSD perpetual futures.

Based on the following individual timeframe analyses:

${analysesText}

Provide a comprehensive trading decision that considers:

1. **Multi-Timeframe Alignment**: How timeframes align or conflict
2. **Market Structure**: Overall market structure and phase
3. **Risk Management**: Appropriate position sizing and risk levels
4. **Entry Strategy**: Best entry approach given the multi-timeframe view
5. **Exit Strategy**: Stop loss and take profit recommendations

CRITICAL: Respond with valid JSON only. Do not include any text before or after the JSON object.

Respond in JSON format with this exact structure:
{
  "action": "hold",
  "confidence": 6,
  "reasoning": "Detailed reasoning for the trading decision",
  "entryPrice": null,
  "stopLoss": null, 
  "takeProfit": null,
  "riskReward": null,
  "overallTrend": "neutral",
  "marketStructure": "Current market phase description",
  "warnings": ["Warning 1", "Warning 2"]
}

JSON RULES:
- Use exact string values: "long", "short", "hold", or "close" for action
- Use exact string values: "bullish", "bearish", or "neutral" for overallTrend
- Numbers must be integers (1-10) for confidence
- Use null for missing price levels
- No trailing commas
- All strings in double quotes

Focus on practical trading advice with specific price levels and risk management.
`;
};

/**
 * Analyze a single chart image
 */
const analyzeChartImage = async (
  openai: OpenAI,
  imagePath: string,
  timeframe: string,
  config: VisionAnalysisConfig
): Promise<ChartAnalysis> => {
  const stepLogger = createStepLogger(`Chart Analysis ${timeframe}`);

  try {
    stepLogger.start();

    const base64Image = imageToBase64(imagePath);
    const prompt = getChartAnalysisPrompt(timeframe);

    logger.info(`🔍 Analyzing ${timeframe} chart: ${path.basename(imagePath)}`);

    const response = await openai.chat.completions.create({
      model: config.model || "openai/gpt-4o",
      max_tokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: config.detail || "high",
              },
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    // Parse JSON response with robust error handling
    const analysis = extractAndParseJSON(
      content,
      `${timeframe} chart analysis`
    ) as ChartAnalysis;

    logger.info(
      `📊 ${timeframe} Analysis: ${analysis.trend} (${analysis.confidence}/10 confidence)`
    );
    stepLogger.complete();

    return analysis;
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Make multi-timeframe trading decision
 */
const makeMultiTimeframeDecision = async (
  openai: OpenAI,
  analyses: ChartAnalysis[],
  config: VisionAnalysisConfig
): Promise<TradingDecision> => {
  const stepLogger = createStepLogger("Multi-Timeframe Decision");

  try {
    stepLogger.start();

    const prompt = getMultiTimeframePrompt(analyses);

    logger.info("🧠 Making multi-timeframe trading decision...");

    const response = await openai.chat.completions.create({
      model: config.model || "openai/gpt-4o",
      max_tokens: config.maxTokens || 800,
      temperature: config.temperature || 0.1,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    // Parse JSON response with robust error handling
    const decision = extractAndParseJSON(
      content,
      "multi-timeframe decision"
    ) as Omit<TradingDecision, "timeframes">;

    const fullDecision: TradingDecision = {
      ...decision,
      timeframes: analyses,
    };

    logger.info(
      `💡 Trading Decision: ${fullDecision.action.toUpperCase()} (${
        fullDecision.confidence
      }/10 confidence)`
    );
    stepLogger.complete();

    return fullDecision;
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Calculate cost for text-only analysis
 */
const calculateTextCost = (
  input: string,
  output: string,
  model: string
): number => {
  const inputTokens = Math.ceil(input.length / 4); // Rough estimate
  const outputTokens = Math.ceil(output.length / 4);

  const costs = {
    "openai/gpt-4o": { input: 0.0025, output: 0.01 },
    "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "openai/gpt-4-turbo": { input: 0.01, output: 0.03 },
    // Fallback for legacy model names
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
  };

  const modelCost =
    costs[model as keyof typeof costs] || costs["openai/gpt-4o"];
  return (
    (inputTokens * modelCost.input + outputTokens * modelCost.output) / 1000
  );
};

/**
 * Generate final trading verdict using function calling for structured output
 */
const generateFinalVerdict = async (
  analyses: ChartAnalysis[],
  tradingDecision: TradingDecision,
  comprehensiveAnalysis: ComprehensiveAnalysis | null,
  openai: OpenAI,
  config: VisionAnalysisConfig
): Promise<{ verdict: TradingVerdict; cost: number }> => {
  const stepLogger = createStepLogger("Final Trading Verdict");

  try {
    stepLogger.start();

    // Create condensed context
    const timeframeSignals = analyses
      .map((a) => `${a.timeframe}: ${a.trend} (${a.confidence}%)`)
      .join(", ");

    // Create market context based on available data
    const marketContext = comprehensiveAnalysis
      ? `RISK LEVEL: ${comprehensiveAnalysis.riskAssessment.riskLevel}
ALIGNMENT SCORE: ${comprehensiveAnalysis.quantitativeMetrics.timeframeAlignment}/10`
      : `INDIVIDUAL ANALYSES: ${analyses
          .map(
            (a) => `${a.timeframe} (${a.trend}, confidence: ${a.confidence}/10)`
          )
          .join(", ")}`;

    const prompt = `You are a senior trading executive making the final decision. Based on all analysis, provide a definitive trading verdict.

TIMEFRAME SIGNALS: ${timeframeSignals}
OVERALL DECISION: ${tradingDecision.action} (${tradingDecision.confidence}/10)
${marketContext}

Your job is to make the FINAL EXECUTIVE DECISION. Be decisive and clear.

Guidelines:
- confidence: 1-100% (your certainty in this decision)
- positionSize: 1-100% (percentage of portfolio to risk)  
- timeHorizon: short=intraday, medium=days, long=weeks
- riskLevel: Based on market conditions and setup quality
- keyReason: One clear sentence why this action is best
- nextCheckMinutes: When to check again (2-60 minutes). Consider:
  * High volatility/uncertainty: 2-5 minutes
  * Strong signals with breakout potential: 5-10 minutes
  * Normal market conditions: 10-15 minutes
  * Consolidation/low volatility: 15-30 minutes
  * Strong trend continuation: 30-60 minutes
- Include entry/exit levels only if action is LONG or SHORT
- criticalWarnings: Key risks that could invalidate the decision

BE DECISIVE. This is the final call that will be acted upon.`;

    // Define tools schema for structured output (modern format)
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "make_trading_verdict",
          description:
            "Make a final executive trading decision with structured data",
          parameters: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["HOLD", "LONG", "SHORT"],
                description: "The definitive trading action to take",
              },
              confidence: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                description: "Confidence percentage in this decision (1-100)",
              },
              positionSize: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                description: "Percentage of portfolio to risk (1-100)",
              },
              timeHorizon: {
                type: "string",
                enum: ["short", "medium", "long"],
                description:
                  "Time horizon: short=intraday, medium=days, long=weeks",
              },
              riskLevel: {
                type: "string",
                enum: ["LOW", "MEDIUM", "HIGH"],
                description: "Risk level classification",
              },
              keyReason: {
                type: "string",
                description:
                  "Single sentence explaining why this decision is best",
              },
              nextCheckMinutes: {
                type: "integer",
                minimum: 2,
                maximum: 60,
                description:
                  "Minutes until next analysis check (2-60 range based on market conditions)",
              },
              entryPrice: {
                type: "number",
                description: "Entry price (only for LONG/SHORT actions)",
              },
              stopLoss: {
                type: "number",
                description: "Stop loss price (only for LONG/SHORT actions)",
              },
              takeProfit: {
                type: "number",
                description: "Take profit price (only for LONG/SHORT actions)",
              },
              criticalWarnings: {
                type: "array",
                items: {
                  type: "string",
                },
                description: "Key risks that could invalidate this decision",
              },
            },
            required: [
              "action",
              "confidence",
              "positionSize",
              "timeHorizon",
              "riskLevel",
              "keyReason",
              "nextCheckMinutes",
              "criticalWarnings",
            ],
            additionalProperties: false,
          },
        },
      },
    ];

    const response = await openai.chat.completions.create({
      model: config.model || "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      tools: tools,
      tool_choice: {
        type: "function",
        function: { name: "make_trading_verdict" },
      },
      temperature: 0.1,
    });

    const toolCall = response.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function.arguments) {
      throw new Error("No tool call response from OpenRouter");
    }

    const cost = calculateTextCost(
      prompt,
      toolCall.function.arguments,
      config.model || "openai/gpt-4o-mini"
    );

    // Parse the structured response
    const verdict = JSON.parse(toolCall.function.arguments) as TradingVerdict;

    logger.info(
      `⚡ Final Verdict: ${verdict.action} (${verdict.confidence}% confidence)`
    );
    logger.info(
      `⏰ Next check scheduled in ${verdict.nextCheckMinutes} minutes`
    );
    stepLogger.complete();

    return { verdict, cost };
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Execute complete vision analysis workflow
 */
export const executeVisionAnalysis = async (
  config: VisionAnalysisConfig = {}
): Promise<VisionAnalysisResult> => {
  const stepLogger = createStepLogger("Vision Analysis");
  const screenshotsDir = config.screenshotsDir || "screenshots";
  const timeframes = config.timeframes || ["5m", "15m", "1h", "2h", "6h"];

  try {
    stepLogger.start();

    // Optionally fetch BTC price upfront
    let btcPrice: number | null = null;
    let btcPriceSource: string | undefined;
    let btcPriceTimestamp: string | undefined;
    if (config.injectPrice !== false) {
      try {
        const { fetchBTCPrice } = await import("../utils/price");
        const priceResult = await fetchBTCPrice();
        btcPrice = priceResult.price;
        btcPriceSource = priceResult.source;
        btcPriceTimestamp = priceResult.timestamp;
        if (btcPrice) {
          logger.info(
            `💱 Live BTC Price: $${btcPrice.toLocaleString()} (source: ${btcPriceSource})`
          );
        } else {
          logger.warn(
            `⚠️  BTC price unavailable (${
              priceResult.error || "unknown error"
            })`
          );
        }
      } catch (e) {
        logger.warn(`⚠️  Failed to fetch BTC price: ${(e as Error).message}`);
      }
    }

    // Verify OpenAI API key
    const openai = initializeOpenAI();

    // Find chart images (prefer cropped versions if available)
    const imageFiles: Array<{ path: string; timeframe: string }> = [];

    for (const timeframe of timeframes) {
      // Check for cropped version first
      const croppedPath = path.join(
        screenshotsDir,
        `jupiter-${timeframe}-cropped.png`
      );
      const originalPath = path.join(
        screenshotsDir,
        `jupiter-${timeframe}.png`
      );

      if (fs.existsSync(croppedPath)) {
        imageFiles.push({ path: croppedPath, timeframe });
        logger.info(
          `📸 Using cropped image for ${timeframe}: ${path.basename(
            croppedPath
          )}`
        );
      } else if (fs.existsSync(originalPath)) {
        imageFiles.push({ path: originalPath, timeframe });
        logger.info(
          `📸 Using original image for ${timeframe}: ${path.basename(
            originalPath
          )}`
        );
      } else {
        logger.warn(`⚠️  Missing screenshot for ${timeframe}: ${originalPath}`);
      }
    }

    if (imageFiles.length === 0) {
      throw new Error("No chart images found. Run chart capture first.");
    }

    logger.info(`📸 Found ${imageFiles.length} chart images to analyze`);

    // Analyze all timeframes in parallel for faster execution
    logger.info(
      `🔄 Running ${imageFiles.length} timeframe analyses in parallel...`
    );

    const analysisPromises = imageFiles.map(
      async ({ path: imagePath, timeframe }) => {
        try {
          const analysis = await analyzeChartImage(
            openai,
            imagePath,
            timeframe,
            config
          );
          logger.info(`✅ Completed ${timeframe} analysis`);
          return analysis;
        } catch (error) {
          logger.error(
            `❌ Failed to analyze ${timeframe}: ${(error as Error).message}`
          );
          return null;
        }
      }
    );

    // Wait for all analyses to complete
    const analysisResults = await Promise.all(analysisPromises);

    // Filter out failed analyses
    const individualAnalyses: ChartAnalysis[] = analysisResults.filter(
      (analysis): analysis is ChartAnalysis => analysis !== null
    );

    logger.info(
      `🎯 Completed ${individualAnalyses.length}/${imageFiles.length} timeframe analyses`
    );

    // Add a small delay after all parallel analyses complete to be gentle on the API
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (individualAnalyses.length === 0) {
      throw new Error("No successful chart analyses");
    }

    // Make multi-timeframe trading decision
    const tradingDecision = await makeMultiTimeframeDecision(
      openai,
      individualAnalyses,
      config
    );

    // Generate final trading verdict (without comprehensive analysis)
    const { verdict: finalVerdict, cost: verdictCost } =
      await generateFinalVerdict(
        individualAnalyses,
        tradingDecision,
        null, // No comprehensive analysis
        openai,
        config
      );

    // Play sound alert for the final verdict
    if (finalVerdict && config.soundEffects !== false) {
      await playTradingAlert(
        finalVerdict.action as TradingAction,
        finalVerdict.confidence,
        finalVerdict.keyReason
      );
    }

    stepLogger.complete();

    const totalCost = verdictCost;

    const result: VisionAnalysisResult = {
      success: true,
      tradingDecision,
      individualAnalyses,
      finalVerdict,
      totalCost,
      btcPrice: btcPrice ?? null,
      btcPriceSource: btcPriceSource ?? null,
      btcPriceTimestamp: btcPriceTimestamp ?? null,
    };

    // --- Backtesting integration ---
    try {
      if (finalVerdict?.action === "LONG" || finalVerdict?.action === "SHORT") {
        trackNewDecision({
          action: finalVerdict.action,
          plannedEntryPrice: finalVerdict.entryPrice ?? null,
          marketPrice: btcPrice ?? null,
          stopLoss: (finalVerdict.stopLoss ?? null) as number | null,
          takeProfit: (finalVerdict.takeProfit ?? null) as number | null,
        });
      }
      // Evaluate existing unresolved trades each run
      const evalResult = await evaluateTrades();
      const snapshot = getTradeTrackerSnapshot();
      // Attach backtest info onto result for serialization
      (result as any).backtest = {
        evaluation: evalResult,
        snapshot,
      };
    } catch (btErr) {
      logger.warn(`⚠️ Backtest evaluation failed: ${(btErr as Error).message}`);
    }
    // --- End Backtesting integration ---

    // Save results to files if requested
    if (config.saveJson || config.saveText) {
      const outputDir = config.outputDir || "analysis-results";
      const savedFiles: string[] = [];

      if (config.saveJson) {
        const jsonPath = saveAnalysisToJson(result, outputDir);
        savedFiles.push(jsonPath);
        logger.info(`💾 Saved JSON analysis: ${jsonPath}`);
      }

      if (config.saveText) {
        const textPath = saveAnalysisToText(result, outputDir);
        savedFiles.push(textPath);
        logger.info(`📄 Saved text report: ${textPath}`);
      }

      if (savedFiles.length > 0) {
        logger.info(`📁 Analysis files saved to: ${outputDir}/`);
      }
    }

    return result;
  } catch (error) {
    stepLogger.error(error as Error);
    return {
      success: false,
      individualAnalyses: [],
      error: (error as Error).message,
    };
  }
};

/**
 * Discover test images in backtest directory structure
 */
const discoverBacktestImages = (
  testDataDir: string,
  config: BacktestConfig
): {
  images: {
    path: string;
    trend: "bullish" | "bearish" | "neutral" | "sideways";
    timeframe: string;
  }[];
  availableTrends: Array<"bullish" | "bearish" | "neutral" | "sideways">;
  availableTimeframes: string[];
} => {
  const images: {
    path: string;
    trend: "bullish" | "bearish" | "neutral" | "sideways";
    timeframe: string;
  }[] = [];
  const availableTrends = new Set<
    "bullish" | "bearish" | "neutral" | "sideways"
  >();
  const availableTimeframes = new Set<string>();

  const trendFolders = ["bullish", "bearish", "neutral", "sideways"] as const;

  for (const trend of trendFolders) {
    const trendDir = path.join(testDataDir, trend);

    if (!fs.existsSync(trendDir)) {
      logger.warn(`⚠️  Trend folder not found: ${trendDir}`);
      continue;
    }

    // Skip if trend not in expected trends filter
    if (config.expectedTrends && !config.expectedTrends.includes(trend)) {
      continue;
    }

    const trendImages = fs
      .readdirSync(trendDir)
      .filter((file) => /\.(png|jpg|jpeg)$/i.test(file))
      .map((file) => {
        // Extract timeframe from filename (e.g., "5m_chart_1.png" -> "5m")
        const timeframeMatch = file.match(/^(\d+[mhd])/i);
        const timeframe = timeframeMatch?.[1]?.toLowerCase() || "unknown";

        return {
          path: path.join(trendDir, file),
          trend,
          timeframe,
        };
      })
      .filter((img) => {
        // Skip if timeframe not in filter
        if (config.timeframes && !config.timeframes.includes(img.timeframe)) {
          return false;
        }
        return true;
      });

    if (trendImages.length > 0) {
      availableTrends.add(trend);

      // Apply max images per category limit
      const limitedImages = config.maxImagesPerCategory
        ? trendImages.slice(0, config.maxImagesPerCategory)
        : trendImages;

      images.push(...limitedImages);

      // Track available timeframes
      limitedImages.forEach((img) => availableTimeframes.add(img.timeframe));

      logger.info(
        `📁 Found ${limitedImages.length} ${trend} images${
          config.maxImagesPerCategory
            ? ` (limited from ${trendImages.length})`
            : ""
        }`
      );
    }
  }

  return {
    images,
    availableTrends: Array.from(availableTrends),
    availableTimeframes: Array.from(availableTimeframes),
  };
};

/**
 * Calculate backtest accuracy metrics
 */
const calculateBacktestMetrics = (
  predictions: BacktestPrediction[]
): {
  categoryMetrics: BacktestCategoryMetrics[];
  confusionMatrix: ConfusionMatrixEntry[];
  timeframeBreakdown: {
    timeframe: string;
    totalImages: number;
    correctPredictions: number;
    accuracy: number;
  }[];
  overallAccuracy: number;
} => {
  const trends = ["bullish", "bearish", "neutral", "sideways"] as const;

  // Calculate per-category metrics
  const categoryMetrics: BacktestCategoryMetrics[] = trends
    .map((trend) => {
      const categoryPredictions = predictions.filter(
        (p) => p.expectedTrend === trend
      );
      const correctPredictions = categoryPredictions.filter(
        (p) => p.correct
      ).length;

      return {
        category: trend,
        totalImages: categoryPredictions.length,
        correctPredictions,
        accuracy:
          categoryPredictions.length > 0
            ? correctPredictions / categoryPredictions.length
            : 0,
        avgConfidence:
          categoryPredictions.length > 0
            ? categoryPredictions.reduce((sum, p) => sum + p.confidence, 0) /
              categoryPredictions.length
            : 0,
        avgStrength:
          categoryPredictions.length > 0
            ? categoryPredictions.reduce((sum, p) => sum + p.strength, 0) /
              categoryPredictions.length
            : 0,
        predictions: categoryPredictions,
      };
    })
    .filter((m) => m.totalImages > 0);

  // Build confusion matrix
  const confusionMatrix: ConfusionMatrixEntry[] = [];
  for (const expected of trends) {
    for (const predicted of trends) {
      const count = predictions.filter(
        (p) => p.expectedTrend === expected && p.predictedTrend === predicted
      ).length;
      if (count > 0) {
        confusionMatrix.push({ expected, predicted, count });
      }
    }
  }

  // Calculate per-timeframe breakdown
  const timeframes = [...new Set(predictions.map((p) => p.timeframe))];
  const timeframeBreakdown = timeframes.map((timeframe) => {
    const timeframePredictions = predictions.filter(
      (p) => p.timeframe === timeframe
    );
    const correctPredictions = timeframePredictions.filter(
      (p) => p.correct
    ).length;

    return {
      timeframe,
      totalImages: timeframePredictions.length,
      correctPredictions,
      accuracy:
        timeframePredictions.length > 0
          ? correctPredictions / timeframePredictions.length
          : 0,
    };
  });

  // Overall accuracy
  const overallAccuracy =
    predictions.length > 0
      ? predictions.filter((p) => p.correct).length / predictions.length
      : 0;

  return {
    categoryMetrics,
    confusionMatrix,
    timeframeBreakdown,
    overallAccuracy,
  };
};

/**
 * Save backtest results to files
 */
const saveBacktestResults = (
  result: BacktestResult,
  outputDir: string
): { jsonPath: string; textPath: string } => {
  const timestamp = generateTimestamp();
  const jsonFilename = `backtest-${timestamp}.json`;
  const textFilename = `backtest-${timestamp}.txt`;
  const jsonPath = path.join(outputDir, jsonFilename);
  const textPath = path.join(outputDir, textFilename);

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON results
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  // Generate text report
  let report = "";

  report += `VISION AI BACKTEST REPORT\n`;
  report += `Generated: ${result.timestamp}\n`;
  report += `${"=".repeat(50)}\n\n`;

  if (!result.success) {
    report += `❌ BACKTEST FAILED\n`;
    report += `Error: ${result.error}\n`;
  } else {
    report += `📊 BACKTEST SUMMARY\n`;
    report += `Test Data Directory: ${result.testDataDir}\n`;
    report += `Model: ${result.modelUsed}\n`;
    report += `Detail Level: ${result.detailLevel}\n`;
    report += `Total Images Tested: ${result.totalImages}\n`;
    report += `Correct Predictions: ${result.correctPredictions}\n`;
    report += `Overall Accuracy: ${(result.overallAccuracy * 100).toFixed(
      2
    )}%\n`;
    report += `Total Cost: $${result.totalCost.toFixed(4)}\n`;
    report += `Processing Time: ${(result.totalProcessingTime / 1000).toFixed(
      2
    )}s\n\n`;

    // Category breakdown
    report += `📈 CATEGORY PERFORMANCE\n`;
    report += `${"-".repeat(30)}\n`;
    result.categoryMetrics.forEach((category) => {
      report += `${category.category.toUpperCase()}:\n`;
      report += `  Images: ${category.totalImages}\n`;
      report += `  Correct: ${category.correctPredictions}\n`;
      report += `  Accuracy: ${(category.accuracy * 100).toFixed(2)}%\n`;
      report += `  Avg Confidence: ${category.avgConfidence.toFixed(1)}/10\n`;
      report += `  Avg Strength: ${category.avgStrength.toFixed(1)}/10\n\n`;
    });

    // Timeframe breakdown
    if (result.timeframeBreakdown.length > 0) {
      report += `🕐 TIMEFRAME PERFORMANCE\n`;
      report += `${"-".repeat(30)}\n`;
      result.timeframeBreakdown.forEach((tf) => {
        report += `${tf.timeframe.toUpperCase()}:\n`;
        report += `  Images: ${tf.totalImages}\n`;
        report += `  Correct: ${tf.correctPredictions}\n`;
        report += `  Accuracy: ${(tf.accuracy * 100).toFixed(2)}%\n\n`;
      });
    }

    // Confusion matrix
    if (result.confusionMatrix.length > 0) {
      report += `🔀 CONFUSION MATRIX\n`;
      report += `${"-".repeat(30)}\n`;
      const trends = ["bullish", "bearish", "neutral", "sideways"];

      // Header
      report += `${"".padStart(12)} `;
      trends.forEach((t) => (report += `${t.padStart(8)} `));
      report += `\n`;

      // Matrix rows
      trends.forEach((expected) => {
        report += `${expected.padStart(10)}: `;
        trends.forEach((predicted) => {
          const entry = result.confusionMatrix.find(
            (e) => e.expected === expected && e.predicted === predicted
          );
          const count = entry ? entry.count : 0;
          report += `${count.toString().padStart(8)} `;
        });
        report += `\n`;
      });
    }
  }

  report += `\n${"=".repeat(50)}\n`;
  report += `End of Backtest Report\n`;

  fs.writeFileSync(textPath, report);

  return { jsonPath, textPath };
};

/**
 * Execute backtest on labeled chart images
 */
export const executeBacktest = async (
  config: BacktestConfig
): Promise<BacktestResult> => {
  const stepLogger = createStepLogger("Vision Analysis Backtest");
  const startTime = Date.now();

  try {
    stepLogger.start();

    if (!fs.existsSync(config.testDataDir)) {
      throw new Error(`Test data directory not found: ${config.testDataDir}`);
    }

    // Initialize OpenAI client
    const openai = initializeOpenAI();

    // Discover test images
    logger.info(`🔍 Scanning test data directory: ${config.testDataDir}`);
    const { images, availableTrends, availableTimeframes } =
      discoverBacktestImages(config.testDataDir, config);

    if (images.length === 0) {
      throw new Error(
        "No test images found. Check directory structure and filters."
      );
    }

    logger.info(`📊 Discovered ${images.length} test images`);
    logger.info(`📈 Available trends: ${availableTrends.join(", ")}`);
    logger.info(`🕐 Available timeframes: ${availableTimeframes.join(", ")}`);

    // Process all images with controlled concurrency for optimal performance
    const concurrency = config.concurrency || 10; // Default to 10 parallel requests
    const progressInterval = config.progressInterval || 5;

    logger.info(
      `🚀 Processing ${images.length} images with concurrency limit of ${concurrency}...`
    );

    // Split images into batches for controlled concurrency
    const batches: Array<
      Array<{
        path: string;
        trend: "bullish" | "bearish" | "neutral" | "sideways";
        timeframe: string;
      }>
    > = [];

    for (let i = 0; i < images.length; i += concurrency) {
      batches.push(images.slice(i, i + concurrency));
    }

    const predictions: BacktestPrediction[] = [];
    let totalCost = 0;
    let successCount = 0;
    let processedCount = 0;

    // Process batches sequentially, but images within each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (!batch) continue; // Safety check

      const batchStartTime = Date.now();

      logger.info(
        `📦 Processing batch ${batchIndex + 1}/${batches.length} (${
          batch.length
        } images)...`
      );

      const batchPromises = batch.map(async (image, imageIndex) => {
        const globalIndex = batchIndex * concurrency + imageIndex;
        const imageStartTime = Date.now();

        try {
          if (config.verbose) {
            logger.info(
              `🔍 [${globalIndex + 1}/${
                images.length
              }] Processing ${path.basename(image.path)} (${image.trend}/${
                image.timeframe
              })`
            );
          }

          // Analyze the chart image
          const analysis = await analyzeChartImage(
            openai,
            image.path,
            image.timeframe,
            {
              model: config.model || "openai/gpt-4o",
              detail: config.detail || "high",
              maxTokens: config.maxTokens || 1000,
              temperature: config.temperature || 0.1,
            }
          );

          const imageProcessingTime = Date.now() - imageStartTime;
          const isCorrect = analysis.trend === image.trend;

          const prediction: BacktestPrediction = {
            imagePath: image.path,
            timeframe: image.timeframe,
            expectedTrend: image.trend,
            predictedTrend: analysis.trend,
            confidence: analysis.confidence,
            strength: analysis.strength,
            correct: isCorrect,
            analysis: analysis.analysis,
            processingTime: imageProcessingTime,
          };

          if (config.verbose) {
            const status = isCorrect ? "✅" : "❌";
            logger.info(
              `${status} [${globalIndex + 1}/${images.length}] ${path.basename(
                image.path
              )}: Expected ${image.trend}, Got ${analysis.trend} (${
                analysis.confidence
              }/10)`
            );
          }

          return { success: true, prediction, cost: 0.01 }; // Approximate cost per image
        } catch (error) {
          logger.error(
            `❌ [${globalIndex + 1}/${
              images.length
            }] Failed to process ${path.basename(image.path)}: ${
              (error as Error).message
            }`
          );

          // Return failed prediction
          const failedPrediction: BacktestPrediction = {
            imagePath: image.path,
            timeframe: image.timeframe,
            expectedTrend: image.trend,
            predictedTrend: "neutral", // Default for failed predictions
            confidence: 0,
            strength: 0,
            correct: false,
            analysis: `Error: ${(error as Error).message}`,
            processingTime: Date.now() - imageStartTime,
          };

          return { success: false, prediction: failedPrediction, cost: 0 };
        }
      });

      // Wait for current batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Process batch results
      let batchSuccessCount = 0;
      for (const result of batchResults) {
        predictions.push(result.prediction);
        totalCost += result.cost;
        if (result.success) {
          successCount++;
          batchSuccessCount++;
        }
        processedCount++;
      }

      const batchTime = Date.now() - batchStartTime;
      const avgTimePerImage = batch.length > 0 ? batchTime / batch.length : 0;
      const remainingImages = images.length - processedCount;
      const estimatedTimeRemaining =
        (remainingImages / concurrency) * batchTime;

      logger.success(
        `✅ Batch ${batchIndex + 1}/${
          batches.length
        } completed: ${batchSuccessCount}/${
          batch.length
        } successful (${batchTime}ms)`
      );

      if (remainingImages > 0) {
        logger.info(
          `📊 Progress: ${processedCount}/${images.length} (${(
            (processedCount / images.length) *
            100
          ).toFixed(1)}%) | ETA: ${Math.round(estimatedTimeRemaining / 1000)}s`
        );
      }

      // Small delay between batches to be respectful to API rate limits
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    logger.success(
      `🎯 Completed ${successCount}/${images.length} analyses successfully`
    );
    if (successCount < images.length) {
      logger.warn(`⚠️  ${images.length - successCount} analyses failed`);
    }

    // Calculate metrics
    const metrics = calculateBacktestMetrics(predictions);
    const totalProcessingTime = Date.now() - startTime;

    const result: BacktestResult = {
      success: true,
      testDataDir: config.testDataDir,
      totalImages: images.length,
      correctPredictions: predictions.filter((p) => p.correct).length,
      overallAccuracy: metrics.overallAccuracy,
      totalCost,
      totalProcessingTime,
      categoryMetrics: metrics.categoryMetrics,
      confusionMatrix: metrics.confusionMatrix,
      timeframeBreakdown: metrics.timeframeBreakdown,
      modelUsed: config.model || "openai/gpt-4o",
      detailLevel: config.detail || "high",
      timestamp: new Date().toISOString(),
    };

    // Save results if requested
    if (config.saveResults !== false && config.outputDir) {
      const { jsonPath, textPath } = saveBacktestResults(
        result,
        config.outputDir
      );
      logger.success(`💾 Backtest results saved:`);
      logger.info(`   JSON: ${jsonPath}`);
      logger.info(`   Report: ${textPath}`);
    }

    // Log summary
    logger.success(`✅ Backtest completed successfully!`);
    logger.info(
      `📊 Overall Accuracy: ${(result.overallAccuracy * 100).toFixed(2)}%`
    );
    logger.info(
      `🎯 Correct: ${result.correctPredictions}/${result.totalImages}`
    );
    logger.info(`💰 Total Cost: $${result.totalCost.toFixed(4)}`);
    logger.info(
      `⏱️  Processing Time: ${(result.totalProcessingTime / 1000).toFixed(2)}s`
    );

    stepLogger.complete();
    return result;
  } catch (error) {
    stepLogger.error(error as Error);

    return {
      success: false,
      testDataDir: config.testDataDir,
      totalImages: 0,
      correctPredictions: 0,
      overallAccuracy: 0,
      totalCost: 0,
      totalProcessingTime: Date.now() - startTime,
      categoryMetrics: [],
      confusionMatrix: [],
      timeframeBreakdown: [],
      modelUsed: config.model || "openai/gpt-4o",
      detailLevel: config.detail || "high",
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
    };
  }
};

// Configuration functions have been moved to src/config/
// Import them from there: import { createBacktestConfig, createVisionAnalysisConfig } from '../config';
