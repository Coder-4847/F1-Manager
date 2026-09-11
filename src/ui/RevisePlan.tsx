import { useState } from "react";
import type { PitStopPlan, TireCompound, WeatherCondition } from "../sim/types";
import { generateWeatherForecast } from "../sim/weather";
import { WeatherForecast } from "./WeatherForecast";

const COMPOUNDS: TireCompound[] = ["soft", "medium", "hard", "intermediate", "wet"];
const COMPOUND_LABEL: Record<TireCompound, string> = {
  soft: "Soft",
  medium: "Medium",
  hard: "Hard",
  intermediate: "Inter",
  wet: "Wet",
};

export interface RevisePlanProps {
  trackName: string;
  currentLap: number;
  totalLaps: number;
  weather: WeatherCondition;
  currentPitPlan: PitStopPlan[];
  onSave: (stops: PitStopPlan[]) => void;
  onClose: () => void;
}

export function RevisePlan({
  trackName,
  currentLap,
  totalLaps,
  weather,
  currentPitPlan,
  onSave,
  onClose,
}: RevisePlanProps) {
  const [pitPlan, setPitPlan] = useState<PitStopPlan[]>(currentPitPlan);
  const lapsRemaining = Math.max(0, totalLaps - currentLap);
  // Freshly regenerated every time this screen opens — an "updated forecast reading".
  const [forecast] = useState(() => generateWeatherForecast(weather, lapsRemaining));

  const addStop = () => {
    const defaultLap = Math.min(totalLaps - 1, Math.max(currentLap + 1, Math.round((currentLap + totalLaps) / 2)));
    setPitPlan((prev) => [...prev, { lap: defaultLap, compound: "medium" }]);
  };

  const removeStop = (index: number) => {
    setPitPlan((prev) => prev.filter((_, i) => i !== index));
  };

  const setStopLap = (index: number, lap: number) => {
    const clamped = Math.min(totalLaps - 1, Math.max(currentLap + 1, Math.round(lap) || currentLap + 1));
    setPitPlan((prev) => prev.map((s, i) => (i === index ? { ...s, lap: clamped } : s)));
  };

  const setStopCompound = (index: number, c: TireCompound) => {
    setPitPlan((prev) => prev.map((s, i) => (i === index ? { ...s, compound: c } : s)));
  };

  const handleSave = () => {
    onSave([...pitPlan].sort((a, b) => a.lap - b.lap));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide racing-plan" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Revise Plan</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <p className="racing-plan__track">
          {trackName} &middot; Lap {currentLap} of {totalLaps}
        </p>

        <div className="racing-plan__field-label">Updated Forecast</div>
        <WeatherForecast forecast={forecast} startLap={currentLap + 1} />

        <div className="racing-plan__stops">
          <div className="racing-plan__stops-header">
            <h3>Remaining Pit Stops</h3>
            <button type="button" onClick={addStop} disabled={lapsRemaining <= 1}>
              + Add Stop
            </button>
          </div>
          {pitPlan.length === 0 && (
            <p className="season-setup__empty">No stops planned for the rest of the race.</p>
          )}
          <div className="racing-plan__stop-list">
            {pitPlan.map((stop, i) => (
              <div className="racing-plan__stop" key={i}>
                <span className="racing-plan__stop-num">Stop {i + 1}</span>
                <label className="racing-plan__stop-lap">
                  Lap
                  <input
                    type="number"
                    min={currentLap + 1}
                    max={totalLaps - 1}
                    value={stop.lap}
                    onChange={(e) => setStopLap(i, Number(e.target.value))}
                  />
                </label>
                <div className="segmented segmented--compounds">
                  {COMPOUNDS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={c === stop.compound ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                      onClick={() => setStopCompound(i, c)}
                    >
                      {COMPOUND_LABEL[c]}
                    </button>
                  ))}
                </div>
                <button
                  className="season-setup__round-remove"
                  onClick={() => removeStop(i)}
                  type="button"
                  aria-label="Remove stop"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="driver-profile__actions">
          <span />
          <div className="driver-profile__actions-right">
            <button onClick={onClose} type="button">
              Cancel
            </button>
            <button className="driver-profile__save" type="button" onClick={handleSave}>
              Save Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
