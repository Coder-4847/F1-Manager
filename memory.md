# F1 Manager — Project Memory

Read this first in any new session. It's written so a fresh Claude Code
session (with no prior context) can pick this project up cold.

## What this is

A browser-based F1 team-management simulation. The player manages one car
(strategy calls only — pit timing, tire compound, driving mode) across a
12-round season on real circuits with fictional teams/drivers. No backend:
100% client-side, deployed as a static site.

**Hard constraints set by the user at the start, still in force:**
- No backend/server/database. All state lives in the browser (React state +
  localStorage for save/load).
- Deployable as a static site on GitHub Pages, no server-side build step.
- Real track names/layouts/lengths are fine. Teams and drivers must be
  **fictional** — no real driver/team likenesses, sponsors, or liveries.
- Should feel like a polished web app, not a spreadsheet.

## Tech stack

Vite + React + TypeScript. Chosen because: pure static `dist/` output for
GitHub Pages, TypeScript for the simulation's many interacting numeric
systems, React's virtual DOM for a leaderboard that reorders every simulated
lap, and easy access to Framer Motion for the reorder animations.

## Repo / deployment

- Remote: `https://github.com/Coder-4847/F1-Manager.git`, branch `master`.
- Git identity is set **locally** on this machine only (not global):
  `user.name "Coder-4847"`, `user.email bansalettan@gmail.com`. A fresh clone
  elsewhere would need this set again.
- Deploys via `.github/workflows/deploy.yml` — GitHub Actions builds with
  `npm run build` and publishes via `actions/deploy-pages` on every push to
  `master`. Live at `https://coder-4847.github.io/F1-Manager/`.
- `vite.config.ts` sets `base: '/F1-Manager/'` for production builds only
  (dev server still serves from `/`) since Pages serves a project site from
  a `/<repo-name>/` subpath.
