import {
  BrowserSession,
  navigateToUrl,
  takeScreenshot,
} from "../utils/browser";
import { logger, createStepLogger } from "../utils/logger";
import { getPageInfo, waitForElement } from "../components/page-actions";
import { chartSettings } from "../config/chart-settings";
import {
  cropTimeframeScreenshots,
  CropConfig,
  DEFAULT_JUPITER_CROP,
} from "../utils/image-cropping";

/**
 * Web automation configuration
 */
export interface WebAutomationConfig {
  url: string;
  screenshots?: boolean;
  waitTime?: number;
  elementToWaitFor?: string;
  applyChartSettings?: boolean;
  chartSettingsMethod?:
    | "localStorage"
    | "url"
    | "javascript"
    | "direct"
    | "jupiter";
  cropScreenshots?: boolean;
  cropConfig?: CropConfig;
}

/**
 * Automation result
 */
export interface AutomationResult {
  success: boolean;
  pageInfo?: {
    title: string;
    url: string;
    viewport: string;
  };
  screenshots?: string[];
  chartSettings?: {
    applied: boolean;
    method: string;
    summary: any;
  } | null;
  error?: string;
}

/**
 * Multi-timeframe automation result
 */
export interface MultiTimeframeResult {
  success: boolean;
  results: Array<{
    timeframe: string;
    success: boolean;
    screenshot?: string;
    error?: string;
  }>;
  totalScreenshots: number;
  error?: string;
}

/**
 * Executes web automation for Jupiter Exchange with chart settings
 */
export const executeWebAutomation = async (
  session: BrowserSession,
  config: WebAutomationConfig
): Promise<AutomationResult> => {
  const stepLogger = createStepLogger("Web Automation");
  const { page } = session;
  const screenshots: string[] = [];
  let chartSettingsResult = null;

  try {
    stepLogger.start();

    // Log chart settings summary
    const settingsSummary = chartSettings.getSummary();
    logger.info(
      `📊 Loaded chart settings: ${settingsSummary.indicatorCount} indicators, ${settingsSummary.theme} theme`
    );

    // Navigate to the target URL
    await navigateToUrl(page, config.url, { waitUntil: "domcontentloaded" });

    // Wait a bit for JavaScript to load
    logger.info("Waiting for page to load...");
    await page.waitForTimeout(3000);

    // Apply chart settings if requested
    if (config.applyChartSettings) {
      chartSettingsResult = await applyChartSettings(
        session,
        config.chartSettingsMethod || "localStorage"
      );
    }

    // Get page information
    const pageInfo = await getPageInfo(page);

    // Wait for specific element if specified
    if (config.elementToWaitFor) {
      logger.info(`Waiting for element: ${config.elementToWaitFor}`);
      await waitForElement(page, config.elementToWaitFor, { timeout: 5000 });
    }

    // Take initial screenshot
    if (config.screenshots !== false) {
      const screenshotPath = await takeScreenshot(page, "jupiter-exchange.png");
      screenshots.push(screenshotPath);
    }

    // Wait if specified (with better error handling)
    if (config.waitTime) {
      logger.info(`Waiting ${config.waitTime}ms for page to fully load...`);
      try {
        await page.waitForTimeout(config.waitTime);

        // Take final screenshot after wait
        const finalScreenshot = await takeScreenshot(
          page,
          "jupiter-exchange-final.png"
        );
        screenshots.push(finalScreenshot);
      } catch (error) {
        logger.warn("Wait timeout interrupted, but continuing...");
        // Still try to take a screenshot if possible
        try {
          const finalScreenshot = await takeScreenshot(
            page,
            "jupiter-exchange-final.png"
          );
          screenshots.push(finalScreenshot);
        } catch (screenshotError) {
          logger.warn("Could not take final screenshot");
        }
      }
    }

    stepLogger.complete();

    return {
      success: true,
      pageInfo,
      screenshots,
      chartSettings: chartSettingsResult,
    };
  } catch (error) {
    stepLogger.error(error as Error);
    return {
      success: false,
      error: (error as Error).message,
      screenshots,
      chartSettings: chartSettingsResult,
    };
  }
};

