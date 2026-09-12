import type { DrivingMode, RaceState, TireCompound, WeatherCondition } from "./types";
import { getStandings } from "./raceEngine";
import { generateWeatherForecast, weatherMismatch } from "./weather";
import { fuelBurnForLap } from "./fuel";

// A lightweight advisory layer, deliberately separate from the blocking damage/weather/
// caution alerts: it surfaces a tactical opportunity the player might miss, but never pauses
// the race or forces a decision — "tactical, not hardcore sim" means the player can just
// ignore the radio call and keep driving.

export type StrategistSuggestionKind = "undercut" | "weather" | "fuel";

export interface StrategistSuggestion {
  kind: StrategistSuggestionKind;
  message: string;
  actionLabel: string;
  /** Present when accepting should queue a pit stop next lap on this compound. */
  pitCompound?: TireCompound;
  /** Present when accepting should switch driving mode. */
  drivingMode?: DrivingMode;
}

const UNDERCUT_GAP_SECONDS = 3;
const UNDERCUT_TIRE_AGE_ADVANTAGE = 3;
const MIN_TIRE_AGE_FOR_UNDERCUT = 5;
const WEATHER_LOOKAHEAD_LAPS = 5;

function compoundForWeather(weather: WeatherCondition): TireCompound {
  if (weather === "wet") return "wet";
  if (weather === "damp") return "intermediate";
  return "medium";
}

/**
 * Looks for one tactical situation worth radioing the player about this lap. Returns at
 * most one suggestion, in priority order (undercut, then weather, then fuel) — the caller
 * (useRace) layers a cooldown on top so the same kind doesn't repeat every lap the
 * underlying condition stays true.
 */
export function checkStrategistSuggestion(state: RaceState, playerDriverId: string): StrategistSuggestion | null {
  const player = state.cars.find((c) => c.driver.id === playerDriverId);
  if (!player || player.finished || player.pitPlan.length > 0 || state.caution) return null;

  // Undercut: the car directly ahead is close and on tires meaningfully older than ours —
  // the same heuristic decideAIAction uses for itself, just surfaced to the player instead
  // of acted on automatically.
  const standings = getStandings(state);
  const idx = standings.findIndex((row) => row.car.driver.id === playerDriverId);
  const ahead = idx > 0 ? standings[idx - 1] : null;
  if (ahead && !ahead.car.retired) {
    const gap = player.totalTimeSeconds - ahead.car.totalTimeSeconds;
    if (
      gap > 0 &&
      gap < UNDERCUT_GAP_SECONDS &&
      ahead.car.tireAge > player.tireAge + UNDERCUT_TIRE_AGE_ADVANTAGE &&
      player.tireAge >= MIN_TIRE_AGE_FOR_UNDERCUT
    ) {
      const pitCompound = compoundForWeather(state.weather);
      return {
        kind: "undercut",
        message: `${ahead.car.driver.name} is only ${gap.toFixed(1)}s ahead on older tires — box now for the undercut?`,
        actionLabel: `Box for ${pitCompound}`,
        pitCompound,
      };
    }
  }

  // Weather: an independent short-range forecast preview (not the race's own live rolls —
  // see generateWeatherForecast) shows a mismatch coming within a few laps. Boxing
  // proactively beats reacting after the WeatherAlert fires once conditions actually change.
  const lapsRemaining = state.track.totalLaps - player.lapsCompleted;
  if (lapsRemaining > WEATHER_LOOKAHEAD_LAPS && weatherMismatch(player.currentCompound, state.weather) === 0) {
    const forecast = generateWeatherForecast(state.weather, WEATHER_LOOKAHEAD_LAPS);
    const upcoming = forecast.find((w) => weatherMismatch(player.currentCompound, w) >= 1);
    if (upcoming) {
      const pitCompound = compoundForWeather(upcoming);
      return {
        kind: "weather",
        message: `Forecast shows conditions turning within ${WEATHER_LOOKAHEAD_LAPS} laps — box now for ${pitCompound}s?`,
        actionLabel: `Box for ${pitCompound}`,
        pitCompound,
      };
    }
  }

  // Fuel: on a Light load, still pushing or balanced, and the margin won't last the rest of
  // the race at the current burn rate — a nudge before being forced into a worse fuel-saving
  // penalty later, rather than the player only finding out once it's already too late.
  if (player.fuelLoad === "light" && !player.fuelSaving && player.drivingMode !== "conserve") {
    const projectedRemaining = player.fuelRemaining - fuelBurnForLap(player.drivingMode) * lapsRemaining;
    if (projectedRemaining < 0) {
      return {
        kind: "fuel",
        message: "Fuel margin is tight at this pace — ease off to Conserve to make it to the flag?",
        actionLabel: "Switch to Conserve",
        drivingMode: "conserve",
      };
    }
  }

  return null;
}
