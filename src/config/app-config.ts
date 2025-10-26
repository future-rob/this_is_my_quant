/**
 * Centralized application configuration
 * This module manages all default settings and allows easy switching of models, tokens, and other parameters
 */

import { url } from "inspector";

/**
 * Available AI models with their specifications
 */
export const AI_MODELS = {
  // Anthropic Models
  "anthropic/claude-3.5-sonnet": {
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    maxTokens: 8192,
    contextWindow: 200000,
    recommended: true,
    useCase: "High-quality analysis, complex reasoning",
  },
  "anthropic/claude-haiku-4.5": {
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    maxTokens: 4096,
    contextWindow: 200000,
    recommended: false,
    useCase: "Fast, cost-effective analysis",
  },
  "anthropic/claude-3-haiku": {
    name: "Claude 3 Haiku",
    provider: "anthropic",
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    maxTokens: 4096,
    contextWindow: 200000,
    recommended: false,
    useCase: "Legacy fast analysis",
  },
  // OpenAI Models
  "openai/gpt-4o": {
    name: "GPT-4 Omni",
    provider: "openai",
    inputCostPer1k: 0.0025,
    outputCostPer1k: 0.01,
    maxTokens: 4096,
    contextWindow: 128000,
    recommended: true,
    useCase: "Vision analysis, multi-modal tasks",
  },
  "openai/gpt-4o-mini": {
    name: "GPT-4 Omni Mini",
    provider: "openai",
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    maxTokens: 16384,
    contextWindow: 128000,
    recommended: false,
    useCase: "Cost-effective vision analysis",
  },
  "openai/gpt-4-turbo": {
    name: "GPT-4 Turbo",
    provider: "openai",
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
    maxTokens: 4096,
    contextWindow: 128000,
    recommended: false,
    useCase: "Legacy high-quality analysis",
  },
} as const;

/**
 * Available tokens for trading and analysis
 */
