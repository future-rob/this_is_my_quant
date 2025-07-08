import tradingViewState from "./TRADING_VIEW_STATE.json";
import { logger } from "../utils/logger";

/**
 * Chart configuration types
 */
export interface ChartSettings {
  layout: string;
  charts: ChartConfig[];
  symbolLock: number;
  intervalLock: number;
  trackTimeLock: number;
  dateRangeLock: number;
  crosshairLock: number;
  layoutsSizes: Record<string, any>;
}

export interface ChartConfig {
  panes: PaneConfig[];
  timeScale: TimeScaleConfig;
  chartProperties: ChartProperties;
  sessions: SessionConfig;
  version: number;
  timezone: string;
  shouldBeSavedEvenIfHidden: boolean;
  linkingGroup: null | string;
  lineToolsGroups: { groups: any[] };
  chartId: string;
}

export interface PaneConfig {
  sources: SourceConfig[];
  mainSourceId: string;
  stretchFactor: number;
  leftAxisesState: any[];
  rightAxisesState: any[];
  overlayPriceScales: Record<string, any>;
  priceScaleRatio: null | number;
  isCollapsed: boolean;
}

export interface SourceConfig {
  type: string;
  id: string;
  state?: any;
  zorder?: number;
  ownFirstValue?: any;
  metaInfo?: any;
}

export interface TimeScaleConfig {
  m_barSpacing: number;
  m_rightOffset: number;
  rightOffsetPercentage: number;
  usePercentageRightOffset: boolean;
}

export interface ChartProperties {
  paneProperties: PaneProperties;
  scalesProperties: ScalesProperties;
  chartEventsSourceProperties: any;
  tradingProperties: any;
  priceScaleSelectionStrategyName: string;
}

export interface PaneProperties {
  backgroundType: string;
  background: string;
  backgroundGradientStartColor: string;
  backgroundGradientEndColor: string;
  gridLinesMode: string;
  vertGridProperties: { color: string };
  horzGridProperties: { color: string };
  crossHairProperties: {
    color: string;
    style: number;
    transparency: number;
    width: number;
  };
  topMargin: number;
  bottomMargin: number;
  axisProperties: any;
  legendProperties: any;
  separatorColor: string;
}

export interface ScalesProperties {
  backgroundColor: string;
  lineColor: string;
  textColor: string;
  fontSize: number;
  scaleSeriesOnly: boolean;
  showSeriesLastValue: boolean;
  seriesLastValueMode: number;
  showSeriesPrevCloseValue: boolean;
  showStudyLastValue: boolean;
  showSymbolLabels: boolean;
  showStudyPlotLabels: boolean;
  showBidAskLabels: boolean;
  showPrePostMarketPriceLabel: boolean;
  showFundamentalNameLabel: boolean;
  showFundamentalLastValue: boolean;
  barSpacing: number;
  axisHighlightColor: string;
  axisLineToolLabelBackgroundColorCommon: string;
  axisLineToolLabelBackgroundColorActive: string;
  showPriceScaleCrosshairLabel: boolean;
  showTimeScaleCrosshairLabel: boolean;
  crosshairLabelBgColorLight: string;
  crosshairLabelBgColorDark: string;
}

export interface SessionConfig {
  properties: {
    graphics: {
      backgrounds: any;
      vertlines: any;
    };
  };
}

/**
 * Chart settings manager class
 */
export class ChartSettingsManager {
  private settings: ChartSettings;

  constructor() {
    this.settings = tradingViewState as ChartSettings;
    logger.info("📊 Chart settings loaded successfully");
  }

  /**
   * Get the full chart settings
   */
  getSettings(): ChartSettings {
    return this.settings;
  }

  /**
   * Get chart configuration by index
   */
  getChartConfig(index: number = 0): ChartConfig | null {
    if (this.settings.charts && this.settings.charts[index]) {
      return this.settings.charts[index];
    }
    logger.warn(`Chart configuration at index ${index} not found`);
    return null;
  }

  /**
   * Get main chart properties
   */
  getChartProperties(): ChartProperties | null {
    const chart = this.getChartConfig(0);
    return chart ? chart.chartProperties : null;
  }

  /**
   * Get pane properties (colors, styling)
   */
  getPaneProperties(): PaneProperties | null {
    const chartProperties = this.getChartProperties();
    return chartProperties ? chartProperties.paneProperties : null;
  }

