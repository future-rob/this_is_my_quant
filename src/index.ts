import { withBrowserSession } from "./utils/browser";
import { logger } from "./utils/logger";
import {
  executeWebAutomation,
  executeMultiTimeframeAutomation,
  createJupiterAutomation,
  createJupiterAutomationWithSettings,
} from "./features/web-automation";
import { chartSettings } from "./config/chart-settings";
import {
  testCropConfiguration,
  parseCropConfig,
  getCropPreset,
  DEFAULT_JUPITER_CROP,
} from "./utils/image-cropping";

/**
 * Parse command line arguments
 */
function parseArgs(): {
  url?: string;
  headless?: boolean;
  headed?: boolean;
  slowmo?: number;
  wait?: number;
  help?: boolean;
  method?: "localStorage" | "javascript" | "direct" | "jupiter";
  debug?: boolean;
  multiTimeframe?: boolean;
  timeframes?: string[];
  cropScreenshots?: boolean;
  cropConfig?: string;
  cropPreset?: string;
  testCrop?: string;
} {
  const args = process.argv.slice(2);
  const result: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
    } else if (arg === "--url" && i + 1 < args.length) {
      result.url = args[++i];
    } else if (arg === "--headless") {
      result.headless = true;
    } else if (arg === "--headed") {
      result.headed = true;
    } else if (arg === "--slowmo" && i + 1 < args.length) {
      const value = args[++i];
      result.slowmo = value ? parseInt(value, 10) : 0;
    } else if (arg === "--wait" && i + 1 < args.length) {
      const value = args[++i];
      result.wait = value ? parseInt(value, 10) : 0;
    } else if (arg === "--method" && i + 1 < args.length) {
      result.method = args[++i];
    } else if (arg === "--debug") {
      result.debug = true;
    } else if (arg === "--multi-timeframe") {
      result.multiTimeframe = true;
    } else if (arg === "--timeframes" && i + 1 < args.length) {
      const timeframesArg = args[++i];
      if (timeframesArg) {
        result.timeframes = timeframesArg.split(",");
      }
    } else if (arg === "--crop-screenshots") {
      result.cropScreenshots = true;
    } else if (arg === "--crop-config" && i + 1 < args.length) {
      result.cropConfig = args[++i];
    } else if (arg === "--crop-preset" && i + 1 < args.length) {
      result.cropPreset = args[++i];
    } else if (arg === "--test-crop" && i + 1 < args.length) {
      result.testCrop = args[++i];
    }
  }

  return result;
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
🚀 Jupiter Exchange Automation Tool

Usage: npm run start [options]

