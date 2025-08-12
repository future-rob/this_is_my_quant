import { logger } from "../utils/logger.js";
import { createStepLogger } from "../utils/logger.js";

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  relevanceScore?: number;
  category?: 'market' | 'regulation' | 'technology' | 'adoption' | 'defi' | 'institutional';
}

export interface NewsAnalysis {
  timestamp: string;
  totalArticles: number;
  significantNews: NewsItem[];
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number; // -1 to 1
  marketImpactLevel: 'low' | 'medium' | 'high';
  keyTopics: string[];
  summary: string;
}

export interface NewsConfig {
  cryptoCompareApiKey?: string;
  newsApiKey?: string;
  enableMultipleSources: boolean;
  maxArticles: number;
  hoursLookback: number;
  minRelevanceScore: number;
}

const DEFAULT_NEWS_CONFIG: NewsConfig = {
  enableMultipleSources: true,
  maxArticles: 50,
  hoursLookback: 24,
  minRelevanceScore: 0.6,
};

/**
 * Crypto news keywords for filtering relevant articles
 */
const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'cryptocurrency', 'crypto', 'blockchain', 'ethereum', 'eth',
  'defi', 'nft', 'altcoin', 'mining', 'wallet', 'exchange', 'trading',
  'market cap', 'price', 'rally', 'dump', 'bull', 'bear', 'hodl'
];

const SIGNIFICANT_KEYWORDS = [
  'regulation', 'ban', 'approval', 'etf', 'institutional', 'adoption',
  'major', 'breaking', 'emergency', 'crash', 'surge', 'all-time high',
  'ath', 'federal reserve', 'fed', 'sec', 'cftc', 'treasury'
];

/**
 * Fetch news from CryptoCompare API (free tier available)
 */
async function fetchCryptoCompareNews(config: NewsConfig): Promise<NewsItem[]> {
  const stepLogger = createStepLogger("CryptoCompare News");
  
  try {
    stepLogger.start();
    
    // CryptoCompare has a free tier without API key for basic requests
    const baseUrl = 'https://min-api.cryptocompare.com/data/v2/news/';
    const params = new URLSearchParams({
      lang: 'EN',
      sortOrder: 'latest',
      categories: 'BTC,ETH,Market,Regulation,Technology',
      ...(config.cryptoCompareApiKey && { api_key: config.cryptoCompareApiKey })
    });

    const response = await fetch(`${baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`CryptoCompare API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.Data || !Array.isArray(data.Data)) {
      throw new Error('Invalid response format from CryptoCompare');
    }

    const newsItems: NewsItem[] = data.Data.slice(0, config.maxArticles).map((item: any) => ({
      title: item.title,
      description: item.body,
      url: item.url,
      publishedAt: new Date(item.published_on * 1000).toISOString(),
      source: `CryptoCompare - ${item.source_info?.name || 'Unknown'}`,
      category: mapCryptoCompareCategory(item.categories)
    }));

    stepLogger.complete();
    logger.info(`📰 Fetched ${newsItems.length} articles from CryptoCompare`);
    
    return newsItems;
  } catch (error) {
    stepLogger.error(error as Error);
    logger.warn("⚠️ CryptoCompare news fetch failed, continuing with other sources");
    return [];
  }
}

/**
 * Fetch news from NewsAPI (requires API key)
 */
async function fetchNewsApiCrypto(config: NewsConfig): Promise<NewsItem[]> {
  const stepLogger = createStepLogger("NewsAPI Crypto");
  
  if (!config.newsApiKey) {
    logger.info("📰 NewsAPI key not provided, skipping NewsAPI source");
    return [];
  }

  try {
    stepLogger.start();
    
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - config.hoursLookback);
    
    const params = new URLSearchParams({
      q: 'bitcoin OR cryptocurrency OR crypto OR blockchain OR BTC',
      language: 'en',
      sortBy: 'publishedAt',
      from: yesterday.toISOString(),
      apiKey: config.newsApiKey,
      pageSize: config.maxArticles.toString()
    });

    const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
    
    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.articles || !Array.isArray(data.articles)) {
      throw new Error('Invalid response format from NewsAPI');
    }

    const newsItems: NewsItem[] = data.articles.map((item: any) => ({
      title: item.title,
      description: item.description || '',
      url: item.url,
      publishedAt: item.publishedAt,
      source: `NewsAPI - ${item.source?.name || 'Unknown'}`,
      category: categorizeNews(item.title + ' ' + (item.description || ''))
    }));

    stepLogger.complete();
    logger.info(`📰 Fetched ${newsItems.length} articles from NewsAPI`);
    
    return newsItems;
  } catch (error) {
    stepLogger.error(error as Error);
    logger.warn("⚠️ NewsAPI fetch failed, continuing with other sources");
    return [];
  }
}

