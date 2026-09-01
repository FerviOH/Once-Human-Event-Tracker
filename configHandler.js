// configHandler.js
// Reads/writes config.json so the bot can persist state (like MESSAGE_ID,
// HAL_LOCATION, and NEXT_PHASE_ISO) between restarts.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `config.json not found at ${CONFIG_PATH}. Copy config.example.json to config.json and fill it in.`
    );
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

// Merge a partial update into config.json and persist it.
// Used by slash commands (e.g. /ohsethallocation) to save changes.
function updateConfig(partial) {
  const current = loadConfig();
  const updated = { ...current, ...partial };
  saveConfig(updated);
  return updated;
}

module.exports = { loadConfig, saveConfig, updateConfig };
