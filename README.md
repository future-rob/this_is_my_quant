# Jupiter Exchange AI Trading Analysis Tool

A comprehensive automation tool that captures Jupiter Exchange chart screenshots across multiple timeframes and uses OpenAI's vision models to perform advanced technical analysis for cryptocurrency perpetual futures trading.

## 🚀 Features

### Chart Capture

- **Multi-timeframe Screenshots**: Automatically captures charts for 5m, 15m, 1h, 2h, 6h timeframes
- **Custom Chart Settings**: Applies predefined TradingView settings with technical indicators
- **Automated Browser Control**: Uses Playwright for reliable chart capture
- **Jupiter Exchange Integration**: Specifically designed for Jupiter Exchange perpetual futures

### Vision AI Analysis

- **OpenAI Vision Models**: Uses GPT-4o/GPT-4o-mini for chart analysis
- **Multi-timeframe Context**: Analyzes charts across different timeframes for comprehensive view
- **Technical Analysis**: Identifies trends, support/resistance, volume, Bollinger Bands, momentum
- **Trading Decisions**: Provides actionable trading recommendations with entry/exit points
- **Risk Management**: Includes stop-loss, take-profit, and risk/reward calculations

## 📋 Prerequisites

### Required

- **Node.js** >= 18.0.0
- **OpenAI API Key** with vision model access
- **Internet connection** for Jupiter Exchange access

### Environment Setup

```bash
# Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"
```

## 🛠 Installation

```bash
# Clone the repository
git clone <repository-url>
cd this_is_my_quant

# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers
```

## 🎯 Usage

### Step 1: Capture Chart Screenshots

Capture screenshots across multiple timeframes (runs in headless mode by default):

```bash
# Capture all default timeframes (5m, 15m, 1h, 2h, 6h) - headless mode
npm run start -- --multi-timeframe

# Show browser window while capturing (for debugging)
npm run start -- --multi-timeframe --headed

# Capture specific timeframes
npm run start -- --multi-timeframe --timeframes 5m,15m,1h

# Capture with custom wait time
npm run start -- --multi-timeframe --wait 8000
```

### Step 2: Analyze Charts with AI

Analyze the captured screenshots using OpenAI vision models:

```bash
# Analyze all captured timeframes
npm run start-vision-ai

# Analyze specific timeframes
npm run start-vision-ai -- --timeframes 5m,1h

# Use a cheaper model for faster analysis
npm run start-vision-ai -- --model gpt-4o-mini

# Use low detail for cost savings
npm run start-vision-ai -- --detail low
```

### Step 3: Automated Trading Analysis (New!)

**🤖 Auto Trader - Continuous Analysis Every 13 Minutes**

```bash
# Run automated analysis every 13 minutes
npm run auto-trader

# Run with custom interval (15 minutes)
npm run auto-trader -- --interval 15

# Run with custom timeframes
npm run auto-trader -- --timeframes 5m,1h,6h

# Run with cheaper AI model
npm run auto-trader -- --model gpt-4o-mini

# Run single cycle and exit
npm run auto-trader -- --once

# Show help
npm run auto-trader -- --help
```

The auto-trader automatically:

1. 📸 Captures charts for all specified timeframes
2. 🤖 Runs AI vision analysis on the screenshots
3. 💾 Saves analysis results to `analysis-results/` directory
4. ⏰ Waits 13 minutes (or custom interval)
5. 🔄 Repeats the process continuously

**Stop the auto-trader**: Press `Ctrl+C`

**🔊 Sound Effects**: The system now plays different sounds for each trading action:

- 🚀 **LONG**: High-pitched success sound (Glass on macOS)
- 📉 **SHORT**: Alert/warning sound (Sosumi on macOS)
- ⏸️ **HOLD**: Neutral sound (Tink on macOS)

Sound effects can be controlled with:

```bash
# Disable sound effects
npm run auto-trader -- --no-sound
npm run start-vision-ai -- --no-sound

# Adjust volume (0.0-1.0)
npm run auto-trader -- --sound-volume 0.3
npm run start-vision-ai -- --sound-volume 0.3

# Test sound effects
npm run test-sounds
```

## 🔧 Configuration Options

### Chart Capture Options

```bash
--url <url>                 # Target URL (default: Jupiter Exchange)
--headed                    # Show browser window (default: headless mode)
--headless                  # Force headless mode (default: true)
--slowmo <ms>               # Add delay between actions
--wait <ms>                 # Wait time after page load
--method <method>           # Chart settings injection method
--multi-timeframe           # Enable multi-timeframe capture
--timeframes <list>         # Comma-separated timeframes
```

### Vision AI Options

