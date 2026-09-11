import { useState } from "react";
import "./App.css";
import { monza } from "./sim/tracks";
import { drivers, getTeam } from "./sim/roster";
import { setupRace, simulateLap, getStandings } from "./sim/raceEngine";
import type { RaceState } from "./sim/types";
import type { InitialStrategy } from "./sim/strategy";

// Phase 1: no interactive in-race controls yet — the player's plan is fixed
// up front, same shape as the AI's, just to prove the simulation math works.
const PLAYER_DRIVER_ID = "k-1"; // Ravi Chandran, Kestrel GP — solid midfield car/driver
const PLAYER_STRATEGY: InitialStrategy = {
  startingCompound: "medium",
  drivingMode: "balanced",
  pitPlan: [{ lap: 27, compound: "hard" }],
};

function formatGap(seconds: number): string {
  if (seconds === 0) return "Leader";
  return `+${seconds.toFixed(1)}s`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3);
  return `${m}:${s.padStart(6, "0")}`;
}

function App() {
  const [raceState, setRaceState] = useState<RaceState | null>(null);
  const [running, setRunning] = useState(false);

  function runRace() {
    setRunning(true);
    const state = setupRace({
      track: monza,
      playerDriverId: PLAYER_DRIVER_ID,
      playerStrategy: PLAYER_STRATEGY,
    });

    console.log(`--- Race start: ${monza.name}, ${monza.totalLaps} laps ---`);
    while (!state.finished) {
      simulateLap(state);
      const lapEvents = state.events.filter((e) => e.lap === state.currentLap);
      for (const event of lapEvents) {
        console.log(`Lap ${event.lap}: ${event.message}`);
      }
    }
    console.log("--- Race finished ---");
    console.log(
      getStandings(state)
        .map((row) => `${row.position}. ${row.car.driver.name} (${row.car.team.name}) ${formatGap(row.gapToLeaderSeconds)}`)
        .join("\n")
    );

    setRaceState(state);
    setRunning(false);
  }

  const standings = raceState ? getStandings(raceState) : [];
  const pitEvents = raceState ? raceState.events.filter((e) => e.type === "pit-stop") : [];

  return (
    <div className="app">
      <h1>F1 Manager — Phase 1</h1>
      <p className="subtitle">
        {monza.name} &middot; {monza.totalLaps} laps &middot; you are managing{" "}
        <strong>{drivers.find((d) => d.id === PLAYER_DRIVER_ID)?.name}</strong> (
        {getTeam(drivers.find((d) => d.id === PLAYER_DRIVER_ID)!.teamId).name})
      </p>

      <button onClick={runRace} disabled={running}>
        {running ? "Simulating..." : raceState ? "Run Again" : "Run Race"}
      </button>

      {raceState && (
        <div className="results">
          <section>
            <h2>Final Classification</h2>
            <table>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Driver</th>
                  <th>Team</th>
                  <th>Gap</th>
                  <th>Total Time</th>
                  <th>Stops</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.car.driver.id} className={row.car.isPlayer ? "player-row" : ""}>
                    <td>{row.position}</td>
                    <td>{row.car.driver.name}</td>
                    <td>{row.car.team.name}</td>
                    <td>{formatGap(row.gapToLeaderSeconds)}</td>
                    <td>{formatTime(row.car.totalTimeSeconds)}</td>
                    <td>{row.car.pitStopsMade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Pit Stop Log</h2>
            <ul className="event-log">
              {pitEvents.map((event, i) => (
                <li key={i}>
                  Lap {event.lap}: {event.message}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