export const AVAILABLE_TOKENS = {
  "BTC/USDC": {
    name: "Bitcoin",
    url: "https://jup.ag/tokens/3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
  },
  "SOL/USDC": {
    name: "Solana",
    url: "https://jup.ag/tokens/So11111111111111111111111111111111111111112",
  },
  "ETH/USDC": {
    name: "Ethereum",
    url: "https://jup.ag/tokens/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  },
  "BNB/USDC": {
    name: "Binance Coin",
    url: "https://jup.ag/tokens/9gP2kCy3wA1ctvYWQk75guqXuHfrEomqydHLtcTCqiLa",
  },
  "2Z/USDC": {
    name: "2Z",
    url: "https://jup.ag/tokens/J6pQQ3FAcJQeWPPGppWRb4nM8jU3wLyYbRrLh7feMfvd",
  },
  "Grr/USDC": {
    name: "Grr",
    url: "https://jup.ag/tokens/DUhWgHD3KgHHmsYdQdJHDv359bySNzigYcqJ45Gcpump",
  },
  "HYPE/USDC": {
    name: "HYPE",
    url: "https://jup.ag/tokens/98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g",
  },
  "BONK/USDC": {
    name: "BONK",
    url: "https://jup.ag/tokens/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  },
  "AIxbit/USDC": {
    name: "AIxbit",
    url: "https://jup.ag/tokens/14zP2ToQ79XWvc7FQpm4bRnp9d6Mp1rFfsUW3gpLcRX",
  },
};
export type ModelKey = keyof typeof AI_MODELS;

/**
 * Model presets for different use cases
 */
export const MODEL_PRESETS = {
  PRODUCTION: "anthropic/claude-haiku-4.5" as ModelKey,
  DEVELOPMENT: "anthropic/claude-haiku-4.5" as ModelKey,
  VISION_ANALYSIS: "anthropic/claude-haiku-4.5" as ModelKey,
  COST_EFFECTIVE: "anthropic/claude-haiku-4.5" as ModelKey,
  BACKTEST: "anthropic/claude-haiku-4.5" as ModelKey,
} as const;

/**
 * Environment-based configuration
 */
export const ENVIRONMENT_CONFIG = {
  development: {
    defaultModel: MODEL_PRESETS.DEVELOPMENT,
    maxTokens: 1000,
    temperature: 0.1,
    verbose: true,
    concurrency: 5,
  },
  production: {
    defaultModel: MODEL_PRESETS.PRODUCTION,
    maxTokens: 2000,
    temperature: 0.05,
    verbose: false,
    concurrency: 10,
  },
  testing: {
    defaultModel: MODEL_PRESETS.COST_EFFECTIVE,
    maxTokens: 500,
    temperature: 0.1,
    verbose: true,
    concurrency: 3,
  },
} as const;

/**
 * Get current environment configuration
 */
export const getCurrentEnvironmentConfig = () => {
  const env =
    (process.env.NODE_ENV as keyof typeof ENVIRONMENT_CONFIG) || "development";
  return ENVIRONMENT_CONFIG[env] || ENVIRONMENT_CONFIG.development;
};

/**
 * Default timeframes for analysis
 */
export const DEFAULT_TIMEFRAMES = ["5m", "15m", "1h", "2h", "6h"];

/**
 * Vision analysis configuration defaults
 */
export const VISION_ANALYSIS_DEFAULTS = {
  screenshotsDir: "screenshots",
  timeframes: DEFAULT_TIMEFRAMES,
  detail: "high" as const,
  outputDir: "analysis-results",
  saveJson: true,
  saveText: true,
  soundEffects: true,
  soundVolume: 0.7,
  injectPrice: true,
};

/**
 * Backtest configuration defaults
 */
export const BACKTEST_DEFAULTS = {
  testDataDir: "backtest-data",
  detail: "high" as const,
  outputDir: "backtest-results",
  saveResults: true,
  verbose: false,
  progressInterval: 5,
};

/**
 * Web automation configuration defaults
 */
export const WEB_AUTOMATION_DEFAULTS = {
  url: AVAILABLE_TOKENS["HYPE/USDC"].url,
  screenshots: true,
  applyChartSettings: true,
  chartSettingsMethod: "jupiter" as const,
  elementSelectors: {
    trading:
      '[data-testid="trading-view"], .trading-interface, main, [class*="trading"], [class*="perp"]',
    chart:
      '[data-testid="trading-view"], .trading-interface, main, .chart-container, [class*="trading"]',
  },
  waitTimes: {
    standard: 20000,
    extended: 25000,
    pageLoad: 8000,
    screenshot: 5000,
  },
};

/**
 * Get model configuration by key
 */
export const getModelConfig = (modelKey: ModelKey) => {
  return AI_MODELS[modelKey];
};

/**
 * Get recommended model for specific use case
 */
export const getRecommendedModel = (
  useCase: "vision" | "backtest" | "analysis" | "cost-effective"
): ModelKey => {
  switch (useCase) {
    case "vision":
      return MODEL_PRESETS.VISION_ANALYSIS;
    case "backtest":
      return MODEL_PRESETS.BACKTEST;
    case "analysis":
      return MODEL_PRESETS.PRODUCTION;
    case "cost-effective":
      return MODEL_PRESETS.COST_EFFECTIVE;
    default:
      return getCurrentEnvironmentConfig().defaultModel;
  }
};

/**
 * Calculate estimated cost for a model and token usage
 */
export const calculateEstimatedCost = (
  modelKey: ModelKey,
  inputTokens: number,
  outputTokens: number
): number => {
  const model = getModelConfig(modelKey);
  return (
    (inputTokens * model.inputCostPer1k) / 1000 +
    (outputTokens * model.outputCostPer1k) / 1000
  );
};

/**
 * Get optimal concurrency for a model (based on rate limits and cost)
 */
export const getOptimalConcurrency = (modelKey: ModelKey): number => {
  const model = getModelConfig(modelKey);
  const envConfig = getCurrentEnvironmentConfig();

  // Reduce concurrency for expensive models to control costs
  if (model.outputCostPer1k > 0.01) {
    return Math.max(1, Math.floor(envConfig.concurrency / 2));
  }

  return envConfig.concurrency;
};

/**
 * Validate model key
 */
export const isValidModelKey = (key: string): key is ModelKey => {
  return key in AI_MODELS;
};

/**
 * Get all available models grouped by provider
 */
export const getModelsByProvider = () => {
  const providers: Record<string, ModelKey[]> = {};

  Object.entries(AI_MODELS).forEach(([key, config]) => {
    if (!providers[config.provider]) {
      providers[config.provider] = [];
    }
    providers[config.provider]!.push(key as ModelKey);
  });

  return providers;
};

/**
 * Export types for external use
 */
export type EnvironmentType = keyof typeof ENVIRONMENT_CONFIG;
export type ModelPreset = keyof typeof MODEL_PRESETS;
