import { DIFFICULTIES, DIFFICULTY_LABELS } from "../sim/difficulty";
import type { Difficulty } from "../sim/difficulty";

export interface MainMenuProps {
  hasStartedRace: boolean;
  roundNumber: number;
  totalRounds: number;
  seasonComplete: boolean;
  hasSave: boolean;
  difficulty: Difficulty;
  onPlay: () => void;
  onCustomSeason: () => void;
  onEditDriver: () => void;
  onTeamDevelopment: () => void;
  onLoad: () => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
}

export function MainMenu({
  hasStartedRace,
  roundNumber,
  totalRounds,
  seasonComplete,
  hasSave,
  difficulty,
  onPlay,
  onCustomSeason,
  onEditDriver,
  onTeamDevelopment,
  onLoad,
  onSetDifficulty,
}: MainMenuProps) {
  return (
    <div className="main-menu">
      <div className="app__flag-strip" />
      <div className="main-menu__content">
        <h1 className="main-menu__title">F1 Manager</h1>
        <p className="main-menu__tagline">Manage your team. Master the conditions.</p>

        <div className="main-menu__status">
          {seasonComplete ? "Season complete" : `Round ${roundNumber}/${totalRounds}`}
        </div>

        <div className="main-menu__difficulty">
          <span className="main-menu__difficulty-label">Difficulty</span>
          <div className="main-menu__difficulty-options">
            {DIFFICULTIES.map((option) => (
              <button
                key={option}
                className={`main-menu__difficulty-btn${
                  option === difficulty ? " main-menu__difficulty-btn--active" : ""
                }`}
                onClick={() => onSetDifficulty(option)}
              >
                {DIFFICULTY_LABELS[option]}
              </button>
            ))}
          </div>
          {hasStartedRace && (
            <p className="main-menu__difficulty-hint">Takes effect next race — Reset, Next Round, or a new season.</p>
          )}
        </div>

        <div className="main-menu__buttons">
          <button className="main-menu__btn main-menu__btn--primary" onClick={onPlay}>
            {hasStartedRace ? "Resume" : "Play"}
          </button>
          <button className="main-menu__btn" onClick={onCustomSeason}>
            Custom Season
          </button>
          <button className="main-menu__btn" onClick={onEditDriver}>
            Edit Driver
          </button>
          <button className="main-menu__btn" onClick={onTeamDevelopment}>
            Team Development
          </button>
          {hasSave && (
            <button className="main-menu__btn" onClick={onLoad}>
              Load Saved Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
