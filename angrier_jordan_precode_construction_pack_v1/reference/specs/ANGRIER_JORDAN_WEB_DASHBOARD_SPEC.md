# Angrier Jordan — Web Dashboard Specification

**Status:** LOCKED FOR BUILD  
**Scope:** Single-guild private deployment  
**Goal:** A simple-to-mid-level control center for complex bot configuration without replacing Discord as the primary user experience.

## 1. Product direction

The web dashboard is an administrative companion to Angrier Jordan. It exists to make complex configuration easier for the owner and authorized staff. Normal member-facing gameplay, economy interactions, social commands and community activity remain inside Discord.

The dashboard must use the same configuration service and PostgreSQL database as the bot. It must not create a second source of truth.

The approved visual reference is `angrier_jordan_dashboard_assets/dashboard_reference_mockup.png`: dark charcoal/black UI, restrained red accents, clear green health indicators, Angrier Jordan branding, compact cards, left navigation and desktop-first responsive layout.

## 2. Authentication and authorization

- Discord OAuth2 login only.
- Verify the user is currently a member of the configured guild.
- Never trust role information supplied by the browser; resolve permissions server-side.
- Throne receives full dashboard access.
- Chaise Lounge and Recliner receive only capabilities enabled in the staff capability matrix.
- Every mutation is re-authorized server-side at request time.
- Dashboard sessions expire and can be revoked.
- Bot token, database credentials and provider secrets are never exposed to browser code.
- All state-changing requests require CSRF protection or equivalent same-site protections.
- Rate-limit login, write endpoints and high-risk actions.

## 3. Dashboard level

This is intentionally **mid-level**, not an enterprise analytics product. Build polished management for complicated systems, but avoid unnecessary infrastructure and live telemetry unless it materially helps the owner.

### Included at launch

1. **Dashboard Home**
   - bot status
   - database/Discord connectivity
   - member count
   - 24-hour messages / active members when already available from bot metrics
   - recent moderation activity
   - quick actions
   - feature toggles
   - recent configuration changes

2. **Server Settings**
   - server display information
   - timezone
   - core behavior defaults
   - feature flags

3. **Channels & Roles**
   - map human-readable bot destinations to Discord channel IDs
   - map Throne, Chaise Lounge, Recliner, Jailed and other managed roles
   - validate missing/deleted resources
   - show permission-health warnings

4. **Moderation**
   - AutoMod rules and actions
   - progressive discipline thresholds
   - moderation case search and detail view
   - staff notes according to authorization
   - appeals queue
   - evidence metadata access according to role

5. **Jail / Hotseat**
   - active moderation jail roster
   - sentence details and case link
   - extend/reduce/release controls based on staff authority
   - Hotseat permissions/configuration
   - history

6. **Raid & Anti-Nuke**
   - join-gate settings
   - raid thresholds
   - trusted/protected accounts and roles
   - current security state
   - Panic Mode button for Throne only, requiring explicit confirmation
   - restoration/status view

7. **Economy**
   - starter amount
   - daily/weekly values
   - bank tiers and safe interest settings
   - robbery/economy tuning within code-enforced bounds
   - economy health summary

8. **Shop & Crafting**
   - item catalog editor
   - rotation settings
   - prices/sell values/rarity
   - recipe catalog
   - repair/crafting tuning inside safe bounds

9. **Games & Activities**
   - timers
   - wager limits
   - voting defaults
   - feature availability
   - channel restrictions
   - no editing of core RNG/fairness algorithms

10. **Introduction System**
    - visual prompt builder
    - add/edit/remove/reorder prompts
    - required/optional
    - placeholders and limits
    - preview member form
    - preview published introduction card

11. **Social Commands**
    - enable/disable commands
    - channel restrictions
    - lightweight cooldowns
    - response-pool management where appropriate

12. **Custom Commands**
    - create/edit/clone/enable/disable/delete custom commands
    - exact-text/prefix and optional advanced trigger types
    - channel/role conditions and cooldowns
    - ordered safe-action builder
    - safe text/embed response templates
    - allowlisted self-role actions and role-panel shortcuts
    - native workflow actions such as Race Start and Line Start
    - test/preview before enabling
    - usage count and audit history
    - never expose arbitrary code, SQL, shell or unrestricted HTTP execution

13. **Content Library**
    - browse/search Truth, Dare, WYR, WWYD and smaller authored pools
    - filter by game/category/intensity/enabled status
    - enable/disable individual entries
    - edit/add owner-authored entries
    - bulk import validated structured content
    - show use count and last-used timestamp when available
    - do not expose destructive bulk-delete without confirmation


