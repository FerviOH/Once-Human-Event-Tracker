// configHandler.js
// Reads environment variables or config.json, and handles state persistence on ephemeral hosting.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  let baseConfig = {};

  // 1. Load baseline / local configurations if the file exists
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      baseConfig = JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse config.json, using defaults:', err.message);
    }
  }

  // 2. Overlay environment variables (Railway takes priority over hardcoded files)
  return {
    ...baseConfig,
    BOT_TOKEN: process.env.BOT_TOKEN || baseConfig.BOT_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID || baseConfig.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID || baseConfig.GUILD_ID,
    CHANNEL_ID: process.env.CHANNEL_ID || baseConfig.CHANNEL_ID,
    MESSAGE_ID: process.env.MESSAGE_ID || baseConfig.MESSAGE_ID,
    TIMEZONE: process.env.TIMEZONE || baseConfig.TIMEZONE || 'UTC',
    HAL_LOCATION: process.env.HAL_LOCATION || baseConfig.HAL_LOCATION,
    NEXT_PHASE_ISO: process.env.NEXT_PHASE_ISO || baseConfig.NEXT_PHASE_ISO,
  };
}

function saveConfig(config) {
  // On Railway, local disk updates disappear on container restart.
  // We log the change so you can update your Railway Variables dashboard manually.
  if (process.env.BOT_TOKEN) {
    console.log('\n⚠️ STATE UPDATE DETECTED! Add these to your Railway Dashboard Variables if you restart:');
    console.log(`MESSAGE_ID: "${config.MESSAGE_ID || ''}"`);
    console.log(`HAL_LOCATION: "${config.HAL_LOCATION || ''}"`);
    console.log(`NEXT_PHASE_ISO: "${config.NEXT_PHASE_ISO || ''}"`);
    console.log('----------------------------------------------------------------------\n');
  }

  // Still attempt to write locally to keep the in-memory process consistent until next restart
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  } catch (err) {
    console.error('Could not write configuration to ephemeral disk:', err.message);
  }
}

function updateConfig(partial) {
  const current = loadConfig();
  const updated = { ...current, ...partial };
  saveConfig(updated);
  return updated;
}

module.exports = { loadConfig, saveConfig, updateConfig };
