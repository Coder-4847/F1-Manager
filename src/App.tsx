import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { drivers, getDefaultProfile, getTeam, updateDriverProfile } from "./sim/roster";
import type { DriverProfileEdit } from "./sim/roster";
import { getFinalResults } from "./sim/raceEngine";
import { generateWeatherForecast } from "./sim/weather";
import { useSeason } from "./state/useSeason";
import { applyStoredDriverProfile, saveDriverProfile } from "./state/driverProfile";
import { loadDifficulty, saveDifficulty } from "./state/difficulty";
import type { Difficulty } from "./sim/difficulty";
import { Leaderboard } from "./ui/Leaderboard";
import { EventFeed } from "./ui/EventFeed";
import { PlayerControls } from "./ui/PlayerControls";
import { PlaybackControls } from "./ui/PlaybackControls";
import { LiveTrackView } from "./ui/LiveTrackView";
import { SeasonStandings } from "./ui/SeasonStandings";
import { DriverProfile } from "./ui/DriverProfile";
import { SeasonSetup } from "./ui/SeasonSetup";
import { DamageAlert } from "./ui/DamageAlert";
import { WeatherAlert } from "./ui/WeatherAlert";
import { CautionAlert } from "./ui/CautionAlert";
import { RacingPlan } from "./ui/RacingPlan";
import { RevisePlan } from "./ui/RevisePlan";
import { RaceResults } from "./ui/RaceResults";
import { MainMenu } from "./ui/MainMenu";
import { TeamDevelopment } from "./ui/TeamDevelopment";
import { WeatherForecast } from "./ui/WeatherForecast";
import type { InitialStrategy } from "./sim/strategy";
import type { SeasonRound } from "./sim/season";
import type { WeatherCondition } from "./sim/types";

const FORECAST_LOOKAHEAD_LAPS = 15;

const WEATHER_ICON: Record<WeatherCondition, string> = { dry: "☀", damp: "🌥", wet: "🌧" };
const WEATHER_LABEL: Record<WeatherCondition, string> = { dry: "Dry", damp: "Damp", wet: "Wet" };

const PLAYER_DRIVER_ID = "k-1"; // Ravi Chandran, Kestrel GP — solid midfield car/driver
const PLAYER_STRATEGY: InitialStrategy = {
  startingCompound: "medium",
  drivingMode: "balanced",
  pitPlan: [{ lap: 27, compound: "hard" }],
};

// Runs once at module load, before useSeason's lazy initializer builds the first
// race — applies any profile edit saved in a previous session to the roster.
applyStoredDriverProfile(PLAYER_DRIVER_ID);