/**
 * Fetch news from CoinTelegraph RSS (free)
 */
async function fetchCoinTelegraphNews(config: NewsConfig): Promise<NewsItem[]> {
  const stepLogger = createStepLogger("CoinTelegraph RSS");
  
  try {
    stepLogger.start();
    
    // Using a simple RSS to JSON service (free)
    const rssUrl = 'https://cointelegraph.com/rss';
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=${config.maxArticles}`);
    
    if (!response.ok) {
      throw new Error(`RSS fetch error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid RSS response format');
    }

    const newsItems: NewsItem[] = data.items.map((item: any) => ({
      title: item.title,
      description: item.description?.replace(/<[^>]*>/g, '') || '', // Strip HTML
      url: item.link,
      publishedAt: item.pubDate,
      source: 'CoinTelegraph',
      category: categorizeNews(item.title + ' ' + (item.description || ''))
    }));

    stepLogger.complete();
    logger.info(`📰 Fetched ${newsItems.length} articles from CoinTelegraph`);
    
    return newsItems;
  } catch (error) {
    stepLogger.error(error as Error);
    logger.warn("⚠️ CoinTelegraph RSS fetch failed, continuing with other sources");
    return [];
  }
}

/**
 * Calculate relevance score for crypto/BTC news
 */
function calculateRelevanceScore(newsItem: NewsItem): number {
  const text = (newsItem.title + ' ' + newsItem.description).toLowerCase();
  
  let score = 0;
  
  // Primary crypto keywords
  CRYPTO_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) {
      score += keyword === 'bitcoin' || keyword === 'btc' ? 0.3 : 0.1;
    }
  });
  
  // Significant event keywords
  SIGNIFICANT_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 0.2;
    }
  });
  
  // Recent articles get higher scores
  const hoursAgo = (Date.now() - new Date(newsItem.publishedAt).getTime()) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, (24 - hoursAgo) / 24) * 0.2;
  score += recencyBonus;
  
  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Analyze sentiment of news content
 */
function analyzeSentiment(newsItem: NewsItem): { sentiment: 'bullish' | 'bearish' | 'neutral', score: number } {
  const text = (newsItem.title + ' ' + newsItem.description).toLowerCase();
  
  const bullishWords = [
    'surge', 'rally', 'bull', 'rise', 'increase', 'gain', 'high', 'record',
    'adoption', 'approval', 'positive', 'growth', 'breakthrough', 'milestone',
    'institutional', 'investment', 'buy', 'bullish', 'moon', 'pump'
  ];
  
  const bearishWords = [
    'crash', 'dump', 'bear', 'fall', 'decline', 'drop', 'low', 'concern',
    'ban', 'regulation', 'negative', 'fear', 'sell', 'bearish', 'correction',
    'warning', 'risk', 'uncertainty', 'volatility', 'panic'
  ];
  
  let bullishScore = 0;
  let bearishScore = 0;
  
  bullishWords.forEach(word => {
    if (text.includes(word)) bullishScore++;
  });
  
  bearishWords.forEach(word => {
    if (text.includes(word)) bearishScore++;
  });
  
  const totalScore = bullishScore + bearishScore;
  if (totalScore === 0) return { sentiment: 'neutral', score: 0 };
  
  const netScore = (bullishScore - bearishScore) / totalScore;
  
  if (netScore > 0.2) return { sentiment: 'bullish', score: netScore };
  if (netScore < -0.2) return { sentiment: 'bearish', score: netScore };
  return { sentiment: 'neutral', score: netScore };
}

/**
 * Categorize news article
 */
