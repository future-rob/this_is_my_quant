import { logger } from "./utils/logger";
import {
  executeVisionAnalysis,
  VisionAnalysisResult,
  TradingDecision,
  ChartAnalysis,
  TradingVerdict,
} from "./features/vision-analysis";
import { createVisionAnalysisConfig } from "./config";

/**
 * Parse command line arguments for vision analysis
 */
function parseVisionArgs(): {
  help?: boolean;
  model?: string;
  detail?: "low" | "high" | "auto";
  timeframes?: string[];
  screenshotsDir?: string;
  maxTokens?: number;
  temperature?: number;
  outputDir?: string;
  saveJson?: boolean;
  saveText?: boolean;
  noSave?: boolean;
  soundEffects?: boolean;
  noSound?: boolean;
  soundVolume?: number;
} {
  const args = process.argv.slice(2);
  const result: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--model" && i + 1 < args.length) {
      result.model = args[++i];
    } else if (arg === "--detail" && i + 1 < args.length) {
      result.detail = args[++i];
    } else if (arg === "--timeframes" && i + 1 < args.length) {
      const timeframesArg = args[++i];
      if (timeframesArg) {
        result.timeframes = timeframesArg.split(",");
      }
    } else if (arg === "--screenshots-dir" && i + 1 < args.length) {
      result.screenshotsDir = args[++i];
    } else if (arg === "--max-tokens" && i + 1 < args.length) {
      const value = args[++i];
      result.maxTokens = value ? parseInt(value, 10) : undefined;
    } else if (arg === "--temperature" && i + 1 < args.length) {
      const value = args[++i];
      result.temperature = value ? parseFloat(value) : undefined;
    } else if (arg === "--output-dir" && i + 1 < args.length) {
      result.outputDir = args[++i];
    } else if (arg === "--save-json") {
      result.saveJson = true;
    } else if (arg === "--save-text") {
      result.saveText = true;
    } else if (arg === "--no-save") {
      result.noSave = true;
    } else if (arg === "--sound-effects") {
      result.soundEffects = true;
    } else if (arg === "--no-sound") {
      result.noSound = true;
    } else if (arg === "--sound-volume" && i + 1 < args.length) {
      const value = args[++i];
      result.soundVolume = value ? parseFloat(value) : undefined;
    }
  }

  return result;
}

/**
 * Show help information
 */
function showVisionHelp() {
  console.log(`
🤖 Jupiter Exchange Vision AI Analysis Tool

Usage: npm run start-vision-ai [options]

Options:
  --model <model>           OpenRouter model to use (default: openai/gpt-4o)
                           Available: openai/gpt-4o, openai/gpt-4o-mini, openai/gpt-4-turbo
  --detail <level>          Image analysis detail level (default: high)
                           Options: low, high, auto
  --timeframes <list>       Comma-separated timeframes to analyze (default: 5m,15m,1h,2h,6h)
  --screenshots-dir <dir>   Directory containing chart screenshots (default: screenshots)
  --max-tokens <number>     Maximum tokens per API call (default: 1000)
  --temperature <number>    Response randomness 0.0-1.0 (default: 0.1)
  --output-dir <dir>        Directory to save analysis results (default: analysis-results)
  --save-json              Save analysis as JSON file (default: enabled)
  --save-text              Save analysis as text report (default: enabled)
  --no-save                Disable saving files (display only)
  --sound-effects          Enable sound effects (default: enabled)
  --no-sound               Disable sound effects
  --sound-volume <0.0-1.0> Sound volume level (default: 0.7)
  --help, -h               Show this help message

Prerequisites:
  • Chart screenshots must exist (run 'npm run start -- --multi-timeframe' first)
  • OPENROUTER_API_KEY environment variable must be set

Examples:
  npm run start-vision-ai                           # Analyze all default timeframes
  npm run start-vision-ai -- --timeframes 5m,1h     # Analyze specific timeframes
  npm run start-vision-ai -- --model openai/gpt-4o-mini    # Use cheaper model
  npm run start-vision-ai -- --detail low           # Faster, lower cost analysis
  npm run start-vision-ai -- --no-save              # Display only, don't save files
  npm run start-vision-ai -- --output-dir reports   # Save to custom directory
  npm run start-vision-ai -- --no-sound             # Disable sound effects
  npm run start-vision-ai -- --sound-volume 0.3     # Lower volume sound effects

Environment Setup:
  export OPENROUTER_API_KEY="your-openrouter-api-key-here"
  `);
}

/**
 * Display individual timeframe analysis
 */
