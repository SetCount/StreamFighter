import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import {
  GetState,
  SetState,
  ClearState,
  GetConfig,
  SetConfig,
  GameOverlayURL,
  BetweenOverlayURL,
  AssetsBaseURL,
  Update,
  ListGames,
  GetLayoutRegistry,
  GetSecrets,
  SetSecrets,
  GetHotkeyConfig,
  SetHotkeyConfig,
  ExecuteHotkeyAction,
  ListPlayerPresets,
  SavePlayerPreset,
  DeletePlayerPreset,
  ListCasterPresets,
  SaveCasterPreset,
  DeleteCasterPreset,
  FetchStartggSets,
  FetchStartggTournament,
  ResizeWindow,
} from "../wailsjs/go/internal/App";
import type {
  StreamState,
  OutputConfig,
  SetInfo,
  GamePack,
  LayoutRegistry,
  Caster,
  Player,
  PlayerPreset,
  CasterPreset,
  StartggSet,
  HotkeyConfig,
} from "./types";
import { reshapeForFormat, canResize, clampScores } from "./reshape";
import { applyStartggSet, collectAmbiguities } from "./startgg";
import type { Ambiguity } from "./startgg";
import { findPack } from "./assets";
import { portPaletteFor } from "./portColors";
import SetInfoEditor from "./components/SetInfoEditor";
import ScoreEntitiesEditor from "./components/ScoreEntitiesEditor";
import CastersEditor from "./components/CastersEditor";
import OutputSettings from "./components/OutputSettings";
import SystemSettings from "./components/SystemSettings";
import OverlayEditor from "./components/OverlayEditor";
import PresetsEditor from "./components/PresetsEditor";
import HotkeysEditor from "./components/HotkeysEditor";
import SetPicker from "./components/SetPicker";
import PresetDisambiguator from "./components/PresetDisambiguator";
import { BrowserOpenURL, EventsOn } from "../wailsjs/runtime/runtime";
import "./App.css";

type TabId = "player" | "presets" | "overlay" | "output" | "hotkeys" | "system";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "player",  label: "Player Info", icon: "player" },
  { id: "presets", label: "Presets",     icon: "presets" },
  { id: "overlay", label: "Overlay",     icon: "overlay" },
  { id: "output",  label: "Output",      icon: "output" },
  { id: "hotkeys", label: "Hotkeys",     icon: "hotkeys" },
  { id: "system",  label: "System",      icon: "system" },
];

function heightForFormat(format: string): number {
  if (format === "2v2") return 1400;
  if (format === "1v1") return 800;
  return 850;
}

type ToastKind = "info" | "ok" | "warn" | "err";
type Toast = { kind: ToastKind; message: string } | null;

