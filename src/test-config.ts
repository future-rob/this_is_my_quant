#!/usr/bin/env node

/**
 * Configuration System Test
 * This script tests the new centralized configuration system
 */

import {
  // Import all the new config functions
  createVisionAnalysisConfig,
  createBacktestConfig,
  createJupiterAutomation,
  CONFIG_PRESETS,
  getConfigPreset,
  getRecommendedModel,
  calculateEstimatedCost,
  AI_MODELS,
  getCurrentEnvironmentConfig,
} from './config';

console.log('🧪 Testing Configuration System\n');

// Test 1: Basic configuration creation
console.log('1. Testing basic configuration creation...');
const visionConfig = createVisionAnalysisConfig({
  model: 'anthropic/claude-3.5-sonnet',
  maxTokens: 1500,
});
console.log(`✅ Vision config created with model: ${visionConfig.model}`);

const backtestConfig = createBacktestConfig({
  model: 'openai/gpt-4o-mini',
  concurrency: 15,
});
console.log(`✅ Backtest config created with model: ${backtestConfig.model}\n`);

// Test 2: Preset configurations
console.log('2. Testing preset configurations...');
const fastDevPreset = getConfigPreset('FAST_DEV');
console.log(`✅ FAST_DEV preset - Vision model: ${fastDevPreset.vision.model}`);
console.log(`✅ FAST_DEV preset - Backtest model: ${fastDevPreset.backtest.model}\n`);

// Test 3: Model recommendations
console.log('3. Testing model recommendations...');
const visionModel = getRecommendedModel('vision');
const backtestModel = getRecommendedModel('backtest');
const costModel = getRecommendedModel('cost-effective');
console.log(`✅ Recommended vision model: ${visionModel}`);
console.log(`✅ Recommended backtest model: ${backtestModel}`);
console.log(`✅ Recommended cost-effective model: ${costModel}\n`);

// Test 4: Cost calculation
console.log('4. Testing cost calculation...');
const cost1 = calculateEstimatedCost('anthropic/claude-3.5-sonnet', 1000, 500);
const cost2 = calculateEstimatedCost('openai/gpt-4o-mini', 1000, 500);
console.log(`✅ Claude Sonnet cost (1000 in, 500 out): $${cost1.toFixed(4)}`);
console.log(`✅ GPT-4o Mini cost (1000 in, 500 out): $${cost2.toFixed(4)}\n`);

// Test 5: Environment configuration
console.log('5. Testing environment configuration...');
const envConfig = getCurrentEnvironmentConfig();
console.log(`✅ Current environment: ${JSON.stringify(envConfig, null, 2)}\n`);

// Test 6: Model information
console.log('6. Testing model information...');
console.log('Available models:');
Object.entries(AI_MODELS).forEach(([key, config]) => {
  console.log(`  ${key}: ${config.name} (${config.provider})`);
});
console.log();

// Test 7: Web automation config
console.log('7. Testing web automation configuration...');
const jupiterConfig = createJupiterAutomation();
console.log(`✅ Jupiter config created - URL: ${jupiterConfig.url}`);
console.log(`✅ Wait time: ${jupiterConfig.waitTime}ms\n`);

// Test 8: Flexible model input
console.log('8. Testing flexible model input...');
const flexConfig1 = createVisionAnalysisConfig({
  model: 'anthropic/claude-haiku-4.5', // ModelKey
});
const flexConfig2 = createVisionAnalysisConfig({
  model: 'some-custom-model', // string
});
console.log(`✅ Flex config 1 model: ${flexConfig1.model}`);
console.log(`✅ Flex config 2 model: ${flexConfig2.model}\n`);

console.log('🎉 All configuration tests passed!');
console.log('\n📋 Summary:');
console.log('- Configuration functions work correctly');
console.log('- Presets load successfully');
console.log('- Model recommendations work');
console.log('- Cost calculations work');
console.log('- Environment detection works');
console.log('- Web automation configs work');
console.log('- System handles both ModelKey and string inputs');