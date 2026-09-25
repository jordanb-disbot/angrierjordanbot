# Angrier Jordan — Final Command-to-Presentation Audit

Date: 2026-09-21

- Current command/interaction records: **192**
- Coverage: **192/192**
- Every current registry entry maps to exactly one final presentation strategy.
- Interactive controls remain Discord-native; rendered cards are information/state surfaces.
- Retired command paths are not part of the current registry.

## Presentation types

- **DEDICATED_RUNTIME**: 52
- **NATIVE_DISCORD**: 66
- **SHARED_RUNTIME**: 72
- **SPECIAL_EVENT_RUNTIME**: 2

## Command matrix

### bootstrap

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/setup` | NATIVE_DISCORD | setup | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/setup health` | NATIVE_DISCORD | setup | ephemeral | `production/atomic_assets/templates/system_state.svg` |

### casino

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/casino blackjack` | DEDICATED_RUNTIME | casino | public | `production/runtime_templates/casino/01_blackjack_live.svg<br>production/runtime_templates/casino/02_blackjack_result.svg` |
| `/casino roulette` | DEDICATED_RUNTIME | casino | public | `production/runtime_templates/casino/03_roulette_result.svg` |
| `/casino slots` | DEDICATED_RUNTIME | casino | public | `production/runtime_templates/casino/04_slots_result.svg<br>production/runtime_templates/casino/07_chair_pot.svg` |
| `/casino dice` | DEDICATED_RUNTIME | casino | public | `production/runtime_templates/casino/05_dice_result.svg` |
| `/casino coinflip` | DEDICATED_RUNTIME | casino | public | `production/runtime_templates/casino/06_coinflip_result.svg` |
| `/lottery` | SHARED_RUNTIME | lottery | public | `production/atomic_assets/templates/result.svg<br>production/atomic_assets/ui/events/lottery_winner.png<br>+1 more` |

### chairisms

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/quote message` | DEDICATED_RUNTIME | chairism | public | `production/atomic_assets/templates/chairism_short.svg<br>production/atomic_assets/templates/chairism_long.svg<br>+2 more` |
| `/quote text` | DEDICATED_RUNTIME | chairism | public | `production/atomic_assets/templates/chairism_short.svg<br>production/atomic_assets/templates/chairism_long.svg<br>+2 more` |
| `/chairisms recent` | DEDICATED_RUNTIME | chairism | public | `production/atomic_assets/templates/chairism_short.svg<br>production/atomic_assets/templates/chairism_long.svg<br>+2 more` |
| `/chairisms member` | DEDICATED_RUNTIME | chairism | public | `production/atomic_assets/templates/chairism_short.svg<br>production/atomic_assets/templates/chairism_long.svg<br>+2 more` |
| `/chairisms random` | DEDICATED_RUNTIME | chairism | public | `production/atomic_assets/templates/chairism_short.svg<br>production/atomic_assets/templates/chairism_long.svg<br>+2 more` |
| `Create Chairism` | DEDICATED_RUNTIME | chairism | ephemeral | `production/atomic_assets/templates/chairism_short.svg<br>production/atomic_assets/templates/chairism_long.svg<br>+2 more` |

### collections

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/collection` | DEDICATED_RUNTIME | inventory_collection | ephemeral | `production/atomic_assets/templates/inventory.svg` |

### community

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/giveaway` | DEDICATED_RUNTIME | community | public | `production/atomic_assets/templates/giveaway.svg` |
| `/poll` | DEDICATED_RUNTIME | community | public | `production/atomic_assets/templates/poll.svg` |
| `/superlatives` | DEDICATED_RUNTIME | community | public | `production/atomic_assets/templates/superlative.svg` |
| `/suggest` | DEDICATED_RUNTIME | community | public | `production/atomic_assets/templates/suggestion.svg` |
| `/ama` | DEDICATED_RUNTIME | community | public | `production/atomic_assets/templates/ama.svg` |

