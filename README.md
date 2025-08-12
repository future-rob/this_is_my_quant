# Jupiter Exchange AI Trading Analysis Tool

A comprehensive automation tool that captures Jupiter Exchange chart screenshots across multiple timeframes and uses OpenAI's vision models to perform advanced technical analysis for cryptocurrency perpetual futures trading. **NEW: Now includes real-time crypto news analysis for enhanced trading decisions!**

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

### 🆕 Crypto News Analysis

- **Real-time News Fetching**: Automatically gathers crypto/BTC news from multiple sources
- **Sentiment Analysis**: Analyzes news sentiment (bullish/bearish/neutral) with scoring
- **Market Impact Assessment**: Determines if news events have low/medium/high market impact
- **News Source Integration**: 
  - CryptoCompare API (free tier available)
  - NewsAPI.org (requires API key for enhanced coverage)
  - CoinTelegraph RSS feed (free)
- **Smart Filtering**: Filters and scores news by relevance to crypto/BTC
- **Trading Integration**: News sentiment and impact directly influence trading decisions

## 📋 Prerequisites

### Required

- **Node.js** >= 18.0.0
- **OpenAI API Key** with vision model access
- **Internet connection** for Jupiter Exchange access

### Optional (Enhanced Features)

- **NewsAPI.org API Key**: For additional news sources (free tier available)
- **CryptoCompare API Key**: For enhanced news access and more data

### Environment Setup

```bash
# Set your OpenAI API key (required)
export OPENAI_API_KEY="your-api-key-here"

# Optional: Set news API keys for enhanced news coverage
export NEWS_API_KEY="your-newsapi-key"
export CRYPTO_COMPARE_API_KEY="your-cryptocompare-key"
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

### Step 2: Analyze Charts with AI (Now with News!)

Analyze the captured screenshots using OpenAI vision models with integrated news analysis:

```bash
# Analyze all captured timeframes (news analysis enabled by default)
npm run start-vision-ai

# Analyze specific timeframes
npm run start-vision-ai -- --timeframes 5m,1h

# Use a cheaper model for faster analysis
npm run start-vision-ai -- --model gpt-4o-mini

# Disable news analysis if you want chart-only analysis
npm run start-vision-ai -- --no-news

# Provide news API keys for enhanced news coverage
npm run start-vision-ai -- --news-api-key your-key --crypto-compare-api-key your-key
```

### Step 3: Automated Trading Analysis (Enhanced with News!)

**🤖 Auto Trader - Continuous Analysis Every 13 Minutes (Now with News Integration)**

```bash
# Run automated analysis every 13 minutes (includes news analysis)
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
2. 📰 **NEW**: Fetches and analyzes crypto news from multiple sources
3. 🤖 Runs AI vision analysis on the screenshots with news context
4. 💾 Saves analysis results to `analysis-results/` directory
5. ⏰ Waits 13 minutes (or custom interval)
6. 🔄 Repeats the process continuously

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
--wait <ms>                 # Wait time after page load (default: 5000)
--timeframes <list>         # Comma-separated timeframes (default: 5m,15m,1h,2h,6h)
--headed                    # Show browser window (default: headless)
--headless                  # Force headless mode
--slowmo <ms>               # Add delay between actions for debugging
--crop-screenshots          # Crop screenshots to chart area only
--crop-preset <preset>      # Use predefined crop settings (jupiter, binance, etc.)
--crop-config <config>      # Custom crop configuration (x,y,width,height)
```

### Vision AI Analysis Options

```bash
--model <model>             # OpenAI model (default: gpt-4o, options: gpt-4o-mini, gpt-4-turbo)
--detail <level>            # Image detail level (default: high, options: low, high, auto)
--timeframes <list>         # Specific timeframes to analyze
--screenshots-dir <dir>     # Screenshot directory (default: screenshots)
--max-tokens <number>       # Max tokens per API call (default: 1000)
--temperature <number>      # Response randomness 0.0-1.0 (default: 0.1)
--output-dir <dir>          # Output directory (default: analysis-results)
--save-json                 # Save JSON analysis (default: enabled)
--save-text                 # Save text report (default: enabled)
--no-save                   # Display only, don't save files
--sound-effects             # Enable sound effects (default: enabled)
--no-sound                  # Disable sound effects
--sound-volume <0.0-1.0>    # Sound volume (default: 0.7)
```

### 🆕 News Analysis Options

```bash
--include-news              # Enable news analysis (default: enabled)
--no-news                   # Disable news analysis
--news-api-key <key>        # NewsAPI.org API key for additional sources
--crypto-compare-api-key <key> # CryptoCompare API key for enhanced access
```

### Auto Trader Options

```bash
--interval <minutes>        # Analysis interval in minutes (default: 13)
--timeframes <list>         # Timeframes to capture and analyze
--model <model>             # OpenAI model for analysis
--chart-capture-args <args> # Additional chart capture arguments
--vision-ai-args <args>     # Additional vision AI arguments
--max-retries <number>      # Max retry attempts (default: 3)
--retry-delay <ms>          # Delay between retries (default: 5000)
--once                      # Run single cycle and exit
--continuous                # Run continuously (default behavior)
```

## 📊 Enhanced Analysis Output

The system now provides comprehensive analysis including:

### Technical Analysis
- Multi-timeframe chart analysis
- Support/resistance levels
- Technical indicators (RSI, MACD, Volume, etc.)
- Market structure assessment

### 🆕 News Analysis
- Overall market sentiment (bullish/bearish/neutral)
- Market impact level (low/medium/high)
- Significant news events with relevance scoring
- Key topic identification
- News-driven risk assessment

### Trading Decision
- Definitive action (LONG/SHORT/HOLD)
- Confidence percentage
- Position sizing recommendations
- Entry/exit points with risk management
- **NEW**: News impact consideration in decision-making

## 📁 Project Structure

```
src/
├── config/
│   ├── chart-settings.ts          # Chart configuration management
│   └── TRADING_VIEW_STATE.json    # TradingView settings
├── features/
│   ├── web-automation.ts          # Chart capture automation
│   ├── vision-analysis.ts         # AI vision analysis
│   └── news-analysis.ts           # 🆕 Crypto news analysis
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
- **Multi-timeframe Synthesis**: Combines insights across different time horizons
- **Risk Management**: ATR-based stops, confidence-based position sizing

