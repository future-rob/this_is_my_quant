/**
 * Configuration factory functions
 * This module provides centralized factory functions for creating configurations
 */

import {
  AI_MODELS,
  ModelKey,
  getCurrentEnvironmentConfig,
  getRecommendedModel,
  getOptimalConcurrency,
  VISION_ANALYSIS_DEFAULTS,
  BACKTEST_DEFAULTS,
  WEB_AUTOMATION_DEFAULTS,
  type EnvironmentType,
} from "./app-config";

import type {
  VisionAnalysisConfig,
  BacktestConfig,
} from "../features/vision-analysis";

import type { WebAutomationConfig } from "../features/web-automation";

/**
 * Configuration override options
 */
export interface ConfigOverrides {
  model?: ModelKey | string;
  maxTokens?: number;
  temperature?: number;
  concurrency?: number;
  verbose?: boolean;
  environment?: EnvironmentType;
}

/**
 * Create vision analysis configuration with smart defaults
 */
export const createVisionAnalysisConfig = (
  options: Partial<VisionAnalysisConfig> & ConfigOverrides = {}
): VisionAnalysisConfig => {
  const envConfig = getCurrentEnvironmentConfig();
  const modelKey = (options.model as ModelKey) || getRecommendedModel("vision");
  const modelConfig =
    AI_MODELS[modelKey] || AI_MODELS[getRecommendedModel("vision")];

  return {
    ...VISION_ANALYSIS_DEFAULTS,
    model: options.model || modelKey,
    maxTokens:
      options.maxTokens || Math.min(envConfig.maxTokens, modelConfig.maxTokens),
    temperature: options.temperature ?? envConfig.temperature,
    ...options,
  };
};

/**
 * Create backtest configuration with smart defaults
 */
export const createBacktestConfig = (
  options: Partial<BacktestConfig> & ConfigOverrides = {}
): BacktestConfig => {
  const envConfig = getCurrentEnvironmentConfig();
  const modelKey =
    (options.model as ModelKey) || getRecommendedModel("backtest");
  const modelConfig =
    AI_MODELS[modelKey] || AI_MODELS[getRecommendedModel("backtest")];

  return {
    ...BACKTEST_DEFAULTS,
    model: options.model || modelKey,
    maxTokens:
      options.maxTokens || Math.min(envConfig.maxTokens, modelConfig.maxTokens),
    temperature: options.temperature ?? envConfig.temperature,
    concurrency: options.concurrency || getOptimalConcurrency(modelKey),
    verbose: options.verbose ?? envConfig.verbose,
    ...options,
  };
};

/**
 * Create web automation configuration with smart defaults
 */
export const createWebAutomationConfig = (
  url?: string,
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
    url: url || WEB_AUTOMATION_DEFAULTS.url,
    screenshots: options.screenshots ?? WEB_AUTOMATION_DEFAULTS.screenshots,
    waitTime: options.waitTime ?? WEB_AUTOMATION_DEFAULTS.waitTimes.pageLoad,
    applyChartSettings:
      options.applyChartSettings ?? WEB_AUTOMATION_DEFAULTS.applyChartSettings,
    chartSettingsMethod:
      options.chartSettingsMethod ??
      WEB_AUTOMATION_DEFAULTS.chartSettingsMethod,
  };

  if (options.elementToWaitFor) {
    config.elementToWaitFor = options.elementToWaitFor;
  }

  return config;
};

/**
 * Create Jupiter Exchange automation configuration
 */
export const createJupiterAutomation = (
  overrides: Partial<WebAutomationConfig> = {}
): WebAutomationConfig => ({
  url: WEB_AUTOMATION_DEFAULTS.url,
  screenshots: true,
  waitTime: WEB_AUTOMATION_DEFAULTS.waitTimes.standard,
  elementToWaitFor: WEB_AUTOMATION_DEFAULTS.elementSelectors.trading,
  applyChartSettings: true,
  chartSettingsMethod: "jupiter",
  ...overrides,
});