### core

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/help` | NATIVE_DISCORD | core | ephemeral | `production/atomic_assets/music_community/help.png` |
| `/rules` | NATIVE_DISCORD | core | ephemeral | `production/atomic_assets/music_community/rules.png` |
| `/status` | NATIVE_DISCORD | core | ephemeral | `production/atomic_assets/music_community/status.png` |
| `/bug` | NATIVE_DISCORD | core | ephemeral | `production/atomic_assets/music_community/bug_report.png` |
| `/dms` | NATIVE_DISCORD | core | ephemeral | `production/atomic_assets/music_community/admin_control.png` |

### crime

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/crime rob` | SHARED_RUNTIME | crime | public | `production/atomic_assets/templates/crime.svg` |
| `/crime 911` | SHARED_RUNTIME | crime | public | `production/atomic_assets/templates/crime.svg` |
| `/crime wanted` | SHARED_RUNTIME | crime | public | `production/atomic_assets/templates/crime.svg` |
| `/crime bail` | SHARED_RUNTIME | crime | public | `production/atomic_assets/templates/crime.svg` |

### custom_commands

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/custom-command create` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command edit` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command delete` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command enable` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command disable` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command list` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command test` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command clone` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/custom-command info` | NATIVE_DISCORD | custom_commands | ephemeral | `production/atomic_assets/templates/system_state.svg` |

### economy

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/daily` | DEDICATED_RUNTIME | daily | ephemeral | `production/runtime_templates/daily/01_ready.svg<br>production/runtime_templates/daily/02_partial.svg<br>+1 more` |
| `/weekly` | SHARED_RUNTIME | economy_result | public | `production/atomic_assets/templates/result.svg` |
| `/scavenge` | SHARED_RUNTIME | economy_result | public | `production/atomic_assets/templates/result.svg` |
| `/dig` | SHARED_RUNTIME | economy_result | public | `production/atomic_assets/templates/result.svg` |
| `/fish` | SHARED_RUNTIME | economy_result | public | `production/atomic_assets/templates/result.svg` |
| `/work` | SHARED_RUNTIME | economy_result | public | `production/atomic_assets/templates/result.svg` |
| `/statement` | DEDICATED_RUNTIME | statement | public | `production/atomic_assets/templates/statement.svg` |
| `/inventory` | DEDICATED_RUNTIME | inventory_collection | public | `production/atomic_assets/templates/inventory.svg` |
| `/bank` | SHARED_RUNTIME | economy | public | `production/atomic_assets/templates/system_state.svg<br>production/atomic_assets/economy/bank.png<br>+1 more` |
| `/shop` | DEDICATED_RUNTIME | shop | public | `production/atomic_assets/templates/shop.svg` |
| `/craft` | DEDICATED_RUNTIME | crafting | public | `production/runtime_templates/crafting/01_recipe.svg<br>production/runtime_templates/crafting/02_success.svg<br>+1 more` |
| `/repair` | DEDICATED_RUNTIME | repair | public | `production/runtime_templates/repair/01_options.svg<br>production/runtime_templates/repair/02_result.svg` |
| `/transfer` | NATIVE_DISCORD | confirmation | public | `production/atomic_assets/templates/result.svg` |
| `/gift` | NATIVE_DISCORD | confirmation | public | `production/atomic_assets/templates/result.svg` |
| `/unlock all` | NATIVE_DISCORD | confirmation | ephemeral | `production/atomic_assets/templates/result.svg` |

### family

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/family marry` | DEDICATED_RUNTIME | family | public | `production/runtime_templates/family/02_marriage_vote.svg` |
| `/family divorce` | SHARED_RUNTIME | family | public | `production/atomic_assets/templates/family.svg` |
| `/family adopt` | SHARED_RUNTIME | family | public | `production/atomic_assets/templates/family.svg` |
| `/family disown` | SHARED_RUNTIME | family | public | `production/atomic_assets/templates/family.svg` |
| `/family emancipate` | SHARED_RUNTIME | family | public | `production/atomic_assets/templates/family.svg` |
| `/family familytree` | DEDICATED_RUNTIME | family | public | `production/runtime_templates/family/01_tree.svg` |
| `/family will` | SHARED_RUNTIME | family | public | `production/atomic_assets/templates/family.svg` |
| `/family familyauction` | SHARED_RUNTIME | family | public | `production/atomic_assets/templates/family.svg` |

### fight

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/fight @member` | DEDICATED_RUNTIME | fight | public | `production/atomic_assets/templates/event_states/fight/01_betting.svg<br>production/atomic_assets/templates/event_states/fight/02_combat_live.svg<br>+1 more` |