function categorizeNews(text: string): NewsItem['category'] {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('regulation') || lowerText.includes('sec') || lowerText.includes('ban')) {
    return 'regulation';
  }
  if (lowerText.includes('defi') || lowerText.includes('decentralized')) {
    return 'defi';
  }
  if (lowerText.includes('institutional') || lowerText.includes('company') || lowerText.includes('corporation')) {
    return 'institutional';
  }
  if (lowerText.includes('blockchain') || lowerText.includes('technology')) {
    return 'technology';
  }
  if (lowerText.includes('adoption') || lowerText.includes('payment') || lowerText.includes('merchant')) {
    return 'adoption';
  }
  
  return 'market';
}

/**
 * Map CryptoCompare categories
 */
function mapCryptoCompareCategory(categories: string): NewsItem['category'] {
  if (!categories) return 'market';
  
  const cat = categories.toLowerCase();
  if (cat.includes('regulation')) return 'regulation';
  if (cat.includes('technology')) return 'technology';
  if (cat.includes('market')) return 'market';
  
  return 'market';
}

/**
 * Main function to fetch and analyze crypto news
 */
export async function fetchAndAnalyzeCryptoNews(config: Partial<NewsConfig> = {}): Promise<NewsAnalysis> {
  const fullConfig = { ...DEFAULT_NEWS_CONFIG, ...config };
  const stepLogger = createStepLogger("Crypto News Analysis");
  
  try {
    stepLogger.start();
    logger.info("📰 Starting comprehensive crypto news analysis...");
    
    // Fetch from multiple sources in parallel
    const [cryptoCompareNews, newsApiNews, coinTelegraphNews] = await Promise.all([
      fetchCryptoCompareNews(fullConfig),
      fullConfig.enableMultipleSources ? fetchNewsApiCrypto(fullConfig) : Promise.resolve([]),
      fullConfig.enableMultipleSources ? fetchCoinTelegraphNews(fullConfig) : Promise.resolve([])
    ]);
    
    // Combine and deduplicate news
    const allNews = [...cryptoCompareNews, ...newsApiNews, ...coinTelegraphNews];
    const uniqueNews = Array.from(
      new Map(allNews.map(item => [item.url, item])).values()
    );
    
    // Filter by time and add relevance scores
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - fullConfig.hoursLookback);
    
    const processedNews = uniqueNews
      .filter(item => new Date(item.publishedAt) > cutoffTime)
      .map(item => {
        const relevanceScore = calculateRelevanceScore(item);
        const sentimentAnalysis = analyzeSentiment(item);
        
        return {
          ...item,
          relevanceScore,
          sentiment: sentimentAnalysis.sentiment
        };
      })
      .filter(item => (item.relevanceScore || 0) >= fullConfig.minRelevanceScore)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // Extract significant news (top relevance scores)
    const significantNews = processedNews.slice(0, 10);
    
    // Calculate overall sentiment
    const sentimentScores = processedNews.map(item => {
      const sentimentAnalysis = analyzeSentiment(item);
      return sentimentAnalysis.score;
    });
    
    const averageSentiment = sentimentScores.length > 0 
      ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length 
      : 0;
    
    let overallSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (averageSentiment > 0.1) overallSentiment = 'bullish';
    else if (averageSentiment < -0.1) overallSentiment = 'bearish';
    
    // Determine market impact level
    const highImpactCount = significantNews.filter(item => 
      item.title.toLowerCase().includes('breaking') ||
      item.title.toLowerCase().includes('major') ||
      (item.relevanceScore || 0) > 0.8
    ).length;
    
    let marketImpactLevel: 'low' | 'medium' | 'high' = 'low';
    if (highImpactCount >= 3) marketImpactLevel = 'high';
    else if (highImpactCount >= 1) marketImpactLevel = 'medium';
    
    // Extract key topics
    const keyTopics = extractKeyTopics(significantNews);
    
    // Generate summary
    const summary = generateNewsSummary(significantNews, overallSentiment, marketImpactLevel);
    
    const analysis: NewsAnalysis = {
      timestamp: new Date().toISOString(),
      totalArticles: processedNews.length,
      significantNews,
      overallSentiment,
      sentimentScore: averageSentiment,
      marketImpactLevel,
      keyTopics,
      summary
    };
    
    stepLogger.complete();
    logger.info(`📊 News analysis complete: ${processedNews.length} articles, ${overallSentiment} sentiment`);
    
    return analysis;
    
  } catch (error) {
    stepLogger.error(error as Error);
    throw error;
  }
}

