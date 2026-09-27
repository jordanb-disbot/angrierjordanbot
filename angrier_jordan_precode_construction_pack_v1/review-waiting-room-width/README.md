# Race and Line width review

These are deterministic outputs from the production renderers with fictional members. The desktop files retain each renderer's full 1200 × 640 pixels; the mobile files scale the same output to 390 pixels wide. `index.html` compares each pair. They are not live Discord screenshots or changes to previous visual approvals.

The production coordinators request the wide renderer for both Race and Line. OPEN, live, and finale frames therefore share the 1200 × 640 attachment size. Discord decides the displayed width inside its clients; an attachment cannot force the app into full-screen mode. Members can open the original-resolution image. At a 390-pixel in-channel width, major headings, participant names, counts, chairs, and finale states remain readable. Small decorative labels scale down, so the live countdown and actions should remain in native Discord text and buttons as well as the artwork.

Regenerate after a bot build with `node scripts/render-waiting-room-width-review.mjs` from the project root.