### introductions

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/introduce` | DEDICATED_RUNTIME | introduction | public | `production/runtime_templates/introduction/01_preview.svg<br>production/runtime_templates/introduction/02_published.svg` |
| `/introduce edit` | DEDICATED_RUNTIME | introduction | ephemeral | `production/runtime_templates/introduction/01_preview.svg<br>production/runtime_templates/introduction/02_published.svg` |
| `/introduce preview` | DEDICATED_RUNTIME | introduction | ephemeral | `production/runtime_templates/introduction/01_preview.svg<br>production/runtime_templates/introduction/02_published.svg` |
| `/intro-config` | NATIVE_DISCORD | introduction | ephemeral | `production/atomic_assets/templates/system_state.svg` |

### jail

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/jail send` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail release` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail extend` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail reduce` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail reason` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail history` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail roster` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |
| `/jail status` | SHARED_RUNTIME | hotseat | public | `production/runtime_templates/moderation/02_hotseat.svg` |

### lore

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/lore` | DEDICATED_RUNTIME | lore | ephemeral | `production/runtime_templates/lore/01_toc.svg<br>production/runtime_templates/lore/02_chapter.svg<br>+1 more` |

### moderation

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/mod warn` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod timeout` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod untimeout` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod kick` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod ban` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod unban` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod purge` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod note` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod history` | SHARED_RUNTIME | moderation_case | ephemeral | `production/runtime_templates/moderation/01_case.svg` |
| `/mod case view` | SHARED_RUNTIME | moderation_case | ephemeral | `production/runtime_templates/moderation/01_case.svg` |
| `/mod case edit` | SHARED_RUNTIME | moderation_case | ephemeral | `production/runtime_templates/moderation/01_case.svg` |
| `/mod case reverse` | SHARED_RUNTIME | moderation_case | ephemeral | `production/runtime_templates/moderation/01_case.svg` |
| `/mod lock` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod unlock` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod slowmode` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod quarantine` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod staff-alert` | SHARED_RUNTIME | moderation | ephemeral | `production/atomic_assets/templates/moderation_warning.svg` |
| `/mod modstats` | SHARED_RUNTIME | records | ephemeral | `production/atomic_assets/templates/records.svg` |

### music

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/play` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music pause` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music resume` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music skip` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music previous` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music stop` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music replay` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music seek` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music queue` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music remove` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music move` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music clear` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music shuffle` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music jump` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music loop` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music autoplay` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music volume` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music nowplaying` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music history` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music join` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music leave` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist create` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist add` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist remove` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist play` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist rename` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist delete` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/playlist view` | SHARED_RUNTIME | music | public | `production/atomic_assets/templates/music_controller.svg` |
| `/music help` | NATIVE_DISCORD | music_help | ephemeral | `production/atomic_assets/music_community/help.png` |

### party_games

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/fmk` | DEDICATED_RUNTIME | fmk | public | `production/atomic_assets/templates/fmk.svg` |
| `/truthordare` | DEDICATED_RUNTIME | party | public | `production/runtime_templates/party/02_truth_dare.svg` |
| `/wyr` | DEDICATED_RUNTIME | party | public | `production/runtime_templates/party/01_wyr.svg` |
| `/wwyd` | DEDICATED_RUNTIME | party | public | `production/runtime_templates/party/03_wwyd.svg` |
| `/finishsentence` | DEDICATED_RUNTIME | party | public | `production/runtime_templates/party/04_finish_sentence.svg` |
| `/onewordstory` | DEDICATED_RUNTIME | party | public | `production/runtime_templates/party/05_one_word_story.svg` |

### profile

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/profile` | DEDICATED_RUNTIME | profile | public | `production/atomic_assets/templates/profile.svg` |
| `/records` | DEDICATED_RUNTIME | records | public | `production/atomic_assets/templates/records.svg` |
| `/tldr chat` | DEDICATED_RUNTIME | tldr | ephemeral | `production/runtime_templates/tldr/01_chat_2h.svg` |
| `/tldr events` | DEDICATED_RUNTIME | tldr | ephemeral | `production/runtime_templates/tldr/02_events_7d.svg` |
| `/privacy activity` | NATIVE_DISCORD | privacy | ephemeral | `production/atomic_assets/templates/system_state.svg` |

