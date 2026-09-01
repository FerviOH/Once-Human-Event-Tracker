// configHandler.js
// Reads a single CONFIG_JSON environment variable or a local config.json file.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  // 1. Check if the single CONFIG_JSON variable exists on Railway
  if (process.env.CONFIG_JSON) {
    try {
      return JSON.parse(process.env.CONFIG_JSON);
    } catch (err) {
      console.error('Failed to parse CONFIG_JSON environment variable string:', err.message);
    }
  }

  // 2. Local Development Fallback: Load from the local physical file
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse local config.json file:', err.message);
    }
  }

  // 3. Absolute fallback if everything is missing
  return {};
}

function saveConfig(config) {
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