function displayTimeframeAnalysis(analysis: ChartAnalysis) {
  logger.info(`📊 ${analysis.timeframe.toUpperCase()} Analysis:`);
  logger.info(`   Trend: ${analysis.trend} (${analysis.strength}/10 strength)`);
  logger.info(`   Confidence: ${analysis.confidence}/10`);

  if (analysis.keyLevels.support || analysis.keyLevels.resistance) {
    logger.info(`   Key Levels:`);
    if (analysis.keyLevels.support) {
      logger.info(
        `     Support: $${analysis.keyLevels.support.toLocaleString()}`
      );
    }
    if (analysis.keyLevels.resistance) {
      logger.info(
        `     Resistance: $${analysis.keyLevels.resistance.toLocaleString()}`
      );
    }
  }

  logger.info(`   Indicators:`);
  logger.info(`     Volume: ${analysis.indicators.volume}`);
  logger.info(`     Bollinger: ${analysis.indicators.bollinger}`);
  logger.info(`     Momentum: ${analysis.indicators.momentum}`);

  if (analysis.signals.length > 0) {
    logger.info(`   Signals: ${analysis.signals.join(", ")}`);
  }

  logger.info(`   Analysis: ${analysis.analysis}`);
  logger.info("");
}

/**
 * Display trading decision
 */
function displayTradingDecision(decision: TradingDecision) {
  logger.info("🎯 TRADING DECISION:");
  logger.info("==========================================");
  logger.info(`   Action: ${decision.action.toUpperCase()}`);
  logger.info(`   Confidence: ${decision.confidence}/10`);
  logger.info(`   Overall Trend: ${decision.overallTrend}`);

  if (decision.entryPrice) {
    logger.info(`   Entry Price: $${decision.entryPrice.toLocaleString()}`);
  }
  if (decision.stopLoss) {
    logger.info(`   Stop Loss: $${decision.stopLoss.toLocaleString()}`);
  }
  if (decision.takeProfit) {
    logger.info(`   Take Profit: $${decision.takeProfit.toLocaleString()}`);
  }
  if (decision.riskReward) {
    logger.info(`   Risk/Reward: 1:${decision.riskReward}`);
  }

  logger.info("");
  logger.info(`   Market Structure: ${decision.marketStructure}`);
  logger.info("");
  logger.info(`   Reasoning: ${decision.reasoning}`);

  if (decision.warnings.length > 0) {
    logger.info("");
    logger.info("⚠️  WARNINGS:");
    decision.warnings.forEach((warning) => {
      logger.info(`   • ${warning}`);
    });
  }

  logger.info("==========================================");
}

/**
 * Display final trading verdict
 */
function displayFinalVerdict(verdict: TradingVerdict) {
  logger.info("");
  logger.info("⚡ FINAL TRADING VERDICT");
  logger.info("==========================================");
  logger.info(`🎯 ACTION: ${verdict.action}`);
  logger.info(`📊 CONFIDENCE: ${verdict.confidence}%`);
  logger.info(`💰 POSITION SIZE: ${verdict.positionSize}% of portfolio`);
  logger.info(`⏱️  TIME HORIZON: ${verdict.timeHorizon.toUpperCase()}`);
  logger.info(`⚠️  RISK LEVEL: ${verdict.riskLevel}`);
  if ((verdict as any).btcPrice) {
    logger.info(`💱 BTC PRICE: $${(verdict as any).btcPrice}`);
  }
  logger.info("");
  logger.info(`💡 KEY REASON: ${verdict.keyReason}`);

  if (verdict.action !== "HOLD") {
    logger.info("");
    logger.info("📋 EXECUTION DETAILS:");
    if (verdict.entryPrice) {
      logger.info(`   Entry: $${verdict.entryPrice.toLocaleString()}`);
    }
    if (verdict.stopLoss) {
      logger.info(`   Stop Loss: $${verdict.stopLoss.toLocaleString()}`);
    }
    if (verdict.takeProfit) {
      logger.info(`   Take Profit: $${verdict.takeProfit.toLocaleString()}`);
    }
  }

  if (verdict.criticalWarnings.length > 0) {
    logger.info("");
    logger.info("🚨 CRITICAL WARNINGS:");
    verdict.criticalWarnings.forEach((warning: string) => {
      logger.info(`   • ${warning}`);
    });
  }

  logger.info("==========================================");
  logger.info(
    `🚀 EXECUTE: ${verdict.action} ${verdict.positionSize}% (${verdict.confidence}% confidence)`
  );
  logger.info("==========================================");
}

/**
 * Display analysis summary
 */
