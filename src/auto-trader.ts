#!/usr/bin/env node

import { spawn } from "child_process";
import { logger } from "./utils/logger";

/**
 * Configuration for the auto trader
 */
interface AutoTraderConfig {
  intervalMinutes: number;
  chartCaptureArgs: string[];
  visionAiArgs: string[];
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AutoTraderConfig = {
  intervalMinutes: 13,
  chartCaptureArgs: [
    "--method",
    "localStorage",
    "--multi-timeframe",
    "--timeframes",
    "5m,15m,1h,2h,6h",
    "--crop-screenshots", // Enable cropping by default for better AI analysis
  ],
  visionAiArgs: [],
  maxRetries: 3,
  retryDelayMs: 30000, // 30 seconds
};

/**
 * Execute a command and return a promise
 */
function executeCommand(
  command: string,
  args: string[] = []
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    logger.info(`🔄 Executing: ${command} ${args.join(" ")}`);

    const child = spawn(command, args, {
      stdio: "pipe",
      shell: true,
    });

    let output = "";
    let errorOutput = "";

    child.stdout?.on("data", (data) => {
      const text = data.toString();
      output += text;
      // Log real-time output but suppress excessive noise
      const lines = text
        .trim()
        .split("\n")
        .filter((line: string) => line.trim());
      lines.forEach((line: string) => {
        if (!line.includes("npm WARN") && !line.includes("deprecated")) {
          logger.info(`  ${line}`);
        }
      });
    });

    child.stderr?.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;
      // Only log actual errors, not warnings
      if (text.includes("error") || text.includes("Error")) {
        logger.error(`  ${text.trim()}`);
      }
    });

    child.on("close", (code) => {
      const success = code === 0;
      if (success) {
        logger.success(`✅ Command completed successfully`);
      } else {
        logger.error(`❌ Command failed with exit code ${code}`);
        if (errorOutput) {
          logger.error(`Error output: ${errorOutput.trim()}`);
        }
      }

      resolve({
        success,
        output: output + errorOutput,
      });
    });

    child.on("error", (error) => {
      logger.error(`❌ Command execution error: ${error.message}`);
      resolve({
        success: false,
        output: error.message,
      });
    });
  });
}

/**
 * Execute command with retry logic
 */