/**
 * Create Jupiter automation with custom chart settings method
 */
export const createJupiterAutomationWithSettings = (
  method: "localStorage" | "javascript" | "direct" | "jupiter" = "jupiter",
  overrides: Partial<WebAutomationConfig> = {}
): WebAutomationConfig => ({
  url: WEB_AUTOMATION_DEFAULTS.url,
  screenshots: true,
  waitTime: WEB_AUTOMATION_DEFAULTS.waitTimes.extended,
  applyChartSettings: true,
  chartSettingsMethod: method,
  elementToWaitFor: WEB_AUTOMATION_DEFAULTS.elementSelectors.chart,
  ...overrides,
});

/**
 * Create configuration for specific use cases
 */
export const createUseCaseConfig = {
  /**
   * High-quality production analysis
   */
  production: (overrides: ConfigOverrides = {}) => ({
    vision: createVisionAnalysisConfig({
      model: "anthropic/claude-3.5-sonnet",
      maxTokens: 2000,
      temperature: 0.05,
      ...overrides,
    }),
    backtest: createBacktestConfig({
      model: "anthropic/claude-3.5-sonnet",
      maxTokens: 2000,
      temperature: 0.05,
      concurrency: 5,
      verbose: false,
      ...overrides,
    }),
  }),

  /**
   * Fast development and testing
   */
  development: (overrides: ConfigOverrides = {}) => ({
    vision: createVisionAnalysisConfig({
      model: "anthropic/claude-haiku-4.5",
      maxTokens: 1000,
      temperature: 0.1,
      ...overrides,
    }),
    backtest: createBacktestConfig({
      model: "anthropic/claude-haiku-4.5",
      maxTokens: 1000,
      temperature: 0.1,
      concurrency: 10,
      verbose: true,
      ...overrides,
    }),
  }),

  /**
   * Cost-effective analysis
   */
  costEffective: (overrides: ConfigOverrides = {}) => ({
    vision: createVisionAnalysisConfig({
      model: "openai/gpt-4o-mini",
      maxTokens: 1000,
      temperature: 0.1,
      ...overrides,
    }),
    backtest: createBacktestConfig({
      model: "openai/gpt-4o-mini",
      maxTokens: 1000,
      temperature: 0.1,
      concurrency: 15,
      verbose: false,
      ...overrides,
    }),
  }),

  /**
   * Vision-optimized analysis
   */
  visionOptimized: (overrides: ConfigOverrides = {}) => ({
    vision: createVisionAnalysisConfig({
      model: "openai/gpt-4o",
      maxTokens: 1500,
      temperature: 0.05,
      detail: "high",
      ...overrides,
    }),
    backtest: createBacktestConfig({
      model: "openai/gpt-4o",
      maxTokens: 1500,
      temperature: 0.05,
      concurrency: 8,
      verbose: true,
      ...overrides,
    }),
  }),
};

/**
 * Quick configuration presets
 */
export const CONFIG_PRESETS = {
  FAST_DEV: createUseCaseConfig.development(),
  PRODUCTION: createUseCaseConfig.production(),
  COST_EFFECTIVE: createUseCaseConfig.costEffective(),
  VISION_FOCUSED: createUseCaseConfig.visionOptimized(),
} as const;

/**
 * Helper to get configuration by preset name
 */
export const getConfigPreset = (presetName: keyof typeof CONFIG_PRESETS) => {
  return CONFIG_PRESETS[presetName];
};

/**
 * Environment-aware configuration factory
 */
export const createEnvironmentConfig = () => {
  const env = (process.env.NODE_ENV as EnvironmentType) || "development";

  switch (env) {
    case "production":
      return CONFIG_PRESETS.PRODUCTION;
    case "testing":
      return CONFIG_PRESETS.COST_EFFECTIVE;
    default:
      return CONFIG_PRESETS.FAST_DEV;
  }
};
