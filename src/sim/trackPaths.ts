// Stylized top-down circuit silhouettes for the live track view. These are
// hand-shaped/generated closed loops that evoke each track's character
// (tight vs flowing, street vs permanent) — not GPS-accurate maps.

export interface TrackPath {
  viewBox: string;
  /** Closed SVG path (Z-terminated), safe to use directly as offset-path. */
  d: string;
}

const VIEWBOX_W = 800;
const VIEWBOX_H = 400;
const CX = VIEWBOX_W / 2;
const CY = VIEWBOX_H / 2;

type Point = [number, number];

function catmullRomClosedPath(points: Point[]): string {
  const n = points.length;
  if (n < 3) return "";
  const get = (i: number) => points[((i % n) + n) % n];
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} `;
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
  }
  d += "Z";
  return d;
}

function pathFromPoints(points: Point[]): TrackPath {
  return { viewBox: `0 0 ${VIEWBOX_W} ${VIEWBOX_H}`, d: catmullRomClosedPath(points) };
}

// Deterministic PRNG so a generated loop is stable across renders/sessions.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

interface GeneratedLoopOptions {
  pointCount: number;
  /** 0-1, how much each point's radius is perturbed from a clean ellipse. */
  jitter: number;
  /** radiusX / radiusY */
  aspect: number;
}

/** A varied-but-plausible closed loop for tracks without a hand-authored shape. */
function generatedLoop(seed: string, opts: GeneratedLoopOptions): TrackPath {
  const rand = mulberry32(hashString(seed));
  const baseRadiusY = VIEWBOX_H * 0.36;
  const baseRadiusX = baseRadiusY * opts.aspect;
  const points: Point[] = [];
  for (let i = 0; i < opts.pointCount; i++) {
    const angle = (i / opts.pointCount) * Math.PI * 2;
    const wobble = 1 - opts.jitter / 2 + rand() * opts.jitter;
    points.push([CX + Math.cos(angle) * baseRadiusX * wobble, CY + Math.sin(angle) * baseRadiusY * wobble]);
  }
  return pathFromPoints(points);
}

// --- Hand-shaped signature circuits -----------------------------------

const monza: TrackPath = pathFromPoints([
  [120, 200],
  [140, 120],
  [220, 70],
  [260, 90],
  [230, 130],
  [300, 150],
  [460, 150],
  [560, 90],
  [640, 60],
  [700, 110],
  [660, 170],
  [690, 220],
  [660, 290],
  [560, 330],
  [520, 300],
  [560, 260],
  [480, 250],
  [260, 250],
  [200, 280],
  [150, 260],
]);

const monaco: TrackPath = pathFromPoints([
  [200, 300],
  [160, 260],
  [180, 210],
  [260, 190],
  [300, 150],
  [280, 110],
  [340, 80],
  [420, 90],
  [440, 130],
  [400, 160],
  [460, 190],
  [560, 180],
  [620, 210],
  [600, 260],
  [520, 270],
  [500, 240],
  [440, 250],
  [420, 300],
  [340, 320],
  [260, 310],
]);

const spa: TrackPath = pathFromPoints([
  [140, 250],
  [130, 190],
  [180, 150],
  [230, 170],
  [260, 140],
  [230, 100],
  [280, 70],
  [360, 80],
  [520, 130],
  [640, 140],
  [700, 180],
  [670, 230],
  [600, 220],
  [560, 260],
  [580, 300],
  [520, 330],
  [420, 320],
  [340, 340],
  [260, 330],
  [190, 300],
]);

const suzuka: TrackPath = pathFromPoints([
  [150, 160],
  [220, 120],
  [320, 140],
  [380, 110],
  [360, 70],
  [420, 60],
  [470, 100],
  [430, 140],
  [480, 170],
  [560, 150],
  [640, 180],
  [650, 240],
  [580, 270],
  [520, 250],
  [470, 280],
  [490, 320],
  [420, 340],
  [340, 300],
  [280, 310],
  [200, 280],
  [160, 230],
]);

// --- Generated loops for the rest, varied by each track's character ---

const barcelona = generatedLoop("barcelona", { pointCount: 11, jitter: 0.4, aspect: 1.5 });
const redbullring = generatedLoop("redbullring", { pointCount: 8, jitter: 0.25, aspect: 1.2 });
const singapore = generatedLoop("singapore", { pointCount: 14, jitter: 0.5, aspect: 1.4 });
const cota = generatedLoop("cota", { pointCount: 12, jitter: 0.45, aspect: 1.6 });
const interlagos = generatedLoop("interlagos", { pointCount: 9, jitter: 0.35, aspect: 1.1 });
const yasmarina = generatedLoop("yasmarina", { pointCount: 12, jitter: 0.4, aspect: 1.7 });
const zandvoort = generatedLoop("zandvoort", { pointCount: 10, jitter: 0.3, aspect: 1.3 });

export const trackPaths: Record<string, TrackPath> = {
  monza,
  silverstone: generatedLoop("silverstone", { pointCount: 11, jitter: 0.35, aspect: 1.5 }),
  spa,
  suzuka,
  monaco,
  barcelona,
  redbullring,
  singapore,
  cota,
  interlagos,
  yasmarina,
  zandvoort,
};

export function getTrackPath(trackId: string): TrackPath {
  return trackPaths[trackId] ?? generatedLoop(trackId, { pointCount: 10, jitter: 0.35, aspect: 1.4 });
}
