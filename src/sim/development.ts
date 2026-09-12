// Team development & budget — resets every season (see season.ts), lives entirely in
// SeasonState rather than mutating the shared roster.ts team registry, the same reasoning
// as why a custom season's per-round lap counts are a shallow copy over the track registry.

export type UpgradeCategory = "pace" | "reliability" | "tireManagement";

export interface TeamDevelopment {
  budget: number;
  paceLevel: number;
  reliabilityLevel: number;
  tireManagementLevel: number;
}

export const MAX_UPGRADE_LEVEL = 5;

/** Cost to go from level N (index) to N+1. Rising, so early upgrades are cheap and
 *  affordable within a round or two, later ones take a real accumulated budget. */
const UPGRADE_COST_BY_LEVEL = [250, 800, 1600, 2600, 3800];

const PACE_BONUS_PER_LEVEL = 1.6;
const RELIABILITY_REDUCTION_PER_LEVEL = 0.09;
const TIRE_WEAR_REDUCTION_PER_LEVEL = 0.07;

export function createInitialDevelopment(teamIds: string[]): Record<string, TeamDevelopment> {
  return Object.fromEntries(teamIds.map((id) => [id, { budget: 0, paceLevel: 0, reliabilityLevel: 0, tireManagementLevel: 0 }]));
}

function levelFor(dev: TeamDevelopment, category: UpgradeCategory): number {
  if (category === "pace") return dev.paceLevel;
  if (category === "reliability") return dev.reliabilityLevel;
  return dev.tireManagementLevel;
}

function withLevel(dev: TeamDevelopment, category: UpgradeCategory, level: number): TeamDevelopment {
  if (category === "pace") return { ...dev, paceLevel: level };
  if (category === "reliability") return { ...dev, reliabilityLevel: level };
  return { ...dev, tireManagementLevel: level };
}

/** Added directly to a team's carPerformance. */
export function paceBonusForLevel(level: number): number {
  return level * PACE_BONUS_PER_LEVEL;
}

/** Multiplies a car's damage/retirement roll chance — lower is more reliable. */
export function reliabilityMultiplierForLevel(level: number): number {
  return 1 - level * RELIABILITY_REDUCTION_PER_LEVEL;
}

/** Multiplies a car's tire wear penalty — lower degrades slower. */
export function tireWearMultiplierForLevel(level: number): number {
  return 1 - level * TIRE_WEAR_REDUCTION_PER_LEVEL;
}

/** Cost of the next level in a category, or null if already at MAX_UPGRADE_LEVEL. */
export function upgradeCost(dev: TeamDevelopment, category: UpgradeCategory): number | null {
  const level = levelFor(dev, category);
  return level >= MAX_UPGRADE_LEVEL ? null : UPGRADE_COST_BY_LEVEL[level];
}

export function canAffordUpgrade(dev: TeamDevelopment, category: UpgradeCategory): boolean {
  const cost = upgradeCost(dev, category);
  return cost !== null && dev.budget >= cost;
}

/** Buys one level in a category if affordable; otherwise returns dev unchanged. */
export function purchaseUpgrade(dev: TeamDevelopment, category: UpgradeCategory): TeamDevelopment {
  const cost = upgradeCost(dev, category);
  if (cost === null || dev.budget < cost) return dev;
  return withLevel({ ...dev, budget: dev.budget - cost }, category, levelFor(dev, category) + 1);
}

const CATEGORIES: UpgradeCategory[] = ["pace", "reliability", "tireManagement"];
/** How many purchases an AI team will attempt per round — gradual investment over a
 *  season rather than dumping a whole windfall into one category at once. */
const AI_PURCHASES_PER_ROUND = 2;

/** Weighted toward whichever category is currently lagging, so a team's identity drifts
 *  toward balance rather than everyone racing to max pace first; a small flat floor keeps
 *  even a maxed-out category possible to "pick" (and skip, since it's unaffordable/capped)
 *  rather than a hard exclusion that would make teams too uniform. */
function pickWeightedCategory(dev: TeamDevelopment, random: () => number): UpgradeCategory {
  const weights = CATEGORIES.map((c) => Math.max(0.5, MAX_UPGRADE_LEVEL - levelFor(dev, c)));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = random() * total;
  for (let i = 0; i < CATEGORIES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return CATEGORIES[i];
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

/** AI teams auto-invest their budget each round rather than getting a shop UI — the field's
 *  competitive order should visibly shift over a season without the player micromanaging it. */
export function aiAutoSpend(dev: TeamDevelopment, random: () => number = Math.random): TeamDevelopment {
  let next = dev;
  for (let i = 0; i < AI_PURCHASES_PER_ROUND; i++) {
    const category = pickWeightedCategory(next, random);
    if (canAffordUpgrade(next, category)) next = purchaseUpgrade(next, category);
  }
  return next;
}
