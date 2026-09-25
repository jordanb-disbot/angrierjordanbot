# Angrier Jordan — Command-to-Asset Audit

**Audit purpose:** run every current command/interaction through the visual system, identify what can reuse the shared renderer, what needs a dedicated runtime template, what needs only Discord-native UI, and what is missing or stale before the Codex build.

## Executive findings

- Master Command Registry base: **180 interaction definitions**.
- Additional current/canonical or reconciliation entries reviewed here: **12**.
- Current production asset manifest: **303 assets**.
- The existing production manifest is **not visually final anymore**. Its palette is the older muted emerald/olive set; every visual asset/template must be refreshed to the newer Colors reference: midnight/black, deep navy, modern emerald/teal accents, warm gold/brass, warm amber light, clean neutral text.
- All crown logos/brand marks should be replaced by the approved **gold chair/throne** mark. No generic crown remains as the primary mark.
- Typography must move to a clean, modern, highly legible UI family. Decorative serif/script may be used only sparingly for large display moments, never for dense data or controls.
- Textures should be lighter/subtler and modern. No heavy old-world marble/leather texture behind small text.
- Runtime visuals remain deterministic renderer output; review boards are references, not assets baked into the bot.
- The current production `/line` animation is stale: it is still documented as `!line`, includes **0**, and must be rebuilt as `/line` **5→4→3→2→1 → in-frame white-powder burst**, with no visible 0.
- The current Master Command Registry is also behind recent product decisions: `/lore`, the new `/tldr chat|events` fields, optional-opponent `/fight`, and several canonical solo/economy surfaces need registry synchronization before Codex begins.

## Asset strategy

| Strategy | Meaning |
|---|---|
| DEDICATED | A purpose-built runtime renderer/state family is justified. |
| SHARED | Reuse an existing shell/template/components; no new illustration. |
| NATIVE | Discord buttons/selects/modals/text are sufficient. |
| UPDATE | Existing production asset exists but behavior/style must be revised. |
| NEW TEMPLATE | Existing icons/art exist but a runtime layout/state renderer is missing. |

## Every registered command / interaction

