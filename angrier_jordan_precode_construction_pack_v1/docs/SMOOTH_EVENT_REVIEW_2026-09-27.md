# Race and Line motion — local review

Owner requested smoother `!race` / `!line` and excluded the portrait from this batch. Review: `review-smooth-events/index.html`. No Chairisms/portrait images appear in that gallery; unrelated Chairisms work and approval files are preserved.

The owner approved the wheelchair assortment and reviewed Race/Line motion on 2026-09-27. Immutable review snapshots and artwork hashes are recorded in docs/approved_visuals/smooth-events-2026-09-27.json. This is visual approval; live Discord acceptance remains pending. No production deployment or flag changes were made.

## Motion changes

- Race samples saved authoritative positions every 50ms (20fps), replacing roughly 60 uneven frames per sprint. Winner selection, odds, betting windows and sprint duration are unchanged.
- Line samples every 50ms, with gentle numeral motion and continuous burst expansion. Exact number boundaries remain 5, 4, 3, 2, 1; no visible zero; terminal frame is held without replay. Partial restart intervals remain exact.
- High-density GIFs render at 480px wide, matching Discord attachment display scale, while still PNGs retain their original resolution. Maximum animation frame count is 512, with a separate 50-million-pixel raw budget; a full 20-second race plus its terminal hold fits.
- Shared artwork is sent once per animation, then decoded at its display size. Renderer jobs are serialized to avoid overlapping raw-frame allocations.

## Verification

Bot TypeScript build passed. 34 event/presentation/Line/animation checks passed; 14 follow-up preparation/performance/animation checks passed after final optimization. The follow-up checks include maximum sprint duration, lossless shared artwork, exact countdown/restart remainder, final-frame hold and 20fps GIF timing. Asset manifest, immutable visual locks and diff whitespace checks passed.

Current fixture exports: Race 310 GIF frames / 1,244,785 bytes / 16,440ms total; Line 181 frames / 1,289,985 bytes / 10,000ms total. Both use 50ms moving-frame delays and a 1000ms terminal hold, loop count 1. Runtime values are fixtures, not live member state.

Measured local generation was approximately 13 seconds for Race and 10 seconds for Line under concurrent testing, improved from 40/15 seconds before artwork optimization. Existing pre-render/cached-publication paths remain in use. These measurements are not production latency or Discord playback acceptance. Live acceptance must verify no cold-cache start delay, smooth desktop/mobile playback and restart behavior before deployment approval.
