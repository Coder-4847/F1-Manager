import type { Track } from "./types";

const STATIONARY_TIME_SECONDS = 2.8;
const STATIONARY_TIME_VARIANCE_SECONDS = 1.2;

/**
 * Total time lost (seconds) from making a pit stop: pit lane speed-limit delta
 * plus time stationary in the box. This whole amount gets added to the car's
 * race time on the lap it pits.
 */
export function pitStopTimeLoss(track: Track, random: () => number = Math.random): number {
  const stationary = STATIONARY_TIME_SECONDS + random() * STATIONARY_TIME_VARIANCE_SECONDS;
  return track.pitLaneLossSeconds + stationary;
}