14. **Tutorial & Help**
   - enable/disable and reorder tutorial paths/lessons
   - edit lesson titles, explanations, examples and contextual-help copy
   - command-help catalog search with field-level definitions
   - preview normal member/staff views
   - coverage report for commands missing help metadata
   - broken tutorial/command link validation
   - safety-critical locked copy cannot be removed
   - all changes versioned and audited

15. **Weekly Spotlight**
    - included/excluded channels
    - post channel
    - reset/post timing
    - public totals toggle
    - badge display settings
    - Triple Threat remains a code-enforced invariant

16. **Community Features**
    - superlative defaults/categories
    - polls
    - AMA settings
    - suggestions statuses
    - giveaways defaults
    - self-role panel configuration

17. **User Management**
    - search member
    - read permitted profile/account flags
    - moderation history shortcut
    - economy correction tools only for staff with explicit capability
    - no unrestricted database editing

18. **Audit Logs**
    - all dashboard configuration changes
    - actor, timestamp, before/after values, source = dashboard
    - searchable by actor/system/date
    - rollback only for settings explicitly marked rollback-safe

19. **Bot Status**
    - process uptime
    - Discord connection
    - database health
    - scheduled-job health
    - last restart
    - deployment/version string
    - restart button only if hosting integration securely supports it; otherwise omit

## 4. Navigation

Desktop left rail:

- Dashboard
- Server Settings
- Channels & Roles
- Moderation
- Jail / Hotseat
- AutoMod
- Raid & Anti-Nuke
- Economy
- Shop & Crafting
- Games & Activities
- Introduction System
- Social Commands
- Custom Commands
- Content Library
- Tutorial & Help
- Weekly Spotlight
- Community Features
- User Management
- Audit Logs
- Bot Status

The navigation may hide sections the current staff member cannot access.

## 5. Editing model

- Version-controlled JSON files are defaults/seed data only.
- Live settings are PostgreSQL-backed.
- Dashboard and Discord admin commands call the same server-side configuration service.
- Every setting has a schema, type, validation rule and hard code-enforced bounds where applicable.
- Settings support a `source` metadata field such as `default`, `discord_admin`, `dashboard`, or `migration`.
- Config edits should become effective immediately where safe; systems that require a controlled reload should surface that clearly.
- High-risk changes require confirmation.

## 6. UI patterns

- Desktop-first responsive web app.
- Dark Angrier Jordan theme matching the approved mockup.
- Use native form controls, cards, tabs, search, filters and confirmation dialogs.
- Avoid recreating Discord visually.
- Human-readable labels first; IDs may be shown as secondary technical detail.
- Every page gets Save/Cancel or immediate-save behavior with visible success/error feedback.
- Unsaved changes warning for multi-field editors.
- Validation appears inline before submission where possible.
- Destructive/high-impact actions use a confirmation modal with explicit scope.

## 7. High-risk controls

The following require additional confirmation and must always be audited:

- Panic Mode
- disabling major security modules
- changing protected/trusted identities
- releasing or materially changing moderation jail sentences
- economy corrections
- bulk content import/disable
- destructive catalog changes
- role/channel remapping affecting moderation or jail
- restoration/rollback actions

## 8. Technical recommendation

A straightforward implementation is sufficient:

- TypeScript end-to-end
- Next.js or equivalent lightweight React web app
- server-side routes/actions for all privileged operations
- Discord OAuth2
- shared PostgreSQL database
- shared validation schemas with the bot where practical
- no Redis requirement for v1
- no microservice split required

The dashboard should be deployable alongside the bot using the same managed hosting project or as a small sibling web service.

## 9. Code / Config / DB / Assets classification

**Code:** authentication, authorization, API handlers, validation, audit writes, config service, safe rollback logic, high-risk confirmation flow, health collection, session security.  
**Config:** dashboard enablement, public URL, session duration, permitted staff capability mapping, page/module visibility, non-secret display defaults.  
**Database:** live server settings, audit events, dashboard sessions, config versions, rollback-safe snapshots, existing feature state.  
**Content:** help text, labels/tooltips, confirmation copy.  
**Assets:** approved dashboard mockup as design reference plus Angrier Jordan logo/brand assets.  
**Secrets:** Discord OAuth client secret, session/encryption secret, database credentials, hosting integration credentials if used.

## 10. Build acceptance criteria

- Owner can sign in with Discord and see only the configured guild.
- Owner can change a supported setting in the dashboard and the bot uses it without a code deploy.
- Unauthorized users cannot access or mutate dashboard data.
- Every dashboard mutation creates an audit record.
- Complex systems (moderation, Hotseat, introductions, economy, content library) can be managed without editing JSON by hand.
- Code-enforced invariants cannot be defeated by dashboard configuration.
- The visual treatment follows the approved mid-level mockup without requiring pixel-perfect reproduction.
