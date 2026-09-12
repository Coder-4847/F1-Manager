import { useState } from "react";
import type { DownforceSetting, DrivingMode, FuelLoad, PitStopPlan, TireCompound, WeatherCondition } from "../sim/types";
import type { InitialStrategy } from "../sim/strategy";
import { generateWeatherForecast } from "../sim/weather";
import { FUEL_LOADS, FUEL_LOAD_LABEL } from "../sim/fuel";
import { DOWNFORCE_SETTINGS, DOWNFORCE_LABEL } from "../sim/downforce";
import type { Objective } from "../sim/objectives";
import { WeatherForecast } from "./WeatherForecast";

const COMPOUNDS: TireCompound[] = ["soft", "medium", "hard", "intermediate", "wet"];
const COMPOUND_LABEL: Record<TireCompound, string> = {
  soft: "Soft",
  medium: "Medium",
  hard: "Hard",
  intermediate: "Inter",
  wet: "Wet",
};
const MODES: DrivingMode[] = ["conserve", "balanced", "push"];

export interface RacingPlanProps {
  trackName: string;
  totalLaps: number;
  startWeather: WeatherCondition;
  /** Where the player qualified — shown as a small info line if provided. */
  startingGridPosition?: number;
  initialPlan: InitialStrategy;
  onStart: (plan: InitialStrategy) => void;
  /** When set, a saved game exists — offer a way out of planning a race that's about to be replaced by it. */
  hasSave?: boolean;
  onLoad?: () => void;
  /** Hides the fuel load picker entirely when the Settings toggle is off — the plan is then
   *  submitted with initialPlan.fuelLoad unchanged (already forced to "standard"). */
  fuelStrategyEnabled: boolean;
  /** Same idea as fuelStrategyEnabled, for the downforce picker. */
  setupTradeoffEnabled: boolean;
  /** Which way this track's character leans — shown as a plain-language hint next to the
   *  downforce picker, computed by the caller from the actual Track (recommendedDownforceFor). */
  downforceHint: DownforceSetting;
  /** null when the Race Objectives setting is off. */
  objective: Objective | null;
}

