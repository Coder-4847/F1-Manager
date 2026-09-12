// Feature toggles the player can flip from the Settings screen — lets the game be dialed
// between a lighter arcade feel and the full tactical layer, rather than locking everyone
// into one fixed mix of systems. Difficulty (see difficulty.ts) is a separate, older knob
// that only scales AI pace; these toggles turn whole systems on or off outright.

export interface GameSettings {
  damageEnabled: boolean;
  weatherEnabled: boolean;
  cautionsEnabled: boolean;
  penaltiesEnabled: boolean;
  retirementsEnabled: boolean;
  fuelStrategyEnabled: boolean;
  setupTradeoffEnabled: boolean;
  strategistSuggestionsEnabled: boolean;
  teamOrdersEnabled: boolean;
  seasonObjectivesEnabled: boolean;
  rivalTrackerEnabled: boolean;
  /** Off by default — a Driver Market swap normally reverts when a season restarts, the
   *  same lifecycle team development already has. */
  driverMarketPersists: boolean;
  /** Off by default — team development normally resets every season (see season.ts);
   *  this lets its budget/levels carry forward across restarts instead, for players who
   *  want a longer-arc career rather than a fresh budget each season. */
  multiSeasonCareer: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  damageEnabled: true,
  weatherEnabled: true,
  cautionsEnabled: true,
  penaltiesEnabled: true,
  retirementsEnabled: true,
  fuelStrategyEnabled: true,
  setupTradeoffEnabled: true,
  strategistSuggestionsEnabled: true,
  teamOrdersEnabled: true,
  seasonObjectivesEnabled: true,
  rivalTrackerEnabled: true,
  driverMarketPersists: false,
  multiSeasonCareer: false,
};

export type SettingGroup = "race" | "tactics" | "career";

export interface SettingToggleInfo {
  key: keyof GameSettings;
  label: string;
  description: string;
  group: SettingGroup;
}

export const SETTING_GROUP_LABEL: Record<SettingGroup, string> = {
  race: "Race Systems",
  tactics: "Tactical Options",
  career: "Season & Career",
};

export const SETTING_GROUPS: SettingGroup[] = ["race", "tactics", "career"];

export const SETTING_TOGGLES: SettingToggleInfo[] = [
  {
    key: "damageEnabled",
    label: "Damage & Mechanical Failures",
    description: "Cars can pick up damage or mechanical issues. Turn off for a cleaner race with no reliability risk.",
    group: "race",
  },
  {
    key: "weatherEnabled",
    label: "Weather Changes",
    description: "Conditions can shift between dry, damp, and wet mid-race. Turn off to keep every race dry.",
    group: "race",
  },
  {
    key: "cautionsEnabled",
    label: "Safety Car / VSC",
    description: "Retirements and serious damage can trigger a Safety Car or Virtual Safety Car.",
    group: "race",
  },
  {
    key: "penaltiesEnabled",
    label: "Time Penalties",
    description: "Track limits, unsafe releases, and collisions can earn a time penalty.",
    group: "race",
  },
  {
    key: "retirementsEnabled",
    label: "DNF Retirements",
    description: "Cars can retire outright from damage, weather, or pushing too hard.",
    group: "race",
  },
  {
    key: "fuelStrategyEnabled",
    label: "Fuel Strategy",
    description: "Choose a fuel load before the race — light is faster but risks running dry late on.",
    group: "tactics",
  },
  {
    key: "setupTradeoffEnabled",
    label: "Setup Trade-off",
    description: "Choose a downforce setup before the race — a pace/tire-wear trade-off suited to the track.",
    group: "tactics",
  },
  {
    key: "strategistSuggestionsEnabled",
    label: "Race Engineer Suggestions",
    description: "Your engineer radios in tactical suggestions mid-race that you can accept or ignore.",
    group: "tactics",
  },
  {
    key: "teamOrdersEnabled",
    label: "Teammate Team Orders",
    description: "Radio orders to your AI teammate — hold position, let you through, or block a rival.",
    group: "tactics",
  },
  {
    key: "seasonObjectivesEnabled",
    label: "Race Objectives",
    description: "A fresh tactical objective each round, paying a development bonus when you achieve it.",
    group: "career",
  },
  {
    key: "rivalTrackerEnabled",
    label: "Rival Tracker",
    description: "A season-long rival is highlighted in the standings, with a live gap shown during races.",
    group: "career",
  },
  {
    key: "driverMarketPersists",
    label: "Driver Market Persists",
    description: "A teammate swap made at the Driver Market carries into new seasons instead of reverting.",
    group: "career",
  },
  {
    key: "multiSeasonCareer",
    label: "Multi-Season Career",
    description: "Team development budget and levels carry forward across season restarts instead of resetting.",
    group: "career",
  },
];
