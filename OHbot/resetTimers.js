// resetTimers.js
// All the "when is the next X" math lives here, kept separate from Discord
// API calls so it's easy to reason about (and test) on its own.

const moment = require('moment-timezone');
const { EmbedBuilder } = require('discord.js');

// Discord renders <t:unix:STYLE> client-side in the viewer's own timezone.
// R = relative ("in 3 hours"), F = full date & time.
function ts(momentObj, style = 'R') {
  return `<t:${momentObj.unix()}:${style}>`;
}

// Generic "next occurrence of a repeating clock time" helper.
// Works for the 4-hour loot reset (intervalHours=4) and the daily
// reset (intervalHours=24) alike, anchored at a given hour:minute.
function getNextIntervalReset(anchorHour, anchorMinute, intervalHours, timezone) {
  const now = moment.tz(timezone);
  let t = now.clone().set({ hour: anchorHour, minute: anchorMinute, second: 0, millisecond: 0 });
  // Walk backwards to the most recent anchor-aligned time at or before now...
  while (t.isAfter(now)) t.subtract(intervalHours, 'hours');
  // ...then forward to the next one strictly after now.
  while (t.isSameOrBefore(now)) t.add(intervalHours, 'hours');
  return t;
}

// Starfall Cycle: active for the first 30 minutes of every hour.
function getStarfallStatus(timezone) {
  const now = moment.tz(timezone);
  const hourStart = now.clone().set({ minute: 0, second: 0, millisecond: 0 });
  const windowEnd = hourStart.clone().add(30, 'minutes');

  if (now.isBetween(hourStart, windowEnd, null, '[)')) {
    return { active: true, activeEnd: windowEnd, nextStart: hourStart.clone().add(1, 'hour') };
  }
  return { active: false, nextStart: hourStart.clone().add(1, 'hour') };
}

// Weekly vendor/commission reset.
function getNextWeeklyReset(dayOfWeek, hour, minute, timezone) {
  const now = moment.tz(timezone);
  const t = now.clone().day(dayOfWeek).set({ hour, minute, second: 0, millisecond: 0 });
  if (t.isSameOrBefore(now)) t.add(1, 'week');
  return t;
}

// Phase cycle: walks through PHASE_DURATIONS_DAYS (one entry per phase, in
// days) starting from PHASE_CYCLE_START_ISO. Once the last phase ends, the
// cycle is "complete" and stays that way until an admin runs /ohsetphase
// again — it does not loop automatically.
function getPhaseStatus(config) {
  const { PHASE_CYCLE_START_ISO, PHASE_DURATIONS_DAYS, PHASE_NAMES, TIMEZONE } = config;

  if (!PHASE_CYCLE_START_ISO || !PHASE_DURATIONS_DAYS || PHASE_DURATIONS_DAYS.length === 0) {
    return { state: 'unset' };
  }

  const now = moment.tz(TIMEZONE);
  const cycleStart = moment(PHASE_CYCLE_START_ISO);

  if (now.isBefore(cycleStart)) {
    const name = PHASE_NAMES[0] || 'Phase 1';
    return { state: 'pending', name, startsAt: cycleStart };
  }

  let cursor = cycleStart.clone();
  for (let i = 0; i < PHASE_DURATIONS_DAYS.length; i++) {
    const phaseEnd = cursor.clone().add(PHASE_DURATIONS_DAYS[i], 'days');
    if (now.isBefore(phaseEnd)) {
      const name = PHASE_NAMES[i] || `Phase ${i + 1}`;
      return { state: 'active', name, index: i, total: PHASE_DURATIONS_DAYS.length, endsAt: phaseEnd };
    }
    cursor = phaseEnd;
  }

  return { state: 'complete' };
}

function buildEmbed(config) {
  const { TIMEZONE, LOOT_RESET_ANCHOR, LOOT_RESET_INTERVAL_HOURS, DAILY_RESET_TIME,
          COMBINED_RESET_DAY, COMBINED_RESET_HOUR, COMBINED_RESET_MINUTE,
          HAL_LOCATION, EMBED_TITLE, EMBED_COLOR, THUMBNAIL_URL } = config;

  const nextLoot = getNextIntervalReset(
    LOOT_RESET_ANCHOR.hour, LOOT_RESET_ANCHOR.minute, LOOT_RESET_INTERVAL_HOURS, TIMEZONE
  );
  const nextDaily = getNextIntervalReset(
    DAILY_RESET_TIME.hour, DAILY_RESET_TIME.minute, 24, TIMEZONE
  );
  const starfall = getStarfallStatus(TIMEZONE);
  const nextVendor = getNextWeeklyReset(COMBINED_RESET_DAY, COMBINED_RESET_HOUR, COMBINED_RESET_MINUTE, TIMEZONE);
  const phase = getPhaseStatus(config);

  let phaseLine;
  if (phase.state === 'unset') {
    phaseLine = 'Not set — use `/ohsetphase`';
  } else if (phase.state === 'pending') {
    phaseLine = `${phase.name} starts ${ts(phase.startsAt)}`;
  } else if (phase.state === 'active') {
    phaseLine = `**${phase.name}** (${phase.index + 1}/${phase.total}) — ends ${ts(phase.endsAt)}`;
  } else {
    phaseLine = 'Cycle complete — awaiting `/ohsetphase` to start a new cycle';
  }

  const starfallLine = starfall.active
    ? `🟢 Active now — ends ${ts(starfall.activeEnd)}`
    : `Starts ${ts(starfall.nextStart)}`;

  const embed = new EmbedBuilder()
    .setTitle(EMBED_TITLE || 'Once Human Event Tracker')
    .setColor(EMBED_COLOR || '#FFFF00')
    .addFields(
      { name: 'Loot Reset (every 4h)', value: `${ts(nextLoot)} (${ts(nextLoot, 'F')})` },
      { name: 'Daily Reset', value: `${ts(nextDaily)} (${ts(nextDaily, 'F')})` },
      { name: 'Starfall Cycle', value: starfallLine },
      { name: 'Phase', value: phaseLine },
      { name: 'Vendor/Commission Reset (weekly)', value: `${ts(nextVendor)} (${ts(nextVendor, 'F')})` },
      { name: "Hal's Moving House", value: HAL_LOCATION || 'Unknown' }
    )
    .setFooter({ text: `Timezone: ${TIMEZONE}` })
    .setTimestamp();

  if (THUMBNAIL_URL) embed.setThumbnail(THUMBNAIL_URL);

  return embed;
}

module.exports = {
  getNextIntervalReset,
  getStarfallStatus,
  getNextWeeklyReset,
  getPhaseStatus,
  buildEmbed,
};
