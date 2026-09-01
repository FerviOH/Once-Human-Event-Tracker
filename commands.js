// commands.js
// All slash commands require "Manage Server" permission so regular
// members can't repost the tracker or mess with reset times.

// 1. Added MessageFlags to the discord.js imports line
const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const moment = require('moment-timezone');
const { updateConfig } = require('./configHandler');
const { buildEmbed } = require('./resetTimers');

const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('ohsetphase')
    .setDescription('Start a new phase cycle (4-7 phases, each with its own length)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt => opt.setName('start_date').setDescription('YYYY-MM-DD').setRequired(true))
    .addStringOption(opt => opt.setName('start_time').setDescription('HH:MM 24h').setRequired(true))
    .addStringOption(opt => opt.setName('durations')
      .setDescription('Comma-separated days per phase, e.g. 3,4,3,5 (4-7 values)').setRequired(true))
    .addStringOption(opt => opt.setName('names')
      .setDescription('Optional comma-separated phase names, e.g. Growth,Bloom,Decay').setRequired(false)),

  new SlashCommandBuilder()
    .setName('ohcreatetimerpost')
    .setDescription('Create the timer post in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  new SlashCommandBuilder()
    .setName('ohsethallocation')
    .setDescription("Update the location for Hal's Moving House")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption(opt => opt.setName('location').setDescription("Hal's current location").setRequired(true)),

  new SlashCommandBuilder()
    .setName('ohsetlootreset')
    .setDescription('Change what time the 4-hour loot reset cycle starts at')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt => opt.setName('hour').setDescription('0-23').setMinValue(0).setMaxValue(23).setRequired(true))
    .addIntegerOption(opt => opt.setName('minute').setDescription('0-59').setMinValue(0).setMaxValue(59).setRequired(true)),

  new SlashCommandBuilder()
    .setName('ohsetdailyreset')
    .setDescription('Change what time the daily reset happens')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption(opt => opt.setName('hour').setDescription('0-23').setMinValue(0).setMaxValue(23).setRequired(true))
    .addIntegerOption(opt => opt.setName('minute').setDescription('0-59').setMinValue(0).setMaxValue(59).setRequired(true)),
];

async function handleInteraction(interaction, config) {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'ohsetphase') {
    const startDate = interaction.options.getString('start_date');
    const startTime = interaction.options.getString('start_time');
    const durationsRaw = interaction.options.getString('durations');
    const namesRaw = interaction.options.getString('names');

    const parsedStart = moment.tz(`${startDate} ${startTime}`, 'YYYY-MM-DD HH:mm', config.TIMEZONE);
    if (!parsedStart.isValid()) {
      // 2. Swapped to MessageFlags array syntax here
      await interaction.reply({ 
        content: 'Could not parse start_date/start_time. Use YYYY-MM-DD and HH:MM (24h).', 
        flags: [MessageFlags.Ephemeral] 
      });
      return;
    }

    const durations = durationsRaw.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n) && n > 0);
    if (durations.length < 4 || durations.length > 7) {
      // 3. Swapped here
      await interaction.reply({ 
        content: 'durations must have between 4 and 7 comma-separated positive numbers (days).', 
        flags: [MessageFlags.Ephemeral] 
      });
      return;
    }

    const names = namesRaw ? namesRaw.split(',').map(s => s.trim()) : [];

    updateConfig({
      PHASE_CYCLE_START_ISO: parsedStart.toISOString(),
      PHASE_DURATIONS_DAYS: durations,
      PHASE_NAMES: names,
    });

    // 4. Swapped here
    await interaction.reply({
      content: `New phase cycle set: ${durations.length} phases starting ${`<t:${parsedStart.unix()}:F>`}.`,
      flags: [MessageFlags.Ephemeral],
    });
    return;
  }

  if (commandName === 'ohcreatetimerpost') {
    const freshConfig = updateConfig({});
    const embed = buildEmbed(freshConfig);
    const message = await interaction.channel.send({ embeds: [embed] });
    updateConfig({ CHANNEL_ID: interaction.channel.id, MESSAGE_ID: message.id });
    // 5. Swapped here
    await interaction.reply({ content: 'Timer post created.', flags: [MessageFlags.Ephemeral] });
    return;
  }

  if (commandName === 'ohsethallocation') {
    const location = interaction.options.getString('location');
    updateConfig({ HAL_LOCATION: location });
    // 6. Swapped here
    await interaction.reply({ content: `Hal's location updated to: ${location}`, flags: [MessageFlags.Ephemeral] });
    return;
  }

  if (commandName === 'ohsetlootreset') {
    const hour = interaction.options.getInteger('hour');
    const minute = interaction.options.getInteger('minute');
    updateConfig({ LOOT_RESET_ANCHOR: { hour, minute } });
    // 7. Swapped here
    await interaction.reply({ 
      content: `Loot reset cycle now anchored at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (repeats every 4h from there).`, 
      flags: [MessageFlags.Ephemeral] 
    });
    return;
  }

  if (commandName === 'ohsetdailyreset') {
    const hour = interaction.options.getInteger('hour');
    const minute = interaction.options.getInteger('minute');
    updateConfig({ DAILY_RESET_TIME: { hour, minute } });
    // 8. Swapped here
    await interaction.reply({ 
      content: `Daily reset now set to ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}.`, 
      flags: [MessageFlags.Ephemeral] 
    });
    return;
  }
}

module.exports = { commandDefinitions, handleInteraction };