async function executeWithRetry(
  command: string,
  args: string[],
  maxRetries: number,
  retryDelay: number
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.info(`📋 Attempt ${attempt}/${maxRetries}`);

    const result = await executeCommand(command, args);

    if (result.success) {
      return true;
    }

    if (attempt < maxRetries) {
      logger.warn(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  logger.error(`❌ Failed after ${maxRetries} attempts`);
  return false;
}

/**
 * Wait for specified number of minutes
 */
async function waitMinutes(minutes: number): Promise<void> {
  const ms = minutes * 60 * 1000;
  logger.info(`⏰ Waiting ${minutes} minutes until next analysis...`);

  // Show countdown every minute
  for (let i = minutes; i > 0; i--) {
    if (i <= 5 || i % 5 === 0) {
      logger.info(`⏳ ${i} minute${i !== 1 ? "s" : ""} remaining...`);
    }
    await new Promise((resolve) => setTimeout(resolve, 60000)); // 1 minute
  }

  logger.info(`🚀 Starting next analysis cycle...`);
}

/**
 * Run single analysis cycle
 */
async function runAnalysisCycle(
  config: AutoTraderConfig,
  cycleNumber: number
): Promise<boolean> {
  const startTime = new Date();
  logger.info(
    `🔄 Starting Analysis Cycle #${cycleNumber} at ${startTime.toLocaleTimeString()}`
  );
  logger.info(`${"=".repeat(60)}`);

  // Step 1: Chart Capture
  logger.info(
    `📸 Step 1: Capturing charts with timeframes ${
      config.chartCaptureArgs.find((arg) => arg.includes(",")) ?? "default"
    }`
  );
  const chartSuccess = await executeWithRetry(
    "npm",
    ["run", "start", "--", ...config.chartCaptureArgs],
    config.maxRetries,
    config.retryDelayMs
  );

  if (!chartSuccess) {
    logger.error(`❌ Chart capture failed after ${config.maxRetries} attempts`);
    return false;
  }

  // Small delay between steps
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Step 2: Vision AI Analysis
  logger.info(`🤖 Step 2: Running Vision AI analysis`);
  const visionSuccess = await executeWithRetry(
    "npm",
    ["run", "start-vision-ai", "--", ...config.visionAiArgs],
    config.maxRetries,
    config.retryDelayMs
  );

  if (!visionSuccess) {
    logger.error(
      `❌ Vision AI analysis failed after ${config.maxRetries} attempts`
    );
    return false;
  }

  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  logger.success(
    `✅ Analysis Cycle #${cycleNumber} completed successfully in ${duration}s`
  );
  logger.info(`🎯 Next cycle will start in ${config.intervalMinutes} minutes`);
  logger.info(`${"=".repeat(60)}`);

  return true;
}

/**
 * Main auto trader loop
 */
async function runAutoTrader(
  config: AutoTraderConfig = DEFAULT_CONFIG
): Promise<void> {
  logger.info(`🚀 Jupiter Exchange Auto Trader Started`);
  logger.info(`⏰ Running every ${config.intervalMinutes} minutes`);
  logger.info(
    `📊 Chart timeframes: ${
      config.chartCaptureArgs.find((arg) => arg.includes(",")) ?? "default"
    }`
  );
  logger.info(`🔄 Max retries per step: ${config.maxRetries}`);
  logger.info(`${"=".repeat(60)}`);

  let cycleNumber = 1;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  // Check prerequisites
  if (!process.env.OPENAI_API_KEY) {
    logger.error(`❌ OPENAI_API_KEY environment variable is required`);
    logger.info(`   Set it with: export OPENAI_API_KEY="your-api-key-here"`);
    process.exit(1);
  }

  while (true) {
    try {
      const success = await runAnalysisCycle(config, cycleNumber);

      if (success) {
        consecutiveFailures = 0;

        // Wait for next cycle (except for the first cycle when testing)
        if (cycleNumber > 1 || process.argv.includes("--continuous")) {
          await waitMinutes(config.intervalMinutes);
        } else if (!process.argv.includes("--once")) {
          await waitMinutes(config.intervalMinutes);
        } else {
          logger.info(
            `🎯 Single cycle completed. Use --continuous for continuous operation.`
          );
          break;
        }
      } else {
        consecutiveFailures++;
        logger.warn(
          `⚠️  Consecutive failures: ${consecutiveFailures}/${maxConsecutiveFailures}`
        );

        if (consecutiveFailures >= maxConsecutiveFailures) {
          logger.error(
            `❌ Too many consecutive failures (${consecutiveFailures}). Stopping auto trader.`
          );
          logger.info(`🔧 Please check your setup and try again.`);
          break;
        }

        // Wait shorter time before retrying failed cycle
        const retryWait = Math.min(config.intervalMinutes, 5);
        logger.info(`⏳ Waiting ${retryWait} minutes before retry...`);
        await waitMinutes(retryWait);
      }

      cycleNumber++;
    } catch (error) {
      logger.error(
        `❌ Unexpected error in cycle ${cycleNumber}: ${
          (error as Error).message
        }`
      );
      consecutiveFailures++;

      if (consecutiveFailures >= maxConsecutiveFailures) {
        logger.error(`❌ Too many consecutive errors. Stopping auto trader.`);
        break;
      }

      await waitMinutes(5); // Wait 5 minutes on unexpected errors
    }
  }

  logger.info(`🛑 Auto Trader stopped`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<AutoTraderConfig> & {
  help?: boolean;
  once?: boolean;
  continuous?: boolean;
} {
  const args = process.argv.slice(2);
  const config: any = {};
  let cropEnabled = true; // Default to enabled
  let cropOptions: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      config.help = true;
    } else if (arg === "--once") {
      config.once = true;
    } else if (arg === "--continuous") {
      config.continuous = true;
    } else if (arg === "--interval" && i + 1 < args.length) {
      config.intervalMinutes = parseInt(args[++i] || "13", 10);
    } else if (arg === "--timeframes" && i + 1 < args.length) {
      const timeframes = args[++i];
      config.chartCaptureArgs = [
        "--method",
        "localStorage",
        "--multi-timeframe",
        "--timeframes",
        timeframes,
      ];
    } else if (arg === "--model" && i + 1 < args.length) {
      const model = args[++i];
      config.visionAiArgs = ["--model", model];
    } else if (arg === "--no-sound") {
      config.visionAiArgs = [...(config.visionAiArgs || []), "--no-sound"];
    } else if (arg === "--sound-volume" && i + 1 < args.length) {
      const volume = args[++i];
      config.visionAiArgs = [
        ...(config.visionAiArgs || []),
        "--sound-volume",
        volume,
      ];
    } else if (arg === "--crop-screenshots") {
      cropEnabled = true;
    } else if (arg === "--no-crop") {
      cropEnabled = false;
    } else if (arg === "--crop-config" && i + 1 < args.length) {
      const cropConfig = args[++i];
      if (cropConfig) {
        cropOptions = ["--crop-config", cropConfig];
        cropEnabled = true;
      }
    } else if (arg === "--crop-preset" && i + 1 < args.length) {
      const cropPreset = args[++i];
      if (cropPreset) {
        cropOptions = ["--crop-preset", cropPreset];
        cropEnabled = true;
      }
    }
  }

  // Build chart capture args with crop options
  if (!config.chartCaptureArgs) {
    config.chartCaptureArgs = [
      "--method",
      "localStorage",
      "--multi-timeframe",
      "--timeframes",
      "5m,15m,1h,2h,6h",
    ];
  }

  // Add crop options if enabled
  if (cropEnabled) {
    config.chartCaptureArgs.push("--crop-screenshots");
    if (cropOptions.length > 0) {
      config.chartCaptureArgs.push(...cropOptions);
    }
  }

  return config;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
🤖 Jupiter Exchange Auto Trader

Automatically captures charts and runs AI analysis every 13 minutes.

Usage: npm run auto-trader [options]

Options:
  --interval <minutes>     Interval between analyses (default: 13)
  --timeframes <list>      Comma-separated timeframes (default: 5m,15m,1h,2h,6h)
  --model <model>          AI model to use (default: gpt-4o)
  --no-sound               Disable sound effects
  --sound-volume <0.0-1.0> Sound volume level (default: 0.7)
  --crop-screenshots       Enable chart screenshot cropping (default: enabled)
  --no-crop                Disable chart screenshot cropping
  --crop-config <x,y,w,h>  Custom crop coordinates (e.g., "0,100,1450,550")
  --crop-preset <preset>   Use crop preset (minimal, wide, chart_volume)
  --once                   Run single cycle and exit
  --continuous             Run continuously (default behavior)
  --help, -h              Show this help message

Examples:
  npm run auto-trader                                    # Run every 13 minutes with cropping
  npm run auto-trader -- --interval 15                  # Run every 15 minutes  
  npm run auto-trader -- --timeframes 5m,1h,6h          # Custom timeframes
  npm run auto-trader -- --model gpt-4o-mini --once     # Single run with cheap model
  npm run auto-trader -- --no-sound                     # Disable sound effects
  npm run auto-trader -- --sound-volume 0.3             # Lower volume sound effects
  npm run auto-trader -- --no-crop                      # Disable chart cropping
  npm run auto-trader -- --crop-preset minimal          # Use minimal crop preset
  npm run auto-trader -- --crop-config 0,100,1450,550   # Custom crop coordinates

Prerequisites:
  • OPENAI_API_KEY environment variable must be set
  • Internet connection for chart capture and AI analysis

Environment Setup:
  export OPENAI_API_KEY="your-api-key-here"

Note: Use Ctrl+C to stop the auto trader.
`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  const config: AutoTraderConfig = {
    ...DEFAULT_CONFIG,
    ...args,
  };

  // Handle process termination gracefully
  process.on("SIGINT", () => {
    logger.info(`\n🛑 Received interrupt signal. Stopping auto trader...`);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info(`\n🛑 Received termination signal. Stopping auto trader...`);
    process.exit(0);
  });

  await runAutoTrader(config);
}

// Run the auto trader
if (require.main === module) {
  main().catch((error) => {
    logger.error(`❌ Auto trader failed: ${error.message}`);
    process.exit(1);
  });
}

export { runAutoTrader, AutoTraderConfig };