/**
 * Multi-timeframe automation for Jupiter Exchange
 * Cycles through different timeframes and captures screenshots for each
 */
export const executeMultiTimeframeAutomation = async (
  session: BrowserSession,
  config: Omit<
    WebAutomationConfig,
    "applyChartSettings" | "chartSettingsMethod"
  > & {
    timeframes?: string[];
    screenshotWaitTime?: number;
    cropScreenshots?: boolean;
    cropConfig?: CropConfig;
  }
): Promise<MultiTimeframeResult> => {
  const stepLogger = createStepLogger("Multi-Timeframe Automation");
  const { page } = session;
  const timeframes = config.timeframes || ["5m", "15m", "1h", "2h", "6h"];
  const results: MultiTimeframeResult["results"] = [];
  let totalScreenshots = 0;

  try {
    stepLogger.start();
    logger.info(
      `📊 Starting multi-timeframe automation for ${
        timeframes.length
      } timeframes: ${timeframes.join(", ")}`
    );

    for (let i = 0; i < timeframes.length; i++) {
      const timeframe = timeframes[i];
      if (!timeframe) continue;

      const timeframeStepLogger = createStepLogger(`Timeframe ${timeframe}`);

      try {
        timeframeStepLogger.start();
        logger.info(
          `🔄 Processing timeframe ${i + 1}/${timeframes.length}: ${timeframe}`
        );

        // Navigate to the URL (or reload if not first iteration)
        if (i === 0) {
          await navigateToUrl(page, config.url, {
            waitUntil: "domcontentloaded",
          });
          await page.waitForTimeout(3000);
        } else {
          logger.info("🔄 Reloading page for next timeframe...");
          await page.reload({ waitUntil: "domcontentloaded" });
          await page.waitForTimeout(2000);
        }

        // Apply chart settings for this specific timeframe
        await applyChartSettingsForTimeframe(session, timeframe);

        // Wait for chart to load and process the new timeframe
        const waitTime = config.screenshotWaitTime || config.waitTime || 8000;
        logger.info(
          `⏳ Waiting ${waitTime}ms for ${timeframe} chart to load...`
        );
        await page.waitForTimeout(waitTime);

        // Take screenshot for this timeframe
        const screenshotPath = await takeScreenshot(
          page,
          `jupiter-${timeframe}.png`
        );
        logger.info(
          `📸 Screenshot captured for ${timeframe}: ${screenshotPath}`
        );

        results.push({
          timeframe,
          success: true,
          screenshot: screenshotPath,
        });
        totalScreenshots++;

        timeframeStepLogger.complete();
      } catch (error) {
        timeframeStepLogger.error(error as Error);
        results.push({
          timeframe,
          success: false,
          error: (error as Error).message,
        });
        logger.warn(
          `❌ Failed to process timeframe ${timeframe}: ${
            (error as Error).message
          }`
        );
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(
      `✅ Multi-timeframe automation completed: ${successCount}/${timeframes.length} timeframes successful`
    );

    // Crop screenshots if enabled
    if (config.cropScreenshots && totalScreenshots > 0) {
      try {
        const cropConfig = config.cropConfig || DEFAULT_JUPITER_CROP;
        logger.info(
          `✂️  Starting image cropping with config: ${cropConfig.x},${cropConfig.y} ${cropConfig.width}x${cropConfig.height}`
        );

        const croppedPaths = await cropTimeframeScreenshots(
          "screenshots",
          timeframes,
          cropConfig
        );

        logger.success(
          `✅ Cropped ${croppedPaths.length} screenshots for better AI analysis`
        );
      } catch (cropError) {
        logger.warn(
          `⚠️  Image cropping failed: ${(cropError as Error).message}`
        );
        logger.info("Continuing with original screenshots...");
      }
    }

    stepLogger.complete();

    return {
      success: successCount > 0,
      results,
      totalScreenshots,
    };
  } catch (error) {
    stepLogger.error(error as Error);
    return {
      success: false,
      results,
      totalScreenshots,
      error: (error as Error).message,
    };
  }
};

/**
 * Apply chart settings to the page
 */
const applyChartSettings = async (
  session: BrowserSession,
  method: "localStorage" | "url" | "javascript" | "direct" | "jupiter"
): Promise<{ applied: boolean; method: string; summary: any }> => {
  const { page } = session;
  const summary = chartSettings.getSummary();

  try {
    logger.info(`🎨 Applying chart settings via ${method}`);

    switch (method) {
      case "localStorage":
        await applyViaLocalStorage(page);
        break;
      case "javascript":
        await applyViaJavaScript(page);
        break;
      case "direct":
        await applyViaDirect(page);
        break;
      case "jupiter":
        await applyViaJupiterKeys(page);
        break;
      case "url":
        logger.warn("URL method not implemented yet");
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }

    logger.success(`✅ Chart settings applied successfully via ${method}`);
    return { applied: true, method, summary };
  } catch (error) {
    logger.error(
      `❌ Failed to apply chart settings via ${method}`,
      error as Error
    );
    return { applied: false, method, summary };
  }
};

/**
 * Apply settings via localStorage injection
 */
const applyViaLocalStorage = async (page: any): Promise<void> => {
  const settings = chartSettings.getSettings();
  const colorTheme = chartSettings.getColorTheme();

  // Inject settings into localStorage
  await page.evaluate(
    ({ settingsData, theme }: { settingsData: any; theme: any }) => {
      try {
        // TradingView chart settings keys
        const keys = [
          "tradingview.chartproperties",
          "tv_chart_layout",
          "chartLayout",
          "tvcoins_chart_layout",
          "TRADING_VIEW_STATE",
        ];

        const settingsJson = JSON.stringify(settingsData);

        keys.forEach((key) => {
          localStorage.setItem(key, settingsJson);
        });

        // Apply theme settings
        localStorage.setItem(
          "tv_theme",
          theme.background === "#0b0e13" ? "Dark" : "Light"
        );
        localStorage.setItem("chart_theme", JSON.stringify(theme));

        console.log("Chart settings injected into localStorage");
      } catch (e) {
        console.error("Failed to inject chart settings:", e);
      }
    },
    { settingsData: settings, theme: colorTheme }
  );

  // Refresh the page to apply settings
  logger.info("🔄 Refreshing page to apply localStorage settings...");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
};

/**
 * Apply settings via JavaScript injection
 */
const applyViaJavaScript = async (page: any): Promise<void> => {
  const jsCode = chartSettings.toJavaScriptInjection();

  await page.evaluate((code: string) => {
    try {
      eval(code);
    } catch (e) {
      console.error("Failed to execute chart settings code:", e);
    }
  }, jsCode);
};

/**
 * Apply settings via direct injection without page refresh
 */
const applyViaDirect = async (page: any): Promise<void> => {
  const settings = chartSettings.getSettings();
  const colorTheme = chartSettings.getColorTheme();

  // Check what's currently in localStorage first
  const currentStorage = await page.evaluate(() => {
    return Object.keys(localStorage).filter(
      (key) =>
        key.includes("chart") || key.includes("trading") || key.includes("tv")
    );
  });

  logger.info(
    `🔍 Current localStorage chart keys: ${
      currentStorage.length ? currentStorage.join(", ") : "none"
    }`
  );

  // Inject settings into localStorage without page refresh
  await page.evaluate(
    ({ settingsData, theme }: { settingsData: any; theme: any }) => {
      try {
        // Multiple localStorage keys for different chart systems
        const keys = [
          "tradingview.chartproperties",
          "tv_chart_layout",
          "chartLayout",
          "tvcoins_chart_layout",
          "tv.chart.layout",
          "jupiter_chart_settings",
          "chart_settings",
          "chart_config",
        ];

        const settingsJson = JSON.stringify(settingsData);

        keys.forEach((key) => {
          localStorage.setItem(key, settingsJson);
          sessionStorage.setItem(key, settingsJson);
        });

        // Apply theme settings
        localStorage.setItem(
          "tv_theme",
          theme.background === "#0b0e13" ? "Dark" : "Light"
        );
        localStorage.setItem("chart_theme", JSON.stringify(theme));

        // Try to apply theme directly to the page
        document.body.style.backgroundColor = theme.background;
        document.documentElement.style.setProperty(
          "--chart-bg",
          theme.background
        );
        document.documentElement.style.setProperty(
          "--chart-text",
          theme.textColor
        );
        document.documentElement.style.setProperty(
          "--chart-grid",
          theme.gridColor
        );

        console.log("Chart settings injected directly (no page refresh)");
        console.log("Theme applied:", theme);

        // Try to find and log chart-related elements
        const chartElements = document.querySelectorAll(
          '[class*="chart"], [id*="chart"], [data-testid*="chart"], canvas, iframe'
        );
        console.log(`Found ${chartElements.length} potential chart elements`);

        return {
          success: true,
          keysApplied: keys.length,
          chartElements: chartElements.length,
        };
      } catch (e) {
        console.error("Failed to inject chart settings:", e);
        return { error: (e as Error).message };
      }
    },
    { settingsData: settings, theme: colorTheme }
  );

  logger.info("⏳ Settings applied directly, waiting for page to process...");
  await page.waitForTimeout(1000);
};

/**
 * Apply settings via Jupiter-specific keys
 */
const applyViaJupiterKeys = async (page: any): Promise<void> => {
  const settings = chartSettings.getSettings();
  const colorTheme = chartSettings.getColorTheme();

  // Check what Jupiter actually has first
  const jupiterKeys = await page.evaluate(() => {
    return Object.keys(localStorage).filter(
      (key) => key.includes("tradingview") || key.includes("tv.")
    );
  });

  logger.info(`🔍 Jupiter's TradingView keys: ${jupiterKeys.join(", ")}`);

  // Inject settings using Jupiter's exact key patterns
  await page.evaluate(
    ({ settingsData, theme }: { settingsData: any; theme: any }) => {
      try {
        // Jupiter's specific TradingView keys
        const jupiterKeys = [
          "tradingview.chartproperties",
          "tradingview.chartproperties.mainSeriesProperties",
          "tradingview.current_theme.name",
          "tv_chart_layout",
          "tv.chart.layout",
        ];

        const settingsJson = JSON.stringify(settingsData);

        // Apply to Jupiter's keys
        jupiterKeys.forEach((key) => {
          localStorage.setItem(key, settingsJson);
        });

        // Apply theme specifically to Jupiter's theme key
        localStorage.setItem(
          "tradingview.current_theme.name",
          theme.background === "#0b0e13" ? "Dark" : "Light"
        );

        // Try to apply the main series properties specifically
        if (
          settingsData.charts &&
          settingsData.charts[0] &&
          settingsData.charts[0].panes &&
          settingsData.charts[0].panes[0]
        ) {
          const mainSeries = settingsData.charts[0].panes[0].sources.find(
            (s: any) => s.type === "MainSeries"
          );
          if (mainSeries) {
            localStorage.setItem(
              "tradingview.chartproperties.mainSeriesProperties",
              JSON.stringify(mainSeries.state)
            );
          }
        }

        console.log("Jupiter-specific chart settings applied");
        return { success: true, keysApplied: jupiterKeys.length };
      } catch (e) {
        console.error("Failed to inject Jupiter chart settings:", e);
        return { error: (e as Error).message };
      }
    },
    { settingsData: settings, theme: colorTheme }
  );

  logger.info("⏳ Jupiter settings applied, waiting for page to process...");
  await page.waitForTimeout(2000);
};

/**
 * Apply chart settings for a specific timeframe
 */
const applyChartSettingsForTimeframe = async (
  session: BrowserSession,
  timeframe: string
): Promise<void> => {
  const { page } = session;
  logger.info(`🎯 Applying chart settings for timeframe: ${timeframe}`);

  // Get settings for this specific timeframe
  const settings = chartSettings.getSettingsForTimeframe(timeframe);
  const colorTheme = chartSettings.getColorTheme();

  // Map timeframe to minute values for TradingView resolution
  const timeframeToMinutes: Record<string, number> = {
    "5m": 5,
    "15m": 15,
    "1h": 60,
    "2h": 120,
    "6h": 360,
  };

  const resolutionMinutes =
    timeframeToMinutes[timeframe] || parseInt(timeframe);

  // Apply settings using TRADING_VIEW_STATE key (the one that works)
  await page.evaluate(
    ({
      settingsData,
      theme,
      tf,
      resolution,
    }: {
      settingsData: any;
      theme: any;
      tf: string;
      resolution: number;
    }) => {
      try {
        // Use the key that works: TRADING_VIEW_STATE
        const settingsJson = JSON.stringify(settingsData);
        localStorage.setItem("TRADING_VIEW_STATE", settingsJson);

        // Also set some backup keys just in case
        localStorage.setItem("tradingview.chartproperties", settingsJson);
        localStorage.setItem("tv_chart_layout", settingsJson);

        // CRITICAL: Set the TradingView timeframe resolution keys
        localStorage.setItem(
          "tradingview.chart.lastUsedTimeBasedResolution",
          resolution.toString()
        );
        localStorage.setItem("lastInterval", resolution.toString());

        // Apply theme settings
        localStorage.setItem(
          "tradingview.current_theme.name",
          theme.background === "#0b0e13" ? "Dark" : "Light"
        );
        localStorage.setItem("chart_theme", JSON.stringify(theme));

        console.log(`Chart settings applied for timeframe: ${tf}`);
        console.log(
          `Interval set to: ${settingsData.charts[0].panes[0].sources[0].state.interval} minutes`
        );
        console.log(
          `TradingView resolution keys set to: ${resolution} minutes (lastUsedTimeBasedResolution + lastInterval)`
        );

        return { success: true, timeframe: tf, resolution: resolution };
      } catch (e) {
        console.error(`Failed to apply settings for timeframe ${tf}:`, e);
        return { error: (e as Error).message, timeframe: tf };
      }
    },
    {
      settingsData: settings,
      theme: colorTheme,
      tf: timeframe,
      resolution: resolutionMinutes,
    }
  );

  // Refresh page to apply the settings
  logger.info("🔄 Refreshing page to apply settings...");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
};

/**
 * Creates a basic web automation configuration
 */
export const createWebAutomationConfig = (
  url: string,
  options: {
    screenshots?: boolean;
    waitTime?: number;
    elementToWaitFor?: string;
    applyChartSettings?: boolean;
    chartSettingsMethod?:
      | "localStorage"
      | "url"
      | "javascript"
      | "direct"
      | "jupiter";
  } = {}
): WebAutomationConfig => {
  const config: WebAutomationConfig = {
    url,
    screenshots: options.screenshots ?? true,
    waitTime: options.waitTime ?? 3000,
    applyChartSettings: options.applyChartSettings ?? true,
    chartSettingsMethod: options.chartSettingsMethod ?? "jupiter",
  };

  if (options.elementToWaitFor) {
    config.elementToWaitFor = options.elementToWaitFor;
  }

  return config;
};

/**
 * Jupiter Exchange specific automation with chart settings
 */
export const createJupiterAutomation = (): WebAutomationConfig => ({
  url: "https://jup.ag/perps/short/USDC-WBTC",
  screenshots: true,
  waitTime: 5000,
  elementToWaitFor:
    '[data-testid="trading-view"], .trading-interface, main, [class*="trading"], [class*="perp"]',
  applyChartSettings: true,
  chartSettingsMethod: "jupiter",
});

/**
 * Create Jupiter automation with custom chart settings
 */
export const createJupiterAutomationWithSettings = (
  method: "localStorage" | "javascript" | "direct" | "jupiter" = "jupiter"
): WebAutomationConfig => ({
  url: "https://jup.ag/perps/short/USDC-WBTC",
  screenshots: true,
  waitTime: 8000, // Longer wait for settings to apply
  applyChartSettings: true,
  chartSettingsMethod: method,
  elementToWaitFor:
    '[data-testid="trading-view"], .trading-interface, main, .chart-container, [class*="trading"]',
});
