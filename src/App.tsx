import "./App.css";
import { monza } from "./sim/tracks";
import { drivers, getTeam } from "./sim/roster";
import { useRace } from "./state/useRace";
import { Leaderboard } from "./ui/Leaderboard";
import { EventFeed } from "./ui/EventFeed";
import { PlayerControls } from "./ui/PlayerControls";
import { PlaybackControls } from "./ui/PlaybackControls";
import { TrackPositionStrip } from "./ui/TrackPositionStrip";
import { TrackSelector } from "./ui/TrackSelector";
import type { InitialStrategy } from "./sim/strategy";

const PLAYER_DRIVER_ID = "k-1"; // Ravi Chandran, Kestrel GP — solid midfield car/driver
const PLAYER_STRATEGY: InitialStrategy = {
  startingCompound: "medium",
  drivingMode: "balanced",
  pitPlan: [{ lap: 27, compound: "hard" }],
};

function App() {
  const {
    raceState,
    standings,
    playerCar,
    playing,
    speed,
    setSpeed,
    play,
    pause,
    step,
    reset,
    switchTrack,
    hasSave,
    save,
    load,
    setDrivingMode,
    queuePitStop,
    cancelPitStop,
  } = useRace({ initialTrack: monza, playerDriverId: PLAYER_DRIVER_ID, playerStrategy: PLAYER_STRATEGY });

  const playerDriver = drivers.find((d) => d.id === PLAYER_DRIVER_ID)!;
  const playerStanding = standings.find((row) => row.car.isPlayer);
  const track = raceState.track;

  return (
    <div className="app">
      <header className="app__header">
        <h1>F1 Manager</h1>
        <p className="subtitle">
          {track.name} &middot; {track.totalLaps} laps &middot; managing{" "}
          <strong>{playerDriver.name}</strong> ({getTeam(playerDriver.teamId).name})
        </p>
        <TrackSelector selectedTrackId={track.id} onSelect={switchTrack} disabled={playing} />
      </header>

      <PlaybackControls
        currentLap={raceState.currentLap}
        totalLaps={track.totalLaps}
        playing={playing}
        finished={raceState.finished}
        speed={speed}
        hasSave={hasSave}
        onPlay={play}
        onPause={pause}
        onStep={step}
        onReset={reset}
        onSetSpeed={setSpeed}
        onSave={save}
        onLoad={load}
      />

      {playerStanding && (
        <div className="player-summary">
          P{playerStanding.position} &middot;{" "}
          {playerStanding.position === 1 ? "Leader" : `+${playerStanding.gapToLeaderSeconds.toFixed(1)}s`}
        </div>
      )}

      <TrackPositionStrip standings={standings} />

      <div className="layout">
        <section className="layout__main">
          <h2>Leaderboard</h2>
          <Leaderboard standings={standings} currentLap={raceState.currentLap} events={raceState.events} />
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
