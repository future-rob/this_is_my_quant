import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { logger, createStepLogger } from "../utils/logger";
import { playTradingAlert, TradingAction } from "../utils/sound-effects";

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
  regimeFilter?: RegimeFilterConfig; // Regime filter configuration
  backtest?: BacktestConfig; // Backtest mode configuration
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
  // Enhanced technical indicators for regime filtering
  technicalData: {
    bbWidth: number; // Bollinger Band Width (normalized 0-1)
    atr: number; // ATR(14) value in ticks/points
    stochRSI: {
      kPercent: number; // %K value (0-100)
      dPercent: number; // %D value (0-100)
      oversold: boolean; // Below 20
      overbought: boolean; // Above 80
      crossDirection?: "bullish" | "bearish" | "none"; // K crossing D
    };
    bollingerPosition: "upper" | "middle" | "lower" | "outside"; // Price position relative to bands
    volatilityRegime: "low" | "medium" | "high"; // Based on ATR and BBWidth
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
  error?: string;
}

/**
 * Initialize OpenAI client
 */
const initializeOpenAI = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  return new OpenAI({ apiKey });
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
  const jsonData = {
    timestamp: new Date().toISOString(),
    success: result.success,
    analysisData: {
      individualAnalyses: result.individualAnalyses,
      tradingDecision: result.tradingDecision,
      comprehensiveAnalysis: result.comprehensiveAnalysis,
      finalVerdict: result.finalVerdict,
      totalCost: result.totalCost,
    },
    metadata: {
      timeframes: result.individualAnalyses.map((a) => a.timeframe),
      overallTrend: result.tradingDecision?.overallTrend,
      confidence: result.tradingDecision?.confidence,
      finalAction: result.finalVerdict?.action,
      finalConfidence: result.finalVerdict?.confidence,
      nextCheckMinutes: result.finalVerdict?.nextCheckMinutes,
    },
  };

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

  // Comprehensive analysis
  if (result.comprehensiveAnalysis) {
    const comp = result.comprehensiveAnalysis;
    report += `🧠 COMPREHENSIVE ANALYSIS\n`;
    report += `${"=".repeat(30)}\n`;
    report += `Executive Summary: ${comp.executiveSummary}\n\n`;
    report += `Market Overview: ${comp.marketOverview}\n\n`;

    report += `Quantitative Metrics:\n`;
    report += `  Bullish Signals: ${comp.quantitativeMetrics.bullishSignals}\n`;
    report += `  Bearish Signals: ${comp.quantitativeMetrics.bearishSignals}\n`;
    report += `  Neutral Signals: ${comp.quantitativeMetrics.neutralSignals}\n`;
    report += `  Average Confidence: ${comp.quantitativeMetrics.avgConfidence.toFixed(
      1
    )}/10\n`;
    report += `  Timeframe Alignment: ${comp.quantitativeMetrics.timeframeAlignment}/10\n\n`;

    report += `Risk Assessment:\n`;
    report += `  Risk Level: ${comp.riskAssessment.riskLevel.toUpperCase()}\n`;
    report += `  Key Risks:\n`;
    comp.riskAssessment.keyRisks.forEach((risk) => {
      report += `    • ${risk}\n`;
    });
    report += `  Risk Mitigation:\n`;
    comp.riskAssessment.riskMitigation.forEach((mitigation) => {
      report += `    • ${mitigation}\n`;
    });

    report += `\nStrategic Recommendations:\n`;
    report += `  Primary: ${comp.strategicRecommendations.primary}\n`;
    report += `  Alternative: ${comp.strategicRecommendations.alternative}\n`;
    report += `  Time Horizon: ${comp.strategicRecommendations.timeHorizon}\n`;
    report += `  Position Sizing: ${comp.strategicRecommendations.positionSizing}\n`;

    report += `\nNext Steps:\n`;
    comp.nextSteps.forEach((step, index) => {
      report += `  ${index + 1}. ${step}\n`;
    });
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
You are an expert cryptocurrency trader and technical analyst. Analyze this ${timeframe} chart image for BTCUSD perpetual futures trading.

Please provide a detailed analysis focusing on:

1. **Trend Analysis**: Current trend direction and strength
2. **Key Levels**: Important support and resistance levels (provide specific price levels if visible)
3. **Technical Indicators**: 
   - Volume analysis (high/medium/low)
   - Bollinger Bands condition (squeeze/expansion/neutral)
   - Overall momentum (increasing/decreasing/stable)
4. **Chart Patterns**: Any recognizable patterns or formations
5. **Entry Signals**: Trading signals for this timeframe
6. **Risk Assessment**: Key risks and invalidation levels

CRITICAL: For regime filtering, you must extract these specific technical values:
- **Bollinger Band Width**: Calculate the width between upper and lower bands as a percentage of price (0.0-1.0 scale, where 0.02 = 2% width)
- **ATR(14)**: Average True Range over 14 periods in points/ticks 
- **Stochastic RSI**: Both %K and %D values (0-100), identify if there's a bullish/bearish cross
- **Price Position**: Where price is relative to Bollinger Bands (upper/middle/lower/outside bands)

Respond in JSON format with this exact structure:
{
  "timeframe": "${timeframe}",
  "trend": "bullish|bearish|neutral|sideways",
  "strength": 1-10,
  "keyLevels": {
    "support": number or null,
    "resistance": number or null
  },
  "indicators": {
    "volume": "high|medium|low",
    "bollinger": "squeeze|expansion|neutral", 
    "momentum": "increasing|decreasing|stable"
  },
  "technicalData": {
    "bbWidth": 0.000,
    "atr": 0.0,
    "stochRSI": {
      "kPercent": 0.0,
      "dPercent": 0.0,
      "oversold": false,
      "overbought": false,
      "crossDirection": "bullish|bearish|none"
    },
    "bollingerPosition": "upper|middle|lower|outside",
    "volatilityRegime": "low|medium|high"
  },
  "signals": ["array", "of", "trading", "signals"],
  "confidence": 1-10,
  "analysis": "detailed analysis text"
}

IMPORTANT GUIDELINES:
- bbWidth: Measure the distance between upper and lower Bollinger Bands as percentage of current price. Typical values: 0.005-0.050 (0.5%-5%)
- atr: Look for ATR(14) indicator value, typically 50-500 points for BTCUSD. If not visible, estimate based on recent candle ranges
- stochRSI: Find %K and %D lines (usually 0-100). Look for recent crossovers in the last 1-3 candles
- bollingerPosition: "upper" if price near upper band, "lower" if near lower band, "middle" if in center 60%, "outside" if beyond bands
- volatilityRegime: "low" if bbWidth < 0.01 AND atr is small, "high" if bbWidth > 0.03 OR atr is large, "medium" otherwise

Focus on actionable insights for perpetual futures trading. Be specific about price levels and technical values.
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
You are an expert cryptocurrency trader making a multi-timeframe trading decision for BTCUSD perpetual futures.

Based on the following individual timeframe analyses:

${analysesText}

Provide a comprehensive trading decision that considers:

1. **Multi-Timeframe Alignment**: How timeframes align or conflict
2. **Market Structure**: Overall market structure and phase
3. **Risk Management**: Appropriate position sizing and risk levels
4. **Entry Strategy**: Best entry approach given the multi-timeframe view
5. **Exit Strategy**: Stop loss and take profit recommendations

Respond in JSON format with this exact structure:
{
  "action": "long|short|hold|close",
  "confidence": 1-10,
  "reasoning": "detailed reasoning for the decision",
  "entryPrice": number or null,
  "stopLoss": number or null, 
  "takeProfit": number or null,
  "riskReward": number or null,
  "overallTrend": "bullish|bearish|neutral",
  "marketStructure": "description of current market structure",
  "warnings": ["array", "of", "important", "warnings"]
}

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
      model: config.model || "gpt-4o",
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

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const analysis: ChartAnalysis = JSON.parse(jsonMatch[0]);

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
      model: config.model || "gpt-4o",
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

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const decision = JSON.parse(jsonMatch[0]) as Omit<
      TradingDecision,
      "timeframes"
    >;

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
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
  };

  const modelCost = costs[model as keyof typeof costs] || costs["gpt-4o"];
  return (
    (inputTokens * modelCost.input + outputTokens * modelCost.output) / 1000
  );
};

