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
  "signals": ["array", "of", "trading", "signals"],
  "confidence": 1-10,
  "analysis": "detailed analysis text"
}

Focus on actionable insights for perpetual futures trading. Be specific about price levels when visible on the chart.
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
    const verdict = JSON.parse(functionCall.arguments) as TradingVerdict;

    logger.info(
      `⚡ Final Verdict: ${verdict.action} (${verdict.confidence}% confidence)`
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

    // Play sound alert for the final verdict
    if (finalVerdict && config.soundEffects !== false) {
      await playTradingAlert(
        finalVerdict.action as TradingAction,
        finalVerdict.confidence,
        finalVerdict.keyReason
      );
    }

    stepLogger.complete();

    const totalCost = compCost + verdictCost;

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
  ...options,
});
