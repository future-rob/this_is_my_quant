/**
 * Configuration module exports
 * Centralized access to all configuration utilities
 */

// Core configuration
export * from "./app-config";
export * from "./config-factory";

// Re-export commonly used functions for convenience
export {
  createVisionAnalysisConfig,
  createBacktestConfig,
  createWebAutomationConfig,
  createJupiterAutomation,
  createJupiterAutomationWithSettings,
  CONFIG_PRESETS,
  getConfigPreset,
  createEnvironmentConfig,
} from "./config-factory";

export {
  AI_MODELS,
  MODEL_PRESETS,
  getModelConfig,
  getRecommendedModel,
  calculateEstimatedCost,
  getOptimalConcurrency,
  getCurrentEnvironmentConfig,
} from "./app-config";

// Default export for easy importing
export { createEnvironmentConfig as default } from "./config-factory";