/**
 * Generate final comprehensive analysis
 */
const generateComprehensiveAnalysis = async (
  analyses: ChartAnalysis[],
  tradingDecision: TradingDecision,
  openai: OpenAI,
  config: VisionAnalysisConfig
): Promise<{ analysis: ComprehensiveAnalysis; cost: number }> => {
  const stepLogger = createStepLogger("Comprehensive Analysis");

  try {
    stepLogger.start();

    // Create comprehensive context
    const analysisContext = analyses
      .map(
        (a) =>
          `${a.timeframe}: ${a.trend} (${a.confidence}% confidence) - ${a.analysis}`
      )
      .join("\n");

    const prompt = `You are an expert quantitative analyst. Based on the following chart analyses and trading decision, provide a comprehensive final analysis.

INDIVIDUAL TIMEFRAME ANALYSES:
${analysisContext}

TRADING DECISION:
Action: ${tradingDecision.action}
Entry: ${tradingDecision.entryPrice || "N/A"}
Stop Loss: ${tradingDecision.stopLoss || "N/A"}
Take Profit: ${tradingDecision.takeProfit || "N/A"}
Risk Level: ${tradingDecision.confidence}/10
Reasoning: ${tradingDecision.reasoning}

Please provide a comprehensive analysis in this EXACT JSON format:
{
  "executiveSummary": "2-3 sentence high-level summary of the analysis",
  "marketOverview": "Detailed market context and current situation",
  "quantitativeMetrics": {
    "bullishSignals": 0,
    "bearishSignals": 0,
    "neutralSignals": 0,
    "avgConfidence": 0,
    "timeframeAlignment": 0
  },
  "riskAssessment": {
    "riskLevel": "low|medium|high",
    "keyRisks": ["risk1", "risk2"],
    "riskMitigation": ["mitigation1", "mitigation2"]
  },
  "strategicRecommendations": {
    "primary": "Main recommendation",
    "alternative": "Alternative approach",
    "timeHorizon": "Expected time horizon",
    "positionSizing": "Position sizing recommendations"
  },
  "nextSteps": ["step1", "step2", "step3"]
}

Calculate quantitative metrics based on the analyses:
- Count bullish, bearish, neutral signals across timeframes
- Calculate average confidence
- Rate timeframe alignment (1-10 scale based on how aligned different timeframes are)`;

    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: config.temperature || 0.1,
      max_tokens: config.maxTokens || 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    const cost = calculateTextCost(
      prompt,
      content,
      config.model || "gpt-4o-mini"
    );

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const analysis = JSON.parse(jsonMatch[0]) as ComprehensiveAnalysis;

    logger.info("📋 Generated comprehensive analysis");
    stepLogger.complete();

    return { analysis, cost };
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Generate final trading verdict using function calling for structured output
 */
const generateFinalVerdict = async (
  analyses: ChartAnalysis[],
  tradingDecision: TradingDecision,
  comprehensiveAnalysis: ComprehensiveAnalysis,
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

    const prompt = `You are a senior trading executive making the final decision. Based on all analysis, provide a definitive trading verdict.

TIMEFRAME SIGNALS: ${timeframeSignals}
OVERALL DECISION: ${tradingDecision.action} (${tradingDecision.confidence}/10)
RISK LEVEL: ${comprehensiveAnalysis.riskAssessment.riskLevel}
ALIGNMENT SCORE: ${comprehensiveAnalysis.quantitativeMetrics.timeframeAlignment}/10

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

    // Define function schema for structured output
    const functions = [
      {
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
    ];

    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      functions: functions,
      function_call: { name: "make_trading_verdict" },
      temperature: 0.1,
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error("No function call response from OpenAI");
    }

    const cost = calculateTextCost(
      prompt,
      functionCall.arguments,
      config.model || "gpt-4o-mini"
    );

    // Parse the structured response
    let verdict = JSON.parse(functionCall.arguments) as TradingVerdict;

    // Apply confidence-based position sizing override
    if (verdict.action !== "HOLD") {
      const regimeConfig = (config as any).regimeFilter || DEFAULT_REGIME_CONFIG;
      
      // Calculate recommended position size based on confidence
      const riskAmount = tradingDecision.riskReward ? 
        Math.abs((tradingDecision.entryPrice || 0) - (tradingDecision.stopLoss || 0)) : 1000;
      
      const positionSizing = calculatePositionSize(
        verdict.confidence,
        100000, // Default account balance for calculation
        riskAmount,
        regimeConfig
      );
      
      // Override AI's position size with confidence-based sizing
      const originalPositionSize = verdict.positionSize;
      verdict.positionSize = Math.round(positionSizing.riskPercent);
      
      logger.info(`📊 Position Sizing Override:`);
      logger.info(`   AI Suggested: ${originalPositionSize}% | Confidence-Based: ${verdict.positionSize}%`);
      logger.info(`   Confidence: ${verdict.confidence}% | Multiplier: ${positionSizing.sizeMultiplier}x | Risk: ${positionSizing.riskPercent.toFixed(1)}%`);
      
      // Add position sizing info to critical warnings if significantly different
      if (Math.abs(originalPositionSize - verdict.positionSize) > 20) {
        verdict.criticalWarnings.push(
          `Position size adjusted from ${originalPositionSize}% to ${verdict.positionSize}% based on confidence level`
        );
      }
    }

    logger.info(
      `⚡ Final Verdict: ${verdict.action} (${verdict.confidence}% confidence)`
    );
    logger.info(
      `💰 Position Size: ${verdict.positionSize}% of portfolio`
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
 * Evaluate pre-trade regime filter
 */
export const evaluateRegimeFilter = (
  analyses: ChartAnalysis[], 
  config: RegimeFilterConfig = DEFAULT_REGIME_CONFIG
): RegimeFilterResult => {
  const stepLogger = createStepLogger("Regime Filter");
  
  try {
    stepLogger.start();
    
    // 1. Directional Agreement Check
    const directionalCheck = evaluateDirectionalAgreement(analyses, config);
    
    // 2. Volatility Check  
    const volatilityCheck = evaluateVolatilityRequirements(analyses, config);
    
    // 3. Momentum Check
    const momentumCheck = evaluateMomentumRequirements(analyses, config);
    
    // Overall result
    const passed = directionalCheck.passed && volatilityCheck.passed && momentumCheck.passed;
    
    let reason = "";
    let recommendedAction: "long" | "short" | "hold" = "hold";
    
    if (!passed) {
      const failures: string[] = [];
      if (!directionalCheck.passed) failures.push("directional agreement");
      if (!volatilityCheck.passed) failures.push("volatility requirements");
      if (!momentumCheck.passed) failures.push("momentum requirements");
      reason = `Failed ${failures.join(", ")}`;
    } else {
      // Determine recommended action based on majority trend
      const trends = analyses.map(a => a.trend);
      const bullishCount = trends.filter(t => t === "bullish").length;
      const bearishCount = trends.filter(t => t === "bearish").length;
      
      if (bullishCount > bearishCount) {
        recommendedAction = "long";
        reason = `Passed all filters - ${bullishCount}/${analyses.length} timeframes bullish`;
      } else if (bearishCount > bullishCount) {
        recommendedAction = "short";  
        reason = `Passed all filters - ${bearishCount}/${analyses.length} timeframes bearish`;
      } else {
        reason = "Passed filters but conflicting direction signals";
      }
    }
    
    // Calculate confidence based on filter strength
    const confidence = calculateFilterConfidence(directionalCheck, volatilityCheck, momentumCheck);
    
    const result: RegimeFilterResult = {
      passed,
      reason,
      checks: {
        directionalAgreement: directionalCheck,
        volatilityCheck,
        momentumCheck,
      },
      ...(passed && { recommendedAction }),
      confidence,
    };
    
    if (config.logFilterDecisions) {
      if (passed) {
        logger.success(`✅ Regime Filter PASSED: ${reason} (${confidence.toFixed(1)}% confidence)`);
      } else {
        logger.warn(`❌ Regime Filter FAILED: ${reason}`);
      }
      
      // Log detailed breakdown
      logger.info(`   📊 Directional: ${directionalCheck.passed ? "✅" : "❌"} (${directionalCheck.agreementCount}/${directionalCheck.requiredCount} agree)`);
      logger.info(`   🌊 Volatility: ${volatilityCheck.passed ? "✅" : "❌"} (BB/ATR thresholds)`);
      logger.info(`   ⚡ Momentum: ${momentumCheck.passed ? "✅" : "❌"} (StochRSI positioning)`);
    }
    
    stepLogger.complete();
    return result;
    
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Evaluate directional agreement across timeframes
 */
function evaluateDirectionalAgreement(
  analyses: ChartAnalysis[], 
  config: RegimeFilterConfig
) {
  const trends = analyses.map(a => ({ timeframe: a.timeframe, trend: a.trend }));
  
  // Count agreements (bullish vs bearish, ignoring neutral/sideways)
  const definitiveSignals = trends.filter(t => t.trend === "bullish" || t.trend === "bearish");
  
  if (definitiveSignals.length === 0) {
    return {
      passed: false,
      agreementCount: 0,
      requiredCount: config.minTimeframeAgreement,
      oppositeHigherTimeframes: [],
    };
  }
  
  // Determine majority direction
  const bullishCount = definitiveSignals.filter(t => t.trend === "bullish").length;
  const bearishCount = definitiveSignals.filter(t => t.trend === "bearish").length;
  const majorityDirection = bullishCount > bearishCount ? "bullish" : "bearish";
  const agreementCount = Math.max(bullishCount, bearishCount);
  
  // Check if higher timeframes (2h, 6h) are in opposite direction
  const higherTimeframes = ["2h", "6h"];
  const oppositeHigherTFs = trends
    .filter(t => higherTimeframes.includes(t.timeframe))
    .filter(t => t.trend !== "neutral" && t.trend !== "sideways" && t.trend !== majorityDirection)
    .map(t => t.timeframe);
  
  const hasOppositeHigher = oppositeHigherTFs.length > 0;
  
  const passed = agreementCount >= config.minTimeframeAgreement && 
                 (config.allowOppositeHigherTimeframes || !hasOppositeHigher);
  
  return {
    passed,
    agreementCount,
    requiredCount: config.minTimeframeAgreement,
    oppositeHigherTimeframes: oppositeHigherTFs,
  };
}

/**
 * Evaluate volatility requirements
 */
function evaluateVolatilityRequirements(
  analyses: ChartAnalysis[], 
  config: RegimeFilterConfig
) {
  const bbWidthChecks = [];
  const atrChecks = [];
  
  // Check BB Width for 1h and 2h
  for (const timeframe of ["1h", "2h"]) {
    const analysis = analyses.find(a => a.timeframe === timeframe);
    if (analysis && analysis.technicalData) {
      const threshold = config.minBBWidth[timeframe as "1h" | "2h"];
      const value = analysis.technicalData.bbWidth;
      const passed = value >= threshold;
      
      bbWidthChecks.push({ timeframe, value, threshold, passed });
    }
  }
  
  // Check ATR for entry timeframes (5m, 15m)
  for (const timeframe of ["5m", "15m"]) {
    const analysis = analyses.find(a => a.timeframe === timeframe);
    if (analysis && analysis.technicalData) {
      const threshold = config.minATR[timeframe as "5m" | "15m"];
      const value = analysis.technicalData.atr;
      const passed = value >= threshold;
      
      atrChecks.push({ timeframe, value, threshold, passed });
    }
  }
  
  const allBBWidthPassed = bbWidthChecks.every(check => check.passed);
  const anyATRPassed = atrChecks.some(check => check.passed); // At least one entry timeframe must have sufficient ATR
  
  return {
    passed: allBBWidthPassed && anyATRPassed,
    bbWidthChecks,
    atrChecks,
  };
}

/**
 * Evaluate momentum requirements (StochRSI and Bollinger positioning)
 */
function evaluateMomentumRequirements(
  analyses: ChartAnalysis[], 
  config: RegimeFilterConfig
) {
  const validStochCrosses: string[] = [];
  const midBandEntries: string[] = [];
  
  for (const analysis of analyses) {
    if (!analysis.technicalData) continue;
    
    const { stochRSI, bollingerPosition } = analysis.technicalData;
    
    // Check for valid StochRSI crosses near band edges
    const hasValidCross = stochRSI.crossDirection && stochRSI.crossDirection !== "none";
    const nearEdge = bollingerPosition === "upper" || bollingerPosition === "lower" || bollingerPosition === "outside";
    
    if (hasValidCross && nearEdge) {
      validStochCrosses.push(analysis.timeframe);
    }
    
    // Check for mid-band entries (to avoid if configured)
    if (bollingerPosition === "middle") {
      midBandEntries.push(analysis.timeframe);
    }
  }
  
  const hasValidMomentum = validStochCrosses.length > 0;
  const hasProblematicMidBand = config.avoidMidBandEntries && midBandEntries.length > 0;
  
  return {
    passed: hasValidMomentum && !hasProblematicMidBand,
    validStochCrosses,
    midBandEntries,
  };
}

/**
 * Calculate overall filter confidence
 */
function calculateFilterConfidence(
  directional: any,
  volatility: any, 
  momentum: any
): number {
  let score = 0;
  let maxScore = 0;
  
  // Directional agreement (40% weight)
  maxScore += 40;
  if (directional.passed) {
    const agreementRatio = directional.agreementCount / 5; // Out of 5 timeframes
    score += 40 * agreementRatio;
  }
  
  // Volatility (35% weight)  
  maxScore += 35;
  if (volatility.passed) {
    const bbPassed = volatility.bbWidthChecks.filter((c: any) => c.passed).length;
    const atrPassed = volatility.atrChecks.filter((c: any) => c.passed).length;
    const volScore = (bbPassed / 2 + Math.min(atrPassed, 1)) / 2; // Normalize
    score += 35 * volScore;
  }
  
  // Momentum (25% weight)
  maxScore += 25;
  if (momentum.passed) {
    score += 25;
  }
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Calculate ATR-based risk management levels
 */
export const calculateATRBasedLevels = (
  entryPrice: number,
  atr: number,
  action: "long" | "short",
  config: RegimeFilterConfig = DEFAULT_REGIME_CONFIG
) => {
  const { stopLossMultiplier, takeProfitMultiplier, minRiskRewardRatio } = config;
  
  let stopLoss: number;
  let takeProfit: number;
  
  if (action === "long") {
    stopLoss = entryPrice - (atr * stopLossMultiplier);
    takeProfit = entryPrice + (atr * takeProfitMultiplier);
  } else {
    stopLoss = entryPrice + (atr * stopLossMultiplier);
    takeProfit = entryPrice - (atr * takeProfitMultiplier);
  }
  
  // Calculate risk:reward ratio
  const riskAmount = Math.abs(entryPrice - stopLoss);
  const rewardAmount = Math.abs(takeProfit - entryPrice);
  const riskReward = rewardAmount / riskAmount;
  
  // Adjust if risk:reward is below minimum
  if (riskReward < minRiskRewardRatio) {
    const adjustedReward = riskAmount * minRiskRewardRatio;
    if (action === "long") {
      takeProfit = entryPrice + adjustedReward;
    } else {
      takeProfit = entryPrice - adjustedReward;
    }
    
    logger.info(`📊 Adjusted TP for min R:R ${minRiskRewardRatio}:1 - New TP: ${takeProfit.toFixed(2)}`);
  }
  
  return {
    stopLoss: Math.round(stopLoss * 100) / 100, // Round to 2 decimals
    takeProfit: Math.round(takeProfit * 100) / 100,
    riskReward: Math.round((Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss)) * 100) / 100,
    riskAmount: Math.round(riskAmount * 100) / 100,
    rewardAmount: Math.round(Math.abs(takeProfit - entryPrice) * 100) / 100
  };
};

/**
 * Calculate position size based on confidence and risk management
 */
export const calculatePositionSize = (
  confidence: number,
  accountBalance: number,
  riskAmount: number,
  config: RegimeFilterConfig = DEFAULT_REGIME_CONFIG
): { positionSize: number; sizeMultiplier: number; riskPercent: number } => {
  // Determine size multiplier based on confidence
  let sizeMultiplier = 1.0;
  
  const { confidenceThresholds } = config;
  
  if (confidence >= confidenceThresholds.high.min && confidence <= confidenceThresholds.high.max) {
    sizeMultiplier = confidenceThresholds.high.sizeMultiplier;
  } else if (confidence >= confidenceThresholds.medium.min && confidence <= confidenceThresholds.medium.max) {
    sizeMultiplier = confidenceThresholds.medium.sizeMultiplier;
  } else if (confidence >= confidenceThresholds.low.min && confidence <= confidenceThresholds.low.max) {
    sizeMultiplier = confidenceThresholds.low.sizeMultiplier;
  } else {
    // Below 70% confidence - very small position
    sizeMultiplier = 0.25;
  }
  
  // Calculate base position size (typically 1-2% of account)
  const baseRiskPercent = 0.015; // 1.5% of account per trade
  const adjustedRiskPercent = baseRiskPercent * sizeMultiplier;
  const maxRiskAmount = accountBalance * adjustedRiskPercent;
  
  // Position size = risk amount / price difference per unit
  const positionSize = Math.min(maxRiskAmount / riskAmount, accountBalance * 0.5); // Cap at 50% of account
  
  return {
    positionSize: Math.round(positionSize * 100) / 100,
    sizeMultiplier,
    riskPercent: adjustedRiskPercent * 100
  };
};

/**
 * Enhanced trading decision with risk management
 */
export const enhanceDecisionWithRiskManagement = (
  decision: TradingDecision,
  analyses: ChartAnalysis[],
  config: RegimeFilterConfig = DEFAULT_REGIME_CONFIG
): TradingDecision => {
  if (decision.action === "hold" || decision.action === "close") {
    return decision; // No risk management needed for hold/close
  }
  
  // Find the entry timeframe (5m or 15m) with highest ATR
  const entryTimeframes = analyses.filter(a => ["5m", "15m"].includes(a.timeframe));
  const entryAnalysis = entryTimeframes.reduce((prev, curr) => 
    (curr.technicalData?.atr || 0) > (prev.technicalData?.atr || 0) ? curr : prev
  );
  
  if (!entryAnalysis?.technicalData?.atr || !decision.entryPrice) {
    logger.warn("⚠️  Cannot calculate ATR-based levels - missing data");
    return decision;
  }
  
  const atr = entryAnalysis.technicalData.atr;
  const entryPrice = decision.entryPrice;
  
  // Calculate ATR-based levels
  const riskLevels = calculateATRBasedLevels(entryPrice, atr, decision.action, config);
  
  // Update decision with enhanced risk management
  const enhancedDecision: TradingDecision = {
    ...decision,
    stopLoss: riskLevels.stopLoss,
    takeProfit: riskLevels.takeProfit,
    riskReward: riskLevels.riskReward,
    warnings: [
      ...decision.warnings,
      ...(riskLevels.riskReward < config.minRiskRewardRatio ? 
        [`Risk:Reward ${riskLevels.riskReward} below minimum ${config.minRiskRewardRatio}`] : [])
    ]
  };
  
  logger.info(`📊 Enhanced Risk Management:`);
  logger.info(`   Entry: ${entryPrice} | SL: ${riskLevels.stopLoss} | TP: ${riskLevels.takeProfit}`);
  logger.info(`   Risk: $${riskLevels.riskAmount} | Reward: $${riskLevels.rewardAmount} | R:R = 1:${riskLevels.riskReward}`);
  logger.info(`   ATR(${entryAnalysis.timeframe}): ${atr} | SL Multiplier: ${config.stopLossMultiplier}x | TP Multiplier: ${config.takeProfitMultiplier}x`);
  
  return enhancedDecision;
};

/**
 * Validate decision against average win/loss ratio
 */
export const validateAgainstWinLossRatio = (
  currentLoss: number,
  averageWin: number,
  config: RegimeFilterConfig = DEFAULT_REGIME_CONFIG
): { isValid: boolean; reason: string } => {
  const maxAllowedLoss = averageWin * config.maxLossToAvgWinRatio;
  
  if (currentLoss > maxAllowedLoss) {
    return {
      isValid: false,
      reason: `Potential loss $${currentLoss.toFixed(2)} exceeds ${config.maxLossToAvgWinRatio}x average win ($${maxAllowedLoss.toFixed(2)})`
    };
  }
  
  return {
    isValid: true,
    reason: `Risk acceptable: $${currentLoss.toFixed(2)} ≤ ${config.maxLossToAvgWinRatio}x avg win ($${maxAllowedLoss.toFixed(2)})`
  };
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

    // Apply pre-trade regime filter
    const regimeConfig = (config as any).regimeFilter || DEFAULT_REGIME_CONFIG;
    const regimeResult = evaluateRegimeFilter(individualAnalyses, regimeConfig);
    
    // Enhanced logging for regime filter
    if (regimeConfig.logFilterDecisions) {
      logRegimeFilterDecision(regimeResult, individualAnalyses, regimeConfig);
    }
    
    // Save regime filter results if configured
    if (regimeConfig.saveFilterResults) {
      saveRegimeFilterResults(regimeResult, individualAnalyses, config.outputDir || "analysis-results");
    }
    
    logger.info(`🔍 Regime Filter: ${regimeResult.passed ? "PASSED" : "FAILED"}`);
    
    let tradingDecision: TradingDecision;
    
    if (!regimeResult.passed) {
      // Create a HOLD decision if regime filter fails
      tradingDecision = {
        action: "hold",
        confidence: Math.round(regimeResult.confidence / 10), // Convert to 1-10 scale
        reasoning: `Regime filter failed: ${regimeResult.reason}`,
        timeframes: individualAnalyses,
        overallTrend: "neutral",
        marketStructure: "Filtered out due to poor regime conditions",
        warnings: ["Trade filtered out by regime analysis"]
      };
      
      logger.warn(`⚠️  Skipping AI analysis - regime filter failed: ${regimeResult.reason}`);
    } else {
      // Only proceed with AI analysis if regime filter passes
      logger.success(`✅ Regime filter passed - proceeding with AI analysis`);
      
      // Make multi-timeframe trading decision
      tradingDecision = await makeMultiTimeframeDecision(
        openai,
        individualAnalyses,
        config
      );
      
      // Validate AI decision matches regime recommendation
      if (regimeResult.recommendedAction && 
          tradingDecision.action !== "hold" && 
          tradingDecision.action !== regimeResult.recommendedAction) {
        logger.warn(`⚠️  AI decision (${tradingDecision.action}) conflicts with regime filter (${regimeResult.recommendedAction})`);
        tradingDecision.warnings.push(`AI decision conflicts with regime filter recommendation`);
      }
      
      // Apply enhanced risk management with ATR-based stops/targets
      if (tradingDecision.action !== "hold") {
        tradingDecision = enhanceDecisionWithRiskManagement(tradingDecision, individualAnalyses, regimeConfig);
      }
      
      // Enhanced logging for trading decision
      if (regimeConfig.logFilterDecisions) {
        logTradingDecisionDetails(tradingDecision, regimeResult);
      }
    }

    // Generate comprehensive analysis
    const { analysis: comprehensiveAnalysis, cost: compCost } =
      await generateComprehensiveAnalysis(
        individualAnalyses,
        tradingDecision,
        openai,
        config
      );

    // Generate final trading verdict
    const { verdict: finalVerdict, cost: verdictCost } =
      await generateFinalVerdict(
        individualAnalyses,
        tradingDecision,
        comprehensiveAnalysis,
        openai,
        config
      );

    stepLogger.complete();

    const totalCost = compCost + verdictCost;

    // Enhanced logging for final verdict
    if (regimeConfig.logFilterDecisions) {
      const analysisTime = (Date.now() - Date.now()) / 1000; // This could be calculated properly with start time
      logFinalVerdictDetails(finalVerdict, {
        regimeFilterPassed: regimeResult.passed,
        aiAnalysisTime: analysisTime,
        totalCost: totalCost
      });
    }

    // Play sound alert for the final verdict
    if (finalVerdict && config.soundEffects !== false) {
      await playTradingAlert(
        finalVerdict.action as TradingAction,
        finalVerdict.confidence,
        finalVerdict.keyReason
      );
    }

    const result: VisionAnalysisResult = {
      success: true,
      tradingDecision,
      individualAnalyses,
      comprehensiveAnalysis,
      finalVerdict,
      totalCost,
    };

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
 * Default vision analysis configuration
 */
export const createVisionAnalysisConfig = (
  options: Partial<VisionAnalysisConfig> = {}
): VisionAnalysisConfig => ({
  screenshotsDir: "screenshots",
  timeframes: ["5m", "15m", "1h", "2h", "6h"],
  model: "gpt-4o",
  detail: "high",
  maxTokens: 1000,
  temperature: 0.1,
  outputDir: "analysis-results",
  saveJson: true,
  saveText: true,
  soundEffects: true,
  soundVolume: 0.7,
  regimeFilter: DEFAULT_REGIME_CONFIG, // Include regime filter by default
  ...options,
});

/**
 * Regime filter configuration for pre-trade filtering
 */
export interface RegimeFilterConfig {
  // Directional agreement thresholds
  minTimeframeAgreement: number; // Minimum timeframes that must agree (default: 3 out of 5)
  allowOppositeHigherTimeframes: boolean; // Allow 2h/6h to be opposite (default: false)
  
  // Volatility thresholds
  minBBWidth: {
    "1h": number; // Minimum BB width for 1h (default: 0.015)
    "2h": number; // Minimum BB width for 2h (default: 0.015)
  };
  minATR: {
    "5m": number; // Minimum ATR for 5m entry (default: 15)
    "15m": number; // Minimum ATR for 15m entry (default: 20)
  };
  
  // Momentum requirements
  stochRSIEdgeThreshold: number; // How close to BB edge for stoch cross (default: 0.2)
  avoidMidBandEntries: boolean; // Avoid entries in middle 40% of BB range (default: true)
  
  // Risk management
  maxLossToAvgWinRatio: number; // Max loss relative to avg win (default: 1.2)
  minRiskRewardRatio: number; // Minimum R:R ratio (default: 1.5)
  
  // ATR-based stops and targets
  stopLossMultiplier: number; // SL = ATR * multiplier (default: 2.0)
  takeProfitMultiplier: number; // TP = ATR * multiplier (default: 3.0)
  
  // Confidence thresholds for position sizing
  confidenceThresholds: {
    low: { min: 70, max: 79, sizeMultiplier: 0.5 }; // 70-79%: 0.5x size
    medium: { min: 80, max: 89, sizeMultiplier: 1.0 }; // 80-89%: 1.0x size  
    high: { min: 90, max: 100, sizeMultiplier: 1.5 }; // 90%+: 1.5x size
  };
  
  // Logging options
  logFilterDecisions: boolean; // Log regime filter pass/fail reasons (default: true)
  saveFilterResults: boolean; // Save filter results to files (default: true)
}

/**
 * Default regime filter configuration
 */
export const DEFAULT_REGIME_CONFIG: RegimeFilterConfig = {
  minTimeframeAgreement: 3,
  allowOppositeHigherTimeframes: false,
  minBBWidth: {
    "1h": 0.015,
    "2h": 0.015,
  },
  minATR: {
    "5m": 15,
    "15m": 20,
  },
  stochRSIEdgeThreshold: 0.2,
  avoidMidBandEntries: true,
  maxLossToAvgWinRatio: 1.2,
  minRiskRewardRatio: 1.5,
  stopLossMultiplier: 2.0,
  takeProfitMultiplier: 3.0,
  confidenceThresholds: {
    low: { min: 70, max: 79, sizeMultiplier: 0.5 },
    medium: { min: 80, max: 89, sizeMultiplier: 1.0 },
    high: { min: 90, max: 100, sizeMultiplier: 1.5 },
  },
  logFilterDecisions: true,
  saveFilterResults: true,
};

/**
 * Regime filter result
 */
export interface RegimeFilterResult {
  passed: boolean;
  reason: string;
  checks: {
    directionalAgreement: {
      passed: boolean;
      agreementCount: number;
      requiredCount: number;
      oppositeHigherTimeframes: string[];
    };
    volatilityCheck: {
      passed: boolean;
      bbWidthChecks: Array<{ timeframe: string; value: number; threshold: number; passed: boolean }>;
      atrChecks: Array<{ timeframe: string; value: number; threshold: number; passed: boolean }>;
    };
    momentumCheck: {
      passed: boolean;
      validStochCrosses: string[];
      midBandEntries: string[];
    };
  };
  recommendedAction?: "long" | "short" | "hold";
  confidence: number;
}

/**
 * Enhanced logging for regime filter and trading decisions
 */
export const logRegimeFilterDecision = (
  regimeResult: RegimeFilterResult,
  analyses: ChartAnalysis[],
  config: RegimeFilterConfig
): void => {
  logger.info("📋 REGIME FILTER ANALYSIS REPORT");
  logger.info("=".repeat(50));
  
  // Overview
  logger.info(`🎯 Filter Result: ${regimeResult.passed ? "✅ PASSED" : "❌ FAILED"}`);
  logger.info(`📊 Overall Confidence: ${regimeResult.confidence.toFixed(1)}%`);
  logger.info(`💡 Recommended Action: ${regimeResult.recommendedAction || "HOLD"}`);
  logger.info(`📝 Reason: ${regimeResult.reason}`);
  logger.info("");
  
  // Directional Agreement Details
  const dirCheck = regimeResult.checks.directionalAgreement;
  logger.info(`📈 DIRECTIONAL AGREEMENT CHECK:`);
  logger.info(`   Status: ${dirCheck.passed ? "✅ PASSED" : "❌ FAILED"}`);
  logger.info(`   Agreement: ${dirCheck.agreementCount}/${dirCheck.requiredCount} timeframes`);
  
  if (dirCheck.oppositeHigherTimeframes.length > 0) {
    logger.warn(`   ⚠️  Opposite Higher TFs: ${dirCheck.oppositeHigherTimeframes.join(", ")}`);
  }
  
  // Show individual timeframe trends
  analyses.forEach(analysis => {
    const indicator = analysis.trend === "bullish" ? "📈" : 
                      analysis.trend === "bearish" ? "📉" : 
                      analysis.trend === "neutral" ? "➡️" : "🔄";
    logger.info(`   ${indicator} ${analysis.timeframe}: ${analysis.trend} (confidence: ${analysis.confidence}/10)`);
  });
  
  logger.info("");
  
  // Volatility Check Details
  const volCheck = regimeResult.checks.volatilityCheck;
  logger.info(`🌊 VOLATILITY CHECK:`);
  logger.info(`   Status: ${volCheck.passed ? "✅ PASSED" : "❌ FAILED"}`);
  
  volCheck.bbWidthChecks.forEach(check => {
    const status = check.passed ? "✅" : "❌";
    logger.info(`   ${status} BB Width ${check.timeframe}: ${check.value.toFixed(4)} (min: ${check.threshold.toFixed(4)})`);
  });
  
  volCheck.atrChecks.forEach(check => {
    const status = check.passed ? "✅" : "❌";
    logger.info(`   ${status} ATR ${check.timeframe}: ${check.value.toFixed(1)} (min: ${check.threshold})`);
  });
  
  logger.info("");
  
  // Momentum Check Details  
  const momCheck = regimeResult.checks.momentumCheck;
  logger.info(`⚡ MOMENTUM CHECK:`);
  logger.info(`   Status: ${momCheck.passed ? "✅ PASSED" : "❌ FAILED"}`);
  
  if (momCheck.validStochCrosses.length > 0) {
    logger.info(`   ✅ Valid StochRSI crosses: ${momCheck.validStochCrosses.join(", ")}`);
  } else {
    logger.warn(`   ⚠️  No valid StochRSI crosses found`);
  }
  
  if (momCheck.midBandEntries.length > 0) {
    logger.warn(`   ⚠️  Mid-band entries detected: ${momCheck.midBandEntries.join(", ")}`);
  }
  
  logger.info("");
  
  // Technical Data Summary
  logger.info(`🔬 TECHNICAL DATA SUMMARY:`);
  analyses.forEach(analysis => {
    if (analysis.technicalData) {
      const td = analysis.technicalData;
      logger.info(`   ${analysis.timeframe}:`);
      logger.info(`     BB Width: ${td.bbWidth.toFixed(4)} | ATR: ${td.atr.toFixed(1)} | Volatility: ${td.volatilityRegime}`);
      logger.info(`     StochRSI: K=${td.stochRSI.kPercent.toFixed(1)}% D=${td.stochRSI.dPercent.toFixed(1)}% | Cross: ${td.stochRSI.crossDirection}`);
      logger.info(`     BB Position: ${td.bollingerPosition} | OS/OB: ${td.stochRSI.oversold ? "Oversold" : td.stochRSI.overbought ? "Overbought" : "Normal"}`);
    }
  });
  
  logger.info("=".repeat(50));
};

/**
 * Log trading decision with enhanced details
 */
export const logTradingDecisionDetails = (
  decision: TradingDecision,
  regimeResult?: RegimeFilterResult
): void => {
  logger.info("💼 TRADING DECISION ANALYSIS");
  logger.info("=".repeat(50));
  
  logger.info(`🎯 Action: ${decision.action.toUpperCase()}`);
  logger.info(`📊 Confidence: ${decision.confidence}/10`);
  logger.info(`📈 Overall Trend: ${decision.overallTrend}`);
  logger.info(`💡 Reasoning: ${decision.reasoning}`);
  
  if (decision.entryPrice) {
    logger.info(`💰 Entry Price: ${decision.entryPrice}`);
  }
  
  if (decision.stopLoss && decision.takeProfit) {
    const risk = Math.abs(decision.entryPrice! - decision.stopLoss);
    const reward = Math.abs(decision.takeProfit - decision.entryPrice!);
    logger.info(`🛡️ Stop Loss: ${decision.stopLoss} (Risk: $${risk.toFixed(2)})`);
    logger.info(`🎯 Take Profit: ${decision.takeProfit} (Reward: $${reward.toFixed(2)})`);
    logger.info(`⚖️ Risk:Reward = 1:${decision.riskReward || (reward/risk).toFixed(2)}`);
  }
  
  if (decision.warnings.length > 0) {
    logger.warn(`⚠️  Warnings:`);
    decision.warnings.forEach(warning => logger.warn(`   • ${warning}`));
  }
  
  if (regimeResult) {
    logger.info(`🔍 Regime Filter: ${regimeResult.passed ? "✅ PASSED" : "❌ BYPASSED"}`);
    if (regimeResult.recommendedAction && regimeResult.recommendedAction !== decision.action) {
      logger.warn(`   ⚠️  Filter recommended: ${regimeResult.recommendedAction}, Decision: ${decision.action}`);
    }
  }
  
  logger.info("=".repeat(50));
};

/**
 * Log final verdict with comprehensive details
 */
export const logFinalVerdictDetails = (
  verdict: TradingVerdict,
  analysisMetadata?: { regimeFilterPassed: boolean; aiAnalysisTime: number; totalCost: number }
): void => {
  logger.info("⚡ FINAL TRADING VERDICT");
  logger.info("=".repeat(60));
  
  const actionEmoji = verdict.action === "LONG" ? "🚀" : verdict.action === "SHORT" ? "🔻" : "⏸️";
  logger.info(`${actionEmoji} FINAL ACTION: ${verdict.action}`);
  logger.info(`📊 Confidence: ${verdict.confidence}%`);
  logger.info(`💰 Position Size: ${verdict.positionSize}% of portfolio`);
  logger.info(`⏰ Time Horizon: ${verdict.timeHorizon}`);
  logger.info(`🎯 Risk Level: ${verdict.riskLevel}`);
  logger.info(`💡 Key Reason: ${verdict.keyReason}`);
  logger.info(`⏰ Next Check: ${verdict.nextCheckMinutes} minutes`);
  
  if (verdict.entryPrice) {
    logger.info(`💰 Entry: ${verdict.entryPrice}`);
  }
  
  if (verdict.stopLoss && verdict.takeProfit) {
    logger.info(`🛡️ Stop Loss: ${verdict.stopLoss}`);
    logger.info(`🎯 Take Profit: ${verdict.takeProfit}`);
  }
  
  if (verdict.criticalWarnings.length > 0) {
    logger.warn(`🚨 CRITICAL WARNINGS:`);
    verdict.criticalWarnings.forEach(warning => logger.warn(`   • ${warning}`));
  }
  
  if (analysisMetadata) {
    logger.info("");
    logger.info(`📈 Analysis Metadata:`);
    logger.info(`   Regime Filter: ${analysisMetadata.regimeFilterPassed ? "✅ PASSED" : "❌ FILTERED"}`);
    logger.info(`   AI Analysis Time: ${analysisMetadata.aiAnalysisTime.toFixed(1)}s`);
    logger.info(`   Total Cost: $${analysisMetadata.totalCost.toFixed(4)}`);
  }
  
  logger.info("=".repeat(60));
};

/**
 * Save regime filter results to file
 */
export const saveRegimeFilterResults = (
  regimeResult: RegimeFilterResult,
  analyses: ChartAnalysis[],
  outputDir: string = "analysis-results"
): string => {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `regime-filter-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    const data = {
      timestamp: new Date().toISOString(),
      regimeResult,
      timeframeAnalyses: analyses.map(a => ({
        timeframe: a.timeframe,
        trend: a.trend,
        confidence: a.confidence,
        technicalData: a.technicalData
      })),
      summary: {
        passed: regimeResult.passed,
        confidence: regimeResult.confidence,
        recommendedAction: regimeResult.recommendedAction,
        failureReasons: regimeResult.passed ? [] : [regimeResult.reason]
      }
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    logger.info(`💾 Regime filter results saved: ${filename}`);
    
    return filepath;
  } catch (error) {
    logger.error(`❌ Failed to save regime filter results: ${(error as Error).message}`);
    throw error;
  }
};

/**
 * Backtest configuration
 */
export interface BacktestConfig {
  enabled: boolean;
  historicalDataPath?: string; // Path to historical analysis results
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  initialBalance: number; // Starting account balance
  riskPerTrade: number; // Risk percentage per trade (0.01 = 1%)
  reportOutputPath?: string; // Where to save backtest results
}

/**
 * Backtest result for a single trade
 */
export interface BacktestTrade {
  timestamp: string;
  timeframe: string;
  action: "LONG" | "SHORT" | "HOLD";
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number; // Dollar amount
  confidence: number;
  regimeFilterPassed: boolean;
  aiDecision: string;
  actualOutcome?: "WIN" | "LOSS" | "BREAK_EVEN";
  pnl?: number; // Profit/Loss in dollars
  holdTime?: number; // Minutes held
  exitReason?: "TP" | "SL" | "TIME" | "MANUAL";
}

/**
 * Backtest summary results
 */
export interface BacktestResults {
  summary: {
    totalTrades: number;
    regimeFilteredTrades: number; // Trades filtered out
    executedTrades: number; // Trades that passed filter
    winRate: number; // Percentage
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    finalBalance: number;
    totalReturn: number; // Percentage
    sharpeRatio?: number;
  };
  regimeFilterPerformance: {
    withFilter: {
      winRate: number;
      avgReturn: number;
      maxDrawdown: number;
    };
    withoutFilter: {
      winRate: number;
      avgReturn: number;
      maxDrawdown: number;
    };
    improvement: {
      winRateImprovement: number; // Percentage points
      returnImprovement: number; // Percentage points
      drawdownReduction: number; // Percentage points
    };
  };
  trades: BacktestTrade[];
  monthlyReturns: Array<{ month: string; return: number; trades: number }>;
}

/**
 * Run backtest on historical data
 */
export const runBacktest = async (
  config: BacktestConfig,
  regimeConfig: RegimeFilterConfig = DEFAULT_REGIME_CONFIG
): Promise<BacktestResults> => {
  if (!config.enabled) {
    throw new Error("Backtest mode is not enabled");
  }

  logger.info("📊 Starting Regime Filter Backtest");
  logger.info("=".repeat(50));

  // Load historical analysis data
  const historicalData = await loadHistoricalData(config);
  logger.info(`📈 Loaded ${historicalData.length} historical analysis points`);

  // Filter data by date range if specified
  const filteredData = filterDataByDateRange(historicalData, config);
  logger.info(`📅 Date filtered data: ${filteredData.length} points`);

  // Run backtest with and without regime filter
  const withFilterResults = simulateTrading(filteredData, config, regimeConfig, true);
  const withoutFilterResults = simulateTrading(filteredData, config, regimeConfig, false);

  // Calculate performance metrics
  const results = calculateBacktestMetrics(withFilterResults, withoutFilterResults, config);

  // Save backtest report
  if (config.reportOutputPath) {
    await saveBacktestReport(results, config.reportOutputPath);
  }

  // Log summary
  logBacktestSummary(results);

  logger.info("=".repeat(50));
  logger.success("✅ Backtest completed successfully");

  return results;
};

/**
 * Load historical analysis data
 */
async function loadHistoricalData(config: BacktestConfig): Promise<any[]> {
  const dataPath = config.historicalDataPath || "analysis-results";
  
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Historical data path not found: ${dataPath}`);
  }

  const files = fs.readdirSync(dataPath)
    .filter(file => file.startsWith("analysis-") && file.endsWith(".json"))
    .sort();

  const historicalData: any[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(dataPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      
      // Extract timestamp from filename or data
      const timestamp = data.timestamp || file.match(/analysis-(.+)\.json/)?.[1];
      
      if (data.analysisData && timestamp) {
        historicalData.push({
          timestamp,
          ...data.analysisData
        });
      }
    } catch (error) {
      logger.warn(`⚠️  Failed to load ${file}: ${(error as Error).message}`);
    }
  }

  return historicalData;
}

/**
 * Filter historical data by date range
 */
function filterDataByDateRange(data: any[], config: BacktestConfig): any[] {
  if (!config.startDate && !config.endDate) {
    return data;
  }

  return data.filter(item => {
    const itemDate = new Date(item.timestamp);
    const startDate = config.startDate ? new Date(config.startDate) : new Date(0);
    const endDate = config.endDate ? new Date(config.endDate) : new Date();
    
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Simulate trading with or without regime filter
 */
function simulateTrading(
  data: any[],
  config: BacktestConfig,
  regimeConfig: RegimeFilterConfig,
  useRegimeFilter: boolean
): BacktestTrade[] {
  const trades: BacktestTrade[] = [];
  let balance = config.initialBalance;

  for (const analysisPoint of data) {
    try {
      const { individualAnalyses, finalVerdict } = analysisPoint;
      
      if (!individualAnalyses || !finalVerdict || finalVerdict.action === "HOLD") {
        continue;
      }

      // Apply regime filter if enabled
      let regimeFilterPassed = true;
      if (useRegimeFilter) {
        const regimeResult = evaluateRegimeFilter(individualAnalyses, regimeConfig);
        regimeFilterPassed = regimeResult.passed;
      }

      // Calculate position size
      const riskAmount = balance * config.riskPerTrade;
      const positionSize = regimeFilterPassed ? riskAmount : 0;

      const trade: BacktestTrade = {
        timestamp: analysisPoint.timestamp,
        timeframe: "5m", // Primary entry timeframe
        action: finalVerdict.action,
        entryPrice: finalVerdict.entryPrice || 0,
        stopLoss: finalVerdict.stopLoss,
        takeProfit: finalVerdict.takeProfit,
        positionSize,
        confidence: finalVerdict.confidence,
        regimeFilterPassed,
        aiDecision: finalVerdict.keyReason || "No reason provided"
      };

      // Simulate outcome (simplified - in real backtest you'd use actual price data)
      if (positionSize > 0) {
        const outcome = simulateTradeOutcome(trade, finalVerdict.confidence);
        trade.actualOutcome = outcome.result;
        trade.pnl = outcome.pnl;
        trade.holdTime = outcome.holdTime;
        trade.exitReason = outcome.exitReason;
        
        balance += outcome.pnl;
      }

      trades.push(trade);
    } catch (error) {
      logger.warn(`⚠️  Failed to process analysis point: ${(error as Error).message}`);
    }
  }

  return trades;
}

/**
 * Simulate individual trade outcome (simplified simulation)
 */
function simulateTradeOutcome(trade: BacktestTrade, confidence: number): {
  result: "WIN" | "LOSS" | "BREAK_EVEN";
  pnl: number;
  holdTime: number;
  exitReason: "TP" | "SL" | "TIME";
} {
  // Simplified simulation based on confidence
  // In a real backtest, you'd use actual historical price movements
  
  const baseWinProbability = 0.6; // 60% base win rate
  const confidenceBonus = (confidence - 70) * 0.01; // Each point above 70% adds 1% win probability
  const winProbability = Math.min(0.9, Math.max(0.3, baseWinProbability + confidenceBonus));
  
  const random = Math.random();
  const isWin = random < winProbability;
  
  const riskAmount = Math.abs((trade.entryPrice - (trade.stopLoss || trade.entryPrice * 0.98)));
  const rewardAmount = Math.abs((trade.takeProfit || trade.entryPrice * 1.03) - trade.entryPrice);
  
  if (isWin) {
    return {
      result: "WIN",
      pnl: trade.positionSize * (rewardAmount / trade.entryPrice),
      holdTime: Math.floor(Math.random() * 240) + 30, // 30-270 minutes
      exitReason: "TP"
    };
  } else {
    return {
      result: "LOSS",
      pnl: -trade.positionSize * (riskAmount / trade.entryPrice),
      holdTime: Math.floor(Math.random() * 60) + 15, // 15-75 minutes  
      exitReason: "SL"
    };
  }
}

/**
 * Calculate backtest performance metrics
 */
function calculateBacktestMetrics(
  withFilter: BacktestTrade[],
  withoutFilter: BacktestTrade[],
  config: BacktestConfig
): BacktestResults {
  const calculateStats = (trades: BacktestTrade[]) => {
    const executedTrades = trades.filter(t => t.positionSize > 0);
    const wins = executedTrades.filter(t => t.actualOutcome === "WIN");
    const losses = executedTrades.filter(t => t.actualOutcome === "LOSS");
    
    const totalPnL = executedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = executedTrades.length > 0 ? wins.length / executedTrades.length : 0;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;
    
    // Calculate max drawdown
    let peak = config.initialBalance;
    let maxDrawdown = 0;
    let currentBalance = config.initialBalance;
    
    for (const trade of executedTrades) {
      currentBalance += trade.pnl || 0;
      if (currentBalance > peak) {
        peak = currentBalance;
      }
      const drawdown = (peak - currentBalance) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return {
      winRate: winRate * 100,
      avgReturn: (totalPnL / config.initialBalance) * 100,
      maxDrawdown: maxDrawdown * 100,
      avgWin,
      avgLoss,
      totalPnL,
      finalBalance: config.initialBalance + totalPnL
    };
  };

  const withFilterStats = calculateStats(withFilter);
  const withoutFilterStats = calculateStats(withoutFilter);

  return {
    summary: {
      totalTrades: withFilter.length,
      regimeFilteredTrades: withFilter.filter(t => !t.regimeFilterPassed).length,
      executedTrades: withFilter.filter(t => t.positionSize > 0).length,
      winRate: withFilterStats.winRate,
      avgWin: withFilterStats.avgWin,
      avgLoss: withFilterStats.avgLoss,
      maxDrawdown: withFilterStats.maxDrawdown,
      finalBalance: withFilterStats.finalBalance,
      totalReturn: withFilterStats.avgReturn
    },
    regimeFilterPerformance: {
      withFilter: {
        winRate: withFilterStats.winRate,
        avgReturn: withFilterStats.avgReturn,
        maxDrawdown: withFilterStats.maxDrawdown
      },
      withoutFilter: {
        winRate: withoutFilterStats.winRate,
        avgReturn: withoutFilterStats.avgReturn,
        maxDrawdown: withoutFilterStats.maxDrawdown
      },
      improvement: {
        winRateImprovement: withFilterStats.winRate - withoutFilterStats.winRate,
        returnImprovement: withFilterStats.avgReturn - withoutFilterStats.avgReturn,
        drawdownReduction: withoutFilterStats.maxDrawdown - withFilterStats.maxDrawdown
      }
    },
    trades: withFilter,
    monthlyReturns: calculateMonthlyReturns(withFilter)
  };
}

/**
 * Calculate monthly returns breakdown
 */
function calculateMonthlyReturns(trades: BacktestTrade[]): Array<{ month: string; return: number; trades: number }> {
  const monthlyData: { [month: string]: { pnl: number; trades: number } } = {};

  for (const trade of trades) {
    if (trade.positionSize > 0 && trade.pnl !== undefined) {
      const date = new Date(trade.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { pnl: 0, trades: 0 };
      }
      
      monthlyData[monthKey].pnl += trade.pnl;
      monthlyData[monthKey].trades += 1;
    }
  }

  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      return: data.pnl,
      trades: data.trades
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Save backtest report to file
 */
async function saveBacktestReport(results: BacktestResults, outputPath: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backtest-report-${timestamp}.json`;
    const filepath = path.join(outputPath, filename);
    
    // Ensure output directory exists
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    logger.info(`💾 Backtest report saved: ${filename}`);
  } catch (error) {
    logger.error(`❌ Failed to save backtest report: ${(error as Error).message}`);
  }
}

/**
 * Log backtest summary
 */
function logBacktestSummary(results: BacktestResults): void {
  logger.info("📊 BACKTEST RESULTS SUMMARY");
  logger.info("=".repeat(60));
  
  const { summary, regimeFilterPerformance } = results;
  
  logger.info(`📈 OVERALL PERFORMANCE:`);
  logger.info(`   Total Trades: ${summary.totalTrades}`);
  logger.info(`   Regime Filtered: ${summary.regimeFilteredTrades} (${((summary.regimeFilteredTrades/summary.totalTrades)*100).toFixed(1)}%)`);
  logger.info(`   Executed Trades: ${summary.executedTrades}`);
  logger.info(`   Win Rate: ${summary.winRate.toFixed(1)}%`);
  logger.info(`   Total Return: ${summary.totalReturn.toFixed(2)}%`);
  logger.info(`   Max Drawdown: ${summary.maxDrawdown.toFixed(2)}%`);
  logger.info(`   Final Balance: $${summary.finalBalance.toFixed(2)}`);
  logger.info("");
  
  logger.info(`🔍 REGIME FILTER EFFECTIVENESS:`);
  logger.info(`   WITH Filter - Win Rate: ${regimeFilterPerformance.withFilter.winRate.toFixed(1)}% | Return: ${regimeFilterPerformance.withFilter.avgReturn.toFixed(2)}% | Max DD: ${regimeFilterPerformance.withFilter.maxDrawdown.toFixed(2)}%`);
  logger.info(`   WITHOUT Filter - Win Rate: ${regimeFilterPerformance.withoutFilter.winRate.toFixed(1)}% | Return: ${regimeFilterPerformance.withoutFilter.avgReturn.toFixed(2)}% | Max DD: ${regimeFilterPerformance.withoutFilter.maxDrawdown.toFixed(2)}%`);
  logger.info("");
  
  const improvement = regimeFilterPerformance.improvement;
  logger.info(`📊 REGIME FILTER IMPROVEMENT:`);
  logger.info(`   Win Rate: ${improvement.winRateImprovement > 0 ? "+" : ""}${improvement.winRateImprovement.toFixed(1)} percentage points`);
  logger.info(`   Returns: ${improvement.returnImprovement > 0 ? "+" : ""}${improvement.returnImprovement.toFixed(2)}% improvement`);
  logger.info(`   Drawdown: ${improvement.drawdownReduction > 0 ? "-" : ""}${Math.abs(improvement.drawdownReduction).toFixed(2)}% reduction`);
  
  if (improvement.winRateImprovement > 5 && improvement.returnImprovement > 0) {
    logger.success("✅ Regime filter shows significant improvement!");
  } else if (improvement.winRateImprovement > 0) {
    logger.info("📈 Regime filter shows modest improvement");
  } else {
    logger.warn("⚠️ Regime filter may need adjustment");
  }
}
