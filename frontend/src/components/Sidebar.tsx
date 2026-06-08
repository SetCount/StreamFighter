import type { GamePack, UpdateInfo } from "../types";
import { Icon } from "../icons";

type TabId = "player" | "presets" | "overlay" | "hotkeys" | "system";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "player", label: "Player Info", icon: "player" },
  { id: "presets", label: "Presets", icon: "presets" },
  { id: "overlay", label: "Overlay", icon: "overlay" },
  { id: "hotkeys", label: "Hotkeys", icon: "hotkeys" },
  { id: "system", label: "System", icon: "system" },
];

interface SidebarProps {
  activePack: GamePack | undefined;
  configGame: string;
  activeTab: string;
  games: GamePack[];
  updateInfo: UpdateInfo | null;
  restartNotice: boolean;
  configEnableServer: boolean;
  configHttpPort: number;
  onTabClick: (id: string) => void;
  onPickGame: (id: string) => void;
  onOpenGamesDir: () => void;
  onReloadGames: () => void;
}

export function Sidebar({
  activePack,
  configGame,
  activeTab,
  games,
  updateInfo,
  restartNotice,
  configEnableServer,
  configHttpPort,
  onTabClick,
  onPickGame,
  onOpenGamesDir,
  onReloadGames,
}: SidebarProps) {
  let statusClass = "sidebar-status";
  let statusBody: React.ReactNode;
  if (restartNotice) {
    statusClass += " is-warn";
    statusBody = (
      <>
        <strong>Restart needed</strong>
        <span>Port or server toggle changed.</span>
      </>
    );
  } else if (!configEnableServer) {
    statusClass += " is-warn";
    statusBody = (
      <>
        <strong>Server off</strong>
        <span>Overlay browser source won't connect.</span>
      </>
    );
  } else {
    statusBody = (
      <>
        <strong>Server running</strong>
        <span>Port {configHttpPort}</span>
      </>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-name">StreamFighter</span>
        <span className="sidebar-brand-version">
          v{(updateInfo?.current ?? "0.0.0").replace(/^v/, "")}
        </span>
        {updateInfo?.outdated && (
          <a
            href={updateInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-update"
            title={`Download ${updateInfo.latest}`}
          >
            <Icon name="open" width={14} height={14} />
            <span>Update to {updateInfo.latest.replace(/^v/, "")}</span>
          </a>
        )}
      </div>

      <nav aria-label="Section">
        <ul className="sidebar-nav">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="nav-item"
                aria-current={activeTab === t.id ? "page" : undefined}
                onClick={() => onTabClick(t.id)}
                title={t.label}
              >
                <Icon
                  name={t.icon}
                  width={18}
                  height={18}
                  className="nav-icon"
                />
                <span className="nav-label">{t.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className={statusClass}>{statusBody}</div>

        <div className="sidebar-game-header">
          <span className="sidebar-game-label">
            {activePack ? (activePack.shortName ?? activePack.name) : "No game"}
          </span>
          <div className="sidebar-game-actions">
            <button
              type="button"
              className="sidebar-game-action"
              title="Open games folder"
              onClick={onOpenGamesDir}
            >
              <Icon name="folder" width={14} height={14} />
            </button>
            <button
              type="button"
              className="sidebar-game-action"
              title="Refresh game packs"
              onClick={onReloadGames}
            >
              <Icon name="refresh" width={14} height={14} />
            </button>
          </div>
        </div>

        <div
          className="sidebar-game-picker"
          role="radiogroup"
          aria-label="Game pack"
        >
          <button
            type="button"
            className={`sidebar-game-option${configGame === "" ? " is-active" : ""}`}
            role="radio"
            aria-checked={configGame === ""}
            onClick={() => onPickGame("")}
          >
            No game
          </button>
          {games.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`sidebar-game-option${configGame === g.id ? " is-active" : ""}`}
              role="radio"
              aria-checked={configGame === g.id}
              onClick={() => onPickGame(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
