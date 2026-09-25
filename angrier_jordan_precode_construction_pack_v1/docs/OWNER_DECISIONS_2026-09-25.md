# Owner decisions — 2026-09-25

## Race/Fight: no winning wagers

Direct owner instruction supersedes earlier omissions: if an event resolves normally but nobody backed the winning racer/fighter, refund 100% of all wagers to the original bettors, charge no rake, and record the event result normally. Persist the betting settlement as `NO_WINNING_BETS_REFUND`.

The 5% rake applies only when winning wagers exist. Refunds use the shared escrow's original wallet/bank allocation; settlement is atomic, idempotent and restart-safe. Race database acceptance explicitly covers concurrent refund settlement, replay through a new repository instance, original balances, zero rake, and the winner's normal recorded result. Fight must use this same shared policy when its approved combat files are available.
