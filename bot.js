// bot.js
// Entry point. Run with: node bot.js

const { Client, GatewayIntentBits, REST, Routes, ActivityType } = require('discord.js');
const { CronJob } = require('cron');
const { loadConfig } = require('./configHandler');
const { buildEmbed } = require('./resetTimers');
const { commandDefinitions, handleInteraction } = require('./commands');

const config = loadConfig();

if (!config.BOT_TOKEN || config.BOT_TOKEN === 'YOUR_DISCORD_BOT_TOKEN') {
  console.error('BOT_TOKEN is missing from config.json. Copy config.example.json to config.json and fill it in.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// --- Slash command registration -------------------------------------------
// With GUILD_ID set, commands register instantly to that one server
// (best while developing). Without it, they register globally, which can
// take up to an hour to propagate everywhere.
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.BOT_TOKEN);
  const body = commandDefinitions.map(cmd => cmd.toJSON());

  if (config.CLIENT_ID && config.GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body });
    console.log('Registered slash commands to guild', config.GUILD_ID);
  } else if (config.CLIENT_ID) {
    await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body });
    console.log('Registered slash commands globally (may take up to 1 hour to appear).');
  } else {
    console.warn('CLIENT_ID not set in config.json — skipping slash command registration.');
  }
}

// --- Keeping the tracker message up to date --------------------------------
async function updateTrackerMessage() {
  const freshConfig = loadConfig();
  if (!freshConfig.CHANNEL_ID || !freshConfig.MESSAGE_ID) return; // nothing posted yet

  try {
    const channel = await client.channels.fetch(freshConfig.CHANNEL_ID);
    const message = await channel.messages.fetch(freshConfig.MESSAGE_ID);
    await message.edit({ embeds: [buildEmbed(freshConfig)] });
  } catch (err) {
    console.error('Failed to update tracker message:', err.message);
  }
}

function setBotActivity() {
  client.user.setActivity('Once Human', { type: ActivityType.Playing });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  setBotActivity();

  new CronJob('0 */10 * * * *', setBotActivity, null, true, config.TIMEZONE);
  new CronJob('0 * * * * *', updateTrackerMessage, null, true, config.TIMEZONE);

  updateTrackerMessage(); // run once immediately so it's not stale on startup
});

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction, loadConfig());
  } catch (err) {
    console.error('Error handling interaction:', err);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: 'Something went wrong running that command.', ephemeral: true });
    }
  }
});

client.login(config.BOT_TOKEN);
