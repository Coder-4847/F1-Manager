import type { Track } from "./types";

// Real track layouts/names/lengths — fine to use, only teams/drivers are fictional.
// Stats are tuned for "feels right" pacing/variety, not real telemetry.

export const monza: Track = {
  id: "monza",
  name: "Autodromo Nazionale Monza",
  lapLengthKm: 5.793,
  totalLaps: 53,
  pitLaneLossSeconds: 22,
  baseLapTimeSeconds: 80,
  tireWearFactor: 0.7,
  overtakingDifficulty: 0.3,
};

export const silverstone: Track = {
  id: "silverstone",
  name: "Silverstone Circuit",
  lapLengthKm: 5.891,
  totalLaps: 52,
  pitLaneLossSeconds: 21,
  baseLapTimeSeconds: 88,
  tireWearFactor: 0.85,
  overtakingDifficulty: 0.4,
};

export const spa: Track = {
  id: "spa",
  name: "Circuit de Spa-Francorchamps",
  lapLengthKm: 7.004,
  totalLaps: 44,
  pitLaneLossSeconds: 20,
  baseLapTimeSeconds: 106,
  tireWearFactor: 0.6,
  overtakingDifficulty: 0.25,
};

export const suzuka: Track = {
  id: "suzuka",
  name: "Suzuka International Racing Course",
  lapLengthKm: 5.807,
  totalLaps: 53,
  pitLaneLossSeconds: 23,
  baseLapTimeSeconds: 92,
  tireWearFactor: 0.8,
  overtakingDifficulty: 0.55,
};

export const monaco: Track = {
  id: "monaco",
  name: "Circuit de Monaco",
  lapLengthKm: 3.337,
  totalLaps: 78,
  pitLaneLossSeconds: 19,
  baseLapTimeSeconds: 74,
  tireWearFactor: 0.55,
  overtakingDifficulty: 0.85,
};

export const barcelona: Track = {
  id: "barcelona",
  name: "Circuit de Barcelona-Catalunya",
  lapLengthKm: 4.657,
  totalLaps: 66,
  pitLaneLossSeconds: 21,
  baseLapTimeSeconds: 78,
  tireWearFactor: 0.9,
  overtakingDifficulty: 0.55,
};

export const redBullRing: Track = {
  id: "redbullring",
  name: "Red Bull Ring",
  lapLengthKm: 4.318,
  totalLaps: 71,
  pitLaneLossSeconds: 18,
  baseLapTimeSeconds: 66,
  tireWearFactor: 0.65,
  overtakingDifficulty: 0.25,
};

export const singapore: Track = {
  id: "singapore",
  name: "Marina Bay Street Circuit",
  lapLengthKm: 4.94,
  totalLaps: 62,
  pitLaneLossSeconds: 24,
  baseLapTimeSeconds: 98,
  tireWearFactor: 0.85,
  overtakingDifficulty: 0.7,
};

export const cota: Track = {
  id: "cota",
  name: "Circuit of the Americas",
  lapLengthKm: 5.513,
  totalLaps: 56,
  pitLaneLossSeconds: 20,
  baseLapTimeSeconds: 97,
  tireWearFactor: 0.85,
  overtakingDifficulty: 0.3,
};

export const interlagos: Track = {
  id: "interlagos",
  name: "Autódromo José Carlos Pace",
  lapLengthKm: 4.309,
  totalLaps: 71,
  pitLaneLossSeconds: 19,
  baseLapTimeSeconds: 71,
  tireWearFactor: 0.75,
  overtakingDifficulty: 0.35,
};

export const yasMarina: Track = {
  id: "yasmarina",
  name: "Yas Marina Circuit",
  lapLengthKm: 5.281,
  totalLaps: 58,
  pitLaneLossSeconds: 21,
  baseLapTimeSeconds: 86,
  tireWearFactor: 0.6,
  overtakingDifficulty: 0.35,
};

export const zandvoort: Track = {
  id: "zandvoort",
  name: "Circuit Zandvoort",
  lapLengthKm: 4.259,
  totalLaps: 72,
  pitLaneLossSeconds: 20,
  baseLapTimeSeconds: 71,
  tireWearFactor: 0.75,
  overtakingDifficulty: 0.65,
};

export const tracks: Track[] = [
  monza,
  silverstone,
  spa,
  suzuka,
  monaco,
  barcelona,
  redBullRing,
  singapore,
  cota,
  interlagos,
  yasMarina,
  zandvoort,
];

export function getTrack(id: string): Track {
  const track = tracks.find((t) => t.id === id);
  if (!track) throw new Error(`Unknown track id: ${id}`);
  return track;
}
