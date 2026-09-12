// Stylized top-down circuit silhouettes for the live track view. These are
// hand-shaped closed loops that evoke each track's real character (esses,
// hairpins, chicanes, long straights, banking) — not GPS-accurate maps. All
// 12 are now hand-authored (see the phase note in memory.md for why: mixing
// real GPS data in for some tracks and stylized shapes for others would look
// inconsistent, so every track gets the same hand-shaped treatment instead).

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

/** Fallback for any track id without a hand-authored shape (shouldn't happen for the
 *  12 in tracks.ts, but keeps getTrackPath total for anything unexpected). */
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
// Each one is a simplified, recognizable silhouette of the real layout's defining
// features — not traced GPS coordinates. Point counts/spacing vary track to track
// on purpose (Red Bull Ring has very few points because it's a short, simple lap;
// Singapore has many closely-spaced points to suggest a tight street-circuit zigzag).

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

// Rounded loop with a wavy esses bulge (Maggotts/Becketts) on the upper-right and a
// tight hairpin notch (Village/The Loop/Aintree) on the upper-left.
const silverstone: TrackPath = pathFromPoints([
  [180, 280],
  [150, 240],
  [170, 190],
  [140, 160],
  [180, 130],
  [150, 100],
  [230, 80],
  [330, 75],
  [420, 95],
  [460, 130],
  [420, 160],
  [460, 200],
  [420, 170],
  [480, 140],
  [530, 175],
  [500, 215],
  [580, 235],
  [680, 260],
  [650, 310],
  [540, 330],
  [380, 320],
  [240, 310],
]);

// Elongated horizontal loop: a long back straight, a hairpin loop-back at the far end,
// and a small infield wiggle mid-lap.
const barcelona: TrackPath = pathFromPoints([
  [140, 200],
  [160, 150],
  [230, 120],
  [320, 110],
  [400, 130],
  [370, 170],
  [430, 190],
  [520, 170],
  [600, 140],
  [680, 160],
  [700, 220],
  [630, 260],
  [540, 250],
  [460, 270],
  [380, 290],
  [290, 300],
  [210, 280],
  [160, 250],
]);

// Short and simple on purpose — Spielberg only has a handful of corners — but with a
// sharp outward point for the Turn 3 hairpin so it doesn't read as a plain oval.
const redBullRing: TrackPath = pathFromPoints([
  [280, 310],
  [200, 260],
  [180, 190],
  [140, 130],
  [220, 100],
  [340, 90],
  [480, 85],
  [560, 100],
  [620, 150],
  [600, 210],
  [560, 260],
  [480, 300],
  [380, 320],
]);

// Angular, tightly-spaced points for a boxy street-circuit zigzag feel.
const singapore: TrackPath = pathFromPoints([
  [180, 300],
  [160, 250],
  [200, 220],
  [180, 180],
  [230, 150],
  [210, 110],
  [280, 90],
  [360, 110],
  [340, 150],
  [420, 160],
  [480, 120],
  [560, 110],
  [610, 150],
  [580, 200],
  [620, 240],
  [590, 290],
  [500, 310],
  [430, 280],
  [350, 300],
  [260, 320],
]);

// A big wavy esses complex (echoing Silverstone's Maggotts/Becketts, the real
// inspiration for COTA's Turn 1-9) leading into a tightening stadium-hairpin section.
const cota: TrackPath = pathFromPoints([
  [160, 150],
  [210, 110],
  [270, 140],
  [240, 180],
  [300, 200],
  [270, 240],
  [330, 260],
  [400, 230],
  [480, 200],
  [580, 190],
  [670, 210],
  [690, 270],
  [630, 310],
  [560, 290],
  [520, 330],
  [440, 310],
  [400, 340],
  [320, 320],
  [250, 300],
  [190, 260],
  [150, 210],
]);

// Compact elongated oval with the famous "Senna S" kink right after the start/finish.
const interlagos: TrackPath = pathFromPoints([
  [220, 180],
  [180, 150],
  [210, 110],
  [270, 100],
  [240, 140],
  [320, 160],
  [420, 140],
  [520, 150],
  [620, 170],
  [660, 230],
  [600, 280],
  [500, 300],
  [400, 310],
  [300, 290],
  [240, 250],
]);

// Wide and asymmetric: one long straight on one side, a cluster of tight marina/hotel
// corners on the other.
const yasMarina: TrackPath = pathFromPoints([
  [140, 200],
  [220, 180],
  [320, 175],
  [420, 178],
  [520, 182],
  [620, 190],
  [700, 210],
  [680, 260],
  [600, 250],
  [580, 290],
  [520, 280],
  [500, 320],
  [430, 300],
  [400, 330],
  [330, 310],
  [280, 270],
  [220, 280],
  [170, 250],
]);

// Compact, with one very sharp near-180 hairpin right after the pit straight (Tarzan).
const zandvoort: TrackPath = pathFromPoints([
  [220, 300],
  [260, 240],
  [210, 200],
  [260, 160],
  [340, 140],
  [440, 130],
  [540, 150],
  [610, 190],
  [630, 250],
  [580, 300],
  [490, 320],
  [380, 330],
  [300, 320],
]);

export const trackPaths: Record<string, TrackPath> = {
  monza,
  silverstone,
  spa,
  suzuka,
  monaco,
  barcelona,
  redbullring: redBullRing,
  singapore,
  cota,
  interlagos,
  yasmarina: yasMarina,
  zandvoort,
};

export function getTrackPath(trackId: string): TrackPath {
  return trackPaths[trackId] ?? generatedLoop(trackId, { pointCount: 10, jitter: 0.35, aspect: 1.4 });
}
