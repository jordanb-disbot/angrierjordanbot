# Line runtime review

These are review fixtures using the actual `features-special` deterministic runtime renderer. Morgan/Avery/Casey are fixture names, not live Discord members. Native Discord buttons appear below the attachment in the real adapter and are covered by adapter tests.

Run from the application root after building: `node packages/features-special/review/render.mjs`.

`open.png`, `locked.png`, `countdown.png`, `burst.png`, `closed.png` and `cancelled.png` preserve the approved lounge, typography and stable frame. `countdown.gif` is one-shot: twenty 250 ms countdown frames, sixteen 50 ms burst frames, then a 1000 ms completion hold. No visible zero or replay controls. Validated 37 pages, loop 1, 6800 ms, 1,049,469 bytes.

Rendering is prepared before committing countdown start. The measured local sequence render took 11.3 seconds; a version check prevents changed check-ins from starting a stale prepared animation. Restart rendering checks the authoritative deadline again after rasterization and falls back to the completed card if time elapsed.

This is renderer QA, not a claim of live Discord acceptance.