Options:
  --url <url>           Target URL to visit (default: Jupiter Exchange)
  --headed              Show browser window (default: headless mode)
  --headless            Force headless mode (default: true)
  --slowmo <ms>         Add delay between actions (default: 0)
  --wait <ms>           Wait time after page load (default: 5000)
  --method <method>     Chart settings injection method:
                        • localStorage (inject into localStorage with page refresh)
                        • javascript (inject via JavaScript evaluation)
                        • direct (inject directly without page refresh)
                        • jupiter (inject using Jupiter's specific TradingView keys) [default]
  --debug               Show debug information about chart settings
  --multi-timeframe     Capture screenshots for multiple timeframes
  --timeframes <list>   Comma-separated list of timeframes (default: 5m,15m,1h,2h,6h)
  --crop-screenshots    Enable automatic cropping of chart screenshots
  --crop-config <x,y,w,h> Custom crop coordinates (e.g., "140,80,1200,700")
  --crop-preset <preset> Use predefined crop preset (minimal, wide, chart_volume)
  --test-crop <file>    Test crop configuration on a single image file
  --help, -h            Show this help message

Examples:
  npm run start                           # Default Jupiter Exchange automation (headless)
  npm run start --headed                  # Show browser window while running
  npm run start --method jupiter          # Use Jupiter-specific TradingView keys
  npm run start --method localStorage     # Try localStorage injection
  npm run start --method javascript       # Try JavaScript injection
  npm run start --debug                   # Show chart settings debug info
  npm run start --multi-timeframe         # Capture screenshots for multiple timeframes
  npm run start --multi-timeframe --timeframes 5m,15m,1h  # Custom timeframes
  npm run start --multi-timeframe --crop-screenshots      # Enable auto-cropping
  npm run start --multi-timeframe --crop-preset minimal   # Use minimal crop preset
  npm run start --multi-timeframe --crop-config 140,80,1200,700  # Custom crop area
  npm run start --test-crop screenshots/jupiter-1h.png    # Test crop on existing image
  npm run start --url https://example.com --wait 10000
  `);
}

/**
 * Show debug information about chart settings
 */
function showDebugInfo() {
  logger.info("🔍 Chart Settings Debug Information");
  logger.info("=====================================");

  const summary = chartSettings.getSummary();
  logger.info(`📊 Summary:`);
  logger.info(`  • Charts: ${summary.chartCount}`);
  logger.info(`  • Indicators: ${summary.indicatorCount}`);
  logger.info(`  • Theme: ${summary.theme}`);
  logger.info(`  • Timezone: ${summary.timezone}`);
  logger.info(`  • Layout: ${summary.layout}`);

  const colorTheme = chartSettings.getColorTheme();
  logger.info(`🎨 Color Theme:`);
  logger.info(`  • Background: ${colorTheme.background}`);
  logger.info(`  • Text: ${colorTheme.textColor}`);
  logger.info(`  • Grid: ${colorTheme.gridColor}`);
  logger.info(`  • Crosshair: ${colorTheme.crosshairColor}`);

  const indicators = chartSettings.getTechnicalIndicators();
  logger.info(`📈 Technical Indicators (${indicators.length}):`);
  indicators.forEach((indicator, index) => {
    const name =
      indicator.metaInfo?.shortDescription ||
      indicator.metaInfo?.description ||
      indicator.type;
    logger.info(`  ${index + 1}. ${name} (${indicator.id})`);
  });

  logger.info("=====================================");
}

/**
 * Run the automation
 */
async function runAutomation() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  if (args.debug) {
    showDebugInfo();
    return;
  }

  // Handle crop testing
  if (args.testCrop) {
    try {
      logger.info(`🧪 Testing crop configuration on: ${args.testCrop}`);

      let cropConfig = DEFAULT_JUPITER_CROP;

      if (args.cropPreset) {
        cropConfig = getCropPreset(args.cropPreset as any);
        logger.info(`📐 Using crop preset: ${args.cropPreset}`);
      } else if (args.cropConfig) {
        cropConfig = parseCropConfig(args.cropConfig);
        logger.info(`📐 Using custom crop config: ${args.cropConfig}`);
      } else {
        logger.info(`📐 Using default Jupiter crop config`);
      }

      await testCropConfiguration(args.testCrop, cropConfig);
      logger.success("✅ Crop test completed successfully!");
      return;
    } catch (error) {
      logger.error(`❌ Crop test failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }

  try {
    logger.info("🚀 Starting Jupiter Exchange automation");

    const config = args.method
      ? createJupiterAutomationWithSettings(args.method)
      : createJupiterAutomation();

    // Override config with CLI args
    if (args.url) config.url = args.url;
    if (args.wait) config.waitTime = args.wait;

    const browserConfig = {
      headless: args.headed ? false : args.headless ?? true,
      slowMo: args.slowmo ?? 0,
    };

    const result = await withBrowserSession(async (session) => {
      if (args.multiTimeframe) {
        // Prepare crop configuration
        let cropConfig = undefined;
        let cropScreenshots = args.cropScreenshots || false;

        if (args.cropPreset) {
          cropConfig = getCropPreset(args.cropPreset as any);
          cropScreenshots = true;
          logger.info(`📐 Using crop preset: ${args.cropPreset}`);
        } else if (args.cropConfig) {
          cropConfig = parseCropConfig(args.cropConfig);
          cropScreenshots = true;
          logger.info(`📐 Using custom crop config: ${args.cropConfig}`);
        } else if (cropScreenshots) {
          cropConfig = DEFAULT_JUPITER_CROP;
          logger.info(`📐 Using default Jupiter crop config`);
        }

        const multiConfig = {
          url: config.url,
          waitTime: config.waitTime || 8000,
          ...(args.timeframes && { timeframes: args.timeframes }),
          cropScreenshots,
          ...(cropConfig && { cropConfig }),
        };
        return await executeMultiTimeframeAutomation(session, multiConfig);
      } else {
        return await executeWebAutomation(session, config);
      }
    }, browserConfig);

    if (result.success) {
      logger.success("✨ Automation completed successfully!");

      // Handle regular automation result
      if ("pageInfo" in result) {
        if (result.pageInfo) {
          logger.info(`📋 Page: ${result.pageInfo.title}`);
          logger.info(`🌐 URL: ${result.pageInfo.url}`);
          logger.info(`📐 Viewport: ${result.pageInfo.viewport}`);
        }
        if (result.screenshots && result.screenshots.length > 0) {
          logger.info(`📸 Screenshots taken: ${result.screenshots.length}`);
          result.screenshots.forEach((screenshot) => {
            logger.info(`   - ${screenshot}`);
          });
        }
        if (result.chartSettings) {
          logger.info(
            `📊 Chart settings: ${
              result.chartSettings.applied ? "Applied" : "Failed"
            } via ${result.chartSettings.method}`
          );
        }
      }

      // Handle multi-timeframe result
      if ("results" in result) {
        logger.info(`📊 Multi-timeframe automation completed:`);
        logger.info(`📸 Total screenshots: ${result.totalScreenshots}`);
        result.results.forEach((timeframeResult) => {
          if (timeframeResult.success) {
            logger.info(
              `   ✅ ${timeframeResult.timeframe}: ${timeframeResult.screenshot}`
            );
          } else {
            logger.warn(
              `   ❌ ${timeframeResult.timeframe}: ${timeframeResult.error}`
            );
          }
        });
      }
    } else {
      logger.error("❌ Automation failed");
      if (result.error) {
        logger.error(`Error: ${result.error}`);
      }
    }
  } catch (error) {
    logger.error("❌ Automation failed");
    logger.error((error as Error).message);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    await runAutomation();
  } catch (error) {
    logger.error("❌ Application failed");
    logger.error((error as Error).message);
    process.exit(1);
  }
}

// Run the application
main();