| Module | Command / interaction | Asset strategy | Required asset/template | Current coverage | Key note |
|---|---|---|---|---|---|
| core | `/help` | SHARED/NATIVE | music_community.help | EXISTS | Ephemeral/native UI. No dedicated background art required. |
| tutorial | `/tutorial` | SHARED | music_community.tutorial + shell.standard | EXISTS | Tutorial pages are native/private cards using one shared visual shell. |
| core | `/rules` | SHARED/NATIVE | music_community.rules | EXISTS | Ephemeral/native UI. No dedicated background art required. |
| core | `/status` | SHARED/NATIVE | music_community.status | EXISTS | Ephemeral/native UI. No dedicated background art required. |
| core | `/bug` | SHARED/NATIVE | music_community.bug_report | EXISTS | Ephemeral/native UI. No dedicated background art required. |
| core | `/dms` | SHARED/NATIVE | ui toggles | EXISTS | Ephemeral/native UI. No dedicated background art required. |
| profile | `/profile` | DEDICATED | templates.profile + badge/chair/economy compositing | EXISTS, RESTYLE | Refresh to new Colors palette, modern font, chair/throne-only brand marks. |
| profile | `/records` | DEDICATED | templates.records + card.leaderboard | EXISTS/PARTIAL | Existing records template; standardize tie/empty states and new visual system. |
| profile | `/tldr` | NEW SHARED | templates.tldr_chat + templates.tldr_events | MISSING | Two long-form summary layouts: chat (1/2/4/8h) and events (1d/7d). Mostly text, no decorative art required. |
| economy | `/daily` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/weekly` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/fortune` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/scavenge` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/dig` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/fish` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/work` | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/statement` | DEDICATED | templates.statement + economy.statement | EXISTS | Refresh style. |
| economy | `/inventory` | DEDICATED | templates.inventory + chairs/materials/tools + collection state tags | EXISTS | Refresh style; include unlocked and locked inventory items, hidden/revealed collection states. |
| economy | `/bank` | SHARED | card.economy + economy.bank/vault/tier assets | EXISTS | No new art, just refreshed bank/vault assets and controls. |
| economy | `/shop` | DEDICATED | templates.shop + item cards + economy/chair/tool/material assets | EXISTS | Refresh style; shop states share inventory item cards. |
| economy | `/craft` | NEW TEMPLATE | templates.crafting + chairs/materials/tools + quality/chairwright badges | MISSING TEMPLATE | Core art exists, but production manifest lacks a dedicated crafting runtime template. |
| economy | `/repair` | NEW TEMPLATE | templates.repair + tool/damaged-tool assets | MISSING TEMPLATE | Need compact repair selection/result template. |
| economy | `/transfer` | SHARED/NATIVE | card.confirmation + templates.result + economy/item icons | EXISTS/PARTIAL | Confirmation/result card only; no unique illustration. |
| economy | `/gift` | SHARED/NATIVE | card.confirmation + templates.result + economy/item icons | EXISTS/PARTIAL | Confirmation/result card only; no unique illustration. |
| economy | `/unlock all` | SHARED/NATIVE | card.confirmation + templates.result + economy/item icons | EXISTS/PARTIAL | Confirmation/result card only; no unique illustration. |
| casino | `/blackjack` | DEDICATED/SHARED | templates.blackjack + casino.deck/playing_cards/chips | MISSING TEMPLATES | Casino art exists; create actual runtime game-state templates. Completed single-player result includes wager and Play Again. |
| casino | `/roulette` | DEDICATED/SHARED | templates.roulette + casino.roulette/chips | MISSING TEMPLATES | Casino art exists; create actual runtime game-state templates. Completed single-player result includes wager and Play Again. |
| casino | `/slots` | DEDICATED/SHARED | templates.slots + casino slot symbols/chair_pot | MISSING TEMPLATES | Casino art exists; create actual runtime game-state templates. Completed single-player result includes wager and Play Again. |
| casino | `/dice` | DEDICATED/SHARED | templates.casino_quick + casino.dice | PARTIAL | Casino art exists; create actual runtime game-state templates. Completed single-player result includes wager and Play Again. |
| casino | `/coinflip` | DEDICATED/SHARED | templates.casino_quick + casino.coin_heads/coin_tails | PARTIAL | Casino art exists; create actual runtime game-state templates. Completed single-player result includes wager and Play Again. |
| casino | `/lottery` | DEDICATED/SHARED | templates.lottery + casino.lottery_ticket/jackpot | MISSING TEMPLATES | Casino art exists; create actual runtime game-state templates. Completed single-player result includes wager and Play Again. |
| community | `/giveaway` | DEDICATED SHARED | templates.giveaway | EXISTS | Refresh templates only; use native buttons/selects for interaction. |
| race | `/race` | DEDICATED UPDATE | templates.race + race_fight.race_chair_1..6 + timer/betting/result states | EXISTS, BEHAVIOR UPDATE | Keep 2–6 racer sprint, no laps, 15–20 sec, progress/position from same state, no Rematch. Restyle all colors. |
| fight | `/fight` | DEDICATED UPDATE | templates.fight + robo fighters + combat outcome badges/log states | EXISTS, BEHAVIOR UPDATE | 1v1; 100 HP; ~25 sec alternating turns; hit/miss/block/crit/heal log synced to HP bars; no player attack buttons. |
| pvp | `/tictactoe` | DEDICATED | games.pvp.tictactoe_panel + games.pvp.pvp_state_banners | EXISTS | Refresh palette/type; support challenge, live board, result, wager display and Play Again where applicable. |
| pvp | `/connectfour` | DEDICATED | games.pvp.connect_four_panel + games.pvp.pvp_state_banners | EXISTS | Refresh palette/type; support challenge, live board, result, wager display and Play Again where applicable. |
| pvp | `/battleship` | DEDICATED | games.pvp.battleship_panel + games.pvp.pvp_state_banners | EXISTS | Refresh palette/type; support challenge, live board, result, wager display and Play Again where applicable. |
| party_games | `/fmk` | DEDICATED UPDATE | templates.fmk + 3 member cards + F/M/K lifetime stats + final vote card | EXISTS, BEHAVIOR UPDATE | Single chooser: Fuck then Marry, remaining Kill; final Agree/Disagree vote; Play Again. |
| party_games | `/truthordare` | SHARED NEW | templates.party_prompt + templates.party_result + card.vote/card.result | PARTIAL | One reusable party-game shell; do not create separate decorative backgrounds for each command. |
| party_games | `/wyr` | SHARED NEW | templates.party_prompt + templates.party_result + card.vote/card.result | PARTIAL | One reusable party-game shell; do not create separate decorative backgrounds for each command. |
| party_games | `/wwyd` | SHARED NEW | templates.party_prompt + templates.party_result + card.vote/card.result | PARTIAL | One reusable party-game shell; do not create separate decorative backgrounds for each command. |
| party_games | `/finishsentence` | SHARED NEW | templates.party_prompt + templates.party_result + card.vote/card.result | PARTIAL | One reusable party-game shell; do not create separate decorative backgrounds for each command. |
| party_games | `/onewordstory` | SHARED NEW | templates.party_prompt + templates.party_result + card.vote/card.result | PARTIAL | One reusable party-game shell; do not create separate decorative backgrounds for each command. |
| line | `/line` | ANIMATION UPDATE | templates.line + countdown 5..1 + powder burst APNG/GIF | EXISTS BUT STALE | Remove countdown 0 and !line wording; no max participants; show Ready and Need a Second rosters; animation replaces center frame then powder burst. |
| community | `/poll` | DEDICATED SHARED | templates.poll | EXISTS | Refresh templates only; use native buttons/selects for interaction. |
| community | `/superlatives` | DEDICATED SHARED | templates.superlative | EXISTS | Refresh templates only; use native buttons/selects for interaction. |
| community | `/suggest` | DEDICATED SHARED | templates.suggestion | EXISTS | Refresh templates only; use native buttons/selects for interaction. |
| community | `/ama` | DEDICATED SHARED | templates.ama | EXISTS | Refresh templates only; use native buttons/selects for interaction. |
| roles | `/roles` | NATIVE | Discord select/button role panel + chair role icons | PARTIAL | No big image needed. Ensure role icons use chair/throne language, not crowns. |
| chairisms | `/quote message` | DEDICATED SHARED | templates.chairism_short/long/image/reply + music_community.quote_frame | EXISTS | One Chairism renderer family covers all quote/browse/context actions. |
| chairisms | `/quote text` | DEDICATED SHARED | templates.chairism_short/long/image/reply + music_community.quote_frame | EXISTS | One Chairism renderer family covers all quote/browse/context actions. |
| chairisms | `/chairisms recent` | DEDICATED SHARED | templates.chairism_short/long/image/reply + music_community.quote_frame | EXISTS | One Chairism renderer family covers all quote/browse/context actions. |
| chairisms | `/chairisms member` | DEDICATED SHARED | templates.chairism_short/long/image/reply + music_community.quote_frame | EXISTS | One Chairism renderer family covers all quote/browse/context actions. |
| chairisms | `/chairisms random` | DEDICATED SHARED | templates.chairism_short/long/image/reply + music_community.quote_frame | EXISTS | One Chairism renderer family covers all quote/browse/context actions. |
| music | `/play` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/pause` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/resume` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/skip` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/previous` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/stop` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/replay` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/seek` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/queue` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/remove` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/move` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/clear` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/shuffle` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/jump` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/loop` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/autoplay` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/volume` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/nowplaying` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/history` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/join` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/leave` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist create` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist add` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist remove` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist play` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist rename` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist delete` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/playlist view` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| music | `/music help` | SHARED | templates.music_controller + music_community controls/provider pill | EXISTS | All music commands mutate one persistent controller in voice-channel embedded text chat. No per-command art. |
| social | `/ts` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/hit` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/slap` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/pillow` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/cushion` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/stab` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/choke` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/shh` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/belittle` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/bonk` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/yeet` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/sit` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/standup` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/fold` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/recline` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/sideeye` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/judge` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/shame` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/boo` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/bruh` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/wtf` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/sus` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/yap` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/touchgrass` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/blame` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/disappoint` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/chaircheck` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/throwchair` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/getup` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/calmdown` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/absolutelynot` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/explainyourself` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/embarrassing` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/questionable` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/respect` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/compliment` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/wheresmyvape` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/hitthegeekbar` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/roast` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| social | `/notmad` | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| introductions | `/introduce` | NEW TEMPLATE | templates.introduction + Discord modal/select controls | MISSING TEMPLATE | Renderer catalog anticipates introduction card, but production manifest lacks dedicated introduction template. |
| introductions | `/introduce edit` | NEW TEMPLATE | templates.introduction + Discord modal/select controls | MISSING TEMPLATE | Renderer catalog anticipates introduction card, but production manifest lacks dedicated introduction template. |
| introductions | `/introduce preview` | NEW TEMPLATE | templates.introduction + Discord modal/select controls | MISSING TEMPLATE | Renderer catalog anticipates introduction card, but production manifest lacks dedicated introduction template. |
| introductions | `/intro-config` | NEW TEMPLATE | templates.introduction + Discord modal/select controls | MISSING TEMPLATE | Renderer catalog anticipates introduction card, but production manifest lacks dedicated introduction template. |
| crime | `/rob` | SHARED | templates.crime + crime_family robbery/wanted/arrest/bail assets | EXISTS | Reuse crime shell. /911 and fight-back should appear as native controls on incident card when applicable. |
| crime | `/911` | SHARED | templates.crime + crime_family robbery/wanted/arrest/bail assets | EXISTS | Reuse crime shell. /911 and fight-back should appear as native controls on incident card when applicable. |
| crime | `/wanted` | SHARED | templates.crime + crime_family robbery/wanted/arrest/bail assets | EXISTS | Reuse crime shell. /911 and fight-back should appear as native controls on incident card when applicable. |
| crime | `/bail` | SHARED | templates.crime + crime_family robbery/wanted/arrest/bail assets | EXISTS | Reuse crime shell. /911 and fight-back should appear as native controls on incident card when applicable. |
| family | `/marry` | DEDICATED UPDATE | templates.marriage_result + ui.event.marriage + ring/blessing/sack + vote controls | PARTIAL | Need final marriage success card with compatibility %, success chance %, thumbs up/down local vote, child-wait outcome. |
| family | `/divorce` | SHARED | templates.family + ui.event family assets + crime_family.* | EXISTS/PARTIAL | Use shared family shell; major divorce/adoption/auction/inheritance events use existing event treatments. |
| family | `/adopt` | SHARED | templates.family + ui.event family assets + crime_family.* | EXISTS/PARTIAL | Use shared family shell; major divorce/adoption/auction/inheritance events use existing event treatments. |
| family | `/disown` | SHARED | templates.family + ui.event family assets + crime_family.* | EXISTS/PARTIAL | Use shared family shell; major divorce/adoption/auction/inheritance events use existing event treatments. |
| family | `/emancipate` | SHARED | templates.family + ui.event family assets + crime_family.* | EXISTS/PARTIAL | Use shared family shell; major divorce/adoption/auction/inheritance events use existing event treatments. |
| family | `/familytree` | NEW TEMPLATE | templates.family_tree + crime_family.family_nodes | MISSING TEMPLATE | Need scalable family-tree renderer for larger families. |
| family | `/will` | SHARED | templates.family + ui.event family assets + crime_family.* | EXISTS/PARTIAL | Use shared family shell; major divorce/adoption/auction/inheritance events use existing event treatments. |
| family | `/familyauction` | SHARED | templates.family + ui.event family assets + crime_family.* | EXISTS/PARTIAL | Use shared family shell; major divorce/adoption/auction/inheritance events use existing event treatments. |
| moderation | `/warn` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/timeout` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/untimeout` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/kick` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/ban` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/unban` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/purge` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/note` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/history` | NEW SHARED | templates.moderation_case + card.moderation | MISSING TEMPLATE | Need case/history detail shell; ephemeral staff use. |
| moderation | `/case` | NEW SHARED | templates.moderation_case + card.moderation | MISSING TEMPLATE | Need case/history detail shell; ephemeral staff use. |
| moderation | `/case edit` | NEW SHARED | templates.moderation_case + card.moderation | MISSING TEMPLATE | Need case/history detail shell; ephemeral staff use. |
| moderation | `/case reverse` | NEW SHARED | templates.moderation_case + card.moderation | MISSING TEMPLATE | Need case/history detail shell; ephemeral staff use. |
| moderation | `/lock` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/unlock` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/slowmode` | SHARED | templates.moderation_warning + card.moderation + shell.rage | EXISTS/PARTIAL | One moderation action template covers warn/timeout/kick/ban/purge/locks/etc.; native confirmations. |
| moderation | `/quarantine` | SHARED | shell.rage + music_community.quarantine/warning | EXISTS/PARTIAL | No unique command art. |
| moderation | `/staff-alert` | SHARED | shell.rage + music_community.quarantine/warning | EXISTS/PARTIAL | No unique command art. |
| moderation | `/modstats` | NEW SHARED | templates.modstats + card.leaderboard | MISSING TEMPLATE | Compact staff activity metrics layout. |
| jail | `/jail send` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail release` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail extend` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail reduce` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail reason` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail history` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail roster` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| jail | `/jail status` | NEW/SHARED | templates.hotseat + templates.crime + card.moderation + jail cell/countdown states | MISSING DEDICATED HOTSEAT TEMPLATE | Need jailed-user live card, roster/status/history/release states; same shell across all jail commands. |
| security | `/panic activate` | NEW SHARED | templates.panic + shell.rage + ui.state warning/error | MISSING TEMPLATE | One emergency-security shell for activate/status/deactivate; no unique art per command. |
| security | `/panic deactivate` | NEW SHARED | templates.panic + shell.rage + ui.state warning/error | MISSING TEMPLATE | One emergency-security shell for activate/status/deactivate; no unique art per command. |
| security | `/panic status` | NEW SHARED | templates.panic + shell.rage + ui.state warning/error | MISSING TEMPLATE | One emergency-security shell for activate/status/deactivate; no unique art per command. |
| custom_commands | `/custom-command create` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command edit` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command delete` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command enable` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command disable` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command list` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command test` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command clone` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| custom_commands | `/custom-command info` | NATIVE/SHARED | Discord modals/selects + dashboard editor + shell.standard | NO UNIQUE IMAGE NEEDED | Use native forms and dashboard UI; no decorative command images. |
| bootstrap | `/setup` | NATIVE/SHARED | setup checklist/status card + ui.state icons | NO UNIQUE IMAGE NEEDED | Private guided setup; standard shell only. |
| bootstrap | `/setup health` | NATIVE/SHARED | setup checklist/status card + ui.state icons | NO UNIQUE IMAGE NEEDED | Private guided setup; standard shell only. |
| chairisms | `Create Chairism` | DEDICATED SHARED | templates.chairism_short/long/image/reply + music_community.quote_frame | EXISTS | One Chairism renderer family covers all quote/browse/context actions. |
| lore | `/lore` **[canonical_new]** | NEW | templates.lore_reader + badges.special.chair_historian | MISSING | Ephemeral paginated text reader plus Chair Historian achievement badge. No large illustration required. |
| solo_games | `/hangman` **[canonical_registry_gap]** | DEDICATED | games.solo.hangman_panel + templates.result | EXISTS/PARTIAL | Refresh style; include secondary option (difficulty/board size) and Play Again on completed result. |
| solo_games | `/wordscramble` **[canonical_registry_gap]** | DEDICATED | games.solo.word_scramble_panel + templates.result | EXISTS/PARTIAL | Refresh style; include secondary option (difficulty/board size) and Play Again on completed result. |
| solo_games | `/mastermind` **[canonical_registry_gap]** | DEDICATED | games.solo.mastermind_panel + templates.result | EXISTS/PARTIAL | Refresh style; include secondary option (difficulty/board size) and Play Again on completed result. |
| solo_games | `/minesweeper` **[canonical_registry_gap]** | DEDICATED | games.solo.minesweeper_panel + templates.result | EXISTS/PARTIAL | Refresh style; include secondary option (difficulty/board size) and Play Again on completed result. |
| economy | `/spin` **[reconcile]** | SHARED | card.economy + templates.result + reward/tool/material assets | EXISTS/PARTIAL | One reward/result shell covers all; /spin additionally needs a wheel/spin state using economy.daily_spin. |
| economy | `/collection` **[reconcile]** | DEDICATED | templates.inventory + chairs/materials/tools + collection state tags | EXISTS | Refresh style; include unlocked and locked inventory items, hidden/revealed collection states. |
| profile | `/showcase` **[reconcile]** | SHARED | templates.profile/templates.records/card.result | PARTIAL | Reuse profile/records system; no new standalone art unless listed above. |
| profile | `/leaderboard` **[reconcile]** | DEDICATED | templates.records + card.leaderboard | EXISTS/PARTIAL | Existing records template; standardize tie/empty states and new visual system. |
| profile | `/privacy activity` **[reconcile]** | SHARED | templates.profile/templates.records/card.result | PARTIAL | Reuse profile/records system; no new standalone art unless listed above. |
| social | `/privacy roast` **[reconcile]** | TEXT/NATIVE | No custom image; optional tiny chair emoji/icon only | NO UNIQUE ASSET NEEDED | Use Discord text/mentions and shared response styling. Do not create 40 separate social-command graphics. |
| economy | `/sell` **[reconcile]** | SHARED/NATIVE | card.confirmation + templates.result + economy/item icons | EXISTS/PARTIAL | Confirmation/result card only; no unique illustration. |

## Passive/non-command visual systems that still need coverage

| System | Asset need | Status |
|---|---|---|
| Welcome/onboarding | Welcome/start panel with Introduce, Read the Lore, Tutorial buttons; PC/mobile Discord-realistic presentation. | NEW/UPDATE |
| Chair Historian | Gold chair + open book achievement badge. | NEW |
| Achievement unlock | Reusable achievement-unlocked card/toast using badge art. | NEW TEMPLATE |
| Weekly Spotlight | Existing 4 badges + weekly announcement renderer, all restyled to new palette/type and chair/throne branding. | UPDATE |
| Counting | Channel-game milestone/reset/result card. | NEW SHARED |
| Last Letter | Round status, invalid-word response, winner/result card. | NEW SHARED |
| Auto Purge | Dashboard setting rows + run-summary staff log; no public decorative image. | NEW DASHBOARD UI |
| Marriage voting close | Finalized marriage card state with vote disabled and child-wait waived/not-waived status. | NEW STATE |
| Global system states | Loading, processing, success, warning, error, disabled, empty, hidden/revealed; existing assets require style refresh. | UPDATE |
| Discord PC/mobile examples | Realistic examples for /line, /race, /fight, music, FMK, marriage, moderation, Hotseat, introduction, Chairism, achievement, TLDR, lore. | REVIEW ART ONLY |

## Net new production assets/templates to create

- `templates.tldr_chat`
- `templates.tldr_events`
- `templates.lore_reader`
- `badges.special.chair_historian`
- `templates.party_prompt`
- `templates.party_result`
- `templates.open_response`
- `templates.crafting`
- `templates.repair`
- `templates.blackjack`
- `templates.roulette`
- `templates.slots`
- `templates.lottery`
- `templates.casino_quick`
- `templates.introduction`
- `templates.marriage_result`
- `templates.family_tree`
- `templates.moderation_case`
- `templates.modstats`
- `templates.hotseat`
- `templates.panic`
- `templates.channel_game`
- `templates.achievement_unlock`

### Assets/state families to rebuild rather than create from scratch

- All 303 current manifest assets: palette/type/texture/brand-mark refresh as applicable
- `templates.line` + APNG/GIF countdown: /line, 5→1, no 0, unlimited roster, Ready/Need a Second
- `templates.race`: no laps, 2–6 racers, ~15–20 sec, synchronized progress/position, no Rematch
- `templates.fight`: 1v1, ~25 sec, alternating randomized chair moves, misses/blocks/crits/heals, HP/log sync
- `templates.fmk`: staged single-player F→M→K choice flow, lifetime F/M/K counts, final Agree/Disagree vote, Play Again
- `ui.event.marriage`: compatibility %, success chance %, local thumbs vote, child-wait result
- Weekly Spotlight badges/announcement: remove crown-primary motifs and use chair/throne mark
- All system/locked/hidden state tags and item cards: preserve functionality but restyle to new visual system

## Commands that should NOT get their own custom image

Do not create one-off art for the 40 social commands, most music control commands, basic moderation actions, custom-command editor operations, setup/health operations, or simple confirmation commands. They should reuse native Discord controls and shared shells. This prevents visual bloat and keeps mobile output readable.

## Registry reconciliation before Codex

The Master Command Registry is supposed to be the single source of truth, so before implementation it must be regenerated with recent decisions. At minimum: add `/lore`; replace old `/tldr daily|weekly` metadata with `/tldr chat time:1h|2h|4h|8h` and `/tldr events time:1d|7d`; keep `/fight` opponent optional; ensure `/line` is slash-only; and reconcile the canonical solo-game commands plus Daily Spin/collection/showcase/leaderboard/privacy/sell command surfaces against the final desired slash API.

## Recommended creation order

1. Global style system refresh and chair/throne brand mark.
2. Rebuild `/line`, `/race`, `/fight`, FMK and marriage because their behavior changed after the original pack.
3. Create missing core runtime templates: TLDR, lore, party shell, crafting/repair, casino boards, introduction, family tree, moderation case/Hotseat/Panic.
4. Add Chair Historian and achievement-unlock treatment.
5. Refresh all existing icons/badges/items/state assets.
6. Build realistic PC/mobile Discord review examples from the actual runtime layouts.
7. Regenerate the production asset manifest and QA report.
