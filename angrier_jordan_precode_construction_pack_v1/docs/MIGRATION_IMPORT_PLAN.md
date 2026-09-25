# Migration / Import Plan

## Existing server
- map actual Discord roles/channels first
- capture the 4 active YAGPDB custom commands
- migrate two reaction-role commands to native Self Role panels
- map existing race trigger to `race.start`
- map existing line trigger to `line.start`
- leave YAGPDB running during shadow testing
- disable YAGPDB commands only after Angrier Jordan passes live verification

## Content
Content import validates IDs, required fields, category, enabled state and duplicate normalized text before database insertion. Import runs transactionally and records a content pack/version.

## Assets
Use manifest IDs as references. Do not rename production assets ad hoc inside feature code.

## Database upgrades
- backup before migrations
- apply migrations in staging/test DB first
- never edit an applied migration
- add forward migrations
- destructive transformations require explicit owner approval and a rollback/export plan
