import type { SettingContract } from '../types.js';
export const SETTINGS = [
  {
    "key": "server.timezone",
    "section": "server",
    "type": "string",
    "default": "America/Denver",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "IANA timezone for scheduled jobs.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "server.daily_reset_hour",
    "section": "server",
    "type": "integer",
    "default": 4,
    "editable_by": [],
    "restart_required": false,
    "description": "Daily economy reset is fixed at 4:00 AM Mountain Time.",
    "risk": "locked",
    "min": 4,
    "max": 4,
    "mutable": false
  },
  {
    "key": "server.weekly_reset_day",
    "section": "server",
    "type": "choice",
    "default": "MONDAY",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "choices": [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY"
    ],
    "mutable": true
  },
  {
    "key": "server.weekly_reset_hour",
    "section": "server",
    "type": "integer",
    "default": 4,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 0,
    "max": 23,
    "mutable": true
  },
  {
    "key": "core.dms_default",
    "section": "core",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "core.feature_flags",
    "section": "core",
    "type": "json",
    "default": {},
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "core.technical_throttle_ms",
    "section": "core",
    "type": "integer",
    "default": 1200,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 250,
    "max": 10000,
    "mutable": true
  },
  {
    "key": "channels.main_chat",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.bot_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.games_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.counting_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.last_letter_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.staff_log",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.chairisms_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.introduction_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "channels.hotseat_channel",
    "section": "channels_roles",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord channel ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "roles.throne",
    "section": "channels_roles",
    "type": "discord_role",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord role ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "roles.chaise_lounge",
    "section": "channels_roles",
    "type": "discord_role",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord role ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "roles.recliner",
    "section": "channels_roles",
    "type": "discord_role",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord role ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "roles.jailed",
    "section": "channels_roles",
    "type": "discord_role",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Resolved Discord role ID.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "race.join_seconds",
    "section": "games",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Race join + betting window before optional extension.",
    "risk": "normal",
    "min": 15,
    "max": 180,
    "mutable": true
  },
  {
    "key": "race.extension_seconds",
    "section": "games",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "One-use host extension for both Race entry and betting.",
    "risk": "normal",
    "min": 0,
    "max": 30,
    "mutable": true
  },
  {
    "key": "party.vote_seconds",
    "section": "games",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 15,
    "max": 300,
    "mutable": true
  },
  {
    "key": "party.extension_seconds",
    "section": "games",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 0,
    "max": 120,
    "mutable": true
  },
  {
    "key": "fmk.vote_seconds",
    "section": "games",
    "type": "integer",
    "default": 180,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 30,
    "max": 600,
    "mutable": true
  },
  {
    "key": "line.ready_seconds",
    "section": "games",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Line readiness/entry window.",
    "risk": "normal",
    "min": 15,
    "max": 180,
    "mutable": true
  },
  {
    "key": "line.abandon_minutes",
    "section": "games",
    "type": "integer",
    "default": 15,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 2,
    "max": 60,
    "mutable": true
  },
  {
    "key": "games.one_active_public_party_round",
    "section": "games",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "games.voting.hidden_totals_default",
    "section": "games",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "games.voting.allow_vote_edit",
    "section": "games",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "economy.starter_ottomans",
    "section": "economy",
    "type": "integer",
    "default": 500,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "min": 0,
    "max": 100000,
    "mutable": true
  },
  {
    "key": "economy.daily_base",
    "section": "economy",
    "type": "integer",
    "default": 250,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "min": 0,
    "max": 100000,
    "mutable": true
  },
  {
    "key": "economy.weekly_base",
    "section": "economy",
    "type": "integer",
    "default": 1500,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "min": 0,
    "max": 500000,
    "mutable": true
  },
  {
    "key": "economy.bet_rake_percent",
    "section": "economy",
    "type": "integer",
    "default": 5,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "min": 0,
    "max": 20,
    "mutable": true
  },
  {
    "key": "lottery.max_tickets",
    "section": "economy",
    "type": "integer",
    "default": 20,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "min": 1,
    "max": 100,
    "mutable": true
  },
  {
    "key": "economy.wallet_first_spending",
    "section": "economy",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "economy.bank_robbery_protected",
    "section": "economy",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "economy.transfers_fee_percent",
    "section": "economy",
    "type": "integer",
    "default": 0,
    "editable_by": [],
    "restart_required": false,
    "description": "Direct Ottoman member transfers are free.",
    "risk": "locked",
    "min": 0,
    "max": 0,
    "mutable": false
  },
  {
    "key": "moderation.evidence_retention_days",
    "section": "moderation",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "min": 7,
    "max": 180,
    "mutable": true
  },
  {
    "key": "moderation.ai_ambiguous_only",
    "section": "moderation",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "moderation.default_posture",
    "section": "moderation",
    "type": "choice",
    "default": "adult_permissive",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "choices": [
      "adult_permissive",
      "balanced",
      "strict"
    ],
    "mutable": true
  },
  {
    "key": "moderation.progressive_discipline_enabled",
    "section": "moderation",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "moderation.heat_decay_hours",
    "section": "moderation",
    "type": "integer",
    "default": 72,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "min": 1,
    "max": 720,
    "mutable": true
  },
  {
    "key": "moderation.appeal_reviewer_independence",
    "section": "moderation",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "moderation.jail.default_minutes",
    "section": "moderation",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "min": 1,
    "max": 10080,
    "mutable": true
  },
  {
    "key": "moderation.jail.links_allowed",
    "section": "moderation",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "moderation.jail.attachments_allowed",
    "section": "moderation",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "moderation.jail.staff_role_suspension_enabled",
    "section": "moderation",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "Allow Throne to temporarily suspend manageable Administrator-granting roles so moderation Hotseat can be effective.",
    "risk": "high",
    "mutable": true
  },
  {
    "key": "security.join_gate_enabled",
    "section": "security",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "high",
    "mutable": true
  },
  {
    "key": "security.anti_raid_enabled",
    "section": "security",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "high",
    "mutable": true
  },
  {
    "key": "security.anti_nuke_enabled",
    "section": "security",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "high",
    "mutable": true
  },
  {
    "key": "security.panic_mode_enabled",
    "section": "security",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "critical",
    "mutable": true
  },
  {
    "key": "security.raid.join_velocity_per_minute",
    "section": "security",
    "type": "integer",
    "default": 10,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "high",
    "min": 2,
    "max": 100,
    "mutable": true
  },
  {
    "key": "content.prompt_recent_game_exclusion",
    "section": "content",
    "type": "integer",
    "default": 250,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 25,
    "max": 1000,
    "mutable": true
  },
  {
    "key": "content.prompt_recent_category_exclusion",
    "section": "content",
    "type": "integer",
    "default": 100,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 10,
    "max": 500,
    "mutable": true
  },
  {
    "key": "content.prompt_prefer_underused",
    "section": "content",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "spotlight.post_channel",
    "section": "spotlight",
    "type": "discord_channel",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "spotlight.fallback_post_hour",
    "section": "spotlight",
    "type": "integer",
    "default": 19,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 17,
    "max": 22,
    "mutable": true
  },
  {
    "key": "spotlight.ties_are_co_winners",
    "section": "spotlight",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.enabled",
    "section": "dashboard",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "dashboard.session_hours",
    "section": "dashboard",
    "type": "integer",
    "default": 12,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "min": 1,
    "max": 72,
    "mutable": true
  },
  {
    "key": "tutorial.enabled",
    "section": "tutorial",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "custom_commands.enabled",
    "section": "custom_commands",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "custom_commands.max_commands",
    "section": "custom_commands",
    "type": "integer",
    "default": 100,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 1,
    "max": 500,
    "mutable": true
  },
  {
    "key": "custom_commands.max_actions",
    "section": "custom_commands",
    "type": "integer",
    "default": 8,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 1,
    "max": 16,
    "mutable": true
  },
  {
    "key": "custom_commands.regex_enabled",
    "section": "custom_commands",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "music.enabled",
    "section": "music",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "music.max_active_voice_channels",
    "section": "music",
    "type": "integer",
    "default": 1,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "min": 1,
    "max": 1,
    "mutable": false
  },
  {
    "key": "music.default_volume",
    "section": "music",
    "type": "integer",
    "default": 65,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "min": 1,
    "max": 100,
    "mutable": true
  },
  {
    "key": "music.vote_skip_majority",
    "section": "music",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "introductions.one_active_per_member",
    "section": "introductions",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "introductions.normal_messages_locked",
    "section": "introductions",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "shop.refresh_hour",
    "section": "shop",
    "type": "integer",
    "default": 4,
    "editable_by": [],
    "restart_required": false,
    "description": "Shop refresh is locked to 4 AM Mountain Time.",
    "risk": "locked",
    "mutable": false,
    "min": 4,
    "max": 4
  },
  {
    "key": "shop.personalized_bonus_slots",
    "section": "shop",
    "type": "integer",
    "default": 2,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "One or two personalized daily bonus slots.",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 2
  },
  {
    "key": "shop.buyback_floor_percent",
    "section": "shop",
    "type": "integer",
    "default": 35,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "mutable": true,
    "min": 10,
    "max": 90
  },
  {
    "key": "shop.buyback_ceiling_percent",
    "section": "shop",
    "type": "integer",
    "default": 70,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "mutable": true,
    "min": 20,
    "max": 100
  },
  {
    "key": "crafting.repair.cheap_restore_min",
    "section": "crafting",
    "type": "integer",
    "default": 10,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 100
  },
  {
    "key": "crafting.repair.cheap_restore_max",
    "section": "crafting",
    "type": "integer",
    "default": 25,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 100
  },
  {
    "key": "crafting.repair.standard_restore_min",
    "section": "crafting",
    "type": "integer",
    "default": 25,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 100
  },
  {
    "key": "crafting.repair.standard_restore_max",
    "section": "crafting",
    "type": "integer",
    "default": 55,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 100
  },
  {
    "key": "crafting.repair.premium_restore_min",
    "section": "crafting",
    "type": "integer",
    "default": 50,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 100
  },
  {
    "key": "crafting.repair.premium_restore_max",
    "section": "crafting",
    "type": "integer",
    "default": 100,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 100
  },
  {
    "key": "crafting.failure_grants_skill",
    "section": "crafting",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "casino.min_bet",
    "section": "casino",
    "type": "integer",
    "default": 10,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "mutable": true,
    "min": 1,
    "max": 100000
  },
  {
    "key": "casino.max_bet",
    "section": "casino",
    "type": "integer",
    "default": 5000,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "mutable": true,
    "min": 10,
    "max": 1000000
  },
  {
    "key": "casino.chair_pot_contribution_percent",
    "section": "casino",
    "type": "integer",
    "default": 1,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "financial",
    "mutable": true,
    "min": 0,
    "max": 10
  },
  {
    "key": "lottery.draw_weekday",
    "section": "casino",
    "type": "choice",
    "default": "FRIDAY",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "choices": [
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
      "SUNDAY"
    ]
  },
  {
    "key": "lottery.draw_hour",
    "section": "casino",
    "type": "integer",
    "default": 20,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 0,
    "max": 23
  },
  {
    "key": "lottery.rake_percent",
    "section": "casino",
    "type": "integer",
    "default": 0,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false,
    "min": 0,
    "max": 0
  },
  {
    "key": "crime.robber_cooldown_minutes",
    "section": "crime",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 1440
  },
  {
    "key": "crime.victim_protection_minutes",
    "section": "crime",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 1440
  },
  {
    "key": "crime.fight_back_seconds",
    "section": "crime",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 15,
    "max": 300
  },
  {
    "key": "crime.report_911_seconds",
    "section": "crime",
    "type": "integer",
    "default": 180,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 30,
    "max": 600
  },
  {
    "key": "crime.jail_hours",
    "section": "crime",
    "type": "integer",
    "default": 24,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 168
  },
  {
    "key": "crime.bank_is_stealable",
    "section": "crime",
    "type": "boolean",
    "default": false,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "family.max_spouses",
    "section": "family",
    "type": "integer",
    "default": 2,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false,
    "min": 1,
    "max": 2
  },
  {
    "key": "family.proposal_hours",
    "section": "family",
    "type": "integer",
    "default": 24,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 168
  },
  {
    "key": "family.divorce_min_days",
    "section": "family",
    "type": "integer",
    "default": 3,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 0,
    "max": 30
  },
  {
    "key": "family.same_pair_remarry_lock_days",
    "section": "family",
    "type": "integer",
    "default": 7,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 0,
    "max": 90
  },
  {
    "key": "family.will_grace_hours",
    "section": "family",
    "type": "integer",
    "default": 24,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 168
  },
  {
    "key": "family.auction_min_hours",
    "section": "family",
    "type": "integer",
    "default": 1,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 24
  },
  {
    "key": "family.auction_max_hours",
    "section": "family",
    "type": "integer",
    "default": 72,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 2,
    "max": 168
  },
  {
    "key": "family.adoption_slot_days",
    "section": "family",
    "type": "json",
    "default": [
      3,
      7,
      14,
      30,
      60
    ],
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "giveaway.min_duration_minutes",
    "section": "community",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 10,
    "max": 10080
  },
  {
    "key": "giveaway.max_duration_minutes",
    "section": "community",
    "type": "integer",
    "default": 10080,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 60,
    "max": 43200
  },
  {
    "key": "giveaway.max_winners",
    "section": "community",
    "type": "integer",
    "default": 5,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 10
  },
  {
    "key": "superlatives.nomination_hours",
    "section": "community",
    "type": "integer",
    "default": 48,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 168
  },
  {
    "key": "superlatives.voting_hours",
    "section": "community",
    "type": "integer",
    "default": 48,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 168
  },
  {
    "key": "superlatives.finalist_count",
    "section": "community",
    "type": "integer",
    "default": 5,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 2,
    "max": 10
  },
  {
    "key": "poll.max_choices",
    "section": "community",
    "type": "integer",
    "default": 20,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 2,
    "max": 25
  },
  {
    "key": "activity.exclude_bot_channel",
    "section": "activity",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "activity.exclude_games_channel",
    "section": "activity",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "activity.exclude_staff_channel",
    "section": "activity",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "activity.vc_require_other_human",
    "section": "activity",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "activity.vc_exclude_self_muted",
    "section": "activity",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "custom_commands.max_execution_seconds",
    "section": "custom_commands",
    "type": "integer",
    "default": 5,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true,
    "min": 1,
    "max": 10
  },
  {
    "key": "custom_commands.max_response_chars",
    "section": "custom_commands",
    "type": "integer",
    "default": 4000,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 100,
    "max": 6000
  },
  {
    "key": "tutorial.practice_mode_enabled",
    "section": "tutorial",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "tutorial.progress_tracking",
    "section": "tutorial",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "dashboard.audit_retention_days",
    "section": "dashboard",
    "type": "integer",
    "default": 365,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Rolling dashboard audit-log retention in days.",
    "risk": "security",
    "mutable": true,
    "min": 30,
    "max": 3650
  },
  {
    "key": "music.queue_max_tracks",
    "section": "music",
    "type": "integer",
    "default": 250,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 10,
    "max": 1000
  },
  {
    "key": "music.autoplay_default",
    "section": "music",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "music.loop_default",
    "section": "music",
    "type": "choice",
    "default": "off",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "choices": [
      "off",
      "track",
      "queue"
    ]
  },
  {
    "key": "music.controller_refresh_on_interaction",
    "section": "music",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "moderation.heat.warning_threshold",
    "section": "moderation",
    "type": "integer",
    "default": 20,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true,
    "min": 1,
    "max": 200
  },
  {
    "key": "moderation.heat.short_timeout_threshold",
    "section": "moderation",
    "type": "integer",
    "default": 40,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true,
    "min": 1,
    "max": 300
  },
  {
    "key": "moderation.heat.long_timeout_threshold",
    "section": "moderation",
    "type": "integer",
    "default": 70,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true,
    "min": 1,
    "max": 400
  },
  {
    "key": "moderation.heat.review_threshold",
    "section": "moderation",
    "type": "integer",
    "default": 100,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "security",
    "mutable": true,
    "min": 1,
    "max": 500
  },
  {
    "key": "security.verification_enabled",
    "section": "security",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "high",
    "mutable": true
  },
  {
    "key": "security.restricted_mode_auto_deescalate_minutes",
    "section": "security",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "",
    "risk": "high",
    "mutable": true,
    "min": 5,
    "max": 1440
  },
  {
    "key": "introductions.reactions_allowed",
    "section": "introductions",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "introductions.attachments_allowed",
    "section": "introductions",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "introductions.max_pages",
    "section": "introductions",
    "type": "integer",
    "default": 4,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 1,
    "max": 8
  },
  {
    "key": "spotlight.learned_post_window_start_hour",
    "section": "spotlight",
    "type": "integer",
    "default": 17,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 0,
    "max": 23
  },
  {
    "key": "spotlight.learned_post_window_end_hour",
    "section": "spotlight",
    "type": "integer",
    "default": 22,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "",
    "risk": "normal",
    "mutable": true,
    "min": 0,
    "max": 23
  },
  {
    "key": "spotlight.triple_threat_permanent",
    "section": "spotlight",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "fight.bet_seconds",
    "section": "games",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Fight betting window; there is no open fighter join phase.",
    "risk": "financial",
    "mutable": true,
    "min": 15,
    "max": 120
  },
  {
    "key": "fight.extension_seconds",
    "section": "games",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "One-use challenger extension for Fight betting only.",
    "risk": "financial",
    "mutable": true,
    "min": 0,
    "max": 30
  },
  {
    "key": "line.extension_seconds",
    "section": "games",
    "type": "integer",
    "default": 30,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "One-use host extension for Line readiness/entry.",
    "risk": "normal",
    "mutable": true,
    "min": 0,
    "max": 30
  },
  {
    "key": "roles.member_access",
    "section": "channels_roles",
    "type": "discord_role",
    "default": null,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Normal member/access role granted after rules acknowledgment.",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "special_commands.enabled",
    "section": "special_commands",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Enable built-in and configured Special Commands.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "special_commands.builtin_role_map",
    "section": "special_commands",
    "type": "json",
    "default": {
      "!line": null,
      "!race": null,
      "!vc": null,
      "!chess": null
    },
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Notification-role mappings for built-in Special Commands.",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "special_commands.default_member_access",
    "section": "special_commands",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Built-in Special Commands are usable by members unless individually role-restricted.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "special_commands.cooldown_enabled",
    "section": "special_commands",
    "type": "boolean",
    "default": false,
    "editable_by": [],
    "restart_required": false,
    "description": "Special Commands have no cooldown.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "roles_panel.enabled",
    "section": "roles_panel",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Enable the ephemeral /roles selection panel.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "roles_panel.category_order",
    "section": "roles_panel",
    "type": "json",
    "default": [
      "Gender",
      "Age",
      "Regions",
      "Vices",
      "Personalities",
      "Pings",
      "DM Status"
    ],
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Initial category order; live category definitions are database-backed.",
    "risk": "normal",
    "mutable": true
  },
  {
    "key": "roles_panel.single_choice_categories",
    "section": "roles_panel",
    "type": "json",
    "default": [
      "Gender",
      "Age",
      "Regions",
      "DM Status"
    ],
    "editable_by": [],
    "restart_required": false,
    "description": "Categories that allow at most one selected option and may also be cleared.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "roles_panel.multi_choice_categories",
    "section": "roles_panel",
    "type": "json",
    "default": [
      "Vices",
      "Personalities",
      "Pings"
    ],
    "editable_by": [],
    "restart_required": false,
    "description": "Categories that allow independent multi-selection with no product cap.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "roles_panel.archive_restores_holders",
    "section": "roles_panel",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Re-enabling an archived option restores it to members who held it at archive time when eligible.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "onboarding.rules_ack_required",
    "section": "onboarding",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Rules acknowledgment is the only required onboarding gate.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "onboarding.optional_steps",
    "section": "onboarding",
    "type": "json",
    "default": [
      "roles",
      "lore",
      "introduce",
      "tutorial"
    ],
    "editable_by": [],
    "restart_required": false,
    "description": "Guided onboarding steps that may be skipped.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "rejoin.require_rules_ack",
    "section": "onboarding",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Returning members must acknowledge rules again before normal access is restored.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "rejoin.restore_self_roles",
    "section": "onboarding",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Restore eligible prior self-selected roles after rejoin.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "rejoin.restore_manual_nonstaff_roles",
    "section": "onboarding",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Restore eligible prior non-staff manual/custom roles after rejoin.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "rejoin.restore_staff_roles",
    "section": "onboarding",
    "type": "boolean",
    "default": false,
    "editable_by": [],
    "restart_required": false,
    "description": "Staff roles require fresh staff approval after rejoin.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "rejoin.restore_nickname",
    "section": "onboarding",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Restore prior server nickname when permitted.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "rejoin.booster_role_source",
    "section": "onboarding",
    "type": "choice",
    "default": "discord",
    "editable_by": [],
    "restart_required": false,
    "description": "Booster/Nitro role state is determined by current Discord boost status.",
    "risk": "locked",
    "mutable": false,
    "choices": [
      "discord"
    ]
  },
  {
    "key": "rejoin.temporary_role_timer_policy",
    "section": "onboarding",
    "type": "choice",
    "default": "wall_clock",
    "editable_by": [],
    "restart_required": false,
    "description": "Temporary roles continue expiring while a member is absent.",
    "risk": "locked",
    "mutable": false,
    "choices": [
      "wall_clock"
    ]
  },
  {
    "key": "rejoin.punishment_timer_policy",
    "section": "onboarding",
    "type": "choice",
    "default": "pause_while_absent",
    "editable_by": [],
    "restart_required": false,
    "description": "Timed punishments pause while a member is absent and resume on return.",
    "risk": "locked",
    "mutable": false,
    "choices": [
      "pause_while_absent"
    ]
  },
  {
    "key": "dashboard.single_global_draft",
    "section": "dashboard",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Only one shared dashboard draft may exist at a time.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.draft_lock_minutes",
    "section": "dashboard",
    "type": "integer",
    "default": 15,
    "editable_by": [],
    "restart_required": false,
    "description": "Inactivity timeout for the active draft edit lock.",
    "risk": "locked",
    "mutable": false,
    "min": 1,
    "max": 60
  },
  {
    "key": "dashboard.simple_live_save_allowed",
    "section": "dashboard",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Low-risk changes may save directly without a draft.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.high_impact_requires_draft",
    "section": "dashboard",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "High-impact/destructive/broad/dependency-sensitive changes require Draft → Preview → Publish.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.draft_scheduling_enabled",
    "section": "dashboard",
    "type": "boolean",
    "default": false,
    "editable_by": [],
    "restart_required": false,
    "description": "Dashboard draft publishing cannot be scheduled.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.dependency_view_mode",
    "section": "dashboard",
    "type": "choice",
    "default": "direct",
    "editable_by": [],
    "restart_required": false,
    "description": "Draft preview displays direct dependencies only.",
    "risk": "locked",
    "mutable": false,
    "choices": [
      "direct"
    ]
  },
  {
    "key": "dashboard.dependency_autofix",
    "section": "dashboard",
    "type": "boolean",
    "default": false,
    "editable_by": [],
    "restart_required": false,
    "description": "Dependency errors are flagged for manual correction; Angrier Jordan does not auto-rewrite dependent settings.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.audit_export_enabled",
    "section": "dashboard",
    "type": "boolean",
    "default": true,
    "editable_by": [],
    "restart_required": false,
    "description": "Authorized Admins may export retained dashboard audit history.",
    "risk": "locked",
    "mutable": false
  },
  {
    "key": "dashboard.access_policy",
    "section": "dashboard",
    "type": "choice",
    "default": "guild_owner_or_discord_administrator",
    "editable_by": [],
    "restart_required": false,
    "description": "Dashboard access is limited to the server owner and users with current Discord Administrator permission.",
    "risk": "locked",
    "mutable": false,
    "choices": [
      "guild_owner_or_discord_administrator"
    ]
  },
  {
    "key": "moderation.automod_enabled",
    "section": "moderation",
    "type": "boolean",
    "default": true,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Enable Angrier Jordan AutoMod message evaluation and progressive discipline.",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "moderation.banned_phrases_csv",
    "section": "moderation",
    "type": "string",
    "default": "",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Comma-separated phrases handled by the configured AutoMod policy.",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "security.trusted_domains_csv",
    "section": "security",
    "type": "string",
    "default": "",
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Comma-separated domains trusted by link/phishing checks.",
    "risk": "security",
    "mutable": true
  },
  {
    "key": "moderation.heat.short_timeout_minutes",
    "section": "moderation",
    "type": "integer",
    "default": 10,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Default short timeout used by progressive discipline.",
    "risk": "security",
    "min": 1,
    "max": 1440,
    "mutable": true
  },
  {
    "key": "moderation.heat.long_timeout_minutes",
    "section": "moderation",
    "type": "integer",
    "default": 60,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Default longer timeout used by progressive discipline.",
    "risk": "security",
    "min": 5,
    "max": 10080,
    "mutable": true
  },
  {
    "key": "security.join.minimum_account_age_hours",
    "section": "security",
    "type": "integer",
    "default": 72,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "Account-age screening threshold for Join Gate; young accounts are not automatically treated as violations.",
    "risk": "high",
    "min": 0,
    "max": 8760,
    "mutable": true
  },
  {
    "key": "security.anti_nuke.events_per_minute",
    "section": "security",
    "type": "integer",
    "default": 4,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "Destructive privileged events per minute that trigger anti-nuke containment review.",
    "risk": "critical",
    "min": 2,
    "max": 30,
    "mutable": true
  },
  {
    "key": "security.anti_nuke.lockdown_events_per_minute",
    "section": "security",
    "type": "integer",
    "default": 7,
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "Destructive privileged events per minute that can trigger Lockdown.",
    "risk": "critical",
    "min": 3,
    "max": 50,
    "mutable": true
  },
  {
    "key": "security.trusted_users_csv",
    "section": "security",
    "type": "string",
    "default": "",
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "Comma-separated Discord user IDs treated as explicitly trusted identities; monitoring remains active.",
    "risk": "critical",
    "mutable": true
  },
  {
    "key": "security.trusted_bots_csv",
    "section": "security",
    "type": "string",
    "default": "",
    "editable_by": [
      "throne"
    ],
    "restart_required": false,
    "description": "Comma-separated bot user IDs permitted by Join Gate.",
    "risk": "critical",
    "mutable": true
  },
  {
    "key": "economy.bank_tiers",
    "section": "economy",
    "type": "json",
    "default": [
      {
        "tier": 1,
        "cap": 5000,
        "upgrade_cost": 1000
      },
      {
        "tier": 2,
        "cap": 25000,
        "upgrade_cost": 5000
      },
      {
        "tier": 3,
        "cap": 100000,
        "upgrade_cost": 20000
      },
      {
        "tier": 4,
        "cap": 500000,
        "upgrade_cost": 75000
      },
      {
        "tier": 5,
        "cap": null,
        "upgrade_cost": 0
      }
    ],
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Five bank tiers. Tiers 1–4 have capacities; Tier 5 is unlimited.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "economy.bank_tier5_interest_bps",
    "section": "economy",
    "type": "integer",
    "default": 100,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Tier 5 weekly bank interest in basis points (100 = 1%).",
    "risk": "financial",
    "min": 0,
    "max": 500,
    "mutable": true
  },
  {
    "key": "economy.bank_tier5_interest_cap",
    "section": "economy",
    "type": "integer",
    "default": 100000,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Maximum Tier 5 weekly interest paid to one member.",
    "risk": "financial",
    "min": 0,
    "max": 1000000,
    "mutable": true
  },
  {
    "key": "economy.daily_milestones",
    "section": "economy",
    "type": "json",
    "default": {
      "7": 500,
      "30": 2500,
      "100": 10000,
      "365": 50000
    },
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Exact Claim Daily streak milestone bonuses.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "economy.daily_spin_table",
    "section": "economy",
    "type": "json",
    "default": [
      {
        "kind": "ottomans",
        "weight": 35,
        "amount": 100,
        "label": "100 Ottomans"
      },
      {
        "kind": "ottomans",
        "weight": 30,
        "amount": 250,
        "label": "250 Ottomans"
      },
      {
        "kind": "ottomans",
        "weight": 15,
        "amount": 500,
        "label": "500 Ottomans"
      },
      {
        "kind": "item",
        "weight": 10,
        "item_id": "junk.bent_screw",
        "quantity": 1,
        "label": "Bent Chair Screw"
      },
      {
        "kind": "item",
        "weight": 6,
        "item_id": "sellable.brass_caster",
        "quantity": 1,
        "label": "Old Brass Caster"
      },
      {
        "kind": "item",
        "weight": 3,
        "item_id": "collectible.lounge_token",
        "quantity": 1,
        "label": "Lounge Token"
      },
      {
        "kind": "ottomans",
        "weight": 1,
        "amount": 1500,
        "label": "1,500 Ottomans"
      }
    ],
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Weighted Daily Spin reward table. Runtime hard bounds still apply.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "economy.grind_technical_throttle_ms",
    "section": "economy",
    "type": "integer",
    "default": 1500,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Small technical anti-spam throttle for repeatable grind commands; not a gameplay cooldown.",
    "risk": "normal",
    "min": 250,
    "max": 5000,
    "mutable": true
  },
  {
    "key": "economy.grind_tables",
    "section": "economy",
    "type": "json",
    "default": {
      "work": [
        {
          "outcome": "win",
          "weight": 72,
          "min": 80,
          "max": 220
        },
        {
          "outcome": "zero",
          "weight": 14
        },
        {
          "outcome": "loss",
          "weight": 7,
          "min": 20,
          "max": 60
        },
        {
          "outcome": "fine",
          "weight": 5,
          "min": 60,
          "max": 120
        },
        {
          "outcome": "tool_damage",
          "weight": 2,
          "tool_damage": 5
        }
      ],
      "fish": [
        {
          "outcome": "win",
          "weight": 65,
          "min": 40,
          "max": 130
        },
        {
          "outcome": "mixed",
          "weight": 18,
          "min": 20,
          "max": 80,
          "item_id": "sellable.rusty_hook",
          "quantity": 1
        },
        {
          "outcome": "item",
          "weight": 10,
          "item_id": "sellable.rusty_hook",
          "quantity": 1
        },
        {
          "outcome": "zero",
          "weight": 7
        }
      ],
      "dig": [
        {
          "outcome": "win",
          "weight": 60,
          "min": 50,
          "max": 150
        },
        {
          "outcome": "mixed",
          "weight": 20,
          "min": 25,
          "max": 90,
          "item_id": "sellable.buried_coaster",
          "quantity": 1
        },
        {
          "outcome": "item",
          "weight": 12,
          "item_id": "sellable.buried_coaster",
          "quantity": 1
        },
        {
          "outcome": "zero",
          "weight": 8
        }
      ],
      "scavenge": [
        {
          "outcome": "win",
          "weight": 55,
          "min": 35,
          "max": 120
        },
        {
          "outcome": "mixed",
          "weight": 25,
          "min": 20,
          "max": 70,
          "item_id": "junk.loose_spring",
          "quantity": 1
        },
        {
          "outcome": "item",
          "weight": 15,
          "item_id": "junk.loose_spring",
          "quantity": 1
        },
        {
          "outcome": "zero",
          "weight": 5
        }
      ]
    },
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Bounded weighted outcome tables for /work, /fish, /dig and /scavenge.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "features.items",
    "section": "features",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Phase 09 runtime; keep disabled until acceptance.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "shop.buyback_percent",
    "section": "shop",
    "type": "integer",
    "default": 50,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Bounded Phase 09 economy configuration.",
    "risk": "financial",
    "mutable": true,
    "min": 10,
    "max": 100
  },
  {
    "key": "crafting.repair.cheap_cost",
    "section": "crafting",
    "type": "integer",
    "default": 25,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Bounded Phase 09 economy configuration.",
    "risk": "financial",
    "mutable": true,
    "min": 1,
    "max": 10000
  },
  {
    "key": "crafting.repair.standard_cost",
    "section": "crafting",
    "type": "integer",
    "default": 75,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Bounded Phase 09 economy configuration.",
    "risk": "financial",
    "mutable": true,
    "min": 1,
    "max": 10000
  },
  {
    "key": "crafting.repair.premium_cost",
    "section": "crafting",
    "type": "integer",
    "default": 150,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Bounded Phase 09 economy configuration.",
    "risk": "financial",
    "mutable": true,
    "min": 1,
    "max": 10000
  },
  {
    "key": "features.profiles",
    "section": "features",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Enable accepted profiles runtime flows. Keep disabled until acceptance passes.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "features.activity",
    "section": "features",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Enable accepted activity runtime flows. Keep disabled until acceptance passes.",
    "risk": "financial",
    "mutable": true
  },
  {
    "key": "features.spotlight",
    "section": "features",
    "type": "boolean",
    "default": false,
    "editable_by": [
      "throne",
      "chaise_lounge"
    ],
    "restart_required": false,
    "description": "Enable accepted spotlight runtime flows. Keep disabled until acceptance passes.",
    "risk": "financial",
    "mutable": true
  }
] as const satisfies readonly SettingContract[];