```bash
--model <model>             # OpenAI model (gpt-4o, gpt-4o-mini, gpt-4-turbo)
--detail <level>            # Analysis detail (low, high, auto)
--timeframes <list>         # Timeframes to analyze
--screenshots-dir <dir>     # Screenshot directory
--max-tokens <number>       # Max tokens per API call
--temperature <number>      # Response randomness (0.0-1.0)
--output-dir <dir>          # Directory to save analysis results
--save-json                 # Save analysis as JSON file
--save-text                 # Save analysis as text report
--no-save                   # Disable saving files (display only)
--sound-effects             # Enable sound effects (default: enabled)
--no-sound                  # Disable sound effects
--sound-volume <0.0-1.0>    # Sound volume level (default: 0.7)
```

## 📊 Analysis Output

The vision AI analysis provides:

### Individual Timeframe Analysis

- **Trend Direction**: bullish/bearish/neutral/sideways
- **Strength Score**: 1-10 scale
- **Key Levels**: Support and resistance prices
- **Technical Indicators**: Volume, Bollinger Bands, momentum
- **Trading Signals**: Specific entry/exit signals
- **Confidence Score**: AI confidence in analysis

### Multi-timeframe Trading Decision

- **Action**: long/short/hold/close recommendation
- **Entry Price**: Suggested entry point
- **Stop Loss**: Risk management level
- **Take Profit**: Profit target
- **Risk/Reward Ratio**: Expected return vs risk
- **Market Structure**: Overall market phase analysis
- **Warnings**: Important risk factors

### Comprehensive Final Analysis

- **Executive Summary**: High-level market assessment
- **Market Overview**: Detailed market context and current situation
- **Quantitative Metrics**: Signal counts, confidence scores, timeframe alignment
- **Risk Assessment**: Risk level classification and mitigation strategies
- **Strategic Recommendations**: Primary/alternative strategies with position sizing
- **Next Steps**: Actionable follow-up tasks

### Final Trading Verdict ← **NEW!**

The system now provides a definitive executive decision using **OpenAI Function Calling** for guaranteed structured output:

- **Action**: HOLD, LONG, or SHORT (clear directive)
- **Confidence**: 1-100% certainty in the decision
- **Position Size**: 1-100% of portfolio to risk
- **Time Horizon**: Short (intraday), Medium (days), Long (weeks)
- **Risk Level**: LOW, MEDIUM, or HIGH classification
- **Key Reason**: Single sentence explaining the decision
- **Execution Details**: Entry, stop loss, take profit levels
- **Critical Warnings**: Key risks that could invalidate the decision

**Key Benefits of Function Calling:**

- ✅ **Guaranteed Structure**: No JSON parsing errors
- ✅ **Type Safety**: Model must respond with exact schema
- ✅ **Programmatic Use**: Clean data for trading bots
- ✅ **Reliability**: Eliminates parsing failures

### File Output

Analysis results are automatically saved to files for review and tracking:

**JSON Format** (`analysis-YYYY-MM-DDTHH-MM-SS.json`):

- Structured data with all analysis results
- Programmatically accessible for further processing
- Includes metadata and timestamps

**Text Report** (`analysis-YYYY-MM-DDTHH-MM-SS.txt`):

- Human-readable formatted report
- Complete analysis summary
- Perfect for printing or sharing

## 💡 Example Workflow

### Complete Analysis Workflow

```bash
# 1. Capture charts for all timeframes (headless mode)
npm run start -- --multi-timeframe

# 2. Analyze charts with AI (now includes final verdict)
npm run start-vision-ai

# 3. Get definitive trading action
# The system now provides a clear HOLD/LONG/SHORT decision with confidence %

# 4. Review analysis files
# Files saved to: analysis-results/analysis-YYYY-MM-DDTHH-MM-SS.json
# Files saved to: analysis-results/analysis-YYYY-MM-DDTHH-MM-SS.txt
```

### Quick Analysis (Specific Timeframes)

```bash
# 1. Capture key timeframes only
npm run start -- --multi-timeframe --timeframes 15m,1h,2h

# 2. Analyze with cost-optimized settings
npm run start-vision-ai -- --timeframes 15m,1h,2h --model gpt-4o-mini --detail low

# 3. Access structured data programmatically
# JSON file contains clean, type-safe trading verdict for automated systems
```

### File Management Options

```bash
# Save to custom directory
npm run start-vision-ai -- --output-dir trading-reports

# Display only (no file saving)
npm run start-vision-ai -- --no-save

# Save only JSON (no text report)
npm run start-vision-ai -- --no-save --save-json
```

### Final Verdict Output Example

