export interface MainMenuProps {
  hasStartedRace: boolean;
  roundNumber: number;
  totalRounds: number;
  seasonComplete: boolean;
  hasSave: boolean;
  onPlay: () => void;
  onCustomSeason: () => void;
  onEditDriver: () => void;
  onTeamDevelopment: () => void;
  onDriverMarket: () => void;
  onSettings: () => void;
  onLoad: () => void;
}

export function MainMenu({
  hasStartedRace,
  roundNumber,
  totalRounds,
  seasonComplete,
  hasSave,
  onPlay,
  onCustomSeason,
  onEditDriver,
  onTeamDevelopment,
  onDriverMarket,
  onSettings,
  onLoad,
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
          <button className="main-menu__btn" onClick={onDriverMarket}>
            Driver Market
          </button>
          <button className="main-menu__btn" onClick={onSettings}>
            Settings
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
