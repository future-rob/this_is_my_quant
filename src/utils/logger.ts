/**
 * Modern logging utility with different log levels and formatting
 */

export type LogLevel = "info" | "success" | "warn" | "error" | "debug";

interface LogConfig {
  level: LogLevel;
  emoji: string;
  color?: string;
}

const LOG_CONFIGS: Record<LogLevel, LogConfig> = {
  info: { level: "info", emoji: "🔵" },
  success: { level: "success", emoji: "✅" },
  warn: { level: "warn", emoji: "⚠️" },
  error: { level: "error", emoji: "❌" },
  debug: { level: "debug", emoji: "🐛" },
};

const formatMessage = (level: LogLevel, message: string): string => {
  const config = LOG_CONFIGS[level];
  const timestamp = new Date().toISOString().slice(11, 19);
  return `${config.emoji} [${timestamp}] ${message}`;
};

export const logger = {
  info: (message: string) => console.log(formatMessage("info", message)),
  success: (message: string) => console.log(formatMessage("success", message)),
  warn: (message: string) => console.warn(formatMessage("warn", message)),
  error: (message: string, error?: Error) => {
    console.error(formatMessage("error", message));
    if (error) console.error(error);
  },
  debug: (message: string) => console.debug(formatMessage("debug", message)),
};

export const createStepLogger = (stepName: string) => ({
  start: () => logger.info(`🚀 Starting ${stepName}...`),
  complete: () => logger.success(`✨ Completed ${stepName}`),
  error: (error: Error) => logger.error(`Failed ${stepName}`, error),
});