```
⚡ FINAL TRADING VERDICT
==========================================
🎯 ACTION: LONG
📊 CONFIDENCE: 87%
💰 POSITION SIZE: 15% of portfolio
⏱️  TIME HORIZON: MEDIUM
⚠️  RISK LEVEL: MEDIUM

💡 KEY REASON: Strong bullish confluence across 1h-6h timeframes with volume confirmation.

📋 EXECUTION DETAILS:
   Entry: $45,200
   Stop Loss: $43,800
   Take Profit: $48,500

🚀 EXECUTE: LONG 15% (87% confidence)
==========================================
```

### Structured JSON Output

For programmatic use, the system returns clean, type-safe JSON:

```json
{
  "action": "LONG",
  "confidence": 87,
  "positionSize": 15,
  "timeHorizon": "medium",
  "riskLevel": "MEDIUM",
  "keyReason": "Strong bullish confluence across 1h-6h timeframes with volume confirmation.",
  "entryPrice": 45200,
  "stopLoss": 43800,
  "takeProfit": 48500,
  "criticalWarnings": [
    "Watch for breakdown below $44,000 support",
    "High volatility during US market hours"
  ]
}
```

This structured output can be directly consumed by:

- **Trading Bots**: Automated execution systems
- **Portfolio Managers**: Position sizing algorithms
- **Risk Systems**: Automated risk management
- **Dashboards**: Real-time trading displays

## 📁 Project Structure

```
src/
├── config/
│   ├── chart-settings.ts          # Chart configuration management
│   └── TRADING_VIEW_STATE.json    # TradingView settings
├── features/
│   ├── web-automation.ts          # Chart capture automation
│   └── vision-analysis.ts         # AI vision analysis
├── utils/
│   ├── browser.ts                 # Playwright browser utilities
│   └── logger.ts                  # Logging system
├── components/
│   └── page-actions.ts            # Page interaction utilities
├── index.ts                       # Main chart capture CLI
└── vision-ai.ts                   # Vision AI analysis CLI

Generated Files:
├── screenshots/                   # Chart screenshots
├── analysis-results/              # Analysis reports (JSON + text)
└── dist/                          # Compiled JavaScript
```

## 🔍 Technical Details

### Chart Settings

- **Indicators**: Volume, Bollinger Bands, Stochastic RSI
- **Theme**: Dark theme optimized for analysis
- **Timeframe Control**: Automatic switching via localStorage injection
- **Jupiter Integration**: Specific localStorage keys for Jupiter Exchange

### AI Analysis

- **Vision Models**: GPT-4o for high accuracy, GPT-4o-mini for cost efficiency
- **Prompt Engineering**: Specialized prompts for financial chart analysis
- **Multi-pass Analysis**: Individual timeframe analysis → trading decision → comprehensive synthesis → final verdict
- **Function Calling**: Structured output using OpenAI function calling for reliable data
- **Text-based Final Analysis**: Cost-effective comprehensive analysis using text-only tokens
- **Executive Decision**: Final AI call that provides definitive trading action
- **Error Handling**: Robust error handling with retry logic

## 📈 Cost Optimization

### Vision API Costs

- **gpt-4o**: Higher accuracy, ~$0.01-0.03 per image
- **gpt-4o-mini**: Cost-effective, ~$0.003-0.01 per image
- **Detail Level**: Use "low" for 85 tokens vs "high" for variable tokens
- **Timeframe Selection**: Analyze fewer timeframes to reduce costs

### Recommendations

- Use `gpt-4o-mini` for development and testing
- Use `detail: low` for quick analysis
- Analyze 2-3 key timeframes instead of all 5 for cost savings

## ⚠️ Important Notes

### Trading Disclaimer

- **Not Financial Advice**: This tool provides technical analysis only
- **Risk Management**: Always use proper position sizing and risk management
- **Market Conditions**: AI analysis may not account for news or market events
- **Backtesting**: Test strategies thoroughly before live trading

### Technical Limitations

- **Image Quality**: Requires clear, unobstructed chart screenshots
- **API Limits**: Subject to OpenAI rate limits and costs
- **Browser Dependency**: Requires stable internet connection
- **Market Hours**: Works best during active trading hours

## 🐛 Troubleshooting

### Common Issues

**No screenshots captured:**

```bash
# Check browser access and internet connection
npm run start -- --help
```

**OpenAI API errors:**

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Check API quota and limits
npm run start-vision-ai -- --model gpt-4o-mini
```

**Chart settings not applying:**

```bash
# Try different injection method
npm run start -- --method jupiter
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:

- Check the troubleshooting section
- Review the command help: `npm run start -- --help`
- Check OpenAI API documentation for vision model details
