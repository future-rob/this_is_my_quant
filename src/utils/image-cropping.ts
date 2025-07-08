import sharp from "sharp";
import fs from "fs";
import path from "path";
import { logger, createStepLogger } from "./logger";

/**
 * Crop configuration for chart screenshots
 */
export interface CropConfig {
  enabled: boolean;
  x: number; // Left position in pixels
  y: number; // Top position in pixels
  width: number; // Crop width in pixels
  height: number; // Crop height in pixels
  outputSuffix?: string; // Suffix for cropped files (default: '-cropped')
}

/**
 * Default crop configuration optimized for Jupiter Exchange chart area
 * These coordinates are based on a typical Jupiter Exchange screenshot
 * and may need adjustment based on screen resolution/browser settings
 */
export const DEFAULT_JUPITER_CROP: CropConfig = {
  enabled: true,
  x: 0, // Skip left sidebar/navigation
  y: 100, // Skip top navigation bar
  width: 1450, // Chart area width
  height: 550, // Chart area height including volume and indicators
  outputSuffix: "-cropped",
};

/**
 * Alternative crop configurations for different use cases
 */
export const CROP_PRESETS = {
  // Focus only on price chart (minimal)
  minimal: {
    enabled: true,
    x: 140,
    y: 80,
    width: 1000,
    height: 450,
    outputSuffix: "-minimal",
  },
  // Include more context (wider view)
  wide: {
    enabled: true,
    x: 100,
    y: 60,
    width: 1400,
    height: 800,
    outputSuffix: "-wide",
  },
  // Chart + volume only (no lower indicators)
  chart_volume: {
    enabled: true,
    x: 140,
    y: 80,
    width: 1200,
    height: 550,
    outputSuffix: "-chart-volume",
  },
} as const;

/**
 * Crop a single image using the specified configuration
 */
