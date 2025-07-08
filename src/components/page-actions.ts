import { Page } from "playwright";
import { logger } from "../utils/logger";

/**
 * Element wait options
 */
export interface WaitOptions {
  timeout?: number;
  state?: "visible" | "hidden" | "attached" | "detached";
}

/**
 * Waits for an element to be present and returns whether it exists
 */
export const waitForElement = async (
  page: Page,
  selector: string,
  options: WaitOptions = {}
): Promise<boolean> => {
  const { timeout = 5000, state = "visible" } = options;

  try {
    await page.locator(selector).waitFor({ state, timeout });
    logger.success(`Element found: ${selector}`);
    return true;
  } catch (error) {
    logger.warn(`Element not found: ${selector}`);
    return false;
  }
};

/**
 * Extracts page information (title, URL, viewport)
 */
export const getPageInfo = async (page: Page) => {
  const title = await page.title();
  const url = page.url();
  const viewport = page.viewportSize();

  const info = {
    title,
    url,
    viewport: viewport ? `${viewport.width}x${viewport.height}` : "unknown",
  };

  logger.info(
    `Page info - Title: ${title}, URL: ${url}, Viewport: ${info.viewport}`
  );
  return info;
};
