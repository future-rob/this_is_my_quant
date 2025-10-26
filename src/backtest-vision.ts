#!/usr/bin/env node

import {
  executeBacktest,
  BacktestConfig,
} from "./features/vision-analysis";
import { createBacktestConfig } from "./config";
import { logger } from "./utils/logger";
import path from "path";
import fs from "fs";

/**
 * Parse command line arguments for backtest
 */
function parseBacktestArgs(): Partial<BacktestConfig> & { help?: boolean } {
  const args = process.argv.slice(2);
  const config: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      config.help = true;
    } else if (arg === "--test-data-dir" && i + 1 < args.length) {
      config.testDataDir = args[++i];
    } else if (arg === "--model" && i + 1 < args.length) {
      config.model = args[++i];
    } else if (arg === "--detail" && i + 1 < args.length) {
      const detail = args[++i];
      if (detail && ["low", "high", "auto"].includes(detail)) {
        config.detail = detail as "low" | "high" | "auto";
      } else {
        logger.warn(`⚠️  Invalid detail level: ${detail}. Using 'high'.`);
      }
    } else if (arg === "--max-tokens" && i + 1 < args.length) {
      config.maxTokens = parseInt(args[++i] || "1000", 10);
    } else if (arg === "--temperature" && i + 1 < args.length) {
      config.temperature = parseFloat(args[++i] || "0.1");
    } else if (arg === "--output-dir" && i + 1 < args.length) {
      config.outputDir = args[++i];
    } else if (arg === "--no-save") {
      config.saveResults = false;
    } else if (arg === "--trends" && i + 1 < args.length) {
      const trendsStr = args[++i];
      if (trendsStr) {
        const trends = trendsStr.split(",").map((t) => t.trim());
        const validTrends = trends.filter((t) =>
          ["bullish", "bearish", "neutral", "sideways"].includes(t)
        );
        if (validTrends.length > 0) {
          config.expectedTrends = validTrends;
        }
      }
    } else if (arg === "--timeframes" && i + 1 < args.length) {
      const timeframesStr = args[++i];
      if (timeframesStr) {
        config.timeframes = timeframesStr.split(",").map((t) => t.trim());
      }
    } else if (arg === "--max-images" && i + 1 < args.length) {
      config.maxImagesPerCategory = parseInt(args[++i] || "0", 10);
    } else if (arg === "--verbose" || arg === "-v") {
      config.verbose = true;
    } else if (arg === "--concurrency" && i + 1 < args.length) {
      const concurrency = parseInt(args[++i] || "10", 10);
      if (concurrency > 0 && concurrency <= 50) {
        config.concurrency = concurrency;
      } else {
        logger.warn(
          `⚠️  Invalid concurrency: ${concurrency}. Using default (10).`
        );
      }
    }
  }

  return config;
}

/**
 * Show help message for backtest CLI
 */
function showBacktestHelp(): void {
  console.log(`
🧪 Vision AI Backtest Tool

Test the accuracy of vision analysis against labeled chart screenshots.

Usage: npm run backtest-vision [options]

Required Directory Structure:
  test-data/
  ├── bullish/
  │   ├── 5m_chart_001.png
  │   ├── 1h_chart_002.png
  │   └── ...
  ├── bearish/
  │   ├── 5m_chart_003.png
  │   └── ...
  ├── neutral/
  │   └── ...
  └── sideways/
      └── ...

Options:
  --test-data-dir <dir>        Test data directory (default: backtest-data)
  --model <model>              AI model to use (default: openai/gpt-4o)
  --detail <level>             Analysis detail level: low, high, auto (default: high)
  --max-tokens <number>        Max tokens per API call (default: 1000)
  --temperature <number>       Response randomness 0.0-1.0 (default: 0.1)
  --output-dir <dir>           Results output directory (default: backtest-results)
  --no-save                    Don't save results to files
  --trends <list>              Comma-separated trends to test (default: all available)
  --timeframes <list>          Comma-separated timeframes to test (default: all available)
  --max-images <number>        Max images per category (default: unlimited)
  --concurrency <number>       Parallel API calls (1-50, default: 10)
  --verbose, -v                Detailed logging
  --help, -h                   Show this help message

Examples:
  npm run backtest-vision                                    # Run with defaults
  npm run backtest-vision -- --test-data-dir my-test-data   # Custom test directory
  npm run backtest-vision -- --model openai/gpt-4o-mini     # Use cheaper model
  npm run backtest-vision -- --detail low --max-images 10   # Quick test with 10 images per category
  npm run backtest-vision -- --trends bullish,bearish       # Test only bullish/bearish
  npm run backtest-vision -- --timeframes 5m,1h             # Test only 5m and 1h timeframes
  npm run backtest-vision -- --concurrency 20               # Process 20 images in parallel
  npm run backtest-vision -- --verbose                      # Detailed output

Image Naming Convention:
  Images should be named with timeframe prefix: 5m_*, 15m_*, 1h_*, 2h_*, 6h_*, etc.
  Examples: 5m_chart_001.png, 1h_bullish_setup.jpg, 15m_breakout.png

Results:
  • JSON file with detailed results for programmatic use
  • Text report with human-readable summary
  • Accuracy metrics per category and timeframe
  • Confusion matrix showing prediction patterns
  • Cost and performance statistics

Prerequisites:
  • OPENROUTER_API_KEY environment variable must be set
  • Test images organized in trend folders with timeframe prefixes
`);
}