function App() {
  const [state, setSt] = useState<StreamState | null>(null);
  const [config, setCfg] = useState<OutputConfig | null>(null);
  const [gameUrl, setGameUrl] = useState("");
  const [betweenUrl, setBetweenUrl] = useState("");
  const [assetsBase, setAssetsBase] = useState("");
  const [games, setGames] = useState<GamePack[]>([]);
  const [toast, setToast] = useState<Toast>(null);
  const [restartNotice, setRestartNotice] = useState(false);
  const [token, setToken] = useState("");
  const [playerPresets, setPlayerPresets] = useState<PlayerPreset[]>([]);
  const [casterPresets, setCasterPresets] = useState<CasterPreset[]>([]);
  const [layoutRegistry, setLayoutRegistry] = useState<LayoutRegistry>({});
  const [hotkeyConfig, setHotkeyConfig] = useState<HotkeyConfig>({ enabled: false, bindings: {} });
  const [activeTab, setActiveTab] = useState<TabId>("player");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSets, setPickerSets] = useState<StartggSet[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerTournament, setPickerTournament] = useState("");
  const pickerUrlRef = useRef("");

  const [disambigOpen, setDisambigOpen] = useState(false);
  const [disambigAmbiguities, setDisambigAmbiguities] = useState<Ambiguity[]>([]);
  const disambigSetRef = useRef<StartggSet | null>(null);

  const flash = (kind: ToastKind, message: string) => setToast({ kind, message });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    Promise.all([
      GetState(),
      GetConfig(),
      GameOverlayURL(),
      BetweenOverlayURL(),
      AssetsBaseURL(),
      ListGames(),
      GetLayoutRegistry(),
      GetSecrets(),
      ListPlayerPresets(),
      ListCasterPresets(),
      GetHotkeyConfig(),
    ])
      .then(([s, c, gu, bu, a, g, lr, sec, pp, cp, hk]) => {
        const st = s as unknown as StreamState;
        setSt(st);
        setCfg(c as unknown as OutputConfig);
        setGameUrl(gu);
        setBetweenUrl(bu);
        setAssetsBase(a);
        setGames((g ?? []) as unknown as GamePack[]);
        setLayoutRegistry((lr ?? {}) as unknown as LayoutRegistry);
        setToken((sec as any)?.startggToken ?? "");
        setPlayerPresets((pp ?? []) as unknown as PlayerPreset[]);
        setCasterPresets((cp ?? []) as unknown as CasterPreset[]);
        setHotkeyConfig((hk as unknown as HotkeyConfig) ?? { enabled: false, bindings: {} });
        ResizeWindow(1280, heightForFormat(st.setInfo.format));
      })
      .catch((e) => flash("err", "Failed to load: " + e));
  }, []);

  const loadedRef = useRef(false);
  const fromGoRef = useRef(false);
  useEffect(() => {
    if (!state) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    if (fromGoRef.current) {
      fromGoRef.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await SetState(state as any);
        await Update();
      } catch (e: any) {
        flash("err", "Error: " + e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const cancel = EventsOn("state:changed", (newState: StreamState) => {
      fromGoRef.current = true;
      setSt(newState as unknown as StreamState);
    });
    return cancel;
  }, []);

  const hotkeyRef = useRef(hotkeyConfig);
  hotkeyRef.current = hotkeyConfig;
  useEffect(() => {
    const formatCombo = (e: KeyboardEvent): string => {
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Meta");
      const key = e.code;
      if (!["ControlLeft","ControlRight","AltLeft","AltRight","ShiftLeft","ShiftRight","MetaLeft","MetaRight"].includes(key)) {
        let name = key;
        if (key.startsWith("Key")) name = key.slice(3);
        else if (key.startsWith("Digit")) name = key.slice(5);
        else if (key.startsWith("Numpad")) name = "Num" + key.slice(6);
        parts.push(name);
      }
      return parts.join("+");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const cfg = hotkeyRef.current;
      if (!cfg.enabled) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (target.isContentEditable) return;

      const combo = formatCombo(e);
      if (!combo) return;

      for (const [action, binding] of Object.entries(cfg.bindings)) {
        if (binding === combo) {
          e.preventDefault();
          ExecuteHotkeyAction(action);
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!state || !config) {
    return <div className="loading">Loading…</div>;
  }

  const commitConfig = (next: OutputConfig) => {
    const portChanged = next.httpPort !== config.httpPort;
    const serverChanged = next.enableServer !== config.enableServer;
    setCfg(next);
    SetConfig(next as any)
      .then(() => {
        if (portChanged || serverChanged) setRestartNotice(true);
      })
      .catch((e) => flash("err", "Error saving config: " + e));
  };

  const onPickGame = (id: string) => {
    const pack = games.find((g) => g.id === id);
    let appearance = { ...config.overlayAppearance };
    const packARs = pack?.aspectRatios ?? [];
    if (packARs.length > 0 && !packARs.includes(appearance.gameAspect)) {
      appearance.gameAspect = packARs[0];
    }
    const validLayouts = layoutRegistry[appearance.gameAspect] ?? [];
    if (validLayouts.length > 0 && !validLayouts.includes(appearance.layout)) {
      appearance.layout = validLayouts[0];
    }
    commitConfig({ ...config, game: id, overlayAppearance: appearance });
    setSt((prev) =>
      prev
        ? {
            ...prev,
            scoreEntities: prev.scoreEntities.map((e) => ({
              ...e,
              players: e.players.map((p) => ({
                ...p,
                character: "",
                costume: 0,
              })),
            })),
          }
        : prev,
    );
  };

  const portPalette = portPaletteFor(findPack(games, config.game));

  const onSetInfoChange = (si: SetInfo) => {
    let entities = state.scoreEntities;
    if (si.format !== state.setInfo.format) {
      entities = reshapeForFormat(entities, si.format, portPalette);
      ResizeWindow(1280, heightForFormat(si.format));
    }
    if (si.bestOf !== state.setInfo.bestOf) {
      entities = clampScores(entities, si.bestOf);
    }
    setSt({ ...state, setInfo: si, scoreEntities: entities });
  };

  const onTournamentUrlChange = (v: string) => {
    setCfg({ ...config, startggTournamentUrl: v });
  };
  const onTournamentUrlBlur = async () => {
    commitConfig(config);
    const url = (config.startggTournamentUrl ?? "").trim();
    if (!url) return;
    try {
      const t = await FetchStartggTournament(url);
      const name = (t as any)?.name ?? "";
      if (!name) return;
      setSt((prev) =>
        prev
          ? { ...prev, setInfo: { ...prev.setInfo, tournamentName: name } }
          : prev,
      );
    } catch {
      // Stay quiet — the user might still be typing the URL, or the
      // token might not be set yet. Pick Set will surface the error.
    }
  };

  const doPickerFetch = async (url?: string) => {
    const fetchUrl = url ?? config.startggTournamentUrl ?? "";
    setPickerLoading(true);
    setPickerError(null);
    setPickerSets([]);
    try {
      const res = await FetchStartggSets(fetchUrl);
      setPickerSets((res?.sets ?? []) as unknown as StartggSet[]);
      setPickerTournament(res?.tournament?.name ?? "");
      pickerUrlRef.current = fetchUrl;
    } catch (e: any) {
      setPickerError(String(e?.message ?? e));
    } finally {
      setPickerLoading(false);
    }
  };

  const onPickSet = async () => {
    setPickerOpen(true);
    const url = config.startggTournamentUrl ?? "";
    if (pickerSets.length > 0 && pickerUrlRef.current === url) return;
    await doPickerFetch(url);
  };
  const onSelectSet = (s: StartggSet) => {
    const ambiguities = collectAmbiguities(s, playerPresets);
    if (ambiguities.length > 0) {
      disambigSetRef.current = s;
      setDisambigAmbiguities(ambiguities);
      setPickerOpen(false);
      setDisambigOpen(true);
      return;
    }
    setSt(
      applyStartggSet(state, pickerTournament, s, playerPresets, portPalette),
    );
    setPickerOpen(false);
  };

  const onDisambigConfirm = (overrides: Map<number, PlayerPreset>) => {
    const s = disambigSetRef.current;
    if (s) {
      setSt(
        applyStartggSet(state, pickerTournament, s, playerPresets, portPalette, overrides),
      );
    }
    setDisambigOpen(false);
    disambigSetRef.current = null;
  };

  const onClear = async () => {
    try {
      const s = (await ClearState()) as unknown as StreamState;
      setSt(s);
      ResizeWindow(1280, heightForFormat(s.setInfo.format));
    } catch (e: any) {
      flash("err", "Error: " + e);
    }
  };

  const onTokenChange = (v: string) => setToken(v);
  const onTokenBlur = () => {
    SetSecrets({ startggToken: token } as any)
      .then(() => flash("ok", "Token saved"))
      .catch((e) => flash("err", "Error saving token: " + e));
  };

  const onAddPlayerPreset = () => {
    setPlayerPresets([...playerPresets, { id: "", name: "", gameId: config.game || undefined }]);
  };
  const onSavePlayerPresetRow = async (p: PlayerPreset) => {
    try {
      const saved = (await SavePlayerPreset(
        p as any,
      )) as unknown as PlayerPreset;
      const next = [...playerPresets];
      const idx = p.id
        ? next.findIndex((x) => x.id === p.id)
        : next.findIndex((x) => !x.id && x.name === p.name);
      if (idx >= 0) next[idx] = saved;
      else next.push(saved);
      setPlayerPresets(next);
      flash("ok", "Saved player preset");
    } catch (e: any) {
      flash("err", "Error: " + e);
    }
  };
  const onDeletePlayerPresetRow = async (id: string) => {
    try {
      await DeletePlayerPreset(id);
      setPlayerPresets(playerPresets.filter((p) => p.id !== id));
    } catch (e: any) {
      flash("err", "Error: " + e);
    }
  };

  const onAddCasterPreset = () => {
    setCasterPresets([...casterPresets, { id: "", name: "", socials: [] }]);
  };
  const onSaveCasterPresetRow = async (c: CasterPreset) => {
    try {
      const saved = (await SaveCasterPreset(
        c as any,
      )) as unknown as CasterPreset;
      const next = [...casterPresets];
      const idx = c.id
        ? next.findIndex((x) => x.id === c.id)
        : next.findIndex((x) => !x.id && x.name === c.name);
      if (idx >= 0) next[idx] = saved;
      else next.push(saved);
      setCasterPresets(next);
      flash("ok", "Saved caster preset");
    } catch (e: any) {
      flash("err", "Error: " + e);
    }
  };
  const onDeleteCasterPresetRow = async (id: string) => {
    try {
      await DeleteCasterPreset(id);
      setCasterPresets(casterPresets.filter((c) => c.id !== id));
    } catch (e: any) {
      flash("err", "Error: " + e);
    }
  };

  const onSavePlayerAsPreset = (player: Player, portColor: string) => {
    if (!player.name) return;
    const existing = playerPresets.find(p => {
      const idMatch = player.startggPlayerId && p.startggPlayerId === player.startggPlayerId;
      const nameMatch = p.name.toLowerCase() === player.name.toLowerCase();
      if (!idMatch && !nameMatch) return false;
      if (player.character) return p.character === player.character || !p.character;
      return true;
    });
    void onSavePlayerPresetRow({
      id: existing?.id ?? '',
      name: player.name,
      pronouns: player.pronouns,
      prefix: player.prefix,
      aliases: existing?.aliases ?? [],
      gameId: existing?.gameId || config.game || undefined,
      character: player.character || undefined,
      costume: player.costume > 0 ? player.costume : undefined,
      startggPlayerId: player.startggPlayerId,
      portColor: portColor || undefined,
    });
  };

  const onSaveCasterAsPreset = (caster: Caster) => {
    if (!caster.name) return;
    const existing = casterPresets.find(p =>
      p.name.toLowerCase() === caster.name.toLowerCase()
    );
    void onSaveCasterPresetRow({
      id: existing?.id ?? '',
      name: caster.name,
      pronouns: caster.pronouns,
      socials: caster.socials ?? [],
    });
  };

  const copyUrl = (label: string, url: string) => {
    navigator.clipboard.writeText(url);
    flash("ok", `Copied ${label} URL`);
  };

  const activePack = findPack(games, config.game);
  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  // ----- Sidebar status pill state ----------------------------------------
  // Steady state: server enabled/disabled. Layered: restart notice when
  // port/enable-server changed since the last save.
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
  } else if (!config.enableServer) {
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
        <span>Port {config.httpPort}</span>
      </>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-eyebrow">
            {activePack ? activePack.shortName ?? activePack.name : "No game"}
          </span>
          <span className="sidebar-brand-name">StreamFighter</span>
        </div>

        <nav aria-label="Section">
          <ul className="sidebar-nav">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="nav-item"
                  aria-current={activeTab === t.id ? "page" : undefined}
                  onClick={() => setActiveTab(t.id)}
                  title={t.label}
                >
                  <Icon name={t.icon} width={18} height={18} className="nav-icon" />
                  <span className="nav-label">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className={statusClass}>{statusBody}</div>

          <label>
            <span className="sidebar-footer-label">Game pack</span>
            <select
              className="sidebar-game-select"
              value={config.game}
              onChange={(e) => onPickGame(e.target.value)}
              aria-label="Game"
            >
              <option value="">— Game —</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>

      <div className="main">
        <header className="appbar">
          <h1 className="appbar-title">{activeTabMeta.label}</h1>
          <div className="appbar-urls">
            {[
              { label: "Game", url: gameUrl },
              { label: "Between", url: betweenUrl },
            ].map(({ label, url }) => (
              <div key={label} className="url-chip" title={url}>
                <span className="url-chip-label">{label}</span>
                <code>{url}</code>
                <button
                  className="url-action"
                  title="Copy link"
                  onClick={() => copyUrl(label, url)}
                >
                  <Icon name="copy" width={14} height={14} />
                </button>
                <button
                  className="url-action"
                  title="Open in browser"
                  onClick={() => BrowserOpenURL(url)}
                >
                  <Icon name="open" width={14} height={14} />
                </button>
              </div>
            ))}
          </div>
        </header>

        {activeTab === "player" && (
          <main className="content" role="tabpanel">
            <div className="player-info-layout">
              <div className="player-info-board">
                <ScoreEntitiesEditor
                  value={state.scoreEntities}
                  onChange={(se) => setSt({ ...state, scoreEntities: se })}
                  canResize={canResize(state.setInfo.format)}
                  format={state.setInfo.format}
                  bestOf={state.setInfo.bestOf}
                  games={games}
                  gameId={config.game}
                  assetsBase={assetsBase}
                  presets={playerPresets}
                  onSavePlayerAsPreset={onSavePlayerAsPreset}
                />
              </div>
              <div className="player-info-side">
                <SetInfoEditor
                  value={state.setInfo}
                  onChange={onSetInfoChange}
                  tournamentUrl={config.startggTournamentUrl ?? ""}
                  onTournamentUrlChange={onTournamentUrlChange}
                  onTournamentUrlBlur={onTournamentUrlBlur}
                  onPickSet={onPickSet}
                  onClear={onClear}
                />
                <CastersEditor
                  value={state.casters}
                  onChange={(c) => setSt({ ...state, casters: c })}
                  presets={casterPresets}
                  onSaveCasterAsPreset={onSaveCasterAsPreset}
                />
              </div>
            </div>
          </main>
        )}

        {activeTab === "presets" && (
          <main className="content" role="tabpanel">
            <PresetsEditor
              players={playerPresets}
              casters={casterPresets}
              games={games}
              gameId={config.game}
              assetsBase={assetsBase}
              onSavePlayer={onSavePlayerPresetRow}
              onDeletePlayer={onDeletePlayerPresetRow}
              onAddPlayer={onAddPlayerPreset}
              onChangePlayers={setPlayerPresets}
              onSaveCaster={onSaveCasterPresetRow}
              onDeleteCaster={onDeleteCasterPresetRow}
              onAddCaster={onAddCasterPreset}
              onChangeCasters={setCasterPresets}
            />
          </main>
        )}

        {activeTab === "overlay" && (
          <main className="content" role="tabpanel">
            <OverlayEditor
              value={config.overlayAppearance}
              onChange={(a) => setCfg({ ...config, overlayAppearance: a })}
              onCommit={(a) =>
                commitConfig({ ...config, overlayAppearance: a })
              }
              gameId={config.game}
              games={games}
              layoutRegistry={layoutRegistry}
            />
          </main>
        )}

        {activeTab === "output" && (
          <main className="content" role="tabpanel">
            <OutputSettings
              value={config}
              onChange={setCfg}
              onCommit={commitConfig}
            />
          </main>
        )}

        {activeTab === "hotkeys" && (
          <main className="content" role="tabpanel">
            <HotkeysEditor
              value={hotkeyConfig}
              onChange={setHotkeyConfig}
              onCommit={(hk) => {
                setHotkeyConfig(hk);
                SetHotkeyConfig(hk as any).catch((e) =>
                  flash("err", "Error saving hotkeys: " + e)
                );
              }}
            />
          </main>
        )}

        {activeTab === "system" && (
          <main className="content" role="tabpanel">
            <SystemSettings
              value={config}
              onChange={setCfg}
              onCommit={commitConfig}
              startggToken={token}
              onTokenChange={onTokenChange}
              onTokenBlur={onTokenBlur}
            />
          </main>
        )}
      </div>

      {toast && (
        <div className={`toast is-${toast.kind}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <SetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectSet}
        loading={pickerLoading}
        error={pickerError}
        sets={pickerSets}
        tournamentName={pickerTournament}
        onReload={() => doPickerFetch()}
      />

      <PresetDisambiguator
        open={disambigOpen}
        onClose={() => setDisambigOpen(false)}
        onConfirm={onDisambigConfirm}
        ambiguities={disambigAmbiguities}
        gameId={config.game}
        games={games}
        assetsBase={assetsBase}
      />
    </div>
  );
}

export default App;