function displayAnalysisSummary(result: VisionAnalysisResult) {
  if (!result.success) {
    logger.error(`❌ Analysis failed: ${result.error}`);
    return;
  }

  logger.info("");
  logger.info("📈 CHART ANALYSIS RESULTS");
  logger.info("==========================================");
  logger.info(`   Timeframes Analyzed: ${result.individualAnalyses.length}`);
  logger.info(
    `   Success Rate: ${result.individualAnalyses.length}/${result.individualAnalyses.length} (100%)`
  );
  if (result.totalCost) {
    logger.info(`   Total Cost: $${result.totalCost.toFixed(4)}`);
  }
  logger.info("");

  // Display individual timeframe analyses
  result.individualAnalyses.forEach((analysis) => {
    displayTimeframeAnalysis(analysis);
  });

  // Display trading decision
  if (result.tradingDecision) {
    displayTradingDecision(result.tradingDecision);
  }

  // Display final trading verdict
  if (result.finalVerdict) {
    logger.info("");
    displayFinalVerdict(result.finalVerdict);
  }
}

/**
 * Check prerequisites
 */
function checkPrerequisites(): boolean {
  // Check OpenRouter API key
  if (!process.env.OPENROUTER_API_KEY) {
    logger.error("❌ OPENROUTER_API_KEY environment variable is required");
    logger.info(
      '   Set it with: export OPENROUTER_API_KEY="your-openrouter-api-key-here"'
    );
    return false;
  }

  // Check for screenshot files
  const fs = require("fs");
  const screenshotsDir = "screenshots";
  const timeframes = ["5m", "15m", "1h", "2h", "6h"];
  const existingFiles = timeframes.filter((tf) =>
    fs.existsSync(`${screenshotsDir}/jupiter-${tf}.png`)
  );

  if (existingFiles.length === 0) {
    logger.error("❌ No chart screenshots found");
    logger.info(
      "   Run chart capture first: npm run start -- --multi-timeframe"
    );
    return false;
  }

  logger.info(
    `✅ Found ${existingFiles.length} chart screenshots: ${existingFiles.join(
      ", "
    )}`
  );
  return true;
}

/**
 * Run vision AI analysis
 */
async function runVisionAnalysis() {
  const args = parseVisionArgs();

  if (args.help) {
    showVisionHelp();
    return;
  }

  try {
    logger.info("🤖 Starting Vision AI Analysis");

    // Check prerequisites
    if (!checkPrerequisites()) {
      process.exit(1);
    }

    const config = createVisionAnalysisConfig({
      ...(args.model && { model: args.model }),
      ...(args.detail && { detail: args.detail }),
      ...(args.timeframes && { timeframes: args.timeframes }),
      ...(args.screenshotsDir && { screenshotsDir: args.screenshotsDir }),
      ...(args.maxTokens && { maxTokens: args.maxTokens }),
      ...(args.temperature && { temperature: args.temperature }),
      ...(args.outputDir && { outputDir: args.outputDir }),
      ...(args.noSave && { saveJson: false, saveText: false }),
      ...(args.saveJson !== undefined && { saveJson: args.saveJson }),
      ...(args.saveText !== undefined && { saveText: args.saveText }),
      ...(args.noSound && { soundEffects: false }),
      ...(args.soundEffects !== undefined && {
        soundEffects: args.soundEffects,
      }),
      ...(args.soundVolume !== undefined && { soundVolume: args.soundVolume }),
    });

    logger.info(`🔧 Configuration:`);
    logger.info(`   Model: ${config.model}`);
    logger.info(`   Detail Level: ${config.detail}`);
    logger.info(`   Timeframes: ${config.timeframes?.join(", ")}`);
    logger.info(`   Max Tokens: ${config.maxTokens}`);
    logger.info(`   Output Directory: ${config.outputDir}`);
    logger.info(`   Save JSON: ${config.saveJson ? "Yes" : "No"}`);
    logger.info(`   Save Text: ${config.saveText ? "Yes" : "No"}`);
    logger.info(`   Sound Effects: ${config.soundEffects ? "Yes" : "No"}`);
    if (config.soundEffects) {
      logger.info(`   Sound Volume: ${config.soundVolume}`);
    }
    logger.info("");

    const result = await executeVisionAnalysis(config);

    displayAnalysisSummary(result);

    if (result.success) {
      logger.success("✨ Vision AI analysis completed successfully!");
    } else {
      logger.error("❌ Vision AI analysis failed");
      process.exit(1);
    }
  } catch (error) {
    logger.error("❌ Vision AI analysis failed");
    logger.error((error as Error).message);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    await runVisionAnalysis();
  } catch (error) {
    logger.error("❌ Application failed");
    logger.error((error as Error).message);
    process.exit(1);
  }
}

// Run the application
main();
