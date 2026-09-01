// configHandler.js
// Reads/writes config.json so the bot can persist state (like MESSAGE_ID,
// HAL_LOCATION, and NEXT_PHASE_ISO) between restarts.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  }

  // Cloud hosts (Railway, etc.) usually don't have a config.json file on
  // disk — instead you paste the whole config as one CONFIG_JSON
  // environment variable. If we find that, use it and write it to disk
  // once so later updateConfig() calls have something to edit.
  if (process.env.CONFIG_JSON) {
    const parsed = JSON.parse(process.env.CONFIG_JSON);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(parsed, null, 2), 'utf8');
    return parsed;
  }

  throw new Error(
    `config.json not found at ${CONFIG_PATH}, and no CONFIG_JSON environment variable is set. ` +
    `Locally: copy config.example.json to config.json and fill it in. ` +
    `On a cloud host: set a CONFIG_JSON environment variable containing the whole config as JSON.`
  );
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
