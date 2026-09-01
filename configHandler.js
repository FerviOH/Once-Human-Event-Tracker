// configHandler.js
// Reads a single CONFIG_JSON environment variable or a local config.json file, with runtime caching.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

// This variable will hold our updates in memory while the bot runs
let cachedConfig = null;

function loadConfig() {
  // If we already have a runtime configuration in memory, use it immediately
  if (cachedConfig) {
    return cachedConfig;
  }

  let baseConfig = {};

  // 1. Check if the single CONFIG_JSON variable exists on Railway
  if (process.env.CONFIG_JSON) {
    try {
      baseConfig = JSON.parse(process.env.CONFIG_JSON);
    } catch (err) {
      console.error('Failed to parse CONFIG_JSON environment variable string:', err.message);
    }
  }
  // 2. Local Development Fallback: Load from the local physical file
  else if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      baseConfig = JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse local config.json file:', err.message);
    }
  }

  // Save to cache so future reads get these values or subsequent runtime updates
  cachedConfig = baseConfig;
  return cachedConfig;
}

function saveConfig(config) {
  // CRUCIAL: Save the update to memory so loadConfig() immediately reflects it
  cachedConfig = config;

  // On Railway, printing out the new JSON configuration block allows easy copying 
  // and pasting straight back into your single Railway variable.
  if (process.env.CONFIG_JSON) {
    console.log('\n⚠️ STATE UPDATE DETECTED! Copy the entire JSON block below and update your CONFIG_JSON variable in Railway:');
    console.log(JSON.stringify(config, null, 2));
    console.log('----------------------------------------------------------------------\n');
  }

  // Still write locally to keep the active bot instance accurate until the next reboot
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
