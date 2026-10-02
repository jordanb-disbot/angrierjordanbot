export const CAPABILITY_MATRIX = {
  "version": 2,
  "roles": [
    "member",
    "recliner",
    "chaise_lounge",
    "throne",
    "discord_administrator",
    "guild_owner"
  ],
  "capabilities": {
    "moderation.warn": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.timeout": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.kick": [
      "chaise_lounge",
      "throne"
    ],
    "moderation.ban": [
      "chaise_lounge",
      "throne"
    ],
    "moderation.case_review": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.case_reverse": [
      "chaise_lounge",
      "throne"
    ],
    "moderation.staff_note": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "jail.send": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "jail.release": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "security.panic": [
      "throne"
    ],
    "security.anti_nuke_config": [
      "throne"
    ],
    "economy.correction": [
      "chaise_lounge",
      "throne"
    ],
    "inventory.correction": [
      "chaise_lounge",
      "throne"
    ],
    "custom_commands.manage": [
      "chaise_lounge",
      "throne"
    ],
    "custom_commands.view": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "community.manage": [
      "chaise_lounge",
      "throne"
    ],
    "intros.configure": [
      "chaise_lounge",
      "throne"
    ],
    "settings.security_critical": [
      "throne"
    ],
    "settings.general": [
      "chaise_lounge",
      "throne"
    ],
    "content.manage": [
      "chaise_lounge",
      "throne"
    ],
    "roles.manage_self_panels": [
      "chaise_lounge",
      "throne"
    ],
    "counting.restore": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "appeals.review": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "dashboard.access": [
      "discord_administrator",
      "guild_owner"
    ],
    "dashboard.force_draft_unlock": [
      "guild_owner"
    ],
    "jail.extend": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "jail.reduce": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "jail.reason_other": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "jail.history": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "jail.roster": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.purge": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.lock": [
      "chaise_lounge",
      "throne"
    ],
    "moderation.slowmode": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.quarantine": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.staff_alert": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "moderation.modstats": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "security.raid_control": [
      "chaise_lounge",
      "throne"
    ],
    "security.automod_review": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "security.heat_adjust": [
      "chaise_lounge",
      "throne"
    ],
    "items.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "profiles.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "casino.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "lottery.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "events.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "special.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "solo.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "pvp.play": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne",
      "discord_administrator",
      "guild_owner"
    ],
    "channel_games.play": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne",
      "discord_administrator",
      "guild_owner"
    ],
    "crime.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne",
      "discord_administrator",
      "guild_owner"
    ],
    "community.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne",
      "discord_administrator",
      "guild_owner"
    ],
    "family.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "chairisms.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "social.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "learning.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "introductions.use": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ]
  },
  "rules": [
    "Dashboard access is granted only to the server owner or a member with current Discord Administrator permission.",
    "Dashboard access is granted only to the server owner or a member with current Discord Administrator permission.",
    "Display names never grant authority; Discord IDs/role IDs are authoritative.",
    "Every mutation is re-authorized at execution time.",
    "Dashboard and Discord commands use the same capability service.",
    "Server owner may forcibly unlock/take over the active dashboard draft; all such actions are audited.",
    "Server owner may forcibly unlock/take over the active dashboard draft; all such actions are audited."
  ]
} as const;