export function RacingPlan({
  trackName,
  totalLaps,
  startWeather,
  startingGridPosition,
  initialPlan,
  onStart,
  hasSave,
  onLoad,
  fuelStrategyEnabled,
  setupTradeoffEnabled,
  downforceHint,
  objective,
}: RacingPlanProps) {
  const [compound, setCompound] = useState<TireCompound>(initialPlan.startingCompound);
  const [mode, setMode] = useState<DrivingMode>(initialPlan.drivingMode);
  const [fuelLoad, setFuelLoad] = useState<FuelLoad>(initialPlan.fuelLoad);
  const [downforce, setDownforce] = useState<DownforceSetting>(initialPlan.downforce);
  // Generated once when the screen opens — a preview, not a guarantee (see generateWeatherForecast).
  const [forecast] = useState(() => generateWeatherForecast(startWeather, totalLaps));
  // Clamp the incoming default (e.g. the app's placeholder plan) to this specific race's
  // length — a short custom race could otherwise start with a pit lap past the finish.
  const [pitPlan, setPitPlan] = useState<PitStopPlan[]>(() =>
    initialPlan.pitPlan.map((s) => ({ ...s, lap: Math.min(totalLaps - 1, Math.max(1, s.lap)) }))
  );

  const addStop = () => {
    const defaultLap = Math.min(totalLaps - 1, Math.max(1, Math.round(totalLaps / 2)));
    setPitPlan((prev) => [...prev, { lap: defaultLap, compound: "medium" }]);
  };

  const removeStop = (index: number) => {
    setPitPlan((prev) => prev.filter((_, i) => i !== index));
  };

  const setStopLap = (index: number, lap: number) => {
    const clamped = Math.min(totalLaps - 1, Math.max(1, Math.round(lap) || 1));
    setPitPlan((prev) => prev.map((s, i) => (i === index ? { ...s, lap: clamped } : s)));
  };

  const setStopCompound = (index: number, c: TireCompound) => {
    setPitPlan((prev) => prev.map((s, i) => (i === index ? { ...s, compound: c } : s)));
  };

  const handleStart = () => {
    onStart({
      startingCompound: compound,
      drivingMode: mode,
      pitPlan: [...pitPlan].sort((a, b) => a.lap - b.lap),
      fuelLoad: fuelStrategyEnabled ? fuelLoad : "standard",
      downforce: setupTradeoffEnabled ? downforce : "balanced",
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal modal--wide racing-plan">
        <div className="modal__header">
          <h2>Racing Plan</h2>
          {hasSave && onLoad && (
            <button className="racing-plan__load" type="button" onClick={onLoad}>
              Load Saved Game Instead
            </button>
          )}
        </div>
        <p className="racing-plan__track">
          {trackName} &middot; {totalLaps} laps
          {startingGridPosition && <> &middot; Qualified P{startingGridPosition}</>}
        </p>

        {objective && (
          <div className="racing-plan__objective">
            🎯 Objective: {objective.description}{" "}
            <span className="racing-plan__objective-reward">+{objective.rewardCredits} credits</span>
          </div>
        )}

        <div className="racing-plan__field-label">Weather Forecast</div>
        <WeatherForecast forecast={forecast} startLap={1} />

        <div className="racing-plan__row">
          <div className="driver-profile__field">
            <label>Starting Tires</label>
            <div className="segmented segmented--compounds">
              {COMPOUNDS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={c === compound ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                  onClick={() => setCompound(c)}
                >
                  {COMPOUND_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="driver-profile__field">
            <label>Driving Mode</label>
            <div className="segmented">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={m === mode ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {fuelStrategyEnabled && (
            <div className="driver-profile__field">
              <label>Fuel Load</label>
              <div className="segmented">
                {FUEL_LOADS.map((load) => (
                  <button
                    key={load}
                    type="button"
                    className={load === fuelLoad ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                    onClick={() => setFuelLoad(load)}
                  >
                    {FUEL_LOAD_LABEL[load]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {setupTradeoffEnabled && (
            <div className="driver-profile__field">
              <label>Downforce</label>
              <div className="segmented">
                {DOWNFORCE_SETTINGS.map((setting) => (
                  <button
                    key={setting}
                    type="button"
                    className={setting === downforce ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                    onClick={() => setDownforce(setting)}
                  >
                    {DOWNFORCE_LABEL[setting]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {fuelStrategyEnabled && (
          <p className="racing-plan__fuel-hint">
            Light is quicker but can run dry late in the race if you push too much — Heavy is always safe but
            permanently slower.
          </p>
        )}

        {setupTradeoffEnabled && (
          <p className="racing-plan__fuel-hint">
            {downforceHint === "balanced"
              ? "This track doesn't strongly favor either extreme — Balanced is a safe default."
              : `This track tends to reward ${DOWNFORCE_LABEL[downforceHint].toLowerCase()} downforce. Going against the
                 grain trades lap time for tire life, or vice versa.`}
          </p>
        )}

        <div className="racing-plan__stops">
          <div className="racing-plan__stops-header">
            <h3>Pit Stops</h3>
            <button type="button" onClick={addStop}>
              + Add Stop
            </button>
          </div>
          {pitPlan.length === 0 && (
            <p className="season-setup__empty">
              No stops planned — you can still queue pit stops live during the race.
            </p>
          )}
          <div className="racing-plan__stop-list">
            {pitPlan.map((stop, i) => (
              <div className="racing-plan__stop" key={i}>
                <span className="racing-plan__stop-num">Stop {i + 1}</span>
                <label className="racing-plan__stop-lap">
                  Lap
                  <input
                    type="number"
                    min={1}
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
            <button className="driver-profile__save" type="button" onClick={handleStart}>
              Start Race
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