### 🆕 News Integration

- **Multiple Sources**: CryptoCompare, NewsAPI, CoinTelegraph RSS
- **Smart Filtering**: Relevance scoring based on crypto/BTC keywords
- **Sentiment Analysis**: Keyword-based sentiment classification
- **Impact Assessment**: Determines market significance of news events
- **Trading Integration**: News sentiment influences final trading decisions

## 🆕 News API Configuration

### CryptoCompare (Recommended)
- **Free Tier**: 250 requests/month without API key
- **Paid Tiers**: Higher limits with API key
- **Coverage**: Comprehensive crypto news with good categorization

### NewsAPI.org
- **Free Tier**: 1000 requests/month
- **Coverage**: General news sources with crypto filtering
- **Setup**: Register at https://newsapi.org

### CoinTelegraph RSS
- **Free**: No API key required
- **Coverage**: Latest crypto news from CoinTelegraph
- **Limitations**: Limited to recent articles

## 📈 Sample Analysis Output

```
⚡ FINAL TRADING VERDICT
==========================================
🚀 ACTION: LONG
📊 Confidence: 87%
💰 Position Size: 15% of portfolio
⏱️  TIME HORIZON: MEDIUM
⚠️  RISK LEVEL: MEDIUM

💡 KEY REASON: Strong bullish confluence across 1h-6h timeframes with positive news sentiment supporting the move.

📰 NEWS IMPACT:
   Sentiment: BULLISH (73.2%)
   Impact Level: HIGH
   Significant Events:
     • Major institutional Bitcoin acquisition announced
     • Regulatory clarity improves market outlook

📋 EXECUTION DETAILS:
   Entry: $45,200
   Stop Loss: $43,800
   Take Profit: $48,500

🚀 EXECUTE: LONG 15% (87% confidence)
==========================================
```

## 🚨 Important Notes

- **News Analysis**: Enabled by default but can be disabled with `--no-news`
- **API Keys**: News API keys are optional but provide enhanced coverage
- **Rate Limits**: Be mindful of API rate limits for news sources
- **Cost Optimization**: Use `gpt-4o-mini` for cost-effective analysis
- **Internet Required**: Both chart capture and news analysis require internet access

## 🔐 Security & Privacy

- API keys are only stored in environment variables, never in code
- News sources are accessed directly, no data is stored permanently
- All analysis results are saved locally

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for:
- Additional news sources
- Enhanced sentiment analysis algorithms
- New technical indicators
- Trading strategy improvements

## 📄 License

MIT License - see LICENSE file for details.
