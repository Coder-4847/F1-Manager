import type { TeamDevelopment as TeamDevelopmentState, UpgradeCategory } from "../sim/development";
import {
  MAX_UPGRADE_LEVEL,
  canAffordUpgrade,
  paceBonusForLevel,
  reliabilityMultiplierForLevel,
  tireWearMultiplierForLevel,
  upgradeCost,
} from "../sim/development";

const CATEGORY_LABEL: Record<UpgradeCategory, string> = {
  pace: "Pace",
  reliability: "Reliability",
  tireManagement: "Tire Management",
};

const CATEGORY_DESCRIPTION: Record<UpgradeCategory, string> = {
  pace: "Raises your car's raw performance every lap.",
  reliability: "Lowers the odds of picking up damage or a mechanical retirement.",
  tireManagement: "Slows down tire degradation across a stint.",
};

function levelFor(dev: TeamDevelopmentState, category: UpgradeCategory): number {
  if (category === "pace") return dev.paceLevel;
  if (category === "reliability") return dev.reliabilityLevel;
  return dev.tireManagementLevel;
}

function effectLabel(category: UpgradeCategory, level: number): string {
  if (category === "pace") return level === 0 ? "No bonus yet" : `+${paceBonusForLevel(level).toFixed(1)} car performance`;
  if (category === "reliability") {
    return level === 0 ? "No reduction yet" : `${Math.round((1 - reliabilityMultiplierForLevel(level)) * 100)}% fewer incidents`;
  }
  return level === 0 ? "No reduction yet" : `${Math.round((1 - tireWearMultiplierForLevel(level)) * 100)}% slower wear`;
}

export interface TeamDevelopmentProps {
  teamName: string;
  development: TeamDevelopmentState;
  onBuy: (category: UpgradeCategory) => void;
  onClose: () => void;
}

export function TeamDevelopment({ teamName, development, onBuy, onClose }: TeamDevelopmentProps) {
  const categories: UpgradeCategory[] = ["pace", "reliability", "tireManagement"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide team-development" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Team Development</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            &times;
          </button>
        </div>
        <p className="team-development__subtitle">{teamName}</p>
        <div className="team-development__budget">
          Budget <strong>{Math.round(development.budget).toLocaleString()}</strong>
        </div>

        <div className="team-development__grid">
          {categories.map((category) => {
            const level = levelFor(development, category);
            const cost = upgradeCost(development, category);
            const affordable = canAffordUpgrade(development, category);
            return (
              <div className="team-development__card" key={category}>
                <div className="team-development__card-head">
                  <h3>{CATEGORY_LABEL[category]}</h3>
                  <span className="team-development__level">
                    Lv {level}/{MAX_UPGRADE_LEVEL}
                  </span>
                </div>
                <div className="team-development__dots">
                  {Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) => (
                    <span
                      key={i}
                      className={i < level ? "team-development__dot team-development__dot--filled" : "team-development__dot"}
                    />
                  ))}
                </div>
                <p className="team-development__desc">{CATEGORY_DESCRIPTION[category]}</p>
                <p className="team-development__effect">{effectLabel(category, level)}</p>
                <button
                  type="button"
                  className="team-development__buy"
                  disabled={cost === null || !affordable}
                  onClick={() => onBuy(category)}
                >
                  {cost === null ? "Maxed Out" : `Upgrade — ${cost.toLocaleString()}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
