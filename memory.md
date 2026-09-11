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

```
src/
  sim/            Pure TS, zero React deps — the simulation engine.
    types.ts        Core domain types: TireCompound, DrivingMode, Driver,
                     Team, Track, CarState, RaceState, LapEvent, etc.
    roster.ts        8 fictional teams x 2 drivers (16 total), each with
                      pace/tireManagement/consistency/aggression stats.
    tracks.ts         12 real-world circuits with per-track lap length, lap
                      count, pit loss, tire wear factor, overtaking difficulty.
    trackPaths.ts     Stylized closed-loop SVG path per track for the live
                      view (Monza/Monaco/Spa/Suzuka hand-shaped for
                      recognizable character; the rest procedurally
                      generated via a seeded PRNG + Catmull-Rom spline).
                      NOT GPS-accurate — deliberately stylized.
    tires.ts          Compound pace/degradation curves + a UI-only wear%
                      helper (doesn't affect lap-time math).
    lapTime.ts        Per-lap time = base pace + tire wear + fuel burn-off +
                      driving-mode delta + randomness (scaled by consistency).
    pitStop.ts        Pit stop time-loss model.
    strategy.ts       AI: generateAIStrategy (starting compound/mode only,
                      decided pre-race) + decideAIAction (reactive per-lap
                      pit/mode decisions based on tire wear, gaps to cars
                      ahead/behind, and driver personality stats).
    overtaking.ts     resolveOvertakeAttempt — probabilistic pass resolution
                      weighing pace delta, tire wear difference, aggression
                      vs. consistency, and track overtaking difficulty.
    raceEngine.ts     Orchestrates one lap (simulateLap): reactive AI calls,
                      lap time, pit stops, battle resolution (cars within
                      0.8s of the car ahead fight for the position instead of
                      passing for free), standings. setupRace/getStandings
                      live here too.
    season.ts         Season calendar, per-round results, cumulative
                      driver/constructor points (classic 25-18-15-...-1).

  state/          React-facing hooks wrapping the sim.
    useRace.ts        Owns one race's live state: play/pause/step/speed,
                      player driving-mode/pit-stop controls, track
                      switching. Playback speed is real seconds-per-lap
                      (1x ≈ 5s/lap; 0.5x/2x/4x scale from that).
    useSeason.ts      Wraps useRace: advances to the next round's track when
                      a race finishes, tracks season points, restart/season-
                      complete, save/load. NOTE: computes the *initial*
                      track id via a lazy useState — see "bug found" below.
    persistence.ts    localStorage save/load of the whole season
                      ({season, raceState} as one JSON blob, key
                      "f1-manager-save-v2").

  ui/             Presentational components, one concern each.
    Leaderboard.tsx     Framer Motion `layout`-animated rows; pit-stop flash.
    LiveTrackView.tsx   SVG track outline + car dots positioned continuously
                      via getPointAtLength, driven by a requestAnimationFrame
                      loop. Each car's on-track fraction = an animation
                      clock (0→1 over one lap's duration) offset by its real
                      time-gap-to-leader (converted through the track's
                      average lap time) — so the pack visually bunches/
                      spreads exactly like the real gaps, not just at lap
                      boundaries.
    PlaybackControls.tsx  Play/Pause/Step/Reset/Speed/Save/Load/Next-Round.
    PlayerControls.tsx    Driving-mode + pit-stop queue for the player's car.
    EventFeed.tsx          Pit-stop and overtake event log.
    SeasonStandings.tsx    Drivers' + Constructors' championship tables,
                      podium-tinted top 3.
    TireBadge.tsx          Compound chip + wear bar (red/yellow/white,
                      matching the F1 palette by coincidence-turned-design).

  App.tsx         Composes useSeason + all UI. PLAYER_DRIVER_ID = "k-1"
                  (Ravi Chandran, Kestrel GP) and PLAYER_STRATEGY are
                  hardcoded constants near the top — change here to play as
                  a different driver.
```

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
- No qualifying/grid order — lap 1 order is arbitrary (roster order), not
  based on any pace ranking.
- Single continuous session only — no multiplayer, no cloud save, just one
  localStorage slot per browser.
- Battle/overtake resolution is a heuristic model, not physics — tuned to
  "feel fair," not validated against real telemetry.

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
- **Push to GitHub after every change** (explicit standing instruction,
  2026-09-11): commit and `git push origin master` at the end of each
  feature/change, not just locally commit. No need to ask permission each
  time for this specific repo — the user pre-authorized it in chat. Still
  never force-push or rewrite history without asking.