/**
 * Extract key topics from news articles
 */
function extractKeyTopics(news: NewsItem[]): string[] {
  const topicCount: Record<string, number> = {};
  
  news.forEach(item => {
    const text = (item.title + ' ' + item.description).toLowerCase();
    
    // Check for specific topics
    const topics = [
      'bitcoin', 'ethereum', 'defi', 'nft', 'regulation', 'etf', 
      'institutional', 'mining', 'stablecoin', 'altcoin', 'trading'
    ];
    
    topics.forEach(topic => {
      if (text.includes(topic)) {
        topicCount[topic] = (topicCount[topic] || 0) + 1;
      }
    });
  });
  
  return Object.entries(topicCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);
}

/**
 * Generate a summary of the news analysis
 */
function generateNewsSummary(
  significantNews: NewsItem[], 
  sentiment: 'bullish' | 'bearish' | 'neutral',
  impactLevel: 'low' | 'medium' | 'high'
): string {
  const topHeadlines = significantNews.slice(0, 3).map(item => item.title);
  
  let summary = `Market sentiment appears ${sentiment} based on ${significantNews.length} significant news items. `;
  summary += `Impact level assessed as ${impactLevel}. `;
  
  if (topHeadlines.length > 0) {
    summary += `Key headlines include: ${topHeadlines.join('; ')}. `;
  }
  
  const regulationNews = significantNews.filter(item => item.category === 'regulation');
  const institutionalNews = significantNews.filter(item => item.category === 'institutional');
  
  if (regulationNews.length > 0) {
    summary += `${regulationNews.length} regulatory development(s) detected. `;
  }
  
  if (institutionalNews.length > 0) {
    summary += `${institutionalNews.length} institutional news item(s) found. `;
  }
  
  return summary.trim();
}

/**
 * Log news analysis results
 */
export function logNewsAnalysis(analysis: NewsAnalysis): void {
  logger.info("📰 CRYPTO NEWS ANALYSIS");
  logger.info("=".repeat(50));
  
  const sentimentEmoji = analysis.overallSentiment === 'bullish' ? '📈' : 
                         analysis.overallSentiment === 'bearish' ? '📉' : '➡️';
  
  const impactEmoji = analysis.marketImpactLevel === 'high' ? '🔴' :
                      analysis.marketImpactLevel === 'medium' ? '🟡' : '🟢';
  
  logger.info(`${sentimentEmoji} Overall Sentiment: ${analysis.overallSentiment.toUpperCase()} (${(analysis.sentimentScore * 100).toFixed(1)}%)`);
  logger.info(`${impactEmoji} Market Impact: ${analysis.marketImpactLevel.toUpperCase()}`);
  logger.info(`📊 Articles Analyzed: ${analysis.totalArticles}`);
  logger.info(`🎯 Significant News: ${analysis.significantNews.length}`);
  
  if (analysis.keyTopics.length > 0) {
    logger.info(`🔍 Key Topics: ${analysis.keyTopics.join(', ')}`);
  }
  
  logger.info(`💭 Summary: ${analysis.summary}`);
  
  if (analysis.significantNews.length > 0) {
    logger.info("");
    logger.info("🔥 TOP SIGNIFICANT NEWS:");
    analysis.significantNews.slice(0, 5).forEach((item, index) => {
      const relevancePercent = ((item.relevanceScore || 0) * 100).toFixed(0);
      const sentimentIcon = item.sentiment === 'bullish' ? '📈' : 
                           item.sentiment === 'bearish' ? '📉' : '➡️';
      
      logger.info(`${index + 1}. ${sentimentIcon} [${relevancePercent}%] ${item.title}`);
      logger.info(`   Source: ${item.source} | Category: ${item.category || 'market'}`);
      if (item.description && item.description.length > 0) {
        const truncatedDesc = item.description.length > 100 
          ? item.description.substring(0, 100) + '...'
          : item.description;
        logger.info(`   ${truncatedDesc}`);
      }
      logger.info(`   URL: ${item.url}`);
      logger.info("");
    });
  }
  
  logger.info("=".repeat(50));
}