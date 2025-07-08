#!/usr/bin/env node

import { testSoundEffects } from "./utils/sound-effects";
import { logger } from "./utils/logger";

/**
 * Test sound effects for trading actions
 */
async function main() {
  try {
    logger.info("🎵 Testing Trading Sound Effects");
    logger.info("================================");

    await testSoundEffects();

    logger.info("🎉 Sound test completed!");
  } catch (error) {
    logger.error(`❌ Sound test failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
