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
- **One-time manual step that may still be needed**: in the repo's Settings →
  Pages, the deployment source must be "GitHub Actions". I could not verify
  or set this myself (no `gh` CLI / API token available in that session) —
  check the Actions tab if the site isn't live after a push.

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