export const cropImage = async (
  inputPath: string,
  outputPath: string,
  config: CropConfig
): Promise<string> => {
  const stepLogger = createStepLogger(`Crop ${path.basename(inputPath)}`);

  try {
    stepLogger.start();

    if (!config.enabled) {
      logger.info(`⏭️  Cropping disabled, skipping ${inputPath}`);
      return inputPath;
    }

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input image not found: ${inputPath}`);
    }

    // Get image metadata to validate crop parameters
    const metadata = await sharp(inputPath).metadata();
    const imageWidth = metadata.width || 0;
    const imageHeight = metadata.height || 0;

    // Validate crop parameters
    if (config.x + config.width > imageWidth) {
      logger.warn(
        `⚠️  Crop width extends beyond image boundary (${
          config.x + config.width
        } > ${imageWidth}), adjusting...`
      );
      config.width = imageWidth - config.x;
    }

    if (config.y + config.height > imageHeight) {
      logger.warn(
        `⚠️  Crop height extends beyond image boundary (${
          config.y + config.height
        } > ${imageHeight}), adjusting...`
      );
      config.height = imageHeight - config.y;
    }

    // Perform the crop
    await sharp(inputPath)
      .extract({
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
      })
      .png() // Ensure PNG output for consistency
      .toFile(outputPath);

    logger.info(
      `✂️  Cropped ${path.basename(inputPath)} → ${path.basename(outputPath)}`
    );
    logger.info(
      `   📐 Crop area: ${config.x},${config.y} ${config.width}x${config.height}`
    );

    stepLogger.complete();
    return outputPath;
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Crop multiple images with the same configuration
 */
export const cropImages = async (
  inputPaths: string[],
  config: CropConfig,
  outputDir?: string
): Promise<string[]> => {
  const stepLogger = createStepLogger("Batch Image Cropping");
  const croppedPaths: string[] = [];

  try {
    stepLogger.start();

    if (!config.enabled) {
      logger.info("⏭️  Cropping disabled, returning original paths");
      return inputPaths;
    }

    logger.info(`✂️  Cropping ${inputPaths.length} images...`);

    for (const inputPath of inputPaths) {
      const dir = outputDir || path.dirname(inputPath);
      const basename = path.basename(inputPath, path.extname(inputPath));
      const extension = path.extname(inputPath);
      const outputPath = path.join(
        dir,
        `${basename}${config.outputSuffix || "-cropped"}${extension}`
      );

      const croppedPath = await cropImage(inputPath, outputPath, config);
      croppedPaths.push(croppedPath);
    }

    logger.success(
      `✅ Successfully cropped ${croppedPaths.length}/${inputPaths.length} images`
    );
    stepLogger.complete();

    return croppedPaths;
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Crop timeframe screenshots automatically
 */
export const cropTimeframeScreenshots = async (
  screenshotsDir: string = "screenshots",
  timeframes: string[] = ["5m", "15m", "1h", "2h", "6h"],
  config: CropConfig = DEFAULT_JUPITER_CROP
): Promise<string[]> => {
  const stepLogger = createStepLogger("Crop Timeframe Screenshots");
  const croppedPaths: string[] = [];

  try {
    stepLogger.start();

    if (!config.enabled) {
      logger.info("⏭️  Cropping disabled for timeframe screenshots");
      // Return original paths
      return timeframes.map((tf) =>
        path.join(screenshotsDir, `jupiter-${tf}.png`)
      );
    }

    logger.info(`🔄 Cropping timeframe screenshots in ${screenshotsDir}...`);

    for (const timeframe of timeframes) {
      const inputPath = path.join(screenshotsDir, `jupiter-${timeframe}.png`);

      if (!fs.existsSync(inputPath)) {
        logger.warn(`⚠️  Screenshot not found for ${timeframe}: ${inputPath}`);
        continue;
      }

      const basename = `jupiter-${timeframe}`;
      const outputPath = path.join(
        screenshotsDir,
        `${basename}${config.outputSuffix || "-cropped"}.png`
      );

      const croppedPath = await cropImage(inputPath, outputPath, config);
      croppedPaths.push(croppedPath);
    }

    logger.success(`✅ Cropped ${croppedPaths.length} timeframe screenshots`);
    stepLogger.complete();

    return croppedPaths;
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Test crop configuration by cropping a single image and showing result info
 */
export const testCropConfiguration = async (
  inputPath: string,
  config: CropConfig
): Promise<void> => {
  const stepLogger = createStepLogger("Test Crop Configuration");

  try {
    stepLogger.start();

    if (!fs.existsSync(inputPath)) {
      throw new Error(`Test image not found: ${inputPath}`);
    }

    // Get original image metadata
    const originalMetadata = await sharp(inputPath).metadata();
    const originalWidth = originalMetadata.width ?? 0;
    const originalHeight = originalMetadata.height ?? 0;
    logger.info(`📷 Original image: ${originalWidth}x${originalHeight}`);

    // Create test output path
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, path.extname(inputPath));
    const testOutputPath = path.join(dir, `${basename}-test-crop.png`);

    // Perform test crop
    const croppedPath = await cropImage(inputPath, testOutputPath, config);

    // Get cropped image metadata
    const croppedMetadata = await sharp(croppedPath).metadata();
    const croppedWidth = croppedMetadata.width ?? 0;
    const croppedHeight = croppedMetadata.height ?? 0;
    logger.info(`✂️  Cropped image: ${croppedWidth}x${croppedHeight}`);

    // Calculate reduction
    const originalSize = originalWidth * originalHeight;
    const croppedSize = croppedWidth * croppedHeight;
    const reduction =
      originalSize > 0
        ? (((originalSize - croppedSize) / originalSize) * 100).toFixed(1)
        : "0";

    logger.success(
      `🎯 Size reduction: ${reduction}% (${originalSize} → ${croppedSize} pixels)`
    );
    logger.info(`📁 Test output saved: ${testOutputPath}`);

    stepLogger.complete();
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
};

/**
 * Get crop configuration from preset name
 */
export const getCropPreset = (
  preset: keyof typeof CROP_PRESETS
): CropConfig => {
  return { ...CROP_PRESETS[preset] };
};

/**
 * Parse crop configuration from command line string
 * Format: "x,y,width,height" (e.g., "140,80,1200,700")
 */
export const parseCropConfig = (
  configString: string,
  outputSuffix: string = "-cropped"
): CropConfig => {
  const parts = configString.split(",").map((s) => parseInt(s.trim(), 10));

  if (parts.length !== 4 || parts.some(isNaN)) {
    throw new Error(
      `Invalid crop configuration: "${configString}". Expected format: "x,y,width,height"`
    );
  }

  const [x, y, width, height] = parts as [number, number, number, number];

  return {
    enabled: true,
    x,
    y,
    width,
    height,
    outputSuffix,
  };
};

/**
 * Create a custom crop configuration
 */
export const createCropConfig = (
  options: Partial<CropConfig> = {}
): CropConfig => ({
  enabled: true,
  x: 140,
  y: 80,
  width: 1200,
  height: 700,
  outputSuffix: "-cropped",
  ...options,
});
