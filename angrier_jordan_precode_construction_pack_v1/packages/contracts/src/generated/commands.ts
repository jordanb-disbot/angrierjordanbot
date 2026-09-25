import type { CommandContract } from '../types.js';
export const COMMANDS = [
  {
    "id": "help",
    "preferred": "/help",
    "registered": "/help",
    "type": "slash",
    "module": "core",
    "handler": "core.help",
    "featureFlag": "core",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "help",
    "tutorialId": "bot_basics"
  },
  {
    "id": "tutorial",
    "preferred": "/tutorial",
    "registered": "/tutorial",
    "type": "slash",
    "module": "tutorial",
    "handler": "tutorial.tutorial",
    "featureFlag": "tutorial",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "tutorial",
    "tutorialId": "bot_basics"
  },
  {
    "id": "rules",
    "preferred": "/rules",
    "registered": "/rules",
    "type": "slash",
    "module": "core",
    "handler": "core.rules",
    "featureFlag": "core",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "rules",
    "tutorialId": null
  },
  {
    "id": "status",
    "preferred": "/status",
    "registered": "/status",
    "type": "slash",
    "module": "core",
    "handler": "core.status",
    "featureFlag": "core",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "status",
    "tutorialId": null
  },
  {
    "id": "bug",
    "preferred": "/bug",
    "registered": "/bug",
    "type": "slash",
    "module": "core",
    "handler": "core.bug",
    "featureFlag": "core",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [
      {
        "name": "description",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "bug",
    "tutorialId": null
  },
  {
    "id": "dms",
    "preferred": "/dms",
    "registered": "/dms",
    "type": "slash",
    "module": "core",
    "handler": "core.dms",
    "featureFlag": "core",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [
      {
        "name": "state",
        "type": "choice",
        "required": true,
        "description": "",
        "choices": [
          "on",
          "off"
        ]
      }
    ],
    "ephemeralDefault": true,
    "helpId": "dms",
    "tutorialId": null
  },
  {
    "id": "profile",
    "preferred": "/profile",
    "registered": "/profile",
    "type": "slash",
    "module": "profile",
    "handler": "profile.profile",
    "featureFlag": "profile",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "profile",
    "tutorialId": null
  },
  {
    "id": "records",
    "preferred": "/records",
    "registered": "/records",
    "type": "slash",
    "module": "profile",
    "handler": "profile.records",
    "featureFlag": "profile",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "records",
    "tutorialId": null
  },
  {
    "id": "daily",
    "preferred": "/daily",
    "registered": "/daily",
    "type": "slash",
    "module": "economy",
    "handler": "economy.daily",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "daily",
    "tutorialId": "economy"
  },
  {
    "id": "weekly",
    "preferred": "/weekly",
    "registered": "/weekly",
    "type": "slash",
    "module": "economy",
    "handler": "economy.weekly",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "weekly",
    "tutorialId": "economy"
  },
  {
    "id": "scavenge",
    "preferred": "/scavenge",
    "registered": "/scavenge",
    "type": "slash",
    "module": "economy",
    "handler": "economy.scavenge",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "scavenge",
    "tutorialId": "economy"
  },
  {
    "id": "dig",
    "preferred": "/dig",
    "registered": "/dig",
    "type": "slash",
    "module": "economy",
    "handler": "economy.dig",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "dig",
    "tutorialId": "economy"
  },
  {
    "id": "fish",
    "preferred": "/fish",
    "registered": "/fish",
    "type": "slash",
    "module": "economy",
    "handler": "economy.fish",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "fish",
    "tutorialId": "economy"
  },
  {
    "id": "work",
    "preferred": "/work",
    "registered": "/work",
    "type": "slash",
    "module": "economy",
    "handler": "economy.work",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "work",
    "tutorialId": "economy"
  },
  {
    "id": "statement",
    "preferred": "/statement",
    "registered": "/statement",
    "type": "slash",
    "module": "economy",
    "handler": "economy.statement",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "statement",
    "tutorialId": "economy"
  },
  {
    "id": "inventory",
    "preferred": "/inventory",
    "registered": "/inventory",
    "type": "slash",
    "module": "economy",
    "handler": "economy.inventory",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "inventory",
    "tutorialId": "economy"
  },
  {
    "id": "bank",
    "preferred": "/bank",
    "registered": "/bank",
    "type": "slash",
    "module": "economy",
    "handler": "economy.bank",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "bank",
    "tutorialId": "economy"
  },
  {
    "id": "shop",
    "preferred": "/shop",
    "registered": "/shop",
    "type": "slash",
    "module": "economy",
    "handler": "economy.shop",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "shop",
    "tutorialId": "economy"
  },
  {
    "id": "craft",
    "preferred": "/craft",
    "registered": "/craft",
    "type": "slash",
    "module": "economy",
    "handler": "economy.craft",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "craft",
    "tutorialId": "economy"
  },
  {
    "id": "repair",
    "preferred": "/repair",
    "registered": "/repair",
    "type": "slash",
    "module": "economy",
    "handler": "economy.repair",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "repair",
    "tutorialId": "economy"
  },
  {
    "id": "transfer",
    "preferred": "/transfer",
    "registered": "/transfer",
    "type": "slash",
    "module": "economy",
    "handler": "economy.transfer",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "amount",
        "type": "integer",
        "required": true,
        "description": "",
        "min": 1
      }
    ],
    "ephemeralDefault": false,
    "helpId": "transfer",
    "tutorialId": "economy"
  },
  {
    "id": "gift",
    "preferred": "/gift",
    "registered": "/gift",
    "type": "slash",
    "module": "economy",
    "handler": "economy.gift",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "item",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "gift",
    "tutorialId": "economy"
  },
  {
    "id": "unlock_all",
    "preferred": "/unlock all",
    "registered": "/unlock all",
    "type": "slash",
    "module": "economy",
    "handler": "economy.unlock_all",
    "featureFlag": "economy",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "unlock_all",
    "tutorialId": null
  },
  {
    "id": "blackjack",
    "preferred": "/casino blackjack",
    "registered": "/casino blackjack",
    "type": "slash",
    "module": "casino",
    "handler": "casino.blackjack",
    "featureFlag": "casino",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "blackjack",
    "tutorialId": "casino"
  },
  {
    "id": "roulette",
    "preferred": "/casino roulette",
    "registered": "/casino roulette",
    "type": "slash",
    "module": "casino",
    "handler": "casino.roulette",
    "featureFlag": "casino",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "roulette",
    "tutorialId": "casino"
  },
  {
    "id": "slots",
    "preferred": "/casino slots",
    "registered": "/casino slots",
    "type": "slash",
    "module": "casino",
    "handler": "casino.slots",
    "featureFlag": "casino",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "slots",
    "tutorialId": "casino"
  },
  {
    "id": "dice",
    "preferred": "/casino dice",
    "registered": "/casino dice",
    "type": "slash",
    "module": "casino",
    "handler": "casino.dice",
    "featureFlag": "casino",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "dice",
    "tutorialId": "casino"
  },
  {
    "id": "coinflip",
    "preferred": "/casino coinflip",
    "registered": "/casino coinflip",
    "type": "slash",
    "module": "casino",
    "handler": "casino.coinflip",
    "featureFlag": "casino",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "coinflip",
    "tutorialId": "casino"
  },
  {
    "id": "lottery",
    "preferred": "/lottery",
    "registered": "/lottery",
    "type": "slash",
    "module": "casino",
    "handler": "casino.lottery",
    "featureFlag": "casino",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "lottery",
    "tutorialId": "casino"
  },
  {
    "id": "giveaway",
    "preferred": "/giveaway",
    "registered": "/giveaway",
    "type": "slash",
    "module": "community",
    "handler": "community.giveaway",
    "featureFlag": "community",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "giveaway",
    "tutorialId": "community"
  },
  {
    "id": "race",
    "preferred": "!race",
    "registered": "!race",
    "type": "special_text",
    "module": "special_commands",
    "handler": "race.specialRace",
    "featureFlag": "race",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "race",
    "tutorialId": "games"
  },
  {
    "id": "fight",
    "preferred": "/fight @member",
    "registered": "/fight",
    "type": "slash",
    "module": "fight",
    "handler": "fight.fight",
    "featureFlag": "fight",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": "Opponent to fight."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "fight",
    "tutorialId": "games"
  },
  {
    "id": "tictactoe",
    "preferred": "/game tictactoe",
    "registered": "/game tictactoe",
    "type": "slash",
    "module": "pvp",
    "handler": "pvp.tictactoe",
    "featureFlag": "pvp",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "wager",
        "type": "integer",
        "required": false,
        "description": "",
        "min": 0
      }
    ],
    "ephemeralDefault": false,
    "helpId": "tictactoe",
    "tutorialId": "games"
  },
  {
    "id": "connectfour",
    "preferred": "/game connectfour",
    "registered": "/game connectfour",
    "type": "slash",
    "module": "pvp",
    "handler": "pvp.connectfour",
    "featureFlag": "pvp",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "wager",
        "type": "integer",
        "required": false,
        "description": "",
        "min": 0
      }
    ],
    "ephemeralDefault": false,
    "helpId": "connectfour",
    "tutorialId": "games"
  },
  {
    "id": "battleship",
    "preferred": "/game battleship",
    "registered": "/game battleship",
    "type": "slash",
    "module": "pvp",
    "handler": "pvp.battleship",
    "featureFlag": "pvp",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "wager",
        "type": "integer",
        "required": false,
        "description": "",
        "min": 0
      }
    ],
    "ephemeralDefault": false,
    "helpId": "battleship",
    "tutorialId": "games"
  },
  {
    "id": "fmk",
    "preferred": "/fmk",
    "registered": "/fmk",
    "type": "slash",
    "module": "party_games",
    "handler": "party_games.fmk",
    "featureFlag": "party_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "fmk",
    "tutorialId": "games"
  },
  {
    "id": "truthordare",
    "preferred": "/truthordare",
    "registered": "/truthordare",
    "type": "slash",
    "module": "party_games",
    "handler": "party_games.truthordare",
    "featureFlag": "party_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "truthordare",
    "tutorialId": "games"
  },
  {
    "id": "wyr",
    "preferred": "/wyr",
    "registered": "/wyr",
    "type": "slash",
    "module": "party_games",
    "handler": "party_games.wyr",
    "featureFlag": "party_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "category",
        "type": "choice",
        "required": false,
        "description": "",
        "choices": [
          "Casual",
          "Friends",
          "Dating",
          "Married",
          "Spicy",
          "Unhinged",
          "Random"
        ]
      }
    ],
    "ephemeralDefault": false,
    "helpId": "wyr",
    "tutorialId": "games"
  },
  {
    "id": "wwyd",
    "preferred": "/wwyd",
    "registered": "/wwyd",
    "type": "slash",
    "module": "party_games",
    "handler": "party_games.wwyd",
    "featureFlag": "party_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "category",
        "type": "choice",
        "required": false,
        "description": "",
        "choices": [
          "Casual",
          "Friends",
          "Dating",
          "Married",
          "Spicy",
          "Unhinged",
          "Random"
        ]
      }
    ],
    "ephemeralDefault": false,
    "helpId": "wwyd",
    "tutorialId": "games"
  },
  {
    "id": "finish",
    "preferred": "/finishsentence",
    "registered": "/finishsentence",
    "type": "slash",
    "module": "party_games",
    "handler": "party_games.finish",
    "featureFlag": "party_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "finish",
    "tutorialId": "games"
  },
  {
    "id": "onewordstory",
    "preferred": "/onewordstory",
    "registered": "/onewordstory",
    "type": "slash",
    "module": "party_games",
    "handler": "party_games.onewordstory",
    "featureFlag": "party_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [
      {
        "name": "length",
        "type": "integer",
        "required": false,
        "description": "",
        "min": 10,
        "max": 200
      }
    ],
    "ephemeralDefault": false,
    "helpId": "onewordstory",
    "tutorialId": "games"
  },
  {
    "id": "line",
    "preferred": "!line",
    "registered": "!line",
    "type": "special_text",
    "module": "special_commands",
    "handler": "line.specialLine",
    "featureFlag": "line",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "line",
    "tutorialId": "games"
  },
  {
    "id": "poll",
    "preferred": "/poll",
    "registered": "/poll",
    "type": "slash",
    "module": "community",
    "handler": "community.poll",
    "featureFlag": "community",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "poll",
    "tutorialId": "community"
  },
  {
    "id": "superlatives",
    "preferred": "/superlatives",
    "registered": "/superlatives",
    "type": "slash",
    "module": "community",
    "handler": "community.superlatives",
    "featureFlag": "community",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "superlatives",
    "tutorialId": "community"
  },
  {
    "id": "suggest",
    "preferred": "/suggest",
    "registered": "/suggest",
    "type": "slash",
    "module": "community",
    "handler": "community.suggest",
    "featureFlag": "community",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "suggest",
    "tutorialId": "community"
  },
  {
    "id": "ama",
    "preferred": "/ama",
    "registered": "/ama",
    "type": "slash",
    "module": "community",
    "handler": "community.ama",
    "featureFlag": "community",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "ama",
    "tutorialId": "community"
  },
  {
    "id": "roles",
    "preferred": "/roles",
    "registered": "/roles",
    "type": "slash",
    "module": "roles",
    "handler": "roles.roles",
    "featureFlag": "roles",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "roles",
    "tutorialId": "introductions_roles"
  },
  {
    "id": "quote_message",
    "preferred": "/quote message",
    "registered": "/quote message",
    "type": "slash",
    "module": "chairisms",
    "handler": "chairisms.quote_message",
    "featureFlag": "chairisms",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_non_private"
    ],
    "options": [
      {
        "name": "message_link",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "quote_message",
    "tutorialId": "community"
  },
  {
    "id": "quote_text",
    "preferred": "/quote text",
    "registered": "/quote text",
    "type": "slash",
    "module": "chairisms",
    "handler": "chairisms.quote_text",
    "featureFlag": "chairisms",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_non_private"
    ],
    "options": [
      {
        "name": "text",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "quote_text",
    "tutorialId": "community"
  },
  {
    "id": "chairisms_recent",
    "preferred": "/chairisms recent",
    "registered": "/chairisms recent",
    "type": "slash",
    "module": "chairisms",
    "handler": "chairisms.chairisms_recent",
    "featureFlag": "chairisms",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "chairisms_recent",
    "tutorialId": null
  },
  {
    "id": "chairisms_member",
    "preferred": "/chairisms member",
    "registered": "/chairisms member",
    "type": "slash",
    "module": "chairisms",
    "handler": "chairisms.chairisms_member",
    "featureFlag": "chairisms",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "chairisms_member",
    "tutorialId": null
  },
  {
    "id": "chairisms_random",
    "preferred": "/chairisms random",
    "registered": "/chairisms random",
    "type": "slash",
    "module": "chairisms",
    "handler": "chairisms.chairisms_random",
    "featureFlag": "chairisms",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "chairisms_random",
    "tutorialId": null
  },
  {
    "id": "music_play",
    "preferred": "/play",
    "registered": "/play",
    "type": "slash",
    "module": "music",
    "handler": "music.music_play",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [
      {
        "name": "query_or_link",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "music_play",
    "tutorialId": "music"
  },
  {
    "id": "music_pause",
    "preferred": "/music pause",
    "registered": "/music pause",
    "type": "slash",
    "module": "music",
    "handler": "music.music_pause",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_pause",
    "tutorialId": "music"
  },
  {
    "id": "music_resume",
    "preferred": "/music resume",
    "registered": "/music resume",
    "type": "slash",
    "module": "music",
    "handler": "music.music_resume",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_resume",
    "tutorialId": "music"
  },
  {
    "id": "music_skip",
    "preferred": "/music skip",
    "registered": "/music skip",
    "type": "slash",
    "module": "music",
    "handler": "music.music_skip",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_skip",
    "tutorialId": "music"
  },
  {
    "id": "music_previous",
    "preferred": "/music previous",
    "registered": "/music previous",
    "type": "slash",
    "module": "music",
    "handler": "music.music_previous",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_previous",
    "tutorialId": "music"
  },
  {
    "id": "music_stop",
    "preferred": "/music stop",
    "registered": "/music stop",
    "type": "slash",
    "module": "music",
    "handler": "music.music_stop",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_stop",
    "tutorialId": "music"
  },
  {
    "id": "music_replay",
    "preferred": "/music replay",
    "registered": "/music replay",
    "type": "slash",
    "module": "music",
    "handler": "music.music_replay",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_replay",
    "tutorialId": "music"
  },
  {
    "id": "music_seek",
    "preferred": "/music seek",
    "registered": "/music seek",
    "type": "slash",
    "module": "music",
    "handler": "music.music_seek",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [
      {
        "name": "value",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "music_seek",
    "tutorialId": "music"
  },
  {
    "id": "music_queue",
    "preferred": "/music queue",
    "registered": "/music queue",
    "type": "slash",
    "module": "music",
    "handler": "music.music_queue",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_queue",
    "tutorialId": "music"
  },
  {
    "id": "music_remove",
    "preferred": "/music remove",
    "registered": "/music remove",
    "type": "slash",
    "module": "music",
    "handler": "music.music_remove",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [
      {
        "name": "value",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "music_remove",
    "tutorialId": "music"
  },
  {
    "id": "music_move",
    "preferred": "/music move",
    "registered": "/music move",
    "type": "slash",
    "module": "music",
    "handler": "music.music_move",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [
      {
        "name": "value",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "music_move",
    "tutorialId": "music"
  },
  {
    "id": "music_clear",
    "preferred": "/music clear",
    "registered": "/music clear",
    "type": "slash",
    "module": "music",
    "handler": "music.music_clear",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_clear",
    "tutorialId": "music"
  },
  {
    "id": "music_shuffle",
    "preferred": "/music shuffle",
    "registered": "/music shuffle",
    "type": "slash",
    "module": "music",
    "handler": "music.music_shuffle",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_shuffle",
    "tutorialId": "music"
  },
  {
    "id": "music_jump",
    "preferred": "/music jump",
    "registered": "/music jump",
    "type": "slash",
    "module": "music",
    "handler": "music.music_jump",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [
      {
        "name": "value",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "music_jump",
    "tutorialId": "music"
  },
  {
    "id": "music_loop",
    "preferred": "/music loop",
    "registered": "/music loop",
    "type": "slash",
    "module": "music",
    "handler": "music.music_loop",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_loop",
    "tutorialId": "music"
  },
  {
    "id": "music_autoplay",
    "preferred": "/music autoplay",
    "registered": "/music autoplay",
    "type": "slash",
    "module": "music",
    "handler": "music.music_autoplay",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_autoplay",
    "tutorialId": "music"
  },
  {
    "id": "music_volume",
    "preferred": "/music volume",
    "registered": "/music volume",
    "type": "slash",
    "module": "music",
    "handler": "music.music_volume",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [
      {
        "name": "value",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "music_volume",
    "tutorialId": "music"
  },
  {
    "id": "music_nowplaying",
    "preferred": "/music nowplaying",
    "registered": "/music nowplaying",
    "type": "slash",
    "module": "music",
    "handler": "music.music_nowplaying",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_nowplaying",
    "tutorialId": "music"
  },
  {
    "id": "music_history",
    "preferred": "/music history",
    "registered": "/music history",
    "type": "slash",
    "module": "music",
    "handler": "music.music_history",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_history",
    "tutorialId": "music"
  },
  {
    "id": "music_join",
    "preferred": "/music join",
    "registered": "/music join",
    "type": "slash",
    "module": "music",
    "handler": "music.music_join",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_join",
    "tutorialId": "music"
  },
  {
    "id": "music_leave",
    "preferred": "/music leave",
    "registered": "/music leave",
    "type": "slash",
    "module": "music",
    "handler": "music.music_leave",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "music_leave",
    "tutorialId": "music"
  },
  {
    "id": "playlist_create",
    "preferred": "/playlist create",
    "registered": "/playlist create",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_create",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_create",
    "tutorialId": "music"
  },
  {
    "id": "playlist_add",
    "preferred": "/playlist add",
    "registered": "/playlist add",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_add",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_add",
    "tutorialId": "music"
  },
  {
    "id": "playlist_remove",
    "preferred": "/playlist remove",
    "registered": "/playlist remove",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_remove",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_remove",
    "tutorialId": "music"
  },
  {
    "id": "playlist_play",
    "preferred": "/playlist play",
    "registered": "/playlist play",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_play",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_play",
    "tutorialId": "music"
  },
  {
    "id": "playlist_rename",
    "preferred": "/playlist rename",
    "registered": "/playlist rename",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_rename",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_rename",
    "tutorialId": "music"
  },
  {
    "id": "playlist_delete",
    "preferred": "/playlist delete",
    "registered": "/playlist delete",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_delete",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_delete",
    "tutorialId": "music"
  },
  {
    "id": "playlist_view",
    "preferred": "/playlist view",
    "registered": "/playlist view",
    "type": "slash",
    "module": "music",
    "handler": "music.playlist_view",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "playlist_view",
    "tutorialId": "music"
  },
  {
    "id": "music_help",
    "preferred": "/music help",
    "registered": "/music help",
    "type": "slash",
    "module": "music",
    "handler": "music.music_help",
    "featureFlag": "music",
    "permissions": [
      "member"
    ],
    "channels": [
      "voice_text_chat"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "music_help",
    "tutorialId": "music"
  },
  {
    "id": "social_ts",
    "preferred": "/social ts",
    "registered": "/social ts",
    "type": "slash",
    "module": "social",
    "handler": "social.social_ts",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_ts",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_hit",
    "preferred": "/social hit",
    "registered": "/social hit",
    "type": "slash",
    "module": "social",
    "handler": "social.social_hit",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_hit",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_slap",
    "preferred": "/social slap",
    "registered": "/social slap",
    "type": "slash",
    "module": "social",
    "handler": "social.social_slap",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_slap",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_pillow",
    "preferred": "/social pillow",
    "registered": "/social pillow",
    "type": "slash",
    "module": "social",
    "handler": "social.social_pillow",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_pillow",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_cushion",
    "preferred": "/social cushion",
    "registered": "/social cushion",
    "type": "slash",
    "module": "social",
    "handler": "social.social_cushion",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_cushion",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_stab",
    "preferred": "/social stab",
    "registered": "/social stab",
    "type": "slash",
    "module": "social",
    "handler": "social.social_stab",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_stab",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_choke",
    "preferred": "/social choke",
    "registered": "/social choke",
    "type": "slash",
    "module": "social",
    "handler": "social.social_choke",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_choke",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_shh",
    "preferred": "/social shh",
    "registered": "/social shh",
    "type": "slash",
    "module": "social",
    "handler": "social.social_shh",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_shh",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_belittle",
    "preferred": "/social belittle",
    "registered": "/social belittle",
    "type": "slash",
    "module": "social",
    "handler": "social.social_belittle",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_belittle",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_bonk",
    "preferred": "/social bonk",
    "registered": "/social bonk",
    "type": "slash",
    "module": "social",
    "handler": "social.social_bonk",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_bonk",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_yeet",
    "preferred": "/social yeet",
    "registered": "/social yeet",
    "type": "slash",
    "module": "social",
    "handler": "social.social_yeet",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_yeet",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_sit",
    "preferred": "/social sit",
    "registered": "/social sit",
    "type": "slash",
    "module": "social",
    "handler": "social.social_sit",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_sit",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_standup",
    "preferred": "/social standup",
    "registered": "/social standup",
    "type": "slash",
    "module": "social",
    "handler": "social.social_standup",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_standup",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_fold",
    "preferred": "/social fold",
    "registered": "/social fold",
    "type": "slash",
    "module": "social",
    "handler": "social.social_fold",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_fold",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_recline",
    "preferred": "/social recline",
    "registered": "/social recline",
    "type": "slash",
    "module": "social",
    "handler": "social.social_recline",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_recline",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_sideeye",
    "preferred": "/social sideeye",
    "registered": "/social sideeye",
    "type": "slash",
    "module": "social",
    "handler": "social.social_sideeye",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_sideeye",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_judge",
    "preferred": "/social judge",
    "registered": "/social judge",
    "type": "slash",
    "module": "social",
    "handler": "social.social_judge",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_judge",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_shame",
    "preferred": "/social shame",
    "registered": "/social shame",
    "type": "slash",
    "module": "social",
    "handler": "social.social_shame",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_shame",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_boo",
    "preferred": "/social boo",
    "registered": "/social boo",
    "type": "slash",
    "module": "social",
    "handler": "social.social_boo",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_boo",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_bruh",
    "preferred": "/social bruh",
    "registered": "/social bruh",
    "type": "slash",
    "module": "social",
    "handler": "social.social_bruh",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_bruh",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_wtf",
    "preferred": "/social wtf",
    "registered": "/social wtf",
    "type": "slash",
    "module": "social",
    "handler": "social.social_wtf",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_wtf",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_sus",
    "preferred": "/social sus",
    "registered": "/social sus",
    "type": "slash",
    "module": "social",
    "handler": "social.social_sus",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_sus",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_yap",
    "preferred": "/social yap",
    "registered": "/social yap",
    "type": "slash",
    "module": "social",
    "handler": "social.social_yap",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_yap",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_touchgrass",
    "preferred": "/social touchgrass",
    "registered": "/social touchgrass",
    "type": "slash",
    "module": "social",
    "handler": "social.social_touchgrass",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_touchgrass",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_blame",
    "preferred": "/social blame",
    "registered": "/social blame",
    "type": "slash",
    "module": "social",
    "handler": "social.social_blame",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_blame",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_disappoint",
    "preferred": "/social disappoint",
    "registered": "/social disappoint",
    "type": "slash",
    "module": "social",
    "handler": "social.social_disappoint",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_disappoint",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_chaircheck",
    "preferred": "/social chaircheck",
    "registered": "/social chaircheck",
    "type": "slash",
    "module": "social",
    "handler": "social.social_chaircheck",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_chaircheck",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_throwchair",
    "preferred": "/social throwchair",
    "registered": "/social throwchair",
    "type": "slash",
    "module": "social",
    "handler": "social.social_throwchair",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_throwchair",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_getup",
    "preferred": "/social getup",
    "registered": "/social getup",
    "type": "slash",
    "module": "social",
    "handler": "social.social_getup",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_getup",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_calmdown",
    "preferred": "/social calmdown",
    "registered": "/social calmdown",
    "type": "slash",
    "module": "social",
    "handler": "social.social_calmdown",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_calmdown",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_absolutelynot",
    "preferred": "/social absolutelynot",
    "registered": "/social absolutelynot",
    "type": "slash",
    "module": "social",
    "handler": "social.social_absolutelynot",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_absolutelynot",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_explainyourself",
    "preferred": "/social explainyourself",
    "registered": "/social explainyourself",
    "type": "slash",
    "module": "social",
    "handler": "social.social_explainyourself",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_explainyourself",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_embarrassing",
    "preferred": "/social embarrassing",
    "registered": "/social embarrassing",
    "type": "slash",
    "module": "social",
    "handler": "social.social_embarrassing",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_embarrassing",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_questionable",
    "preferred": "/social questionable",
    "registered": "/social questionable",
    "type": "slash",
    "module": "social",
    "handler": "social.social_questionable",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_questionable",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_respect",
    "preferred": "/social respect",
    "registered": "/social respect",
    "type": "slash",
    "module": "social",
    "handler": "social.social_respect",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_respect",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_compliment",
    "preferred": "/social compliment",
    "registered": "/social compliment",
    "type": "slash",
    "module": "social",
    "handler": "social.social_compliment",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "social_compliment",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_wheresmyvape",
    "preferred": "/social wheresmyvape",
    "registered": "/social wheresmyvape",
    "type": "slash",
    "module": "social",
    "handler": "social.social_wheresmyvape",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "social_wheresmyvape",
    "tutorialId": "social_commands"
  },
  {
    "id": "social_hitthegeekbar",
    "preferred": "/social hitthegeekbar",
    "registered": "/social hitthegeekbar",
    "type": "slash",
    "module": "social",
    "handler": "social.social_hitthegeekbar",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "social_hitthegeekbar",
    "tutorialId": "social_commands"
  },
  {
    "id": "roast",
    "preferred": "/social roast",
    "registered": "/social roast",
    "type": "slash",
    "module": "social",
    "handler": "social.roast",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "roast",
    "tutorialId": "social_commands"
  },
  {
    "id": "notmad",
    "preferred": "/social notmad",
    "registered": "/social notmad",
    "type": "slash",
    "module": "social",
    "handler": "social.notmad",
    "featureFlag": "social",
    "permissions": [
      "throne"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "notmad",
    "tutorialId": null
  },
  {
    "id": "introduce",
    "preferred": "/introduce",
    "registered": "/introduce",
    "type": "slash",
    "module": "introductions",
    "handler": "introductions.introduce",
    "featureFlag": "introductions",
    "permissions": [
      "member"
    ],
    "channels": [
      "introduction_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "introduce",
    "tutorialId": "introductions_roles"
  },
  {
    "id": "introduce_edit",
    "preferred": "/introduce edit",
    "registered": "/introduce edit",
    "type": "slash",
    "module": "introductions",
    "handler": "introductions.introduce_edit",
    "featureFlag": "introductions",
    "permissions": [
      "member"
    ],
    "channels": [
      "introduction_channel"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "introduce_edit",
    "tutorialId": "introductions_roles"
  },
  {
    "id": "introduce_preview",
    "preferred": "/introduce preview",
    "registered": "/introduce preview",
    "type": "slash",
    "module": "introductions",
    "handler": "introductions.introduce_preview",
    "featureFlag": "introductions",
    "permissions": [
      "member"
    ],
    "channels": [
      "introduction_channel"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "introduce_preview",
    "tutorialId": "introductions_roles"
  },
  {
    "id": "intro_config",
    "preferred": "/intro-config",
    "registered": "/intro-config",
    "type": "slash",
    "module": "introductions",
    "handler": "introductions.intro_config",
    "featureFlag": "introductions",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "introduction_channel"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "intro_config",
    "tutorialId": "owner_admin"
  },
  {
    "id": "rob",
    "preferred": "/crime rob",
    "registered": "/crime rob",
    "type": "slash",
    "module": "crime",
    "handler": "crime.rob",
    "featureFlag": "crime",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": false,
    "helpId": "rob",
    "tutorialId": "crime_family"
  },
  {
    "id": "crime_911",
    "preferred": "/crime 911",
    "registered": "/crime 911",
    "type": "slash",
    "module": "crime",
    "handler": "crime.crime_911",
    "featureFlag": "crime",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "crime_911",
    "tutorialId": "crime_family"
  },
  {
    "id": "crime_wanted",
    "preferred": "/crime wanted",
    "registered": "/crime wanted",
    "type": "slash",
    "module": "crime",
    "handler": "crime.crime_wanted",
    "featureFlag": "crime",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "crime_wanted",
    "tutorialId": "crime_family"
  },
  {
    "id": "crime_bail",
    "preferred": "/crime bail",
    "registered": "/crime bail",
    "type": "slash",
    "module": "crime",
    "handler": "crime.crime_bail",
    "featureFlag": "crime",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "crime_bail",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_marry",
    "preferred": "/family marry",
    "registered": "/family marry",
    "type": "slash",
    "module": "family",
    "handler": "family.family_marry",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_marry",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_divorce",
    "preferred": "/family divorce",
    "registered": "/family divorce",
    "type": "slash",
    "module": "family",
    "handler": "family.family_divorce",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_divorce",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_adopt",
    "preferred": "/family adopt",
    "registered": "/family adopt",
    "type": "slash",
    "module": "family",
    "handler": "family.family_adopt",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_adopt",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_disown",
    "preferred": "/family disown",
    "registered": "/family disown",
    "type": "slash",
    "module": "family",
    "handler": "family.family_disown",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_disown",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_emancipate",
    "preferred": "/family emancipate",
    "registered": "/family emancipate",
    "type": "slash",
    "module": "family",
    "handler": "family.family_emancipate",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_emancipate",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_familytree",
    "preferred": "/family familytree",
    "registered": "/family familytree",
    "type": "slash",
    "module": "family",
    "handler": "family.family_familytree",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_familytree",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_will",
    "preferred": "/family will",
    "registered": "/family will",
    "type": "slash",
    "module": "family",
    "handler": "family.family_will",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_will",
    "tutorialId": "crime_family"
  },
  {
    "id": "family_familyauction",
    "preferred": "/family familyauction",
    "registered": "/family familyauction",
    "type": "slash",
    "module": "family",
    "handler": "family.family_familyauction",
    "featureFlag": "family",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "family_familyauction",
    "tutorialId": "crime_family"
  },
  {
    "id": "warn",
    "preferred": "/mod warn",
    "registered": "/mod warn",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.warn",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "warn",
    "tutorialId": "staff_academy"
  },
  {
    "id": "timeout",
    "preferred": "/mod timeout",
    "registered": "/mod timeout",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.timeout",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "duration",
        "type": "duration",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "timeout",
    "tutorialId": "staff_academy"
  },
  {
    "id": "untimeout",
    "preferred": "/mod untimeout",
    "registered": "/mod untimeout",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.untimeout",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "untimeout",
    "tutorialId": "staff_academy"
  },
  {
    "id": "kick",
    "preferred": "/mod kick",
    "registered": "/mod kick",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.kick",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "kick",
    "tutorialId": "staff_academy"
  },
  {
    "id": "ban",
    "preferred": "/mod ban",
    "registered": "/mod ban",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.ban",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "duration",
        "type": "duration",
        "required": false,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "ban",
    "tutorialId": "staff_academy"
  },
  {
    "id": "unban",
    "preferred": "/mod unban",
    "registered": "/mod unban",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.unban",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "user_id",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "unban",
    "tutorialId": "staff_academy"
  },
  {
    "id": "purge",
    "preferred": "/mod purge",
    "registered": "/mod purge",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.purge",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "count",
        "type": "integer",
        "required": true,
        "description": "",
        "min": 1,
        "max": 100
      },
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Reason for the cleanup."
      }
    ],
    "ephemeralDefault": true,
    "helpId": "purge",
    "tutorialId": "staff_academy"
  },
  {
    "id": "note",
    "preferred": "/mod note",
    "registered": "/mod note",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.note",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "text",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "note",
    "tutorialId": "staff_academy"
  },
  {
    "id": "history_mod",
    "preferred": "/mod history",
    "registered": "/mod history",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.history_mod",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "history_mod",
    "tutorialId": "staff_academy"
  },
  {
    "id": "case_view",
    "preferred": "/mod case view",
    "registered": "/mod case view",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.case_view",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "case_id",
        "type": "integer",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "case_view",
    "tutorialId": "staff_academy"
  },
  {
    "id": "case_edit",
    "preferred": "/mod case edit",
    "registered": "/mod case edit",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.case_edit",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "case_id",
        "type": "integer",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "case_edit",
    "tutorialId": "staff_academy"
  },
  {
    "id": "case_reverse",
    "preferred": "/mod case reverse",
    "registered": "/mod case reverse",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.case_reverse",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "case_id",
        "type": "integer",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "case_reverse",
    "tutorialId": "staff_academy"
  },
  {
    "id": "lock",
    "preferred": "/mod lock",
    "registered": "/mod lock",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.lock",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "channel",
        "type": "channel",
        "required": false,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Reason for locking the channel."
      }
    ],
    "ephemeralDefault": true,
    "helpId": "lock",
    "tutorialId": "staff_academy"
  },
  {
    "id": "unlock",
    "preferred": "/mod unlock",
    "registered": "/mod unlock",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.unlock",
    "featureFlag": "moderation",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "channel",
        "type": "channel",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "unlock",
    "tutorialId": "staff_academy"
  },
  {
    "id": "slowmode",
    "preferred": "/mod slowmode",
    "registered": "/mod slowmode",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.slowmode",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "channel",
        "type": "channel",
        "required": false,
        "description": ""
      },
      {
        "name": "duration",
        "type": "duration",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "slowmode",
    "tutorialId": "staff_academy"
  },
  {
    "id": "quarantine",
    "preferred": "/mod quarantine",
    "registered": "/mod quarantine",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.quarantine",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "message_link",
        "type": "string",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Reason for quarantining the message."
      }
    ],
    "ephemeralDefault": true,
    "helpId": "quarantine",
    "tutorialId": "staff_academy"
  },
  {
    "id": "staff_alert",
    "preferred": "/mod staff-alert",
    "registered": "/mod staff-alert",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.staff_alert",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": ""
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "staff_alert",
    "tutorialId": "staff_academy"
  },
  {
    "id": "modstats",
    "preferred": "/mod modstats",
    "registered": "/mod modstats",
    "type": "slash",
    "module": "moderation",
    "handler": "moderation.modstats",
    "featureFlag": "moderation",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff_or_any_target"
    ],
    "options": [
      {
        "name": "period",
        "type": "string",
        "required": false,
        "description": ""
      }
    ],
    "ephemeralDefault": true,
    "helpId": "modstats",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_send",
    "preferred": "/jail send",
    "registered": "/jail send",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_send",
    "featureFlag": "jail",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": "Member to place in moderation Hotseat."
      },
      {
        "name": "duration",
        "type": "string",
        "required": true,
        "description": "5m–30d or indefinite."
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Moderation reason linked to the case."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_send",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_release",
    "preferred": "/jail release",
    "registered": "/jail release",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_release",
    "featureFlag": "jail",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": "Jailed member to release."
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Reason for release."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_release",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_extend",
    "preferred": "/jail extend",
    "registered": "/jail extend",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_extend",
    "featureFlag": "jail",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": "Jailed member."
      },
      {
        "name": "duration",
        "type": "string",
        "required": true,
        "description": "Additional sentence time."
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Reason for extension."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_extend",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_reduce",
    "preferred": "/jail reduce",
    "registered": "/jail reduce",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_reduce",
    "featureFlag": "jail",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": "Jailed member."
      },
      {
        "name": "duration",
        "type": "string",
        "required": true,
        "description": "Amount of time to subtract."
      },
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Reason for reduction."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_reduce",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_reason",
    "preferred": "/jail reason",
    "registered": "/jail reason",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_reason",
    "featureFlag": "jail",
    "permissions": [
      "member",
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": "Member to inspect; omit for yourself."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_reason",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_history",
    "preferred": "/jail history",
    "registered": "/jail history",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_history",
    "featureFlag": "jail",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": true,
        "description": "Member whose moderation Hotseat history to view."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_history",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_roster",
    "preferred": "/jail roster",
    "registered": "/jail roster",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_roster",
    "featureFlag": "jail",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "type",
        "type": "choice",
        "required": false,
        "description": "Filter active jail states.",
        "choices": [
          "all",
          "crime",
          "moderation"
        ]
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_roster",
    "tutorialId": "staff_academy"
  },
  {
    "id": "jail_status",
    "preferred": "/jail status",
    "registered": "/jail status",
    "type": "slash",
    "module": "jail",
    "handler": "jail.jail_status",
    "featureFlag": "jail",
    "permissions": [
      "member"
    ],
    "channels": [
      "hotseat_or_staff"
    ],
    "options": [
      {
        "name": "member",
        "type": "user",
        "required": false,
        "description": "Member to inspect; omit for yourself."
      }
    ],
    "ephemeralDefault": false,
    "helpId": "jail_status",
    "tutorialId": "moderation_safety"
  },
  {
    "id": "panic_activate",
    "preferred": "/panic activate",
    "registered": "/panic activate",
    "type": "slash",
    "module": "security",
    "handler": "security.panic_activate",
    "featureFlag": "security",
    "permissions": [
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [
      {
        "name": "reason",
        "type": "string",
        "required": true,
        "description": "Emergency reason recorded in the security audit."
      }
    ],
    "ephemeralDefault": true,
    "helpId": "panic_activate",
    "tutorialId": "staff_academy"
  },
  {
    "id": "panic_deactivate",
    "preferred": "/panic deactivate",
    "registered": "/panic deactivate",
    "type": "slash",
    "module": "security",
    "handler": "security.panic_deactivate",
    "featureFlag": "security",
    "permissions": [
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "panic_deactivate",
    "tutorialId": "staff_academy"
  },
  {
    "id": "panic_status",
    "preferred": "/panic status",
    "registered": "/panic status",
    "type": "slash",
    "module": "security",
    "handler": "security.panic_status",
    "featureFlag": "security",
    "permissions": [
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "panic_status",
    "tutorialId": "staff_academy"
  },
  {
    "id": "custom_create",
    "preferred": "/custom-command create",
    "registered": "/custom-command create",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_create",
    "featureFlag": "custom_commands",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_create",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_edit",
    "preferred": "/custom-command edit",
    "registered": "/custom-command edit",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_edit",
    "featureFlag": "custom_commands",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_edit",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_delete",
    "preferred": "/custom-command delete",
    "registered": "/custom-command delete",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_delete",
    "featureFlag": "custom_commands",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_delete",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_enable",
    "preferred": "/custom-command enable",
    "registered": "/custom-command enable",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_enable",
    "featureFlag": "custom_commands",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_enable",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_disable",
    "preferred": "/custom-command disable",
    "registered": "/custom-command disable",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_disable",
    "featureFlag": "custom_commands",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_disable",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_list",
    "preferred": "/custom-command list",
    "registered": "/custom-command list",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_list",
    "featureFlag": "custom_commands",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_list",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_test",
    "preferred": "/custom-command test",
    "registered": "/custom-command test",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_test",
    "featureFlag": "custom_commands",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_test",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_clone",
    "preferred": "/custom-command clone",
    "registered": "/custom-command clone",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_clone",
    "featureFlag": "custom_commands",
    "permissions": [
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_clone",
    "tutorialId": "owner_admin"
  },
  {
    "id": "custom_info",
    "preferred": "/custom-command info",
    "registered": "/custom-command info",
    "type": "slash",
    "module": "custom_commands",
    "handler": "custom_commands.custom_info",
    "featureFlag": "custom_commands",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "custom_info",
    "tutorialId": "owner_admin"
  },
  {
    "id": "setup",
    "preferred": "/setup",
    "registered": "/setup",
    "type": "slash",
    "module": "bootstrap",
    "handler": "bootstrap.setup",
    "featureFlag": "bootstrap",
    "permissions": [
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "setup",
    "tutorialId": "owner_admin"
  },
  {
    "id": "setup_health",
    "preferred": "/setup health",
    "registered": "/setup health",
    "type": "slash",
    "module": "bootstrap",
    "handler": "bootstrap.health",
    "featureFlag": "bootstrap",
    "permissions": [
      "recliner",
      "chaise_lounge",
      "throne"
    ],
    "channels": [
      "staff"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "setup_health",
    "tutorialId": "staff_academy"
  },
  {
    "id": "chairism_context",
    "preferred": "Create Chairism",
    "registered": "Create Chairism",
    "type": "context_message",
    "module": "chairisms",
    "handler": "chairisms.contextCreate",
    "featureFlag": "chairisms",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_non_private"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "quote_message",
    "tutorialId": "community"
  },
  {
    "id": "tldr_chat",
    "preferred": "/tldr chat",
    "registered": "/tldr chat",
    "type": "slash",
    "module": "profile",
    "handler": "profile.tldrChat",
    "featureFlag": "profile",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [
      {
        "name": "time",
        "type": "choice",
        "required": true,
        "description": "Rolling chat window.",
        "choices": [
          "1h",
          "2h",
          "4h",
          "8h"
        ]
      }
    ],
    "ephemeralDefault": true,
    "helpId": "tldr_chat",
    "tutorialId": null
  },
  {
    "id": "tldr_events",
    "preferred": "/tldr events",
    "registered": "/tldr events",
    "type": "slash",
    "module": "profile",
    "handler": "profile.tldrEvents",
    "featureFlag": "profile",
    "permissions": [
      "member"
    ],
    "channels": [
      "bot_channel"
    ],
    "options": [
      {
        "name": "time",
        "type": "choice",
        "required": true,
        "description": "Rolling event window.",
        "choices": [
          "1d",
          "7d"
        ]
      }
    ],
    "ephemeralDefault": true,
    "helpId": "tldr_events",
    "tutorialId": null
  },
  {
    "id": "special_vc",
    "preferred": "!vc",
    "registered": "!vc",
    "type": "special_text",
    "module": "special_commands",
    "handler": "special_commands.vc",
    "featureFlag": "special_commands",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "special_vc",
    "tutorialId": "bot_basics"
  },
  {
    "id": "special_chess",
    "preferred": "!chess",
    "registered": "!chess",
    "type": "special_text",
    "module": "special_commands",
    "handler": "special_commands.chess",
    "featureFlag": "special_commands",
    "permissions": [
      "member"
    ],
    "channels": [
      "main_chat"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "special_chess",
    "tutorialId": "bot_basics"
  },
  {
    "id": "lore",
    "preferred": "/lore",
    "registered": "/lore",
    "type": "slash",
    "module": "lore",
    "handler": "lore.lore",
    "featureFlag": "lore",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "lore",
    "tutorialId": "essentials"
  },
  {
    "id": "collection",
    "preferred": "/collection",
    "registered": "/collection",
    "type": "slash",
    "module": "collections",
    "handler": "collections.collection",
    "featureFlag": "collections",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": true,
    "helpId": "collection",
    "tutorialId": "economy"
  },
  {
    "id": "leaderboard",
    "preferred": "/leaderboard",
    "registered": "/leaderboard",
    "type": "slash",
    "module": "records",
    "handler": "records.leaderboard",
    "featureFlag": "records",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "leaderboard",
    "tutorialId": "essentials"
  },
  {
    "id": "privacy_activity",
    "preferred": "/privacy activity",
    "registered": "/privacy activity",
    "type": "slash",
    "module": "profile",
    "handler": "profile.privacyActivity",
    "featureFlag": "profile",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [
      {
        "name": "state",
        "type": "choice",
        "required": true,
        "description": "Activity visibility.",
        "choices": [
          "visible",
          "hidden"
        ]
      }
    ],
    "ephemeralDefault": true,
    "helpId": "privacy_activity",
    "tutorialId": "essentials"
  },
  {
    "id": "privacy_roast",
    "preferred": "/privacy roast",
    "registered": "/privacy roast",
    "type": "slash",
    "module": "social",
    "handler": "social.privacyRoast",
    "featureFlag": "social",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [
      {
        "name": "state",
        "type": "choice",
        "required": true,
        "description": "Roast targeting preference.",
        "choices": [
          "allow",
          "block"
        ]
      }
    ],
    "ephemeralDefault": true,
    "helpId": "privacy_roast",
    "tutorialId": "community"
  },
  {
    "id": "hangman",
    "preferred": "/hangman",
    "registered": "/hangman",
    "type": "slash",
    "module": "solo_games",
    "handler": "solo_games.hangman",
    "featureFlag": "solo_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "hangman",
    "tutorialId": "games"
  },
  {
    "id": "wordscramble",
    "preferred": "/wordscramble",
    "registered": "/wordscramble",
    "type": "slash",
    "module": "solo_games",
    "handler": "solo_games.wordscramble",
    "featureFlag": "solo_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "wordscramble",
    "tutorialId": "games"
  },
  {
    "id": "mastermind",
    "preferred": "/mastermind",
    "registered": "/mastermind",
    "type": "slash",
    "module": "solo_games",
    "handler": "solo_games.mastermind",
    "featureFlag": "solo_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "mastermind",
    "tutorialId": "games"
  },
  {
    "id": "minesweeper",
    "preferred": "/minesweeper",
    "registered": "/minesweeper",
    "type": "slash",
    "module": "solo_games",
    "handler": "solo_games.minesweeper",
    "featureFlag": "solo_games",
    "permissions": [
      "member"
    ],
    "channels": [
      "games_channel"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "minesweeper",
    "tutorialId": "games"
  },
  {
    "id": "haiku",
    "preferred": "/haiku",
    "registered": "/haiku",
    "type": "slash",
    "module": "social",
    "handler": "social.haiku",
    "featureFlag": "haiku",
    "permissions": [
      "member"
    ],
    "channels": [
      "any_allowed"
    ],
    "options": [],
    "ephemeralDefault": false,
    "helpId": "haiku",
    "tutorialId": "community"
  }
] as const satisfies readonly CommandContract[];
