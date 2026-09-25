# YAGPDB Cutover Checklist

Current known uses: two role/reaction workflows, Race Start, Line Start.

1. Export/copy the four existing YAGPDB command definitions before cutover.
2. Recreate role commands as native Self Role panels; preserve familiar text triggers as safe custom-command aliases if desired.
3. Map race trigger to native `race.start`; never duplicate race logic.
4. Map line trigger to native `line.start`; `!line` remains native.
5. Test each Angrier Jordan replacement in a private staff channel/test guild.
6. Disable the corresponding YAGPDB commands one at a time.
7. Observe logs for 48 hours before removing YAGPDB permissions/bot.
8. Removing YAGPDB from the server is a destructive cutover action and requires owner approval.