### pvp

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/game tictactoe` | DEDICATED_RUNTIME | pvp | public | `production/atomic_assets/games/pvp/tictactoe_panel.png<br>production/atomic_assets/games/pvp/pvp_state_banners.png<br>+1 more` |
| `/game connectfour` | DEDICATED_RUNTIME | pvp | public | `production/atomic_assets/games/pvp/connect_four_panel.png<br>production/atomic_assets/games/pvp/pvp_state_banners.png<br>+1 more` |
| `/game battleship` | DEDICATED_RUNTIME | pvp | public | `production/atomic_assets/games/pvp/battleship_panel.png<br>production/atomic_assets/games/pvp/pvp_state_banners.png<br>+1 more` |

### records

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/leaderboard` | DEDICATED_RUNTIME | records | public | `production/atomic_assets/templates/records.svg` |

### roles

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/roles` | DEDICATED_RUNTIME | roles | ephemeral | `production/runtime_templates/roles/01_panel.svg` |

### security

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/panic activate` | DEDICATED_RUNTIME | panic | ephemeral | `production/runtime_templates/moderation/03_panic_active.svg` |
| `/panic deactivate` | DEDICATED_RUNTIME | panic | ephemeral | `production/runtime_templates/moderation/03_panic_active.svg` |
| `/panic status` | DEDICATED_RUNTIME | panic | ephemeral | `production/runtime_templates/moderation/03_panic_active.svg` |

### social

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/social ts` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social hit` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social slap` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social pillow` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social cushion` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social stab` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social choke` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social shh` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social belittle` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social bonk` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social yeet` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social sit` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social standup` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social fold` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social recline` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social sideeye` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social judge` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social shame` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social boo` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social bruh` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social wtf` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social sus` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social yap` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social touchgrass` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social blame` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social disappoint` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social chaircheck` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social throwchair` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social getup` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social calmdown` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social absolutelynot` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social explainyourself` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social embarrassing` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social questionable` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social respect` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social compliment` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social wheresmyvape` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social hitthegeekbar` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social roast` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/social notmad` | NATIVE_DISCORD | social_text | public | `production/atomic_assets/templates/result.svg` |
| `/privacy roast` | NATIVE_DISCORD | privacy | ephemeral | `production/atomic_assets/templates/system_state.svg` |
| `/haiku` | NATIVE_DISCORD | social_text | public | `Discord-native text/components` |

### solo_games

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/hangman` | DEDICATED_RUNTIME | solo_game | public | `production/atomic_assets/games/solo/hangman_panel.png<br>production/atomic_assets/templates/result.svg` |
| `/wordscramble` | DEDICATED_RUNTIME | solo_game | public | `production/atomic_assets/games/solo/word_scramble_panel.png<br>production/atomic_assets/templates/result.svg` |
| `/mastermind` | DEDICATED_RUNTIME | solo_game | public | `production/atomic_assets/games/solo/mastermind_panel.png<br>production/atomic_assets/templates/result.svg` |
| `/minesweeper` | DEDICATED_RUNTIME | solo_game | public | `production/atomic_assets/games/solo/minesweeper_panel.png<br>production/atomic_assets/templates/result.svg` |

### special_commands

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `!race` | SPECIAL_EVENT_RUNTIME | race | public | `production/atomic_assets/templates/event_states/race/01_join_betting.svg<br>production/atomic_assets/templates/event_states/race/02_sprint_live.svg<br>+1 more` |
| `!line` | SPECIAL_EVENT_RUNTIME | line | public | `production/atomic_assets/templates/event_states/line/01_readiness_open.svg<br>production/atomic_assets/templates/event_states/line/02_entry_locked.svg<br>+3 more` |
| `!vc` | NATIVE_DISCORD | special_callout | public | `production/atomic_assets/templates/announcement.svg` |
| `!chess` | NATIVE_DISCORD | special_callout | public | `production/atomic_assets/templates/announcement.svg` |

### tutorial

| Invocation | Presentation | Family | Visibility | Production reference |
|---|---|---|---|---|
| `/tutorial` | SHARED_RUNTIME | tutorial | ephemeral | `production/atomic_assets/music_community/tutorial.png<br>production/atomic_assets/templates/system_state.svg` |
