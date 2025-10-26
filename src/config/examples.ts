/**
 * Configuration Usage Examples
 * This file demonstrates how to use the new centralized configuration system
 */

import {
  // Core configuration
  AI_MODELS,
  MODEL_PRESETS,
  getRecommendedModel,
  calculateEstimatedCost,
  getCurrentEnvironmentConfig,
  
  // Factory functions
  createVisionAnalysisConfig,
  createBacktestConfig,
  createJupiterAutomation,
  
  // Presets
  CONFIG_PRESETS,
  getConfigPreset,
  createEnvironmentConfig,
  
  // Use case configurations
  createUseCaseConfig,
} from '../config';

/**
 * BASIC USAGE EXAMPLES
 */

// 1. Using default configurations (environment-aware)
const defaultConfigs = createEnvironmentConfig();
console.log('Default configs:', defaultConfigs);

// 2. Using presets
const productionConfig = getConfigPreset('PRODUCTION');
console.log('Production config:', productionConfig);

// 3. Creating custom configurations
const customVisionConfig = createVisionAnalysisConfig({
  model: 'anthropic/claude-3.5-sonnet',
  maxTokens: 2000,
  temperature: 0.05,
  timeframes: ['5m', '15m', '1h'],
});

const customBacktestConfig = createBacktestConfig({
  model: 'openai/gpt-4o-mini',
  maxTokens: 1500,
  concurrency: 15,
  verbose: true,
});

/**
 * ADVANCED USAGE EXAMPLES
 */

// 1. Model selection and cost estimation
const bestModelForVision = getRecommendedModel('vision');
const bestModelForBacktest = getRecommendedModel('backtest');

const estimatedCost = calculateEstimatedCost(
  'anthropic/claude-3.5-sonnet',
  1000, // input tokens
  500   // output tokens
);
console.log(`Estimated cost: $${estimatedCost.toFixed(4)}`);

// 2. Environment-specific configurations
const envConfig = getCurrentEnvironmentConfig();
console.log('Current environment config:', envConfig);

// 3. Use case-specific configurations
const developmentConfigs = createUseCaseConfig.development({
  maxTokens: 800, // Override default
  verbose: true,
});

const costEffectiveConfigs = createUseCaseConfig.costEffective({
  concurrency: 20, // Override for faster processing
});

/**
 * SWITCHING MODELS AND TOKENS EASILY
 */

// Easy model switching
const models = {
  FAST: 'anthropic/claude-haiku-4.5',
  QUALITY: 'anthropic/claude-3.5-sonnet',
  VISION: 'openai/gpt-4o',
  CHEAP: 'openai/gpt-4o-mini',
} as const;

// Create configs with different models
const configs = {
  fast: createVisionAnalysisConfig({ model: models.FAST }),
  quality: createVisionAnalysisConfig({ model: models.QUALITY }),
  vision: createVisionAnalysisConfig({ model: models.VISION }),
  cheap: createVisionAnalysisConfig({ model: models.CHEAP }),
};

// Easy token adjustment
const tokenConfigs = {
  light: createBacktestConfig({ maxTokens: 500 }),
  medium: createBacktestConfig({ maxTokens: 1000 }),
  heavy: createBacktestConfig({ maxTokens: 2000 }),
};

/**
 * PRACTICAL USAGE PATTERNS
 */

// Pattern 1: Development vs Production
export const createDevConfig = () => ({
  vision: createVisionAnalysisConfig({
    model: 'anthropic/claude-haiku-4.5',
    maxTokens: 1000,
    verbose: true,
  }),
  backtest: createBacktestConfig({
    model: 'anthropic/claude-haiku-4.5',
    maxTokens: 800,
    concurrency: 15,
    verbose: true,
  }),
});

export const createProdConfig = () => ({
  vision: createVisionAnalysisConfig({
    model: 'anthropic/claude-3.5-sonnet',
    maxTokens: 2000,
    temperature: 0.05,
    verbose: false,
  }),
  backtest: createBacktestConfig({
    model: 'anthropic/claude-3.5-sonnet',
    maxTokens: 1500,
    concurrency: 8,
    verbose: false,
  }),
});

// Pattern 2: Budget-conscious configurations
export const createBudgetConfig = (budget: 'low' | 'medium' | 'high') => {
  const modelMap = {
    low: 'openai/gpt-4o-mini',
    medium: 'anthropic/claude-haiku-4.5',
    high: 'anthropic/claude-3.5-sonnet',
  } as const;

  const tokenMap = {
    low: 500,
    medium: 1000,
    high: 2000,
  };

  return {
    vision: createVisionAnalysisConfig({
      model: modelMap[budget],
      maxTokens: tokenMap[budget],
    }),
    backtest: createBacktestConfig({
      model: modelMap[budget],
      maxTokens: tokenMap[budget],
    }),
  };
};

// Pattern 3: Feature-specific configurations
export const createFeatureConfigs = () => ({
  quickAnalysis: createVisionAnalysisConfig({
    model: 'anthropic/claude-haiku-4.5',
    timeframes: ['5m', '15m'],
    maxTokens: 800,
  }),
  
  deepAnalysis: createVisionAnalysisConfig({
    model: 'anthropic/claude-3.5-sonnet',
    timeframes: ['5m', '15m', '1h', '2h', '6h', '12h', '1d'],
    maxTokens: 2500,
    temperature: 0.02,
  }),
  
  visionFocused: createVisionAnalysisConfig({
    model: 'openai/gpt-4o',
    detail: 'high',
    maxTokens: 1500,
  }),
  
  massBacktest: createBacktestConfig({
    model: 'openai/gpt-4o-mini',
    concurrency: 25,
    maxTokens: 600,
    verbose: false,
  }),
});

/**
 * DYNAMIC CONFIGURATION EXAMPLES
 */

// Based on environment variables
export const createDynamicConfig = () => {
  const budget = process.env.AI_BUDGET as 'low' | 'medium' | 'high' | undefined;
  const preferVision = process.env.PREFER_VISION === 'true';
  const maxConcurrency = parseInt(process.env.MAX_CONCURRENCY || '10');

  if (preferVision) {
    return createVisionAnalysisConfig({
      model: 'openai/gpt-4o',
      detail: 'high',
    });
  }

  if (budget) {
    return createBudgetConfig(budget);
  }

  return createEnvironmentConfig();
};