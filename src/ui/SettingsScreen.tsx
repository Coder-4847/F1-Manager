import { DIFFICULTIES, DIFFICULTY_LABELS } from "../sim/difficulty";
import type { Difficulty } from "../sim/difficulty";
import { SETTING_GROUPS, SETTING_GROUP_LABEL, SETTING_TOGGLES } from "../sim/settings";
import type { GameSettings } from "../sim/settings";

export interface SettingsScreenProps {
  settings: GameSettings;
  difficulty: Difficulty;
  hasStartedRace: boolean;
  onToggle: (key: keyof GameSettings) => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
  onClose: () => void;
}

export function SettingsScreen({
  settings,
  difficulty,
  hasStartedRace,
  onToggle,
  onSetDifficulty,
  onClose,
}: SettingsScreenProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide settings-screen" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Settings</h2>
          <button className="modal__close" onClick={onClose} aria-label="Close" type="button">
            &times;
          </button>
        </div>

        <div className="settings-screen__section">
          <h3>Difficulty</h3>
          <div className="segmented">
            {DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="button"
                className={option === difficulty ? "segmented__btn segmented__btn--active" : "segmented__btn"}
                onClick={() => onSetDifficulty(option)}
              >
                {DIFFICULTY_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {SETTING_GROUPS.map((group) => (
          <div className="settings-screen__section" key={group}>
            <h3>{SETTING_GROUP_LABEL[group]}</h3>
            <div className="settings-screen__list">
              {SETTING_TOGGLES.filter((toggle) => toggle.group === group).map((toggle) => (
                <label className="settings-toggle" key={toggle.key}>
                  <div className="settings-toggle__text">
                    <span className="settings-toggle__label">{toggle.label}</span>
                    <span className="settings-toggle__desc">{toggle.description}</span>
                  </div>
                  <input type="checkbox" checked={settings[toggle.key]} onChange={() => onToggle(toggle.key)} />
                </label>
              ))}
            </div>
          </div>
        ))}

        {hasStartedRace && (
          <p className="main-menu__difficulty-hint">
            Changes here take effect next race — Reset, Next Round, or a new season.
          </p>
        )}
      </div>
    </div>
  );
}
