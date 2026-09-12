import { useState } from "react";
import type { CarState, DrivingMode, TireCompound } from "../sim/types";
import { FUEL_LOAD_LABEL } from "../sim/fuel";
import { TireBadge } from "./TireBadge";
import { CarHealthIndicator } from "./CarHealthIndicator";

const MODES: DrivingMode[] = ["conserve", "balanced", "push"];
const COMPOUNDS: TireCompound[] = ["soft", "medium", "hard", "intermediate", "wet"];
const COMPOUND_LABEL: Record<TireCompound, string> = {
  soft: "Soft",
  medium: "Medium",
  hard: "Hard",
  intermediate: "Inter",
  wet: "Wet",
};

export interface PlayerControlsProps {
  car: CarState;
  currentLap: number;
  onSetDrivingMode: (mode: DrivingMode) => void;
  onQueuePitStop: (lap: number, compound: TireCompound) => void;
  onCancelPitStop: () => void;
  onOpenRevisePlan: () => void;
  fuelStrategyEnabled: boolean;
}

export function PlayerControls({
  car,
  currentLap,
  onSetDrivingMode,
  onQueuePitStop,
  onCancelPitStop,
  onOpenRevisePlan,
  fuelStrategyEnabled,
}: PlayerControlsProps) {
  const [selectedCompound, setSelectedCompound] = useState<TireCompound>("medium");
  const pendingStop = car.pitPlan[0];

  return (
    <div className="player-controls">
      <div className="player-controls__row">
        <div className="player-controls__label">Car condition</div>
        <div className="car-condition">
          <CarHealthIndicator severity={car.damageSeverity} />
          <span className={car.damageSeverity ? `damage-status damage-status--${car.damageSeverity}` : "car-condition__ok"}>
            {car.damageSeverity ? car.damageLabel : "No damage"}
          </span>
        </div>
      </div>

      <div className="player-controls__row">
        <div className="player-controls__label">Your tires</div>
        <TireBadge compound={car.currentCompound} tireAge={car.tireAge} />
      </div>

      {car.damageSeverity && (
        <div className="player-controls__row">
          <div className="player-controls__label">Damage</div>
          <div className={`damage-status damage-status--${car.damageSeverity}`}>
            {car.damageDescription ?? car.damageLabel} &middot; -{car.damagePenaltySeconds.toFixed(1)}s/lap
          </div>
        </div>
      )}

      {fuelStrategyEnabled && (
        <div className="player-controls__row">
          <div className="player-controls__label">Fuel</div>
          <div className={car.fuelSaving ? "damage-status damage-status--major" : "car-condition__ok"}>
            {FUEL_LOAD_LABEL[car.fuelLoad]} load
            {car.fuelSaving ? " — fuel saving!" : ` · ${Math.max(0, Math.round(car.fuelRemaining))} laps' margin left`}
          </div>
        </div>
      )}

      {car.penaltySeconds > 0 && (
        <div className="player-controls__row">
          <div className="player-controls__label">Time penalties</div>
          <div className="damage-status damage-status--major">+{car.penaltySeconds}s total</div>
        </div>
      )}

      <div className="player-controls__row">
        <div className="player-controls__label">Driving mode</div>
        <div className="segmented">
          {MODES.map((mode) => (
            <button
              key={mode}
              className={mode === car.drivingMode ? "segmented__btn segmented__btn--active" : "segmented__btn"}
              onClick={() => onSetDrivingMode(mode)}
              disabled={car.finished}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="player-controls__row">
        <div className="player-controls__label">Pit stop</div>
        <div className="pit-controls">
          <div className="segmented segmented--compounds">
            {COMPOUNDS.map((compound) => (
              <button
                key={compound}
                className={
                  compound === selectedCompound ? "segmented__btn segmented__btn--active" : "segmented__btn"
                }
                onClick={() => setSelectedCompound(compound)}
                disabled={car.finished}
              >
                {COMPOUND_LABEL[compound]}
              </button>
            ))}
          </div>
          <button
            className="pit-controls__action"
            disabled={car.finished}
            onClick={() => onQueuePitStop(currentLap + 1, selectedCompound)}
          >
            Pit Next Lap
          </button>
          {pendingStop && (
            <button className="pit-controls__cancel" onClick={onCancelPitStop}>
              Cancel (Lap {pendingStop.lap}, {pendingStop.compound})
            </button>
          )}
        </div>
      </div>

      <div className="player-controls__row">
        <button className="player-controls__revise-plan" onClick={onOpenRevisePlan} disabled={car.finished}>
          Revise Plan (Forecast)
        </button>
      </div>
    </div>
  );
}
