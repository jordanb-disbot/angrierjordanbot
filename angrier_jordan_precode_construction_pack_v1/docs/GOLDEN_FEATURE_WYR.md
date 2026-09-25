# Golden Feature — Would You Rather

Would You Rather is the architectural reference implementation for interactive non-economic features.

It demonstrates:
- command → domain service separation
- category content selection with recent-history exclusion
- 60-second round timer
- one +30-second extension
- anonymous/editable voting
- hidden totals until close
- deterministic result rendering
- restart recovery contract
- help/tutorial/config hooks

The domain implementation is in `packages/features-wyr` and intentionally has no direct discord.js dependency. The production Discord adapter should remain thin.

Future WWYD, polls, FMK audience voting, Finish the Sentence voting and similar modules should reuse the same primitives rather than cloning state/timer/vote logic.
