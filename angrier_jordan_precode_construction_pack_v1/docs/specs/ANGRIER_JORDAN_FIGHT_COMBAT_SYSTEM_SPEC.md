# Angrier Jordan Robo Chair Fight Combat System v1

## Purpose
This specification defines the live 1v1 combat sequence for `/fight`. It supersedes older fight timing/action details where they conflict. It does not alter the existing opponent selection, betting, 5% rake, 95% proportional payout, or strict 50/50 winner rule.

## Core fight loop
- Both fighters start at **100 HP**.
- Turns alternate between Fighter 1 and Fighter 2.
- The fair winner is selected by a strict **50/50 RNG** before the narrated combat sequence is built.
- The combat planner then samples attacks, misses, blocks, critical hits, and heals until it produces a sequence consistent with that winner and the target duration.
- Every displayed action, damage/heal number, numeric HP value, health-bar fill, and KO state comes from one authoritative combat-state update.
- No move repeats inside the same fight. When enough unused content is available, moves used in the previous three fights are suppressed to reduce repetition across consecutive fights.

## Timing
- Target fight duration: **about 25 seconds**.
- Normal target window: **22–28 seconds**.
- Hard cap: **30 seconds**.
- Action beats occur about every **1.35–1.65 seconds**.
- The single authoritative Discord fight message is edited throughout the fight. The live card retains only the most recent combat-log lines so it stays readable on desktop and mobile.

## Turn selection
Each turn normally resolves as follows:
1. If the fighter is below 100 HP, there is a **10% chance** to use a chair-themed heal instead of attacking. A heal roll at full HP is rerolled as an attack.
2. Attack outcomes are sampled from:
   - **68% normal hit**
   - **10% miss**
   - **12% blocked**
   - **10% critical hit**
3. Blocked attacks still deal reduced damage at **25–45%** of the rolled base damage.
4. Critical hits deal **1.65–1.90×** the rolled base damage.
5. HP is clamped to 0–100. Healing can never exceed 100 HP.

## Pacing protection
The combat planner keeps the fight exciting without allowing a random sequence to end in three seconds or drag on for a minute.
- Before roughly 20 seconds, lethal damage may be constrained so the fight does not end implausibly early.
- After roughly 22 seconds, heal frequency may be reduced.
- After roughly 26 seconds, heals and misses may be disabled for the remaining beats so the fight resolves by the 30-second hard cap.
- These pacing rules never change who was selected by the initial fair 50/50 winner draw.

## Content pool
`angrier_jordan_fight_move_pool_v1.json` contains:
- **100 chair-themed attacks** across light, medium, heavy, trick, ranged, and chaos categories.
- **36 chair-themed heals**.
- Damage/heal ranges and standard combat-log templates.

## Example live sequence
```text
NotJordan     100 HP  ██████████
NotNick       100 HP  ██████████

NotJordan uses Folding Chair Faceplant — 14 damage
NotNick       86 HP   █████████░

NotNick tries Barstool Backhand — MISS

NotJordan uses Emergency Reupholstery — +11 HP
NotJordan     100 HP  ██████████

CRIT! NotNick lands Recliner Ram — 29 damage
NotJordan      71 HP  ███████░░░
```

The visual health bars and text never calculate independently. Both render from the same authoritative HP snapshot after each resolved action.
