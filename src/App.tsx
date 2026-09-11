import "./App.css";
import { drivers, getTeam } from "./sim/roster";
import { useSeason } from "./state/useSeason";
import { Leaderboard } from "./ui/Leaderboard";
import { EventFeed } from "./ui/EventFeed";
import { PlayerControls } from "./ui/PlayerControls";
import { PlaybackControls } from "./ui/PlaybackControls";
import { LiveTrackView } from "./ui/LiveTrackView";
import { SeasonStandings } from "./ui/SeasonStandings";
import type { InitialStrategy } from "./sim/strategy";

const PLAYER_DRIVER_ID = "k-1"; // Ravi Chandran, Kestrel GP — solid midfield car/driver
const PLAYER_STRATEGY: InitialStrategy = {
  startingCompound: "medium",
  drivingMode: "balanced",
  pitPlan: [{ lap: 27, compound: "hard" }],
};

function App() {
  const {
    season,
    race,
    seasonComplete,
    driverStandings,
    constructorStandings,
    advanceToNextRound,
    restartSeason,
    hasSave,
    saveProgress,
    loadProgress,
  } = useSeason({ playerDriverId: PLAYER_DRIVER_ID, playerStrategy: PLAYER_STRATEGY });

  const {
    raceState,
    standings,
    playerCar,
    playing,
    speed,
    tickDurationMs,
    setSpeed,
    play,
    pause,
    step,
    reset,
    setDrivingMode,
    queuePitStop,
    cancelPitStop,
  } = race;

  const playerDriver = drivers.find((d) => d.id === PLAYER_DRIVER_ID)!;
  const playerStanding = standings.find((row) => row.car.isPlayer);
  const track = raceState.track;
  const roundNumber = Math.min(season.roundIndex + 1, season.calendar.length);

  return (
    <div className="app">
      <header className="app__header">
        <h1>F1 Manager</h1>
        <p className="subtitle">
          Round {roundNumber} of {season.calendar.length} &middot; {track.name} &middot; {track.totalLaps} laps
          &middot; managing <strong>{playerDriver.name}</strong> ({getTeam(playerDriver.teamId).name})
        </p>
      </header>

      <PlaybackControls
        currentLap={raceState.currentLap}
        totalLaps={track.totalLaps}
        playing={playing}
        finished={raceState.finished}
        seasonComplete={seasonComplete}
        speed={speed}
        hasSave={hasSave}
        onPlay={play}
        onPause={pause}
        onStep={step}
        onReset={reset}
        onSetSpeed={setSpeed}
        onSave={saveProgress}
        onLoad={loadProgress}
        onNextRound={advanceToNextRound}
      />

      {seasonComplete && (
        <div className="season-complete-banner">
          Season complete! <button onClick={restartSeason}>Start New Season</button>
        </div>
      )}

      {playerStanding && (
        <div className="player-summary">
          P{playerStanding.position} &middot;{" "}
          {playerStanding.position === 1 ? "Leader" : `+${playerStanding.gapToLeaderSeconds.toFixed(1)}s`}
        </div>
      )}

      <LiveTrackView
        track={track}
        standings={standings}
        currentLap={raceState.currentLap}
        playing={playing}
        tickDurationMs={tickDurationMs}
        events={raceState.events}
      />

      <div className="layout">
        <section className="layout__main">
          <h2>Leaderboard</h2>
          <Leaderboard standings={standings} currentLap={raceState.currentLap} events={raceState.events} />

          <h2 className="section-spacer">Championship</h2>
          <SeasonStandings
            driverStandings={driverStandings}
            constructorStandings={constructorStandings}
            playerDriverId={PLAYER_DRIVER_ID}
          />
        </section>

        <aside className="layout__side">
          {playerCar && (
            <section>
              <h2>Strategy</h2>
              <PlayerControls
                car={playerCar}
                currentLap={raceState.currentLap}
                onSetDrivingMode={setDrivingMode}
                onQueuePitStop={queuePitStop}
                onCancelPitStop={cancelPitStop}
              />
            </section>
          )}

          <section>
            <h2>Event Feed</h2>
            <EventFeed events={raceState.events} />
          </section>
        </aside>
      </div>
    </div>
  );
}

export default App;
