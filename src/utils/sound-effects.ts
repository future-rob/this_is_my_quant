import playSound from "play-sound";
import { logger } from "./logger";
import { spawn } from "child_process";
import { existsSync } from "fs";

const player = playSound({});

/**
 * Trading action types that trigger sound effects
 */
export type TradingAction = "LONG" | "SHORT" | "HOLD";

/**
 * Sound effect configuration
 */
interface SoundConfig {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  fallbackToSystemBeep: boolean;
}

const DEFAULT_SOUND_CONFIG: SoundConfig = {
  enabled: true,
  volume: 0.7,
  fallbackToSystemBeep: true,
};

/**
 * Sound file paths for different actions
 */
const SOUND_FILES = {
  LONG: "assets/sounds/long.wav",
  SHORT: "assets/sounds/short.wav",
  HOLD: "assets/sounds/hold.wav",
};

/**
 * System sounds for different platforms
 */
const SYSTEM_SOUNDS = {
  darwin: {
    // macOS
    LONG: "Glass", // Positive/success sound
    SHORT: "Sosumi", // Alert/warning sound
    HOLD: "Tink", // Neutral sound
  },
  linux: {
    LONG: "dialog-information",
    SHORT: "dialog-warning",
    HOLD: "dialog-question",
  },
  win32: {
    // Windows
    LONG: "SystemAsterisk",
    SHORT: "SystemExclamation",
    HOLD: "SystemQuestion",
  },
};

/**
 * Generate a simple beep tone programmatically
 */
function generateBeep(frequency: number, duration: number): void {
  try {
    // Try to use system bell/beep
    if (process.platform === "darwin") {
      spawn("afplay", ["/System/Library/Sounds/Tink.aiff"]);
    } else if (process.platform === "linux") {
      spawn("paplay", ["/usr/share/sounds/alsa/Front_Right.wav"]);
    } else {
      // Fallback: print bell character (may produce beep on some terminals)
      process.stdout.write("\x07");
    }
  } catch (error) {
    logger.debug(`Failed to generate beep: ${(error as Error).message}`);
  }
}

/**
 * Play system sound based on platform
 */
async function playSystemSound(action: TradingAction): Promise<boolean> {
  const platform = process.platform as keyof typeof SYSTEM_SOUNDS;
  const systemSounds = SYSTEM_SOUNDS[platform];

  if (!systemSounds) {
    logger.debug(`No system sounds defined for platform: ${platform}`);
    return false;
  }

  const soundName = systemSounds[action];

  try {
    if (platform === "darwin") {
      // macOS: use afplay with system sounds
      await new Promise<void>((resolve, reject) => {
        const child = spawn("afplay", [
          `/System/Library/Sounds/${soundName}.aiff`,
        ]);
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Sound failed with code ${code}`));
        });
        child.on("error", reject);
      });
    } else if (platform === "linux") {
      // Linux: use paplay or aplay
      await new Promise<void>((resolve, reject) => {
        const child = spawn("paplay", [
          `/usr/share/sounds/freedesktop/stereo/${soundName}.oga`,
        ]);
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Sound failed with code ${code}`));
        });
        child.on("error", reject);
      });
    } else if (platform === "win32") {
      // Windows: use PowerShell to play system sounds
      await new Promise<void>((resolve, reject) => {
        const child = spawn("powershell", [
          "-c",
          `[System.Media.SystemSounds]::${soundName}.Play()`,
        ]);
        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Sound failed with code ${code}`));
        });
        child.on("error", reject);
      });
    }

    return true;
  } catch (error) {
    logger.debug(`Failed to play system sound: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Play custom sound file
 */
async function playCustomSound(
  action: TradingAction,
  config: SoundConfig
): Promise<boolean> {
  const soundFile = SOUND_FILES[action];

  if (!existsSync(soundFile)) {
    logger.debug(`Custom sound file not found: ${soundFile}`);
    return false;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      player.play(soundFile, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return true;
  } catch (error) {
    logger.debug(`Failed to play custom sound: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Play sound effect for trading action
 */
export async function playTradingSound(
  action: TradingAction,
  config: SoundConfig = DEFAULT_SOUND_CONFIG
): Promise<void> {
  if (!config.enabled) {
    logger.debug(`Sound effects disabled`);
    return;
  }

  logger.info(`🔊 Playing ${action} sound effect...`);

  try {
    // Try custom sound files first
    const customSuccess = await playCustomSound(action, config);
    if (customSuccess) {
      logger.debug(`✅ Played custom sound for ${action}`);
      return;
    }

    // Fallback to system sounds
    const systemSuccess = await playSystemSound(action);
    if (systemSuccess) {
      logger.debug(`✅ Played system sound for ${action}`);
      return;
    }

    // Final fallback: simple beep
    if (config.fallbackToSystemBeep) {
      logger.debug(`🔔 Using fallback beep for ${action}`);

      // Different beep patterns for different actions
      switch (action) {
        case "LONG":
          generateBeep(800, 200); // Higher pitch for bullish
          break;
        case "SHORT":
          generateBeep(400, 200); // Lower pitch for bearish
          break;
        case "HOLD":
          generateBeep(600, 100); // Medium pitch, short duration
          break;
      }
    }
  } catch (error) {
    logger.error(`Failed to play sound effect: ${(error as Error).message}`);
  }
}

/**
 * Play sound sequence for multiple actions
 */
export async function playActionSequence(
  actions: TradingAction[]
): Promise<void> {
  for (const action of actions) {
    await playTradingSound(action);
    // Small delay between sounds
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * Test all sound effects
 */
export async function testSoundEffects(): Promise<void> {
  logger.info(`🎵 Testing sound effects...`);

  const actions: TradingAction[] = ["LONG", "SHORT", "HOLD"];

  for (const action of actions) {
    logger.info(`🔊 Testing ${action} sound...`);
    await playTradingSound(action);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  logger.success(`✅ Sound effects test completed`);
}

/**
 * Get sound configuration from environment or defaults
 */
export function getSoundConfig(): SoundConfig {
  return {
    enabled: process.env.SOUND_EFFECTS !== "false",
    volume: parseFloat(process.env.SOUND_VOLUME || "0.7"),
    fallbackToSystemBeep: process.env.SOUND_FALLBACK !== "false",
  };
}

/**
 * Enhanced trading alert with sound and visual feedback
 */
export async function playTradingAlert(
  action: TradingAction,
  confidence: number,
  reason: string
): Promise<void> {
  const config = getSoundConfig();

  // Visual alert
  const emoji = action === "LONG" ? "🚀" : action === "SHORT" ? "📉" : "⏸️";
  const color = action === "LONG" ? "🟢" : action === "SHORT" ? "🔴" : "🟡";

  logger.info(
    `${color} ${emoji} TRADING ALERT: ${action} (${confidence}% confidence)`
  );
  logger.info(`💭 Reason: ${reason}`);

  // Play sound effect
  await playTradingSound(action, config);

  // Additional alert pattern for high confidence trades
  if (confidence >= 80) {
    logger.info(`🎯 HIGH CONFIDENCE TRADE!`);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await playTradingSound(action, config);
  }
}
