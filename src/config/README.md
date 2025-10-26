# Configuration System

This directory contains the centralized configuration system for the quantitative trading application. The configuration system makes it easy to switch between different AI models, adjust token limits, and manage different environment settings.

## Overview

The configuration system is organized into several modules:

- **`app-config.ts`** - Core configuration constants, model definitions, and utility functions
- **`config-factory.ts`** - Factory functions for creating different types of configurations
- **`index.ts`** - Main exports and convenience functions
- **`examples.ts`** - Usage examples and patterns

## Quick Start

```typescript
import { 
  createVisionAnalysisConfig, 
  createBacktestConfig,
  CONFIG_PRESETS 
} from './config';

// Use a preset
const configs = CONFIG_PRESETS.FAST_DEV;

// Or create custom configs
const visionConfig = createVisionAnalysisConfig({
  model: 'anthropic/claude-3.5-sonnet',
  maxTokens: 2000,
  temperature: 0.05,
});

const backtestConfig = createBacktestConfig({
  model: 'openai/gpt-4o-mini',
  concurrency: 15,
  verbose: true,
});
```

## Available Models

The system supports multiple AI models with different cost and performance characteristics:

### Anthropic Models
- **Claude 3.5 Sonnet** - High quality analysis, complex reasoning (recommended for production)
- **Claude Haiku 4.5** - Fast, cost-effective analysis (recommended for development)
- **Claude 3 Haiku** - Legacy fast analysis

### OpenAI Models  
- **GPT-4 Omni** - Vision analysis, multi-modal tasks (recommended for vision)
- **GPT-4 Omni Mini** - Cost-effective vision analysis
- **GPT-4 Turbo** - Legacy high-quality analysis

## Configuration Presets

Ready-to-use configuration presets:

- **`FAST_DEV`** - Fast development with Claude Haiku
- **`PRODUCTION`** - High-quality production with Claude Sonnet
- **`COST_EFFECTIVE`** - Budget-friendly with GPT-4o Mini
- **`VISION_FOCUSED`** - Optimized for vision analysis with GPT-4o

## Environment-Based Configuration

The system automatically adapts to your environment:

- **Development** - Fast models, verbose logging, lower concurrency
- **Production** - High-quality models, minimal logging, optimized concurrency  
- **Testing** - Cost-effective models, limited tokens, reduced concurrency

Set your environment with `NODE_ENV`:
```bash
NODE_ENV=production npm run analyze
```

## Common Usage Patterns

### 1. Easy Model Switching

```typescript
// Development: Fast and cheap
const devConfig = createVisionAnalysisConfig({
  model: 'anthropic/claude-haiku-4.5'
});

// Production: High quality
const prodConfig = createVisionAnalysisConfig({
  model: 'anthropic/claude-3.5-sonnet'
});

// Vision-focused: Best for image analysis
const visionConfig = createVisionAnalysisConfig({
  model: 'openai/gpt-4o'
});
```

### 2. Token Management

```typescript
// Light analysis
const lightConfig = createBacktestConfig({ maxTokens: 500 });

// Standard analysis  
const standardConfig = createBacktestConfig({ maxTokens: 1000 });

// Deep analysis
const deepConfig = createBacktestConfig({ maxTokens: 2500 });
```

### 3. Budget Control

```typescript
import { calculateEstimatedCost, getOptimalConcurrency } from './config';

// Check cost before running
const cost = calculateEstimatedCost('anthropic/claude-3.5-sonnet', 1000, 500);
console.log(`Estimated cost: $${cost.toFixed(4)}`);

// Get optimal concurrency for cost control
const concurrency = getOptimalConcurrency('anthropic/claude-3.5-sonnet');
```

### 4. Feature-Specific Configs

```typescript
// Quick 5-minute analysis
const quickConfig = createVisionAnalysisConfig({
  timeframes: ['5m', '15m'],
  maxTokens: 800,
});

// Comprehensive multi-timeframe analysis
const deepConfig = createVisionAnalysisConfig({
  timeframes: ['5m', '15m', '1h', '2h', '6h', '12h', '1d'],
  maxTokens: 2500,
});
```

## Migration from Old System

The old configuration functions have been moved from individual feature files to this centralized system:

### Before
```typescript
// Old way - scattered across files
import { createVisionAnalysisConfig } from './features/vision-analysis';
import { createBacktestConfig } from './features/vision-analysis';
import { createJupiterAutomation } from './features/web-automation';
```

### After
```typescript
// New way - centralized
import { 
  createVisionAnalysisConfig,
  createBacktestConfig,
  createJupiterAutomation 
} from './config';
```

## Customization

You can easily extend the configuration system:

### Adding New Models

```typescript
// In app-config.ts
export const AI_MODELS = {
  // ... existing models
  "new/model": {
    name: "New Model",
    provider: "new",
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.005,
    maxTokens: 4096,
    contextWindow: 100000,
    recommended: false,
    useCase: "Special purpose analysis"
  }
} as const;
```

### Creating Custom Presets

```typescript
// In config-factory.ts
export const CUSTOM_PRESETS = {
  MY_PRESET: {
    vision: createVisionAnalysisConfig({
      model: 'my/preferred-model',
      maxTokens: 1500,
      temperature: 0.08,
    }),
    backtest: createBacktestConfig({
      model: 'my/preferred-model',
      concurrency: 12,
    }),
  }
} as const;
```

## Best Practices

1. **Use presets for common scenarios** - Start with `CONFIG_PRESETS` before creating custom configs
2. **Consider cost vs quality tradeoffs** - Use `calculateEstimatedCost()` to estimate expenses
3. **Leverage environment-based configs** - Let the system adapt to your deployment environment
4. **Set appropriate concurrency** - Use `getOptimalConcurrency()` to avoid rate limits
5. **Monitor token usage** - Set reasonable `maxTokens` limits to control costs

## Examples

See `examples.ts` for comprehensive usage examples and patterns.