function App() {
  const [difficulty, setDifficultyState] = useState<Difficulty>(() => loadDifficulty());

  const {
    season,
    race,
    seasonComplete,
    playerTeamId,
    driverStandings,
    constructorStandings,
    advanceToNextRound,
    restartSeason,
    startCustomSeason,
    purchaseUpgrade,
    hasSave,
    saveProgress,
    loadProgress,
  } = useSeason({ playerDriverId: PLAYER_DRIVER_ID, playerStrategy: PLAYER_STRATEGY, difficulty });

  const {
    raceState,
    standings,
    playerCar,
    playing,
    speed,
    tickDurationMs,
    damageAlert,
    weatherAlert,
    cautionAlert,
    planPending,
    setSpeed,
    play,
    pause,
    step,
    reset,
    setDrivingMode,
    queuePitStop,
    cancelPitStop,
    updatePitPlan,
    resolveDamage,
    resolveWeather,
    resolveCaution,
    confirmPlan,
  } = race;

  const blocked = damageAlert || weatherAlert || cautionAlert || planPending;

  const [showMenu, setShowMenu] = useState(true);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showSeasonSetup, setShowSeasonSetup] = useState(false);
  const [showRevisePlan, setShowRevisePlan] = useState(false);
  const [showRaceResults, setShowRaceResults] = useState(false);
  const [showTeamDevelopment, setShowTeamDevelopment] = useState(false);

  // Regenerated once per lap (not every render) — a preview, not a guarantee, same as
  // the one shown pre-race and in the weather alert; see generateWeatherForecast.
  const liveForecast = useMemo(
    () =>
      generateWeatherForecast(
        raceState.weather,
        Math.min(FORECAST_LOOKAHEAD_LAPS, Math.max(0, raceState.track.totalLaps - raceState.currentLap))
      ),
    [raceState.currentLap, raceState.weather, raceState.track.totalLaps]
  );

  // Surfaces the final classification automatically the moment a race finishes.
  useEffect(() => {
    if (raceState.finished) setShowRaceResults(true);
  }, [raceState.finished]);

  const playerDriver = drivers.find((d) => d.id === PLAYER_DRIVER_ID)!;
  const playerTeam = getTeam(playerDriver.teamId);
  const playerStanding = standings.find((row) => row.car.isPlayer);
  const track = raceState.track;
  const roundNumber = Math.min(season.roundIndex + 1, season.calendar.length);

  const handleSaveProfile = (edit: DriverProfileEdit) => {
    updateDriverProfile(PLAYER_DRIVER_ID, edit);
    saveDriverProfile(edit);
    setShowProfileEditor(false);
  };

  const handleStartCustomSeason = (calendar: SeasonRound[]) => {
    startCustomSeason(calendar);
    setShowSeasonSetup(false);
    setShowMenu(false);
  };

  const handleOpenRevisePlan = () => {
    pause();
    setShowRevisePlan(true);
  };

  const handleOpenMenu = () => {
    pause();
    setShowMenu(true);
  };

  const handleLoadFromMenu = () => {
    loadProgress();
    setShowMenu(false);
  };

  const handleSetDifficulty = (next: Difficulty) => {
    setDifficultyState(next);
    saveDifficulty(next);
  };

  if (showMenu) {
    return (
      <>
        <MainMenu
          hasStartedRace={!planPending}
          roundNumber={roundNumber}
          totalRounds={season.calendar.length}
          seasonComplete={seasonComplete}
          hasSave={hasSave}
          difficulty={difficulty}
          onPlay={() => setShowMenu(false)}
          onCustomSeason={() => setShowSeasonSetup(true)}
          onEditDriver={() => setShowProfileEditor(true)}
          onTeamDevelopment={() => setShowTeamDevelopment(true)}
          onLoad={handleLoadFromMenu}
          onSetDifficulty={handleSetDifficulty}
        />

        {showProfileEditor && (
          <DriverProfile
            teamName={playerTeam.name}
            profile={{
              name: playerDriver.name,
              age: playerDriver.age!,
              nationality: playerDriver.nationality!,
              number: playerDriver.number!,
            }}
            onSave={handleSaveProfile}
            onResetToDefault={() => getDefaultProfile(PLAYER_DRIVER_ID)}
            onClose={() => setShowProfileEditor(false)}
          />
        )}

        {showSeasonSetup && (
          <SeasonSetup
            initialCalendar={season.calendar}
            onStart={handleStartCustomSeason}
            onClose={() => setShowSeasonSetup(false)}
          />
        )}

        {showTeamDevelopment && (
          <TeamDevelopment
            teamName={playerTeam.name}
            development={season.teamDevelopment[playerTeamId]}
            onBuy={purchaseUpgrade}
            onClose={() => setShowTeamDevelopment(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="app">
      <div className="app__flag-strip" />
      <header className="app__header">
        <div className="app__title-row">
          <h1>F1 Manager</h1>
          <span className="round-badge">
            Round {roundNumber}/{season.calendar.length}
          </span>
          <div className="app__header-actions">
            <button onClick={handleOpenMenu}>Menu</button>
          </div>
        </div>
        <p className="subtitle">
          {track.name} &middot; {track.totalLaps} laps &middot;{" "}
          <span className={`weather-tag weather-tag--${raceState.weather}`}>
            {WEATHER_ICON[raceState.weather]} {WEATHER_LABEL[raceState.weather]}
          </span>{" "}
          &middot; managing <strong>#{playerDriver.number} {playerDriver.name}</strong> ({playerTeam.name}
          {playerDriver.nationality ? ` · ${playerDriver.nationality}` : ""})
        </p>
      </header>

      {raceState.caution && (
        <div className={`caution-banner caution-banner--${raceState.caution.type}`}>
          🚧 {raceState.caution.type === "sc" ? "SAFETY CAR" : "VIRTUAL SAFETY CAR"} &middot;{" "}
          {raceState.caution.lapsRemaining} lap{raceState.caution.lapsRemaining === 1 ? "" : "s"} remaining
        </div>
      )}

      {planPending && playerCar && (
        <RacingPlan
          trackName={track.name}
          totalLaps={track.totalLaps}
          startWeather={raceState.weather}
          startingGridPosition={playerStanding?.position}
          initialPlan={{
            startingCompound: playerCar.currentCompound,
            drivingMode: playerCar.drivingMode,
            pitPlan: playerCar.pitPlan,
          }}
          onStart={confirmPlan}
          hasSave={hasSave}
          onLoad={loadProgress}
        />
      )}

      {!planPending && weatherAlert && playerCar && (
        <WeatherAlert
          weather={raceState.weather}
          car={playerCar}
          currentLap={raceState.currentLap}
          totalLaps={track.totalLaps}
          onPit={(compound) => resolveWeather("pit", compound)}
          onPush={() => resolveWeather("push")}
        />
      )}

      {!planPending && !weatherAlert && damageAlert && playerCar && (
        <DamageAlert
          car={playerCar}
          onPit={() => resolveDamage("pit")}
          onPush={() => resolveDamage("push")}
        />
      )}

      {!planPending && !weatherAlert && !damageAlert && cautionAlert && raceState.caution && (
        <CautionAlert
          caution={raceState.caution}
          track={track}
          onPit={() => resolveCaution("pit")}
          onPush={() => resolveCaution("push")}
        />
      )}

      {showRevisePlan && playerCar && (
        <RevisePlan
          trackName={track.name}
          currentLap={raceState.currentLap}
          totalLaps={track.totalLaps}
          weather={raceState.weather}
          currentPitPlan={playerCar.pitPlan}
          onSave={(stops) => {
            updatePitPlan(stops);
            setShowRevisePlan(false);
          }}
          onClose={() => setShowRevisePlan(false)}
        />
      )}

      {showRaceResults && raceState.finished && (
        <RaceResults
          trackName={track.name}
          results={getFinalResults(raceState)}
          onClose={() => setShowRaceResults(false)}
          onManageDevelopment={() => setShowTeamDevelopment(true)}
        />
      )}

      {showTeamDevelopment && (
        <TeamDevelopment
          teamName={playerTeam.name}
          development={season.teamDevelopment[playerTeamId]}
          onBuy={purchaseUpgrade}
          onClose={() => setShowTeamDevelopment(false)}
        />
      )}

      <PlaybackControls
        currentLap={raceState.currentLap}
        totalLaps={track.totalLaps}
        playing={playing}
        finished={raceState.finished}
        seasonComplete={seasonComplete}
        speed={speed}
        hasSave={hasSave}
        blocked={blocked}
        onPlay={play}
        onPause={pause}
        onStep={step}
        onReset={() => reset(season.teamDevelopment, difficulty)}
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
          {playerStanding.car.retired ? (
            "DNF"
          ) : (
            <>
              P{playerStanding.position} &middot;{" "}
              {playerStanding.position === 1 ? "Leader" : `+${playerStanding.gapToLeaderSeconds.toFixed(1)}s`}
            </>
          )}
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
          <section>
            <h2>Weather Forecast</h2>
            {liveForecast.length > 0 ? (
              <WeatherForecast forecast={liveForecast} startLap={raceState.currentLap + 1} />
            ) : (
              <p className="season-setup__empty">No further laps to forecast.</p>
            )}
          </section>

          {playerCar && (
            <section>
              <h2>Strategy</h2>
              <PlayerControls
                car={playerCar}
                currentLap={raceState.currentLap}
                onSetDrivingMode={setDrivingMode}
                onQueuePitStop={queuePitStop}
                onCancelPitStop={cancelPitStop}
                onOpenRevisePlan={handleOpenRevisePlan}
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