- **Confirmed working (2026-09-11, via the user's logged-in browser)**: Settings
  → Pages → Source is set to "GitHub Actions" and the site is live. The first
  two workflow runs failed (`404 Not Found` on the deploy step) because that
  setting hadn't been switched yet at the time; the third run, after it was
  set, succeeded and is what's currently live. No manual step is outstanding —
  every push to `master` redeploys automatically within about a minute, no
  separate "relaunch" action needed on the GitHub side.

## How to run locally

```bash
cd "C:\Programming\Visual Studio Code\F1 Manager"
npm install
npm run dev
```
Opens at `http://localhost:5173`. `npm run build` produces the static
`dist/` (type-checks via `tsc -b` first, then `vite build`).

## Architecture

Current as of phase 19 (2026-09-12) — kept in sync with `src/` on every phase;
if this ever drifts, `find src -type f | sort` is the source of truth.

```
src/
  sim/            Pure TS, zero React deps — the simulation engine.
    types.ts        Core domain types: TireCompound (now incl. intermediate/
                     wet), DrivingMode, WeatherCondition, DamageSeverity,
                     Driver, Team, Track, CarState, RaceState, LapEvent, etc.
    roster.ts        8 fictional teams x 2 drivers (16 total), each with
                      pace/tireManagement/consistency/aggression stats, plus
                      updateDriverProfile()/getDefaultProfile() for the
                      player's editable name/age/nationality/number (phase 11).
    tracks.ts         12 real-world circuits with per-track lap length, lap
                      count, pit loss, tire wear factor, overtaking difficulty.
    trackPaths.ts     Stylized closed-loop SVG path per track for the live
                      view (Monza/Monaco/Spa/Suzuka hand-shaped for
                      recognizable character; the rest procedurally
                      generated via a seeded PRNG + Catmull-Rom spline).
                      NOT GPS-accurate — deliberately stylized.
    tires.ts          Compound pace/degradation curves (soft/medium/hard/
                      intermediate/wet) + a UI-only wear% helper (doesn't
                      affect lap-time math).
    weather.ts        WeatherCondition transitions (rollForWeatherChange),
                      tire/weather mismatch scoring, lap-time and damage-risk
                      penalties from wrong-tire-for-conditions, and
                      generateWeatherForecast() — a standalone preview (not
                      a guarantee) used by the UI, independent of the race's
                      own live rolls. Phase 14.
    damage.ts         rollForDamage/applyDamage/clearDamage — per-lap chance
                      of minor/major/mechanical damage with a flat per-lap
                      time penalty and a repair cost paid on the next pit
                      stop, plus a narrative description per cause. Phase 13,
                      extended in 14 (weather risk) and 15 (description).
    penalties.ts      rollForPenalty — small per-lap chance of a flat 5-10s
                      time penalty, dominated by driving mode (push carries
                      ~7x conserve's risk). Phase 15.
    retirement.ts     rollForRetirement — extremely rare per-lap DNF chance
                      built from three additive risk factors (active damage,
                      tire/weather mismatch, push mode). Phase 15.
    caution.ts        Safety Car / VSC: rollCautionForRetirement (always
                      triggers at least a VSC, ~40% escalates to a full SC),
                      rollCautionForDamage (a small independent chance major/
                      mechanical damage alone brings out a VSC, never SC),
                      plus the lap-time/pit-loss multipliers and the SC
                      gap-closure rate used by raceEngine. Phase 17.
    difficulty.ts     Difficulty = "easy"|"normal"|"hard" and
                      AI_SPEED_MULTIPLIER (0.8/1/1.2) — the only thing
                      difficulty affects: AI (never player) lap-time pace
                      in raceEngine.ts's simulateLap. Phase 19.
    development.ts    Team development & budget: TeamDevelopment
                      {budget, paceLevel, reliabilityLevel,
                      tireManagementLevel}, upgradeCost (rising per level,
                      capped at MAX_UPGRADE_LEVEL = 5), purchaseUpgrade,
                      paceBonusForLevel/reliabilityMultiplierForLevel/
                      tireWearMultiplierForLevel (the actual in-race effects),
                      and aiAutoSpend (weighted toward whichever category an
                      AI team is lagging in, capped at 2 purchases/round).
                      Lives in SeasonState, not roster.ts — resets every
                      season the same way custom-calendar lap counts do.
                      Phase 18.
    lapTime.ts        Per-lap time = base pace + tire wear + fuel burn-off +
                      driving-mode delta + weather penalty + randomness
                      (scaled by consistency and conditions) + active damage.
    pitStop.ts        Pit stop time-loss model.
    strategy.ts       AI: generateAIStrategy (starting compound/mode only,
                      decided pre-race) + decideAIAction (reactive per-lap
                      pit/mode decisions based on tire wear, gaps to cars
                      ahead/behind, damage, weather mismatch, driver
                      personality stats, and now an active caution — a
                      `cautionOpportunity` roll grabs the cheap pit window
                      even without normal urgency, phase 17) — includes a
                      gambleChance so cars don't all react to urgent
                      situations in lockstep.
    overtaking.ts     resolveOvertakeAttempt — probabilistic pass resolution
                      weighing pace delta, tire wear difference, aggression
                      vs. consistency, and track overtaking difficulty. Not
                      called at all while a caution is active (see
                      raceEngine.ts below) — no overtaking under yellow.
    raceEngine.ts     setupRace (incl. runQualifying() grid order, phase 16)
                      + simulateLap: weather roll, per-car damage/retirement/
                      penalty rolls (all three skipped while a caution is
                      already active — no new incidents under yellow, phase
                      17), reactive AI calls, lap time, pit stops, battle
                      resolution (cars within 0.8s of the car ahead fight for
                      the position instead of passing for free, unless a
                      caution suppresses it). `activeCaution` is captured at
                      the top of simulateLap (the caution controlling *this*
                      lap, from before it started) so a caution triggered
                      *during* the lap doesn't retroactively slow it down —
                      its effects (lap-time multiplier, pit-loss discount,
                      and for a full SC, closing each gap toward the leader
                      by SC_GAP_CLOSURE_RATE per lap) start the lap after.
                      `state.caution` only decrements when it equals the
                      snapshotted `activeCaution` reference, which is what
                      keeps a freshly-triggered caution from being
                      decremented the same lap it's set. getStandings (DNFs
                      ranked below classified cars) and getFinalResults
                      (+ best lap) live here too. `createCarState` takes an
                      optional per-team `TeamDevelopment` (phase 18): pace
                      is folded into a car-scoped shallow copy of its Team
                      (`developedTeam` — same shallow-copy-don't-mutate
                      pattern as season.ts's currentRoundTrack), while
                      reliability/tire-management become two new required
                      CarState fields (`reliabilityMultiplier`,
                      `tireWearMultiplier`, default 1 when no development is
                      passed) that damage.ts/retirement.ts/lapTime.ts read
                      directly rather than threading development through
                      every roll function. `runQualifying` also takes
                      development so a pace upgrade actually improves grid
                      position, not just race pace. `RaceState.difficulty`
                      (phase 19) is baked in by `setupRace` from
                      `RaceSetup.difficulty` (defaults `"normal"`) and read
                      by `simulateLap` each lap: a non-player car's raw lap
                      time is divided by `AI_SPEED_MULTIPLIER[difficulty]`
                      (higher speed = lower time) — the player's own
                      `rawLapTime` is never touched. Deliberately *not*
                      applied to `runQualifying`'s pace, to keep the
                      feature scoped to exactly what was asked ("AI go at
                      X speed" during the race) rather than also
                      reshuffling the starting grid.
    season.ts         Season calendar (SeasonRound[] — trackId + custom laps,
                      phase 12), per-round results, cumulative driver/
                      constructor points (classic 25-18-15-...-1, 0 for
                      DNFs), and per-team development (phase 18):
                      `SeasonState.teamDevelopment` starts at
                      `createInitialDevelopment()` (all zero) and
                      `completeRound` pays every team prize money
                      (`PRIZE_TABLE`/`prizeForPosition` — unlike points, every
                      position earns *something*, summed across both a
                      team's drivers into one shared budget) then runs
                      `aiAutoSpend` on every team except the player's own
                      (found via `standings.find(r => r.car.isPlayer)`, not
                      a parameter — completeRound already has full
                      StandingsRow[] with `car.team.id`/`car.isPlayer` on
                      it). `purchaseTeamUpgrade(season, teamId, category)`
                      is the one place that mutates a team's development
                      outside of aiAutoSpend/completeRound — used by the
                      player's own purchases.

  state/          React-facing hooks wrapping the sim.
    useRace.ts        Owns one race's live state: play/pause/step/speed,
                      player driving-mode/pit-stop controls, track switching,
                      planPending/damageAlert/weatherAlert/cautionAlert
                      gating. Playback speed is real seconds-per-lap (1x ≈
                      5s/lap; 0.5x/2x/4x scale from that). Every setRaceState
                      updater structuredClone()s `prev` before mutating — see
                      the StrictMode bugs in phase 15's entry below; don't
                      remove this. Alert detection lives in a useEffect
                      reacting to committed state, not inside the updater —
                      same reason. `cautionAlert` detects a *freshly*
                      deployed caution via `raceState.caution.lapsRemaining
                      === raceState.caution.durationLaps` (only true the one
                      lap it's triggered, since raceEngine never decrements a
                      caution the same lap it sets it) rather than parsing
                      event messages, phase 17. `reset`/`switchTrack` take
                      `teamDevelopment` as an explicit call argument rather
                      than a captured hook option (phase 18) — useSeason
                      calls these in the same tick it computes a new
                      SeasonState (completeRound/createSeason), before React
                      re-renders useRace with a fresh option value, so a
                      captured option would still read the *previous*
                      round's development. Passing it explicitly at the call
                      site sidesteps that staleness; only the very first
                      lazy `setupRace` call still uses a hook option
                      (`initialTeamDevelopment`), since that one only ever
                      runs once at mount. `difficulty` (phase 19) rides
                      along the same way — `reset`/`switchTrack` take it as
                      an explicit argument and only the initial lazy
                      `setupRace` call reads `initialDifficulty` — even
                      though difficulty doesn't have teamDevelopment's
                      same-tick staleness problem (it isn't recomputed by
                      `useSeason` the way `teamDevelopment` is), matching
                      the established pattern here keeps a difficulty
                      change picked up correctly by the very next race
                      regardless of render timing.
    useSeason.ts      Wraps useRace: advances to the next round's track when
                      a race finishes, tracks season points, restart/season-
                      complete/custom-season, save/load, and (phase 18)
                      `purchaseUpgrade(category)` for the player's own team
                      (derived `playerTeamId` from `getDriver(playerDriverId)
                      .teamId`, not stored separately) plus passing fresh
                      `teamDevelopment` into every `race.switchTrack` call —
                      see the useRace.ts note above for why that has to be
                      an explicit argument. NOTE: computes the *initial*
                      track via a lazy useState — see "bug found" below.
    driverProfile.ts  localStorage persistence for the player's edited
                      name/age/nationality/number, separate from the season
                      save (key `f1-manager-driver-profile-v1`). Phase 11.
    difficulty.ts     localStorage persistence for the chosen `Difficulty`
                      (key `f1-manager-difficulty-v1`), same
                      separate-from-the-season-save pattern as
                      driverProfile.ts — it's an app-wide setting, not part
                      of any one season. `loadDifficulty()` defaults to
                      `"normal"` when nothing's stored yet or storage
                      throws. Phase 19.
    persistence.ts    localStorage save/load of the whole season
                      ({season, raceState} as one JSON blob). Key is
                      currently `f1-manager-save-v8` — bumped each time
                      CarState/RaceState/SeasonState gains a field an old
                      save wouldn't have (v3: custom-season calendar shape;
                      v4: weather + damage fields; v5: penaltySeconds/retired/
                      damageDescription; v6: RaceState.caution; v7:
                      CarState.reliabilityMultiplier/tireWearMultiplier +
                      SeasonState.teamDevelopment; v8: RaceState.difficulty).
                      Bump again next time the schema changes.

  ui/             Presentational components, one concern each.
    MainMenu.tsx        Full-screen title menu (Play/Resume, Custom Season,
                      Edit Driver, Team Development, Load Saved Game) — the
                      app opens here. Phase 16, Team Development button
                      added phase 18, Easy/Normal/Hard difficulty toggle
                      added phase 19 (a hint line appears once a race has
                      already been started, since the change only takes
                      effect on the next race — Reset/Next Round/Restart/
                      Custom Season — not the one in progress).
    DriverProfile.tsx   "Edit Driver" modal — name/age/nationality/number.
                      Phase 11.
    SeasonSetup.tsx     "Custom Season" modal — build a calendar from any of
                      the 12 tracks, any order, any lap count. Phase 12.
    RacingPlan.tsx      Pre-race blocking modal — starting tires, driving
                      mode, multi-stop pit plan, whole-race weather forecast,
                      qualifying position. Phase 14, forecast/grid in 15/16.
    RevisePlan.tsx      Mid-race, non-blocking — edit the remaining pit plan
                      against a freshly regenerated forecast. Phase 15.
    WeatherAlert.tsx    Blocking popup on a weather change that actually
                      invalidates the player's current tire — compound
                      picker, remaining-race forecast, pit-now/push-through.
                      Phase 14, gating tightened in 15.
    DamageAlert.tsx     Blocking popup for major/mechanical damage — car
                      health icon, damage name + narrative description,
                      per-lap cost, pit-for-repairs/push-through. Phase 13,
                      description in 15, visual icon in 16.
    CautionAlert.tsx    Blocking popup the lap a Safety Car/VSC is freshly
                      deployed — type, expected duration, and an estimated
                      discounted pit cost (track.pitLaneLossSeconds ×
                      cautionPitLossMultiplier), pit-now/stay-out. Lowest
                      priority of the four pre-race/mid-race modals (after
                      plan/weather/damage) since it's the least urgent to the
                      player's own car. Phase 17.
    CarHealthIndicator.tsx  Small schematic top-down car SVG that recolors
                      green/orange/red with damage severity. Phase 16.
    RaceResults.tsx     Auto-opens when a race finishes — final
                      classification, DNFs, best lap, total time, penalties.
                      Phase 15. Gained a "Manage Development Budget" button
                      (phase 18) — the natural moment to spend a round's
                      just-earned prize money, since the *next* round's
                      RacingPlan modal blocks reaching Menu (no cancel, by
                      design — see phase 14's Load-bug entry) until a plan
                      is confirmed.
    TeamDevelopment.tsx Budget + three upgrade categories (pace/reliability/
                      tire management), each with a 0-5 level, rising cost,
                      and a live effect readout computed from development.ts's
                      exported bonus functions. Reachable from MainMenu (any
                      time) and RaceResults ("Manage Development Budget").
                      Phase 18.
    WeatherForecast.tsx Shared colored-strip + legend component consuming a
                      forecast array — used by RacingPlan, WeatherAlert,
                      RevisePlan, and the always-visible sidebar forecast in
                      App.tsx. Phase 15/16.
    Leaderboard.tsx     Framer Motion `layout`-animated rows; pit-stop flash;
                      damage ⚠ badge; DNF rows dimmed and gap-column shows
                      "DNF".
    LiveTrackView.tsx   SVG track outline + car dots positioned continuously
                      via getPointAtLength, driven by a requestAnimationFrame
                      loop. Each car's on-track fraction = an animation
                      clock (0→1 over one lap's duration) offset by its real
                      time-gap-to-leader (converted through the track's
                      average lap time) — so the pack visually bunches/
                      spreads exactly like the real gaps, not just at lap
                      boundaries.
    PlaybackControls.tsx  Play/Pause/Step/Reset/Speed/Save/Load/Next-Round;
                      `blocked` prop disables Play/Step while any modal gate
                      (plan/damage/weather/caution) is active.
    PlayerControls.tsx    Car condition indicator, tires, damage/penalty
                      status, driving-mode + pit-stop queue, "Revise Plan"
                      button.
    EventFeed.tsx          Pit-stop, overtake, damage, weather, penalty,
                      retirement, and caution event log (one icon each).
    SeasonStandings.tsx    Drivers' + Constructors' championship tables,
                      podium-tinted top 3.
    TireBadge.tsx          Compound chip + wear bar for all 5 compounds
                      (green intermediate / blue wet added phase 14).

  App.tsx         Top-level: `showMenu` gates MainMenu vs. the game view (the
                  game view still mounts useSeason/useRace underneath either
                  way, so Play/Resume is instant). Composes useSeason + all
                  UI, including the always-visible sidebar weather-forecast
                  panel (useMemo'd per lap), the persistent caution banner,
                  and the plan/weather/damage/caution/revise/results/
                  team-development modals (plan > weather > damage > caution
                  in render-order priority when more than one could apply
                  the same lap). PLAYER_DRIVER_ID = "k-1" (Ravi Chandran,
                  Kestrel GP) and PLAYER_STRATEGY are hardcoded constants
                  near the top — change here to play as a different driver.
```

**New files added in phases 20-27** (the tree above predates them —
`find src -type f | sort` is the source of truth if this list ever drifts):
`sim/settings.ts` (GameSettings + toggle metadata), `sim/fuel.ts`,
`sim/downforce.ts`, `sim/strategist.ts`, `sim/objectives.ts`,
`state/settings.ts`, `state/driverMarket.ts`, `ui/SettingsScreen.tsx`,
`ui/StrategistSuggestion.tsx`, `ui/TeamRadio.tsx`, `ui/DriverMarket.tsx` —
see their phase entries below for what each does and why.

## What's been built (chronological, by phase)

1. **Core sim, no UI** — lap time model, tire degradation, pit stops, fixed
   AI, console-log output. Proved the math on Monza only.
2. **Real interactive UI** — leaderboard, tire wear bars, playback controls,
   player strategy panel, event feed. Still Monza only, AI still fixed.
3. **Reactive AI** — replaced the pre-race fixed pit plan with per-lap
   decisions (`decideAIAction`) reacting to tire wear and rival gaps
   (undercut/cover heuristics).
4. **Overtaking/battle resolution** — cars can no longer pass for free on
   pure time; close battles (<0.8s) resolve probabilistically, a lost
   attempt holds the attacker up in dirty air.
5. **Polish round 1** — 4 tracks total (added Silverstone/Spa/Suzuka),
   localStorage save/load, Framer Motion leaderboard reorder animation.
6. **Season mode** — calendar of races, points, drivers'/constructors'
   championships, Next-Race flow, restart. Removed free single-track
   selection (the old `TrackSelector.tsx`) since the season calendar now
   drives track choice — a deliberate scope call, not an oversight.
7. **Calendar expansion** — grew to the current 12 circuits (added Monaco,
   Barcelona, Red Bull Ring, Singapore, COTA, Interlagos, Yas Marina,
   Zandvoort) per explicit user request, Monaco required.
8. **Live animated track view** — replaced the old linear gap-strip with
   actual per-track SVG shapes and continuously-animated cars (see
   `LiveTrackView.tsx` above). Recalibrated playback speed to ~5s/lap.
9. **F1-themed visual redesign** — black/red/white/yellow palette, Titillium
   Web (the real F1 broadcast typeface) for headings, checkered-flag header
   strip, glowing red CTAs, yellow for secondary emphasis (player's track
   marker, pit flashes, P1 standings). Committed the app to always-dark
   (no longer follows system light/dark — a deliberate brand choice).
10. **Deployment** — GitHub Actions → GitHub Pages workflow, Vite base path
    fix for the project-site subpath.
11. **Driver customization** — "Edit Driver" modal (`ui/DriverProfile.tsx`)
    lets the player change their driver's name, age, car number, and
    nationality. `Driver` gained optional `age`/`nationality`/`number`
    fields (`sim/types.ts`); only the player driver (`k-1`) has them
    populated in `roster.ts`. Edits are applied via
    `updateDriverProfile()` in `roster.ts`, which `Object.assign`s the
    roster driver object **in place** — deliberate, so every existing
    reference to it (an in-progress race's `CarState.driver`, season
    standings, event log messages) picks up the change on the next render
    with zero changes to `useSeason`/`useRace`/`raceEngine`. Persisted to
    its own localStorage key (`state/driverProfile.ts`,
    `f1-manager-driver-profile-v1`, separate from the season save) and
    reapplied once at module load in `App.tsx` (before `useSeason`'s
    lazy initializer runs, so the very first race setup already sees any
    saved edit). "Reset to Default" is backed by a snapshot of the
    original roster values taken once at `roster.ts` module load, before
    any edit can mutate them — `getDefaultProfile()` reads from that
    snapshot, not from the (possibly-mutated) live roster.
12. **Custom seasons** — "Custom Season" modal (`ui/SeasonSetup.tsx`) lets the
    player build a calendar from scratch: add any of the 12 tracks (any
    number of times, including repeats), reorder rounds with ↑/↓, edit each
    round's lap count independently (3-100, clamped), remove rounds, or
    "Fill All 12 (Default Order)" for the original experience. `SeasonState.
    calendar` changed shape from `string[]` (track ids) to `SeasonRound[]`
    (`{trackId, laps}` — `sim/season.ts`), so a race's laps are no longer
    tied to the track's own `totalLaps`; `currentRoundTrack()` builds the
    actual `Track` passed into the race as a **shallow copy** of the
    registry track with `totalLaps` overridden, so the shared track objects
    in `tracks.ts` are never mutated (needed since the same track can appear
    more than once in one calendar with different lap counts each time).
    `useRace.switchTrack` changed from taking a `trackId` to taking a full
    `Track` object so it can carry that per-round override. `restartSeason`
    now restarts with the *current* calendar (custom or default) instead of
    always reverting to the default 12 — a deliberate improvement, and a
    no-op for the plain-default case since that's what it already did.
    Bumped the season-save localStorage key to `f1-manager-save-v3` since
    the `calendar` schema changed shape and an old `v2` save would otherwise
    load malformed data and crash.
13. **Damage & mechanical failures** — new `sim/damage.ts`: every car rolls a
    small independent chance each lap (`rollForDamage`, ~1.2% base, scaled
    0.7x-1.3x by the driver's aggression stat) of picking up damage, split
    minor/major/mechanical (70/25/5%, so mechanical is rare — roughly a
    3-4% chance across a full ~55-lap race per car). Active damage adds a
    flat seconds-per-lap penalty (`CarState.damagePenaltySeconds`, folded
    into `lapTime.ts`'s total) that persists until repaired; any pit stop
    (not just a dedicated "repair" stop) clears it and adds the damage's
    `pendingRepairSeconds` on top of the normal pit loss — see `clearDamage`/
    `applyDamage` in `damage.ts` and the `repaired` flag threaded through
    `raceEngine.ts`'s `LapCompute`. AI cars react through `decideAIAction`
    (`strategy.ts`): major/mechanical damage forces an immediate same-lap
    pit regardless of tire wear, minor damage just lowers the pit-wear
    threshold so they come in a bit sooner. The player instead gets a
    blocking `DamageAlert` modal (`ui/DamageAlert.tsx`): `useRace.ts` checks
    after every simulated lap for a new "damage" event belonging to the
    player, and if found pauses (`setPlaying(false)`) and sets `damageAlert`
    true, which also disables Play/Step in `PlaybackControls` (via a new
    `blocked` prop) until resolved. "Pit for Repairs" queues a next-lap stop
    on the player's current compound (`resolveDamage("pit")` ->
    `queuePlayerPitStop`); "Push Through" just dismisses the modal and the
    penalty keeps applying until the player pits some other way. Active
    damage also shows as a small ⚠ badge next to the driver's name in
    `Leaderboard.tsx` and as a status line in `PlayerControls.tsx`, and
    damage/repair events get a 💥 icon in `EventFeed.tsx`. Deliberately
    **not** implemented: retirement/DNF — a mechanical failure is a severe,
    long-lasting performance penalty, not a race-ending one, since properly
    modeling a retired car (removing it from the running order while still
    showing it in standings) would be a much larger change to the engine
    than this feature asked for. Verified in-browser with a custom 100-lap
    single-track season at 4x speed: saw AI cars get hit and react (both
    same-lap forced pits for major damage and deferred pits for minor), the
    player get hit with a blocking popup, both "Push Through" and "Pit for
    Repairs" paths, and the damage indicator appearing/clearing correctly —
    then ran the race to completion with no errors.
14. **Racing plans & weather** — two features landed together since weather
    needed the new tire compounds and the pre-race screen was the natural
    place to pick a starting compound suited to them.
    - **Tire compounds**: `TireCompound` gained `"intermediate"` and
      `"wet"` (`sim/types.ts`, defined in `sim/tires.ts` alongside the
      three slicks). Green/blue chips in `TireBadge.tsx`, matching real F1
      convention.
    - **Weather**: new `sim/weather.ts` — `WeatherCondition` is
      `"dry"|"damp"|"wet"`, stored on `RaceState.weather` (starts `"dry"`
      every race). Each lap, `rollForWeatherChange` (~1% chance) can shift
      it one step, occasionally two ("drastic" — dry straight to wet or
      back, rarer, weighted in `TRANSITIONS`). The wrongness of a tire for
      current conditions is a single `weatherMismatch()` value (0-2, compound
      "grip level" vs weather "severity level"); that feeds three things:
      `tireWeatherPenaltySeconds()` (lap time, folded into `lapTime.ts`),
      `weatherRiskMultiplier()` (scales `damage.ts`'s `rollForDamage` chance
      — explicitly "higher risk of damage... in rainy weather" from the
      user's request), and `decideAIAction` in `strategy.ts` (mismatch >=2
      forces an immediate same-lap pit for the right compound, mismatch ===1
      just lowers the pit threshold — same pattern as damage urgency).
      `weatherBaseLapPenaltySeconds()` also slows *everyone* a bit in the
      rain regardless of tire, and noise amplitude in `lapTime.ts` scales up
      with conditions (rain makes racing scrappier for everyone). The player
      gets a blocking `WeatherAlert` modal (`ui/WeatherAlert.tsx`) on *any*
      weather change (not just severe ones) with a compound picker
      pre-selecting the ideal tire, "Pit Now" or "Push Through" — same
      pause/block wiring in `useRace.ts` as the damage alert
      (`weatherAlert` state, checked alongside `damageAlert` in `step()`).
      Current conditions show as an icon+label in the header subtitle at
      all times, not just during the alert.
    - **Racing Plan**: before every race (initial load, Next Round, Reset,
      Restart, and starting a custom season — anywhere `useRace` builds a
      fresh lap-0 state) a blocking `RacingPlan` modal (`ui/RacingPlan.tsx`)
      now appears: starting compound, driving mode, and a fully custom
      multi-stop pit plan (add/remove/edit lap+compound per stop, no count
      limit). Implemented as a `planPending` flag in `useRace.ts` (`true`
      at mount and after `reset`/`switchTrack`, `false` after
      `restoreRaceState`) that blocks Play/Step exactly like the damage/
      weather alerts. Confirming calls the new `applyPlayerPlan()` in
      `raceEngine.ts`, which mutates the already-created player `CarState`
      directly (compound/mode/pitPlan) rather than re-running `setupRace` —
      much less invasive than threading a dynamic strategy through
      `useSeason`. The modal pre-fills from the player's current (placeholder)
      car state, so accepting it unedited is a valid "I don't want to
      bother" path — satisfies "the *option* to create a plan" without a
      separate skip button. `App.tsx`'s three pre-race/mid-race modals
      (RacingPlan, WeatherAlert, DamageAlert) are mutually exclusive by
      render-order priority in case two conditions are somehow both true
      the same lap.
    - Bumped the season-save key to `f1-manager-save-v4` (`RaceState`
      gained `weather`) — and this bump also retroactively covers a gap
      from phase 13, which added `CarState` damage fields without its own
      version bump.
    - **Bug found and fixed during testing**: the pre-race `RacingPlan`
      modal's full-viewport backdrop visually sits on top of everything,
      including the header's Save/Load/Custom Season buttons — a coordinate
      click on "Load" was actually landing on the invisible backdrop above
      it and doing nothing, making a saved game **permanently unreachable**
      on a fresh page load (the modal has no close/cancel by design, so
      there was no way out). Fixed by adding a "Load Saved Game Instead"
      link inside the `RacingPlan` modal itself (`hasSave`/`onLoad` props)
      rather than changing the backdrop's click-blocking behavior. Worth
      remembering if another blocking modal is added later — check whether
      it can strand a player away from Load.
    - Verified in-browser: built a custom plan (changed starting compound,
      added a second stop with a weather compound), confirmed the player's
      car actually started on the chosen tire; ran a custom 100-lap race,
      watched weather shift dry -> damp, saw multiple AI cars react with
      same-lap pits to intermediates, took the player through both a
      damage alert and the weather alert (chose Pit Now, confirmed the tire
      changed and damage feed logged it), ran the race to completion with
      no console/server errors, confirmed Reset reopens the plan modal, and
      confirmed the Load-bug fix by saving mid-race, reloading the page
      fresh, and using the new in-modal Load link to restore it correctly.
15. **Penalties, DNF retirements, race results, and two real StrictMode bugs**
    — a big one. In rough order:
    - **Time penalties** (new `sim/penalties.ts`): every car rolls a small
      per-lap chance of a 5-10s time penalty (track limits, unsafe release,
      collision, etc.), dominated by driving mode —
      conserve/balanced/push risk multipliers are 0.35x/1x/2.4x, with a
      modest further scale from the driver's aggression stat. No popup for
      these (deliberately, to avoid more interruptions) — just an event log
      entry and a running `car.penaltySeconds` total, folded directly into
      `naiveTotal` in `raceEngine.ts` alongside pit loss so it affects
      battle resolution and final standings like any other time loss.
    - **DNF retirements** (new `sim/retirement.ts`) — the race-ending
      damage explicitly deferred in phase 13. An extremely small per-lap
      chance, built from three additive risk contributions: active
      unrepaired damage, a tire/weather mismatch (scaled by mismatch
      level), and push driving mode (scaled a bit by aggression). Verified
      by Monte Carlo (import the module directly in a dev-server browser
      tab via `await import('/src/sim/retirement.ts')` — plain ES modules,
      no build step needed) over 3000 trials × 55 laps: all three factors
      together ≈3%, any single factor alone ≈0.6-1.3%, none of them
      ≈0.13% — matches "extremely rare, barely see it, but can happen"
      closely. `CarState` gained `retired`/`retiredReason`; a retiring car
      gets `finished = true` too (so the existing "is the race over" check
      needs no changes) and is skipped for the rest of that lap's
      processing. `getStandings()` in `raceEngine.ts` now ranks retired
      cars below every classified car (their frozen totalTimeSeconds would
      otherwise make an early retirement look like the race leader),
      ordered among themselves by laps completed — the standard DNF
      convention. `completeRound()` in `season.ts` gives retired cars 0
      points regardless of their nominal position.
    - **Race Results screen** (`ui/RaceResults.tsx`): auto-opens (via a
      `useEffect` watching `raceState.finished`) the moment a race ends —
      closable, not a blocking gate like the other modals. Shows final
      classification (DNFs sorted below finishers, with their retirement
      reason), best lap, total time, and total penalties per driver, via a
      new `getFinalResults()` in `raceEngine.ts` (wraps `getStandings()`
      plus `Math.min(...car.lapTimes)`).
    - **Fewer, more detailed popups** — three changes: (1) the damage
      popup now only fires for major/mechanical severity, not minor (minor
      damage still applies and shows in the leaderboard/event feed, just
      silently); (2) the weather popup only fires when the change actually
      invalidates the player's *current* tire (`weatherMismatch(...) >= 1`)
      — if you're already on the right tire when conditions shift, no
      interruption; (3) `damage.ts` damage options gained a narrative
      `description` field per specific cause (e.g. "A knock on the front
      wing has chipped away some front-end grip"), shown in
      `DamageAlert.tsx` above the numeric penalty — this is what "properly
      detail the damage... more immersive" meant. Base damage/weather-change
      per-lap chances were also both dialed back slightly
      (0.012→0.009, 0.01→0.008).
    - **AI pit/push variance** (`strategy.ts`): previously, "urgent" damage
      or weather-mismatch situations always forced an immediate AI pit.
      Now there's a `gambleChance` (15-50%, aggression-scaled) that a car
      stays out anyway despite the urgency, re-rolled every lap the
      situation persists — so across a full grid you see a realistic mix
      of some cars pitting immediately and others holding out a lap or
      two, rather than everyone reacting in lockstep.
    - **Weather forecast** (`generateWeatherForecast()` in `weather.ts`,
      displayed by the new shared `ui/WeatherForecast.tsx` strip
      component): a *preview*, not a guarantee — it runs the exact same
      `rollForWeatherChange` transition model standalone with a throwaway
      random source, completely independent of the race's own live weather
      rolls. Shown in the pre-race `RacingPlan` (whole race), the
      `WeatherAlert` popup (remaining laps, so you can see what's likely
      coming when deciding your tire), and the new mid-race `RevisePlan`
      screen (also remaining laps, regenerated fresh every time it opens —
      this is the "updated forecast readings" the player can act on).
      Deliberately *not* a scripted/predetermined race weather timeline:
      the actual weather still rolls live and independently lap by lap
      (unchanged from phase 14), so a forecast can turn out wrong, same as
      real weather — the point of `RevisePlan` is exactly to let the
      player react when live conditions diverge from what was forecast.
    - **Mid-race Revise Plan** (`ui/RevisePlan.tsx`): a non-blocking
      (closable, calls `pause()` on open rather than hard-gating) screen
      reachable any time during a race via a new "Revise Plan (Forecast)"
      button in `PlayerControls.tsx`. Lets the player replace their entire
      remaining pit-stop schedule (not just the single next stop
      `queuePlayerPitStop` supports) — new `setPlayerPitPlan()` in
      `raceEngine.ts` and `updatePitPlan()` in `useRace.ts`.
    - **Bug #1 — the reported "lap counter jumps in 2s"**: root cause was
      `useRace.ts`'s `step()` calling `simulateLap(prev)` (which mutates
      its argument) directly inside a `setRaceState(prev => ...)`
      functional updater. React StrictMode (`main.tsx` wraps `<App/>` in
      `<StrictMode>`) intentionally calls updater functions **twice** in
      development to catch exactly this kind of impurity; since both calls
      received the *same* `prev` reference and the first call already
      mutated it, the second call mutated an already-incremented lap
      counter, advancing by 2 per tick. Only manifests in dev
      (`npm run dev` — production builds skip StrictMode's double-invoke),
      which is presumably why the user saw it but it was never caught by
      the production-build checks run after every phase so far. Fixed by
      `structuredClone`-ing `prev` before mutating — confirmed safe since
      `RaceState`/`CarState` are plain JSON-safe data with no functions or
      class instances (the same property `persistence.ts` already relies
      on for localStorage save/load). Applied the same clone-before-mutate
      pattern to every other `setRaceState` updater in the file for
      consistency, even though those are individually idempotent (setting
      the same driving mode/pit plan twice is harmless) and so weren't
      actually causing bugs on their own.
    - **Bug #2 — phantom weather/damage alerts (found *while verifying
      the fix above*, in-browser)**: after the `structuredClone` fix, the
      lap counter was correct, but a weather alert popup fired once even
      though the player's current tire already matched the new weather
      (mismatch 0) — contradicting the just-added gating logic. Root
      cause: `step()` was calling `setWeatherAlert(true)`/
      `setDamageAlert(true)`/`setPlaying(false)` as *side effects from
      inside* the updater. Because StrictMode's two calls use independent
      `Math.random()` draws (only the clone is shared, not the randomness),
      the two calls can simulate genuinely different lap outcomes — e.g.
      call 1 rolls a weather change that mismatches and fires
      `setWeatherAlert(true)`, call 2 (the one whose *return value* React
      actually keeps) rolls no change at all. The side effect from the
      discarded call 1 still lands in React state, popping an alert for an
      event that never actually happened in the committed race history.
      Fixed by moving all alert-detection out of the updater entirely and
      into a separate `useEffect` that reacts only to the *committed*
      `raceState` — effects aren't re-run for a discarded StrictMode render
      the way updaters are. Added a `lastCheckedLapRef` guard so the effect
      only evaluates a given lap once (otherwise an unrelated re-render
      while sitting on the same lap — e.g. changing driving mode — would
      re-scan that lap's already-handled events and could re-alert).
      **Lesson for future sessions**: never call other `setX` functions as
      side effects from inside a `setState(prev => ...)` updater,
      especially one that calls into non-deterministic logic — StrictMode
      may invoke it more than once with outcomes that diverge from what
      actually gets committed. Decide side effects from the committed
      state in an effect instead.
    - Bumped the season-save key to `f1-manager-save-v5` (`CarState`
      gained `penaltySeconds`, required — an old save's missing field
      would propagate `NaN` through total-time math — plus
      `retired`/`retiredReason`/`damageDescription`).
    - Verified in-browser (twice, after finding and fixing both StrictMode
      bugs above, in a fresh tab the second time — an HMR-battered dev tab
      can accumulate stale Fast-Refresh state that produces misleading
      "hook order changed" console errors unrelated to the actual code;
      worth remembering, don't chase that particular error without first
      trying a genuinely fresh tab): stepped single laps to confirm exact
      +1 increments; ran a 100-lap push-mode custom race end to end with
      zero console/server errors — minor damage applied silently (no
      popup), a real hard-tires-in-damp mismatch correctly popped the
      weather alert, pitting for intermediates and continuing for 40+
      further laps produced no further (phantom) alerts, 11 penalty events
      accumulated (push mode) with the total correctly reflected in the
      final results screen (+20s for the player), Race Results auto-opened
      exactly at lap 100 with correct best-lap/total-time/penalty
      formatting, and a save/load round-trip through the new v5 schema
      restored everything correctly.
16. **Main menu, live forecast visibility, qualifying, louder popups, and a
    visual damage indicator** — user feedback after playing phase 15's
    build: the single game screen felt cluttered, the forecast was buried
    behind a click, only 1 popup showed up in a 53-lap race (wanted ~3),
    the damage popup wasn't detailed/visual enough, and the game "felt
    incomplete" without being able to say exactly why.
    - **Main menu** (`ui/MainMenu.tsx`): the app now opens to a full-screen
      menu (`showMenu` state in `App.tsx`, `true` on mount) with Play/
      Resume (label depends on `!planPending`, i.e. whether a race has
      already been configured), Custom Season, Edit Driver, and Load Saved
      Game (only shown when `hasSave`). The in-game header's two buttons
      got replaced with a single "Menu" button (`pause()` then
      `setShowMenu(true)`) — decluttering was the explicit ask, so
      Custom Season/Edit Driver are reachable only via the menu now, not
      from mid-race. `DriverProfile`/`SeasonSetup` render as siblings
      outside the menu-vs-game branch so they can open from either
      context; starting a custom season or loading a save also dismisses
      the menu.
    - **Live weather forecast** (sidebar section in `App.tsx`, using the
      existing `WeatherForecast` component and `generateWeatherForecast`):
      previously the forecast only existed inside modals you had to
      actively open (Racing Plan, a weather alert, or Revise Plan) — "I
      don't see the place to check the live forecast" was a real gap. Now
      a "Weather Forecast" section sits in the sidebar at all times during
      a race, showing the next 15 laps, regenerated via `useMemo` keyed on
      `currentLap`/`weather` (once per lap, not every render, so it stays
      visually stable within a lap).
    - **Qualifying**: `raceEngine.ts` gained `runQualifying()` — a
      one-lap-equivalent sim (combined car/driver pace plus ±3 random
      variance, no tire wear/fuel) run once in `setupRace()`, fastest to
      slowest. Grid order is applied as a tiny per-position time offset
      (position × 0.001s) on top of each car's starting `totalTimeSeconds`
      — enough to break the lap-0 "everyone's tied at 0.0s" sort
      deterministically in qualifying order, negligible against real
      race-time deltas everywhere else. This was `memory.md`'s own
      "known limitation" (lap-1 order was arbitrary roster order) and is
      the main answer to "why does this feel incomplete" — starting
      position now actually matters, and the player sees exactly where
      they qualified (`RacingPlan` shows "Qualified P{n}", sourced from
      `playerStanding` at lap 0 — no new state needed, it falls out of the
      grid-offset sort for free).
    - **Louder popups**: `DAMAGE_CHANCE_PER_LAP` 0.009→0.02 and its
      minor/major split shifted from 70/25/5% to 50/45/5% (so major+
      mechanical — the popup-worthy tiers — went from 30% to 50% of
      events); `WEATHER_CHANGE_CHANCE_PER_LAP` 0.008→0.022. Together,
      roughly triples the expected popup count over a full race. Verified
      in-browser: 4 popups (3 damage, 1 weather) in one 53-lap race,
      against the user's target of "~3" — close, and randomness means any
      one race will vary either side of that.
    - **Car damage visual** (`ui/CarHealthIndicator.tsx`): a small
      schematic top-down car silhouette (plain SVG shapes — body, wings,
      wheels — not an illustration, matching the app's existing clean
      data-viz aesthetic rather than attempting photorealism) that
      recolors green → orange → red exactly as the user described:
      no-damage green, minor-or-major damage orange (deliberately not
      distinguishing the two shades — the accompanying text already says
      exactly what's wrong; the icon is for an ambient at-a-glance read),
      mechanical red. Shown always-visible in the Strategy panel
      (`PlayerControls.tsx`, new "Car Condition" row) and prominently in
      the `DamageAlert` popup itself, alongside the existing
      `damageDescription` flavor text from phase 15 (also now reused as
      the damage-row detail line in `PlayerControls`, not just the popup).
    - Deliberately **not** built this round, flagged instead as natural
      next steps if the user wants to keep going: a safety car / VSC
      system tied to retirements (bunches the field, creates a strategic
      cheap-pit-stop window — classic source of race drama this sim
      doesn't have yet) and car development/budget progression across a
      season (the other hallmark "F1 Manager" feature, but a genuinely
      large addition — a budget currency, upgrade choices, persistence —
      not something to bolt on without discussing scope first).
    - Verified in-browser end to end: menu → Play → RacingPlan showing
      "Qualified P4" and a real varied forecast (dry → damp → wet) → set
      pit stops around that forecast → started, confirmed grid order in
      the lap-0 leaderboard and player-summary both read P4 → hit a damage
      popup showing the orange car icon, label, and flavor description →
      confirmed the same orange indicator + description persisted in the
      Strategy panel after dismissing → opened Menu mid-race (button
      correctly read "Resume") → resumed at the exact lap it paused on →
      ran to completion picking up 4 total popups and 0 console errors →
      confirmed Race Results, then separately re-verified Edit
      Driver/Custom Season both still open correctly over the menu and
      return to it on cancel.
17. **Safety Car / VSC** — the first of two features the user asked for
    together (Safety Car/VSC and team development/budget), scoped via a round
    of questions first: escalating VSC→SC by severity (not VSC-only or
    SC-only), an interactive blocking alert on deployment (matching the
    Weather/Damage alert pattern), and no persistence concerns since this
    feature is entirely within a single race.
    - **Trigger model** (new `sim/caution.ts`): a retirement always brings
      out at least a Virtual Safety Car, with a 40% chance it escalates to a
      full Safety Car instead (`rollCautionForRetirement`). Independently,
      major/mechanical damage that *doesn't* cause a retirement has its own
      small 12% chance to bring out a VSC on its own — a car limping back
      with visible damage — but this path never escalates to a full SC
      (`rollCautionForDamage`). VSC lasts 3-5 laps, SC lasts 4-7. Verified
      the trigger split and duration ranges by Monte Carlo (5000 trials via
      dynamic `import('/src/sim/caution.ts')` in a dev-server browser tab,
      same technique as phase 15's retirement verification): landed at
      40.2%/59.8% SC/VSC and 12.15% for the damage path, matching spec.
    - **Effects** (`raceEngine.ts`'s `simulateLap`): a caution multiplies
      every car's raw lap time (VSC ×1.35, SC ×1.6 — a multiplier rather
      than a flat seconds figure, so it scales correctly across wildly
      different track lengths) and discounts pit-stop time loss (VSC ×0.65,
      SC ×0.35 — the "cheap window" the whole feature exists to create).
      Both types suppress overtaking entirely and pause new
      damage/retirement/penalty rolls for the duration (a caution existing
      is exactly why the field *isn't* generating new chaos). A full SC
      additionally bunches the field: each lap, a car's gap to the one ahead
      closes by 45% (`SC_GAP_CLOSURE_RATE`, floored at 0.05s so gaps never
      hit exactly zero) instead of the normal battle/overtake resolution —
      converges the pack to nose-to-tail over the SC's several laps rather
      than snapping shut instantly.
    - **Timing subtlety, worth remembering**: `simulateLap` snapshots
      `activeCaution = state.caution` *before* processing the lap — this is
      the caution that controls this lap's math. A caution triggered by an
      incident *during* this same lap (via `cautionTriggeredThisLap`) is
      written to `state.caution` but does **not** affect this lap's lap-time
      multiplier, pit discount, or bunching — those start next lap. This
      matters because the incident that triggers a caution still happens at
      racing speed; only the *response* to it is slow. Symmetrically, the
      lapsRemaining-decrement logic at the end of the lap only fires
      `if (state.caution === activeCaution)` — i.e. only for a caution that
      already existed before the lap — so a freshly-triggered caution's
      countdown starts the lap after, not the lap it's set. Get this wrong
      (e.g. decrement unconditionally) and a caution silently loses its
      first lap of duration, or a same-lap incident retroactively slows down
      a lap that already played out at racing pace.
    - **AI reaction** (`strategy.ts`): `decideAIAction` gained a `caution`
      field on its context. A `cautionOpportunity` roll (45-70%, aggression-
      scaled, gated on the car having at least a little tire wear so a car
      that just pitted doesn't immediately pit again) lets AI cars grab the
      cheap window even without their normal pit-urgency threshold being
      met — this is what makes the field's pit-stop pattern visibly cluster
      during a caution instead of continuing on the same schedule as if
      nothing happened.
    - **Player experience**: a new `ui/CautionAlert.tsx` blocking modal
      (lowest priority of the four modals, after plan/weather/damage) fires
      the lap a caution is freshly deployed — type, expected duration, and
      an estimated discounted pit cost — with Pit Now (queues a stop next
      lap on the current compound, like `resolveDamage`) or Stay Out. A
      persistent yellow banner in the header (`caution-banner` in
      `App.css`) shows type + laps remaining for the whole caution period,
      and `EventFeed.tsx` logs both the deployment and the "Green flag!"
      end. `useRace.ts` detects a *freshly* deployed caution via
      `raceState.caution.lapsRemaining === raceState.caution.durationLaps`
      (only true the one lap it's set, per the timing subtlety above) rather
      than parsing event message text — a cleaner, state-shape-based
      detection than the string-matching this could easily have become.
    - Bumped the season-save key to `f1-manager-save-v6` (`RaceState`
      gained the required `caution` field — an old save's `undefined` would
      fail `!== null` checks and crash on property access, so this needed a
      version bump rather than degrading gracefully).
    - Verified in-browser with the same custom 100-lap single-track (Monza)
      approach as prior phases, player in push mode to raise the incident
      rate: 4 VSCs deployed over the race (one from a retirement, the rest
      from the damage-only path — no live full SC this run, consistent with
      SC needing both a retirement *and* the 40% escalation roll), each
      showing the correct alert copy and discounted pit estimate, the
      banner counting down correctly, racing resuming normally (overtakes
      reappearing in the event feed) after each "Green flag!", and the race
      completing cleanly at lap 100 with a caution still active at the
      finish (an edge case that worked without special-casing, since a
      caution's effects are just per-lap multipliers with no assumption the
      race continues past it) — zero console errors throughout. Because a
      live full SC needs a retirement (rare by design, see phase 15) *and*
      a 40% escalation roll on top, its rarer bunching/discount path was
      instead verified deterministically: imported `raceEngine.ts` directly
      in the browser console, forced `state.caution = {type: "sc", ...}`
      with two real roster cars artificially 5s apart, ran one
      `simulateLap` with a constant-random source, and confirmed the gap
      closed (5s → 3.14s, in the expected direction/magnitude — not exactly
      45% because the two real drivers have slightly different pace stats,
      which is expected noise, not a bug), no overtake event fired despite
      the cars being well within the normal battle zone, and
      `lapsRemaining` decremented correctly. A second console test
      confirmed a VSC pit stop costs exactly 0.65× a green-flag one
      (25.4s → 16.5s for the same stop) and that the caution clears with a
      "Green flag!" event exactly on its last lap.
18. **Team development & budget** — the second of the two features scoped
    together before phase 17. Scoping questions settled: escalating VSC→SC
    (already built in 17), an interactive alert (built in 17), prize money
    by finishing position (not a flat per-round income or one season-long
    lump sum), and — the biggest scope call — **both the player and every
    AI team develop**, with progress resetting each season rather than
    persisting into a multi-season career.
    - **Model** (new `sim/development.ts`): three upgrade categories —
      Pace (+1.6 carPerformance/level), Reliability (-9%/level on the
      damage+retirement roll chance), Tire Management (-7%/level on tire
      wear) — each 0-5 levels, costing 250/800/1600/2600/3800 to reach the
      next level (a deliberately steep curve: cheap to dip a toe in, real
      money needed to push toward the cap). `TeamDevelopment
      {budget, paceLevel, reliabilityLevel, tireManagementLevel}` lives in
      `SeasonState.teamDevelopment` (keyed by team id), **not** the shared
      `roster.ts` team registry — same reasoning as `season.ts`'s
      per-round lap-count override: it must reset every season, and the
      registry is shared/global.
    - **Income**: `PRIZE_TABLE`/`prizeForPosition` in `season.ts` — a
      16-position payout (500 down to a 10-credit floor) where, unlike the
      points table, *every* position earns something, so every team's
      budget grows every round regardless of where they finish. Paid out
      in `completeRound`, summed across both a team's drivers into one
      shared team budget (a driver's teammate's result funds the same pool
      as their own — it's the team's budget, not the driver's).
    - **AI teams auto-spend**, the player doesn't get a shop UI for them:
      `aiAutoSpend` (in `development.ts`) attempts up to 2 purchases per
      round, each in a category weighted toward whichever one that team is
      currently lagging in (a flat floor keeps a maxed category
      occasionally "pickable" — and then skipped as unaffordable/capped —
      rather than a hard exclusion that would make every team converge on
      identical builds). `completeRound` runs this for every team *except*
      the player's own (identified via `standings.find(r =>
      r.car.isPlayer)?.car.team.id`, not a parameter) — the player manages
      their own team's spending manually through the new
      `ui/TeamDevelopment.tsx` screen instead.
    - **Wiring into the race** (`raceEngine.ts`): `createCarState` takes an
      optional `TeamDevelopment` for that driver's team. Pace becomes a
      car-scoped shallow copy of Team with carPerformance bumped
      (`developedTeam()`, mirroring `currentRoundTrack`'s
      copy-don't-mutate pattern) — `runQualifying` uses the same helper, so
      a pace upgrade improves grid position too, not just race pace.
      Reliability and tire management become two new required `CarState`
      fields, `reliabilityMultiplier`/`tireWearMultiplier` (default 1 when
      no development is passed, e.g. a standalone test setup), which
      `damage.ts`/`retirement.ts` multiply into their roll chance and
      `lapTime.ts` multiplies into the tire wear penalty — reading a field
      already on the car directly, rather than threading `TeamDevelopment`
      through every roll function's signature.
    - **The stale-closure trap this phase had to design around**:
      `useSeason.advanceToNextRound`/`restartSeason`/`startCustomSeason`
      all call `setSeason(...)` and then, in the very same callback,
      `race.switchTrack(...)` — but `race.switchTrack` is a `useCallback`
      created on the *previous* render, so if it closed over
      `season.teamDevelopment` as a captured hook option, it would still
      read the development state from *before* this round's prize
      money/AI spending was applied (React hasn't re-rendered `useRace`
      with a fresh option yet when the callback runs). Fixed by having
      `useRace`'s `reset`/`switchTrack` take `teamDevelopment` as an
      explicit call argument instead of a hook option — `useSeason` passes
      the freshly-computed `updated.teamDevelopment`/`fresh.teamDevelopment`
      it already has in scope, sidestepping the staleness regardless of
      React's render timing. Only the very first lazy `setupRace` call (at
      `useRace` mount) still reads a hook option
      (`initialTeamDevelopment`), since that one only ever runs once,
      before any round has completed. **Lesson for future sessions**: any
      time a callback both updates state derived from `useX` and, in the
      same tick, calls a memoized function *from* `useX`, check whether
      that function's `useCallback` deps include the data the state update
      just changed — if the function was created on a prior render, it can
      still be holding the pre-update value.
    - **Player UI**: `ui/TeamDevelopment.tsx` — budget, three cards (level
      dots, live effect readout, next-level cost), reachable any time from
      `MainMenu` and, more usefully, from `RaceResults`'s new "Manage
      Development Budget" button right after a round's prize money lands
      — this matters because the *next* round's `RacingPlan` modal has no
      cancel/close (a deliberate design from phase 14) and blocks reaching
      Menu until confirmed, so RaceResults is the only guaranteed window to
      spend a round's earnings before locking into the next one.
    - Bumped the season-save key to `f1-manager-save-v7` (`CarState` gained
      the required `reliabilityMultiplier`/`tireWearMultiplier`,
      `SeasonState` gained the required `teamDevelopment`).
    - Verified with a mix of live play and direct console tests (importing
      `sim/season.ts`/`sim/development.ts`/`sim/raceEngine.ts` the same way
      phase 17 verified the rare Safety Car path): played a 3-round,
      6-lap-per-round custom season live — confirmed the player's team
      budget landed at exactly 270 after round 1 (P5=260 + P16=10, the
      two Kestrel GP drivers' actual finishing positions that race),
      spending 250 of it on a Pace upgrade correctly dropped the budget to
      20 and disabled all three buttons (unaffordable), and a direct
      `setupRace` call with that development record back confirmed the car
      actually got `team.carPerformance` 85→86.6, `reliabilityMultiplier`
      0.82, and `tireWearMultiplier` 0.79 — each matching the category
      levels exactly. Console-verified `aiAutoSpend` over 8 simulated
      rounds of income: purchases land, cap at 2/round, spending tracks
      budget correctly, and levels spread across categories rather than
      dumping everything into one. Console-verified `purchaseTeamUpgrade`
      no-ops (returns the same `SeasonState` reference) when unaffordable.
      Played the season to completion, restarted it, and confirmed
      `teamDevelopment` reset to all zeros; saved mid-round-1 of the fresh
      season, reloaded the page cold, loaded the save, and confirmed the
      budget came back at 0 (not the prior season's spent-down state) with
      zero console/server errors across the whole session.

19. **Difficulty system** — the last feature requested; the user considers the game
    feature-complete after this phase. A three-way Easy/Normal/Hard toggle
    (`ui/MainMenu.tsx`) that scales AI pace only:
    - **Model** (new `sim/difficulty.ts`): `AI_SPEED_MULTIPLIER` — easy 0.8,
      normal 1, hard 1.2 — is the entire mechanic. In `raceEngine.ts`'s
      `simulateLap`, a non-player car's raw lap time is divided by that
      multiplier (a speed multiplier above 1 means faster, so it divides
      into a time rather than multiplying); the player's own `rawLapTime`
      is never touched, and per-lap noise/tire wear/damage/etc. are
      untouched too — this is purely a pace shift, not a difficulty
      applied to the odds of anything. Deliberately *not* applied to
      `runQualifying`'s grid-order pace, to keep the change scoped to
      exactly what was asked (AI race pace) rather than also reshuffling
      starting positions.
    - **Persistence**: stored in its own localStorage key
      (`state/difficulty.ts`, `f1-manager-difficulty-v1`, defaults
      `"normal"`) separate from the season save — same reasoning as
      `driverProfile.ts`: it's an app-wide setting, not part of any one
      season or race. `RaceState` itself gained a required `difficulty`
      field (baked in once at `setupRace` and read every lap by
      `simulateLap`), so the season-save key bumped to
      `f1-manager-save-v8`.
    - **Change timing**: picking a new difficulty in the menu updates
      `App.tsx` state and localStorage immediately, but an *already
      running* race keeps whatever difficulty it was set up with — the
      new value only reaches `setupRace` the next time one is called
      (Reset, Next Round, Restart, or a fresh Custom Season). `MainMenu`
      shows a one-line hint to this effect whenever a race is already
      under way (`hasStartedRace`). This mirrors phase 18's teamDevelopment
      wiring almost exactly: `useRace`'s `reset`/`switchTrack` take
      `difficulty` as an explicit call argument (not a captured hook
      option) for the same reason — even though difficulty doesn't
      actually have teamDevelopment's same-tick staleness bug (nothing
      recomputes it mid-callback the way `completeRound` recomputes
      `teamDevelopment`), matching the established pattern was simpler
      than reasoning out whether a plain captured option would've been
      safe here too.
    - Verified in-browser: a deterministic console test (importing
      `raceEngine.ts` directly, same technique as phases 15/17/18) called
      `setupRace`+`simulateLap` with a constant random source at each of
      the three difficulties and confirmed the AI car's lap time was
      exactly 100s/80s/66.67s (easy/normal/hard — 80s ÷ 0.8/1/1.2) while
      the player's lap time stayed fixed at 81.5s in all three. Then live
      play: selected Hard from the menu, started a race, and watched the
      player (a mid-pack car/driver) sink to P11 within 3 laps as the AI
      pulled away; reset mid-race with Hard still selected and confirmed
      (via the save file) the *new* race's `difficulty` was `"hard"`
      where the very first race of the session — created before any menu
      click — had correctly stayed `"normal"`; saved and inspected
      `f1-manager-save-v8` directly to confirm the field round-trips.
      Zero console errors throughout, `tsc -b` clean.

20. **Settings system** — after phase 19, the user asked for five more
    tactical features (fuel strategy, setup trade-off, race engineer
    suggestions, teammate team orders, driver market) plus a Settings screen
    to enable/disable every optional system. This phase built the Settings
    infrastructure first since every later phase in this batch plugs into it.
    - New `sim/settings.ts`: `GameSettings` — one boolean per optional
      system (damageEnabled, weatherEnabled, cautionsEnabled,
      penaltiesEnabled, retirementsEnabled, fuelStrategyEnabled,
      setupTradeoffEnabled, strategistSuggestionsEnabled, teamOrdersEnabled,
      seasonObjectivesEnabled, rivalTrackerEnabled) plus two
      career-persistence toggles (driverMarketPersists, multiSeasonCareer),
      both **off** by default per explicit instruction — everything else
      defaults **on** (matches the pre-existing experience).
      `SETTING_TOGGLES`/`SETTING_GROUPS` drive the UI generically instead of
      hand-writing each toggle row.
    - `state/settings.ts`: localStorage persistence
      (`f1-manager-settings-v1`), merging stored values over
      `DEFAULT_SETTINGS` so a toggle added in a later phase still gets a
      sane default for an old stored blob instead of `undefined`.
    - `ui/SettingsScreen.tsx`: a modal grouping toggles into Race
      Systems/Tactical Options/Season & Career, plus the Easy/Normal/Hard
      difficulty control **moved here from MainMenu** (MainMenu now just has
      a "Settings" button).
    - `RaceState` gained a required `settings: GameSettings` field, baked in
      once at `setupRace` — same pattern as `difficulty`, so a mid-race
      Settings change never destabilizes a race already in progress. The
      five pre-existing systems are gated with `state.settings.xEnabled &&`
      checks in `simulateLap`; the newer toggles become functional as their
      features land in the phases below. Bumped the season-save key to v9.
21. **Fuel strategy** — a pre-race Light/Standard/Heavy fuel-load choice in
    `RacingPlan`, gated by `fuelStrategyEnabled`.
    - New `sim/fuel.ts`: Light gives a permanent -0.25s/lap pace bonus but a
      whole-race fuel budget (`initialFuelRemaining`, laps × a
      per-load multiplier — 0.85 for Light, 1.15 Standard, 1.5 Heavy) that
      depletes every lap by a driving-mode-scaled burn rate
      (`fuelBurnForLap` — push 1.35x, balanced 1x, conserve 0.7x). **Not**
      replenished at pit stops — a whole-race resource, so managing it means
      watching driving mode across the *entire* race, not just one stint.
      Running it dry sets `CarState.fuelSaving = true` permanently for the
      rest of the race, applying `FUEL_SAVING_PENALTY_SECONDS` (0.6s/lap) —
      worse than Light's own bonus, so it's a real mistake to manage around,
      not a soft inconvenience. Heavy is the inverse: +0.25s/lap, never
      realistically runs dry.
    - AI cars always run "standard" — fuel micromanagement stays a
      player-facing tactical layer, matching how AI already doesn't get
      difficulty-scaled pace or the later downforce/team-order features
      either. `InitialStrategy` gained a required `fuelLoad` field.
    - `CarState` gained `fuelLoad`/`fuelRemaining`/`fuelSaving` (all
      required); `createCarState` forces `fuelLoad` to `"standard"`
      whenever `settings.fuelStrategyEnabled` is false, regardless of what
      the strategy object says — guards against stale "light"/"heavy" left
      over from before the player disabled the feature. `applyPlayerPlan`
      re-derives `fuelRemaining` from whatever load the player actually
      confirmed in `RacingPlan` (the car was first created with a
      placeholder strategy before that screen opens).
    - Current load + remaining margin show in `PlayerControls`'s Strategy
      panel; running dry logs a new `"fuel"` LapEvent type (⛽ icon).
      Verified in-browser: a deterministic console race (Light + push the
      whole way, 53-lap Monza) ran dry almost exactly where the arithmetic
      predicted (lap 34 vs. a predicted ~33.4), and disabling the setting
      confirmed the load stays "standard" and never depletes even under
      sustained push. Bumped the season-save key to v10.
22. **Setup trade-off (downforce)** — a pre-race Low/Balanced/High downforce
    choice in `RacingPlan`, gated by `setupTradeoffEnabled`.
    - New `sim/downforce.ts`: derives which way a track "leans" from its
      *existing* `overtakingDifficulty` stat rather than adding new
      per-track data — a twisty, hard-to-pass track (high
      overtakingDifficulty, e.g. Monaco) rewards High downforce; a power
      track (low overtakingDifficulty, e.g. Monza) rewards Low. Picking
      against a track's grain costs real lap time
      (`downforcePaceDeltaSeconds`, ±0.45s scaled by how strongly the track
      leans); Balanced is always neutral. It's a genuine trade-off, not a
      free lunch: Low downforce also wears tires 12% faster and High wears
      them 10% slower (`downforceTireWearMultiplier`), so chasing a power
      track's pace bonus with Low costs tire life across the stint.
      `recommendedDownforceFor(track)` powers a plain-language hint on the
      Racing Plan screen ("This track tends to reward low downforce...")
      without exposing raw numbers.
    - Same AI-always-"balanced" simplification as fuel load. `CarState`
      gained a required `downforce` field, same forced-to-default-when-
      disabled pattern as `fuelLoad`. Verified the pace math directly in
      console for both Monza (favors Low, confirmed negative/positive
      deltas) and Monaco (favors High, confirmed the mirrored signs).
      Bumped the season-save key to v11.
23. **Race engineer strategist suggestions** — a non-blocking advisory,
    gated by `strategistSuggestionsEnabled`: a small corner toast
    (`ui/StrategistSuggestion.tsx`) that can appear mid-race with a tactical
    suggestion the player can accept (carries out the action directly) or
    ignore. Deliberately does **not** pause playback or gate Play/Step like
    the damage/weather/caution alerts — meant to feel like advice you can
    act on or brush off while still driving, a different interaction
    pattern from every earlier alert.
    - New `sim/strategist.ts`: `checkStrategistSuggestion` looks for one of
      three situations, in priority order: (1) **undercut** — the car ahead
      is close (<3s) and on tires meaningfully older (5+ laps), the same
      heuristic `decideAIAction` already uses on itself, just surfaced
      instead of acted on automatically; (2) **weather** — an independent
      short-range forecast preview (`generateWeatherForecast`, *not* the
      race's own live rolls) shows a mismatch coming within 5 laps while the
      current tire still matches; (3) **fuel** — Light load, not already
      conserving, projected to run dry before the finish at the current
      burn rate. Accepting queues a pit stop or switches driving mode
      per whichever field the suggestion carries (`pitCompound`/
      `drivingMode`).
    - Lives entirely in `useRace.ts`'s React state (a `strategistSuggestion`
      + a `lastStrategistLapRef` 6-lap cooldown so the engineer doesn't
      radio in every lap a condition persists) — **not** part of
      `RaceState`, so no save-schema bump was needed this phase. Detected in
      the same post-lap `useEffect` that already handles the damage/
      weather/caution alerts (reacting to committed state only, for the
      same StrictMode-safety reason documented in phase 15).
    - Verified the three trigger conditions directly against hand-built
      `RaceState` objects in the console (undercut, weather, and fuel cases
      all fired exactly as designed), then live-played several laps with no
      console errors.
24. **Teammate team orders** — a "Team Radio" panel (button in the Strategy
    sidebar next to Revise Plan, gated by `teamOrdersEnabled`) letting the
    player issue a standing order to their AI teammate:
    - **Hold Position**: neither car fights the other for the rest of the
      race — persists until canceled.
    - **Let Me Through**: one-shot — the teammate concedes the position
      outright the next time the player is actually running right behind
      them, then the order clears itself.
    - **Push to Block**: the teammate defends specifically against a chosen
      rival (picked from whoever's currently nearest the teammate on
      track) — the attacker has to win the overtake roll *twice in a row*
      to get past (verified by Monte Carlo: an evenly-matched rival's pass
      rate dropped from ~81% to ~70% under a block order — a real but not
      absolute deterrent, weaker against a much-faster attacker since
      squaring an already-high probability doesn't reduce it as much).
    - All three are special cases inside `raceEngine.ts`'s existing
      per-lap battle-resolution loop (`simulateLap`'s Phase B), keyed off
      which two cars are in a given pairing (player/teammate, or
      teammate/target-rival) — reuses the existing gap/pace battle math
      instead of a separate subsystem. `RaceState` gained a required
      `teamOrder: TeamOrder | null` field; `player`/`teammate` are resolved
      once per lap near `activeCaution` at the top of `simulateLap`.
      Verified in-browser (UI) and via hand-built `RaceState` console tests
      for all three order types, including the Monte Carlo block-rate test.
      Bumped the season-save key to v12.
25. **Driver market** — a Driver Market screen (reachable from the main menu
    at any time, and highlighted on the season-complete banner as the
    natural moment to use it) where the player can swap their AI teammate
    for any other driver on the grid — a straight trade, so the swapped-out
    driver moves to the new driver's old team in return. Candidates show
    their full stat line so it's an informed choice.
    - `sim/roster.ts` gained `swapDriverTeams`/`applyTeamAssignments`/
      `currentTeamAssignments`/`resetDriverMarket` — the swap mutates
      `teamId` on the shared `drivers` array in place (same pattern as
      `updateDriverProfile`), and a `defaultTeamIds` snapshot (taken at
      module load, before any mutation) lets `resetDriverMarket` always
      revert to the true original regardless of how many trades happened
      since.
    - `state/driverMarket.ts`: **always** persists the current swap to its
      own localStorage key (`f1-manager-driver-market-v1`) — a plain page
      reload should never quietly undo a trade, same reasoning as
      `driverProfile.ts`. What the **Driver Market Persists** setting
      actually controls is narrower: whether starting a *new season*
      (Restart or Custom Season, in `App.tsx`'s
      `resetDriverMarketIfNotPersisting`) reverts the swap and clears the
      saved key, or leaves it alone. Off by default.
    - No season-save schema change — lives in roster.ts's global state plus
      its own localStorage key, entirely separate from SeasonState/
      RaceState. Verified in-browser end to end: swapped in a driver,
      confirmed the trade survived a page reload, then started a fresh
      custom season and confirmed it reverted to the default teammate.
26. **Race objectives + multi-season career** — two smaller features that
    both touch `season.ts`'s season-creation/restart code paths, done
    together to avoid editing the same lines twice.
    - New `sim/objectives.ts`: a fresh objective generated every round from
      a pool of six kinds (top-N finish, beat your teammate, no time
      penalties, gain 3+ grid positions, ≤2 pit stops, fastest lap of the
      race), gated by `seasonObjectivesEnabled`. Shown in `RacingPlan` and a
      persistent sidebar section during the race; resolved on Race Results
      with a 120-200 credit development-budget bonus on top of normal prize
      money if achieved (folded into the same `prizeByTeam` map
      `completeRound` already builds, so it flows through the existing
      AI-auto-spend/player-budget pipeline unchanged). A retired player
      fails every objective outright, no partial credit for a DNF.
      `CarState` gained a required `startingPosition` field (grid slot from
      qualifying) so "gain positions" has something to compare the finish
      against. `evaluateObjective` is also called directly from `App.tsx`
      when Race Results first opens (using `season.currentObjective`,
      which hasn't been replaced yet at that point) rather than waiting for
      `completeRound` — that only runs when the player clicks Next Round,
      which would be too late to show the result on the results screen that
      appears immediately when the race finishes.
    - **Multi-Season Career** (its own setting, off by default): when on,
      `restartSeason`/`startCustomSeason` pass the *current*
      `teamDevelopment` into `createSeason`'s new `carryForwardDevelopment`
      option instead of letting it reset to zero.
    - `createSeason`'s growing parameter list (calendar, objectives,
      rival — added next phase, dev carry-forward) was refactored into a
      single options object rather than more positional params. Verified
      the objective-evaluation boundary conditions directly (top-N/
      gain-positions/limited-pit-stops all flip exactly at their target
      value) against a full deterministic 53-lap console race. Bumped the
      season-save key to v13.
27. **Rival tracker** — a season-long rival, gated by `rivalTrackerEnabled`:
    picked once per season (`pickRival` in `season.ts`, weighted toward
    drivers on teams closer in `carPerformance` to the player's own team —
    verified by 2000 simulated season starts showing the teammate and
    similarly-performing teams picked 2-3x more often than the weakest team
    on the grid) and fixed for that whole season — a new one is only picked
    when a new season actually starts, never mid-season. Highlighted with a
    "RIVAL" tag in the Drivers' championship table and shown as a live
    "Gap to Rival" card in the race sidebar (position + time gap, or DNF).
    `SeasonState` gained a required `rivalDriverId: string | null` field.
    Bumped the season-save key to v14.

    After phase 27, every one of the six phase-20 batch features (fuel,
    setup trade-off, race engineer suggestions, team orders, driver market)
    plus the two bonus features requested mid-batch (race objectives, rival
    tracker) and the Settings screen tying them all together are complete
    and pushed.

## A real bug that was found and fixed (worth knowing about)

In `useSeason.ts`, the hook originally recomputed `getTrack(currentRoundTrackId(season)!)`
directly in the hook body on every render to seed `useRace`. That's fine
mid-season, but once the season completes, `currentRoundTrackId` returns
`null`, and the non-null assertion doesn't stop the runtime call — it
crashed the whole app the moment a season actually finished. Fixed by
computing the initial track id **once**, lazily, via `useState(() =>
currentRoundTrackId(season)!)`, since only the first render's value is ever
actually used (React ignores later changes to a `useState` initializer).
Verified by playing two full 4-round (later 12-round) seasons end-to-end
through the exact crash point with zero errors afterward.

## Known limitations / deliberate simplifications

- Track shapes in `trackPaths.ts` are stylized, not GPS-accurate — 4 are
  hand-shaped for recognizable character, the other 8 are procedurally
  generated (varied but not bespoke). More could be hand-authored if wanted.
- No sound/audio.
- Single continuous session only — no multiplayer, no cloud save, just one
  localStorage slot per browser.
- Battle/overtake resolution is a heuristic model, not physics — tuned to
  "feel fair," not validated against real telemetry.
- Team development/budget (phase 18) resets every season by default — but
  phase 26 added a "Multi-Season Career" setting (off by default) that
  carries teamDevelopment forward across a restart/custom-season instead,
  for players who want upgrades to compound over a longer arc.

## Working style notes for whoever picks this up

- The user likes phase-by-phase delivery: propose scope briefly, build it,
  verify it actually works in a browser (not just type-checks), then report
  back before moving on. Commits are one per phase with a descriptive
  message ending in the `Co-Authored-By: Claude Sonnet 5` trailer.
- When testing in the sandboxed Browser pane, a hidden/backgrounded pane can
  throttle `setInterval`-based playback and occasionally drop clicks —
  this showed up during testing as races appearing to "stick" one lap short
  of finishing. It's a testing-harness artifact, not an app bug (confirmed
  by driving the same clicks via `dispatchEvent`/direct JS and by the fact
  manual Step always eventually worked). Don't chase it as a real bug again
  without first checking `tabs_context` for pane visibility.
- The user explicitly wants scope kept tight per phase — features not asked
  for (e.g. a "quick single race" mode after season mode replaced it) were
  intentionally left out rather than added speculatively.
- **Verifying rare/probabilistic mechanics**: playing the game live can't
  reliably exercise a deliberately-rare event (DNF retirements ~3% over a
  race, a full Safety Car needs a retirement *and* a 40% escalation roll on
  top). The established fallback, used in phases 15/17/18: open the running
  dev server in a browser tab and `await import('/src/sim/<module>.ts')`
  directly in the console — plain ES modules via Vite, no build/test step
  needed. From there, either Monte Carlo a roll function thousands of times
  to confirm its probability distribution, or call `setupRace`/`simulateLap`
  directly with a hand-built scenario and a constant/seeded random source to
  deterministically exercise one specific rare branch (e.g. forcing
  `state.caution = {type: "sc", ...}` to test Safety Car bunching without
  waiting for one to occur naturally). Pair this with normal live-play
  verification for the common paths — the console technique is for the
  long tail, not a replacement for actually playing the feature.
- When scoping a substantial new feature (safety car/VSC and team
  development in phases 17-18), the user is happy to answer a batched round
  of `AskUserQuestion`-style multiple-choice questions up front covering the
  real architectural forks (mechanic type, UI pattern, data source, scope
  boundary) rather than being asked one at a time or having decisions made
  silently on their behalf — then wants a build without further check-ins
  until the phase is complete and demonstrably verified.
- **Push to GitHub after every change** (explicit standing instruction,
  2026-09-11): commit and `git push origin master` at the end of each
  feature/change, not just locally commit. No need to ask permission each
  time for this specific repo — the user pre-authorized it in chat. Still
  never force-push or rewrite history without asking.
- **Local dev server / Browser-pane preview environment quirk** (found phase
  20, 2026-09-12): on this machine, Node/npm aren't on PATH for either the
  Bash tool or the Browser pane's `preview_start` — `npx`/`npm` fail with
  "command not found" unless invoked with the full path
  (`/c/Program Files/nodejs/...` in Bash, or via PATH-prefixing:
  `export PATH="/c/Program Files/nodejs:$PATH"`). `preview_start` doesn't
  support an inline PATH override, so `.claude/launch.json`'s
  `runtimeExecutable` points at a small wrapper, `.claude/run-dev.bat`,
  which sets PATH and then runs `npm run dev` — don't revert this to a bare
  `"npm"`/`"npx"` runtimeExecutable, it'll fail the same way again.
- **Console-based verification and shared mutable module state** (phase 25):
  the established `await import('/src/sim/<module>.ts')` console technique
  (see the entry below) works perfectly for testing pure functions with
  freshly-constructed state, but is unreliable for checking *global mutable
  state* the live page's own React app already mutated (e.g. roster.ts's
  `drivers` array after a Driver Market swap) — a raw console `import()`
  can resolve to a different cache-busted module instance than the one the
  running app is actually using, silently reading stale/default values.
  Verify that kind of change by reading it back through the UI (or via a
  fresh full page reload, which re-syncs everyone to the same instance),
  not by importing the module fresh into the console mid-session.
