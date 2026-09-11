import type { TireCompound, WeatherCondition } from "./types";

/** Where each compound sits on the dry(0) <-> wet(2) spectrum. */
const COMPOUND_LEVEL: Record<TireCompound, number> = {
  soft: 0,
  medium: 0,
  hard: 0,
  intermediate: 1,
  wet: 2,
};

const WEATHER_LEVEL: Record<WeatherCondition, number> = { dry: 0, damp: 1, wet: 2 };

export function weatherLevel(weather: WeatherCondition): number {
  return WEATHER_LEVEL[weather];
}

/** 0 = perfect tire for these conditions, 1 = one step off, 2 = completely wrong tire. */
export function weatherMismatch(compound: TireCompound, weather: WeatherCondition): number {
  return Math.abs(COMPOUND_LEVEL[compound] - WEATHER_LEVEL[weather]);
}

const MISMATCH_PACE_PENALTY_PER_LEVEL = 2.2;

/** Extra lap time (seconds) from running the wrong tire for current conditions. */
export function tireWeatherPenaltySeconds(compound: TireCompound, weather: WeatherCondition): number {
  return weatherMismatch(compound, weather) * MISMATCH_PACE_PENALTY_PER_LEVEL;
}

const WEATHER_BASE_LAP_PENALTY: Record<WeatherCondition, number> = { dry: 0, damp: 1.0, wet: 2.5 };

/** Extra lap time (seconds) every car pays in these conditions, regardless of tire choice — reduced grip/visibility for the whole field. */
export function weatherBaseLapPenaltySeconds(weather: WeatherCondition): number {
  return WEATHER_BASE_LAP_PENALTY[weather];
}

/** How much a car's damage risk is scaled by current conditions and tire choice — running the wrong tire in the rain is genuinely dangerous. */
export function weatherRiskMultiplier(compound: TireCompound, weather: WeatherCondition): number {
  const wetnessFactor = weather === "dry" ? 1 : 1.3;
  return wetnessFactor * (1 + weatherMismatch(compound, weather) * 0.8);
}

export function weatherLabel(weather: WeatherCondition): string {
  if (weather === "dry") return "Dry";
  if (weather === "damp") return "Damp";
  return "Wet";
}

// Tuned alongside DAMAGE_CHANCE_PER_LAP for roughly 2-3 total alert popups over a full
// ~55-lap race — up from an earlier, noticeably-too-quiet tuning.
const WEATHER_CHANGE_CHANCE_PER_LAP = 0.022;

/** Possible next states from each condition, weighted — a step to the adjacent state is
 *  far more likely than a "drastic" jump straight from dry to wet or back. */
const TRANSITIONS: Record<WeatherCondition, { to: WeatherCondition; weight: number }[]> = {
  dry: [
    { to: "damp", weight: 0.85 },
    { to: "wet", weight: 0.15 },
  ],
  damp: [
    { to: "dry", weight: 0.5 },
    { to: "wet", weight: 0.5 },
  ],
  wet: [
    { to: "damp", weight: 0.85 },
    { to: "dry", weight: 0.15 },
  ],
};

/** Rolls whether the weather changes this lap. Independent of any car — one roll per lap for the whole race. */
export function rollForWeatherChange(
  current: WeatherCondition,
  random: () => number = Math.random
): WeatherCondition | null {
  if (random() >= WEATHER_CHANGE_CHANCE_PER_LAP) return null;

  const options = TRANSITIONS[current];
  const roll = random();
  let cumulative = 0;
  for (const option of options) {
    cumulative += option.weight;
    if (roll < cumulative) return option.to;
  }
  return options[options.length - 1].to;
}

/**
 * Generates a plausible weather forecast for a stretch of upcoming laps, starting from
 * `fromWeather` — a preview using the exact same transition model the live race uses, so
 * it's a genuinely informative planning aid. It is **not** a guarantee: the actual race
 * weather is rolled independently lap by lap with its own random source, so live
 * conditions can turn out differently than forecast (as with real weather). Call this
 * fresh — with a fresh random source, never the race's own — any time an up-to-date
 * forecast is wanted, including mid-race.
 */
export function generateWeatherForecast(
  fromWeather: WeatherCondition,
  lapCount: number,
  random: () => number = Math.random
): WeatherCondition[] {
  const forecast: WeatherCondition[] = [];
  let current = fromWeather;
  for (let i = 0; i < lapCount; i++) {
    const changed = rollForWeatherChange(current, random);
    if (changed) current = changed;
    forecast.push(current);
  }
  return forecast;
}
