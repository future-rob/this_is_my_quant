import { chromium, Browser, BrowserContext, Page } from "playwright";
import { logger } from "./logger";

/**
 * Browser configuration options
 */
export interface BrowserConfig {
  headless?: boolean;
  slowMo?: number;
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
}

/**
 * Default browser configuration
 */
const DEFAULT_CONFIG: Required<BrowserConfig> = {
  headless: true,
  slowMo: 0,
  viewport: { width: 1920, height: 1080 },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  timeout: 30000,
};

/**
 * Browser session type
 */
export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Creates a new browser session with the specified configuration
 */
export const createBrowserSession = async (
  config: BrowserConfig = {}
): Promise<BrowserSession> => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  logger.info("Initializing browser session");

  const browser = await chromium.launch({
    headless: finalConfig.headless,
    slowMo: finalConfig.slowMo,
  });

  const context = await browser.newContext({
    viewport: finalConfig.viewport,
    userAgent: finalConfig.userAgent,
  });

  const page = await context.newPage();

  // Set default timeout
  page.setDefaultTimeout(finalConfig.timeout);

  logger.success("Browser session created successfully");

  return { browser, context, page };
};

/**
 * Closes a browser session safely
 */
export const closeBrowserSession = async (
  session: BrowserSession
): Promise<void> => {
  logger.info("Closing browser session");

  try {
    await session.context.close();
    await session.browser.close();
    logger.success("Browser session closed successfully");
  } catch (error) {
    logger.error("Error closing browser session", error as Error);
    throw error;
  }
};

/**
 * Creates a managed browser session with automatic cleanup
 */
export const withBrowserSession = async <T>(
  callback: (session: BrowserSession) => Promise<T>,
  config?: BrowserConfig
): Promise<T> => {
  const session = await createBrowserSession(config);

  try {
    return await callback(session);
  } finally {
    await closeBrowserSession(session);
  }
};

/**
 * Takes a screenshot with automatic directory creation
 */
export const takeScreenshot = async (
  page: Page,
  filename: string,
  options: { fullPage?: boolean; path?: string } = {}
): Promise<string> => {
  const { fullPage = true, path = "screenshots" } = options;
  const screenshotPath = `${path}/${filename}`;

  await page.screenshot({
    path: screenshotPath,
    fullPage,
  });

  logger.success(`Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
};

/**
 * Navigates to a URL with loading wait strategies
 */
export const navigateToUrl = async (
  page: Page,
  url: string,
  options: { waitUntil?: "load" | "domcontentloaded" | "networkidle" } = {}
): Promise<void> => {
  const { waitUntil = "networkidle" } = options;

  logger.info(`Navigating to: ${url}`);

  await page.goto(url, { waitUntil });

  logger.success(`Successfully loaded: ${url}`);
};