/**
 * Validate backtest setup
 */
function validateBacktestSetup(config: BacktestConfig): boolean {
  // Check API key
  if (!process.env.OPENROUTER_API_KEY) {
    logger.error(`❌ OPENROUTER_API_KEY environment variable is required`);
    logger.info(
      `   Set it with: export OPENROUTER_API_KEY="your-api-key-here"`
    );
    return false;
  }

  // Check test data directory
  if (!fs.existsSync(config.testDataDir)) {
    logger.error(`❌ Test data directory not found: ${config.testDataDir}`);
    logger.info(`   Create the directory and organize images as:`);
    logger.info(`   ${config.testDataDir}/`);
    logger.info(`   ├── bullish/`);
    logger.info(`   ├── bearish/`);
    logger.info(`   ├── neutral/`);
    logger.info(`   └── sideways/`);
    return false;
  }

  // Check for trend folders
  const trendFolders = ["bullish", "bearish", "neutral", "sideways"];
  const existingFolders = trendFolders.filter((folder) =>
    fs.existsSync(path.join(config.testDataDir, folder))
  );

  if (existingFolders.length === 0) {
    logger.error(`❌ No trend folders found in ${config.testDataDir}`);
    logger.info(`   Expected folders: ${trendFolders.join(", ")}`);
    return false;
  }

  // Check for images
  let totalImages = 0;
  for (const folder of existingFolders) {
    const folderPath = path.join(config.testDataDir, folder);
    const images = fs
      .readdirSync(folderPath)
      .filter((file) => /\.(png|jpg|jpeg)$/i.test(file));
    totalImages += images.length;
  }

  if (totalImages === 0) {
    logger.error(`❌ No images found in trend folders`);
    logger.info(
      `   Add images with timeframe prefixes (e.g., 5m_chart_001.png)`
    );
    return false;
  }

  logger.info(
    `✅ Found ${totalImages} test images across ${existingFolders.length} trend categories`
  );
  return true;
}

/**
 * Main backtest execution function
 */
async function runBacktest(): Promise<void> {
  const args = parseBacktestArgs();

  if (args.help) {
    showBacktestHelp();
    return;
  }

  const config = createBacktestConfig(args);

  logger.info(`🧪 Starting Vision AI Backtest`);
  logger.info(`📁 Test Data: ${config.testDataDir}`);
  logger.info(`🤖 Model: ${config.model}`);
  logger.info(`📊 Detail: ${config.detail}`);

  // Validate setup
  if (!validateBacktestSetup(config)) {
    process.exit(1);
  }

  try {
    // Execute backtest
    const result = await executeBacktest(config);

    if (result.success) {
      logger.success(`\n🎉 Backtest completed successfully!`);
      logger.info(`${"=".repeat(50)}`);
      logger.info(`📊 FINAL RESULTS:`);
      logger.info(
        `   Overall Accuracy: ${(result.overallAccuracy * 100).toFixed(2)}%`
      );
      logger.info(
        `   Correct Predictions: ${result.correctPredictions}/${result.totalImages}`
      );
      logger.info(`   Total Cost: $${result.totalCost.toFixed(4)}`);
      logger.info(
        `   Processing Time: ${(result.totalProcessingTime / 1000).toFixed(2)}s`
      );

      // Category breakdown
      if (result.categoryMetrics.length > 0) {
        logger.info(`\n📈 Category Performance:`);
        result.categoryMetrics.forEach((category) => {
          logger.info(
            `   ${category.category.toUpperCase()}: ${(
              category.accuracy * 100
            ).toFixed(2)}% (${category.correctPredictions}/${
              category.totalImages
            })`
          );
        });
      }

      // Timeframe breakdown
      if (result.timeframeBreakdown.length > 0) {
        logger.info(`\n🕐 Timeframe Performance:`);
        result.timeframeBreakdown.forEach((tf) => {
          logger.info(
            `   ${tf.timeframe.toUpperCase()}: ${(tf.accuracy * 100).toFixed(
              2
            )}% (${tf.correctPredictions}/${tf.totalImages})`
          );
        });
      }

      logger.info(`${"=".repeat(50)}`);

      if (config.saveResults !== false) {
        logger.info(`💾 Results saved to: ${config.outputDir}`);
      }
    } else {
      logger.error(`❌ Backtest failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error(`❌ Backtest execution failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Handle process termination gracefully
 */
process.on("SIGINT", () => {
  logger.info(`\n🛑 Received interrupt signal. Stopping backtest...`);
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info(`\n🛑 Received termination signal. Stopping backtest...`);
  process.exit(0);
});

// Run the backtest
if (require.main === module) {
  runBacktest().catch((error) => {
    logger.error(`❌ Backtest failed: ${error.message}`);
    process.exit(1);
  });
}

export { runBacktest };