  /**
   * Get scale properties
   */
  getScaleProperties(): ScalesProperties | null {
    const chartProperties = this.getChartProperties();
    return chartProperties ? chartProperties.scalesProperties : null;
  }

  /**
   * Get technical indicators from the first pane
   */
  getTechnicalIndicators(): SourceConfig[] {
    const chart = this.getChartConfig(0);
    if (!chart || !chart.panes || !chart.panes[0]) {
      return [];
    }

    return chart.panes[0].sources.filter(
      (source) => source.type === "Study" || source.type === "study_Volume"
    );
  }

  /**
   * Get color theme from pane properties
   */
  getColorTheme(): {
    background: string;
    textColor: string;
    gridColor: string;
    crosshairColor: string;
  } {
    const paneProps = this.getPaneProperties();
    const scaleProps = this.getScaleProperties();

    return {
      background: paneProps?.background || "#0b0e13",
      textColor: scaleProps?.textColor || "#B2B5BE",
      gridColor: paneProps?.vertGridProperties?.color || "#182430",
      crosshairColor: paneProps?.crossHairProperties?.color || "#9598A1",
    };
  }

  /**
   * Convert settings to localStorage format for TradingView
   */
  toLocalStorageFormat(): string {
    try {
      return JSON.stringify(this.settings);
    } catch (error) {
      logger.error("Failed to serialize chart settings", error as Error);
      return "{}";
    }
  }

  /**
   * Get settings as JavaScript injection code
   */
  toJavaScriptInjection(): string {
    const settingsJson = this.toLocalStorageFormat();
    return `
      // Inject chart settings into localStorage
      try {
        localStorage.setItem('tradingview.chartproperties', '${settingsJson.replace(
          /'/g,
          "\\'"
        )}');
        localStorage.setItem('tv_chart_layout', '${settingsJson.replace(
          /'/g,
          "\\'"
        )}');
        console.log('Chart settings injected successfully');
      } catch (e) {
        console.error('Failed to inject chart settings:', e);
      }
    `;
  }

  /**
   * Get specific indicator settings
   */
  getIndicatorSettings(indicatorType: string): SourceConfig | null {
    const indicators = this.getTechnicalIndicators();
    return (
      indicators.find(
        (indicator) =>
          indicator.metaInfo?.shortDescription === indicatorType ||
          indicator.metaInfo?.description === indicatorType
      ) || null
    );
  }

  /**
   * Summary of loaded configuration
   */
  getSummary(): {
    chartCount: number;
    indicatorCount: number;
    timezone: string;
    theme: string;
    layout: string;
  } {
    const indicators = this.getTechnicalIndicators();
    const chart = this.getChartConfig(0);
    const theme = this.getColorTheme();

    return {
      chartCount: this.settings.charts?.length || 0,
      indicatorCount: indicators.length,
      timezone: chart?.timezone || "Unknown",
      theme: theme.background === "#0b0e13" ? "Dark" : "Light",
      layout: this.settings.layout || "Unknown",
    };
  }

  /**
   * Get settings with a specific timeframe
   */
  getSettingsForTimeframe(timeframe: string): ChartSettings {
    const settings = JSON.parse(JSON.stringify(this.settings)) as ChartSettings;

    // Map timeframe to interval minutes
    const timeframeMap: Record<string, string> = {
      "5m": "5",
      "15m": "15",
      "1h": "60",
      "2h": "120",
      "6h": "360",
    };

    const interval = timeframeMap[timeframe] || timeframe;

    // Update interval in all charts
    if (settings.charts) {
      settings.charts.forEach((chart) => {
        if (chart.panes) {
          chart.panes.forEach((pane) => {
            if (pane.sources) {
              pane.sources.forEach((source) => {
                if (source.type === "MainSeries" && source.state) {
                  source.state.interval = interval;
                }
              });
            }
          });
        }
      });
    }

    return settings;
  }

  /**
   * Get localStorage format for a specific timeframe
   */
  toLocalStorageFormatForTimeframe(timeframe: string): string {
    const settings = this.getSettingsForTimeframe(timeframe);
    return JSON.stringify(settings, null, 0);
  }
}

// Export a singleton instance
export const chartSettings = new ChartSettingsManager();

// Export default settings
export default chartSettings;
