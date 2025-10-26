# Vision AI Backtesting

This directory contains test chart images organized by expected trend classifications for backtesting the vision analysis accuracy.

## Directory Structure

```
backtest-data/
├── bullish/
│   ├── 5m_chart_001.png
│   ├── 15m_chart_002.png
│   ├── 1h_chart_003.png
│   └── ...
├── bearish/
│   ├── 5m_chart_004.png
│   ├── 15m_chart_005.png
│   └── ...
├── neutral/
│   ├── 5m_chart_006.png
│   └── ...
└── sideways/
    ├── 1h_chart_007.png
    └── ...
```

## Image Naming Convention

Images should be named with a timeframe prefix followed by any descriptive text:

- **Format**: `{timeframe}_{description}.{extension}`
- **Timeframes**: `5m`, `15m`, `1h`, `2h`, `6h`, etc.
- **Extensions**: `.png`, `.jpg`, `.jpeg`

### Examples:
- `5m_chart_001.png`
- `1h_bullish_setup.jpg`
- `15m_breakout_pattern.png`
- `2h_support_test.png`

## Trend Categories

### bullish/
Charts showing clear bullish/upward trends, breakouts, or bullish patterns.

### bearish/
Charts showing clear bearish/downward trends, breakdowns, or bearish patterns.

### neutral/
Charts showing consolidation, ranging markets, or unclear directional bias.

### sideways/
Charts showing horizontal/sideways movement, trading ranges, or choppy markets.

## Usage

Run backtests using the CLI tool:

```bash
# Basic backtest
npm run backtest-vision

# Custom test directory
npm run backtest-vision -- --test-data-dir my-test-images

# Quick test with limited images
npm run backtest-vision -- --max-images 10 --model openai/gpt-4o-mini

# Test specific trends and timeframes
npm run backtest-vision -- --trends bullish,bearish --timeframes 5m,1h

# Verbose output
npm run backtest-vision -- --verbose
```

## Results

Results are saved to `backtest-results/` directory:

- **JSON file**: Structured data for programmatic analysis
- **Text report**: Human-readable summary with:
  - Overall accuracy percentage
  - Per-category performance metrics
  - Per-timeframe breakdown
  - Confusion matrix
  - Cost and performance statistics

## Tips for Good Test Data

1. **Clear Examples**: Use charts with obvious trend characteristics
2. **Variety**: Include different chart patterns within each category
3. **Quality**: Use high-resolution screenshots with clear indicators
4. **Balance**: Try to have similar numbers of images across categories
5. **Timeframe Mix**: Include multiple timeframes to test consistency

## Expected Accuracy

Typical accuracy ranges based on chart clarity:
- **Very clear trends**: 85-95%
- **Moderate trends**: 70-85%
- **Subtle trends**: 60-75%
- **Mixed/noisy data**: 50-65%

Lower accuracy on neutral/sideways categories is normal as these are inherently more subjective.