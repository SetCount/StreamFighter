import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "./icons";
import {
  GetState,
  GetConfig,
  ClearState,
  SetConfig,
  Update,
  GameOverlayURL,
  BetweenOverlayURL,
  AssetsBaseURL,
  ListGames,
  ReloadGames,
  OpenGamesDir,
  GetLayoutRegistry,
  GetSecrets,
  SetSecrets,
  GetHotkeyConfig,
  SetHotkeyConfig,
  ListPlayerPresets,
  SavePlayerPreset,
  DeletePlayerPreset,
  ListCasterPresets,
  SaveCasterPreset,
  DeleteCasterPreset,
  FetchStartggSets,
  FetchStartggTournament,
  CheckUpdate,
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
  UpdateInfo,
} from "./types";
import { reshapeForFormat, canResize, clampScores } from "./reshape";
import { applyStartggSet, collectAmbiguities } from "./startgg";
import type { Ambiguity } from "./startgg";
import { findPack } from "./assets";
import { portPaletteFor } from "./portColors";
import SetInfoEditor from "./components/SetInfoEditor";
import ScoreEntitiesEditor from "./components/ScoreEntitiesEditor";
import CastersEditor from "./components/CastersEditor";
import SystemSettings from "./components/SystemSettings";
import OverlayEditor from "./components/OverlayEditor";
import PresetsEditor from "./components/PresetsEditor";
import HotkeysEditor from "./components/HotkeysEditor";
import SetPicker from "./components/SetPicker";
import PresetDisambiguator from "./components/PresetDisambiguator";
import { Sidebar } from "./components/Sidebar";
import { BrowserOpenURL } from "../wailsjs/runtime/runtime";
import { useWindowResize } from "./hooks/useWindowResize";
import { useHotkeyListener } from "./hooks/useHotkeyListener";
import { useAutoSave } from "./hooks/useAutoSave";
import "./App.css";

type TabId = "player" | "presets" | "overlay" | "hotkeys" | "system";

export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "player", label: "Player Info", icon: "player" },
  { id: "presets", label: "Presets", icon: "presets" },
  { id: "overlay", label: "Overlay", icon: "overlay" },
  { id: "hotkeys", label: "Hotkeys", icon: "hotkeys" },
  { id: "system", label: "System", icon: "system" },
];

type ToastKind = "info" | "ok" | "warn" | "err";
type Toast = { kind: ToastKind; message: string } | null;

function App() {
  const [state, setSt] = useState<StreamState | null>(null);
  const [config, setCfg] = useState<OutputConfig | null>(null);
  const [gameUrl, setGameUrl] = useState("");
  const [betweenUrl, setBetweenUrl] = useState("");
  const [assetsBase, setAssetsBase] = useState("");
  const [games, setGames] = useState<GamePack[]>([]);
  const [restartNotice, setRestartNotice] = useState(false);
  const [token, setToken] = useState("");
  const [playerPresets, setPlayerPresets] = useState<PlayerPreset[]>([]);
  const [casterPresets, setCasterPresets] = useState<CasterPreset[]>([]);
  const [layoutRegistry, setLayoutRegistry] = useState<LayoutRegistry>({});
  const [hotkeyConfig, setHotkeyConfig] = useState<HotkeyConfig>({
    enabled: false,
    bindings: {},
  });
  const [activeTab, setActiveTab] = useState<TabId>("player");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSets, setPickerSets] = useState<StartggSet[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerTournament, setPickerTournament] = useState("");
  const pickerUrlRef = useRef("");

  const [disambigOpen, setDisambigOpen] = useState(false);
  const [disambigAmbiguities, setDisambigAmbiguities] = useState<Ambiguity[]>([]);
  const disambigSetRef = useRef<StartggSet | null>(null);

  const { flash, toast, setToast, useAutoSaveEffect, useGoStateSync } = useAutoSave();

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load initial data
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
      CheckUpdate(),
    ])
      .then(([s, c, gu, bu, a, g, lr, sec, pp, cp, hk, up]) => {
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
        setHotkeyConfig(
          (hk as unknown as HotkeyConfig) ?? { enabled: false, bindings: {} },
        );
        setUpdateInfo(up as unknown as UpdateInfo);
      })
      .catch((e) => flash("err", "Failed to load: " + e));
  }, []);

  // Auto-save state changes
  useAutoSaveEffect(state);

  // Sync Go-side state changes
  useGoStateSync(setSt);

  // Hotkey listener
  useHotkeyListener(hotkeyConfig);

  // Window resize
  const appRef = useWindowResize();

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

  const onOpenGamesDir = () => {
    OpenGamesDir().catch((e) =>
      flash("err", "Couldn't open games folder: " + e),
    );
  };

  const onReloadGames = () => {
    ReloadGames()
      .then((g) => {
        setGames((g ?? []) as unknown as GamePack[]);
        flash("ok", "Refreshed game packs");
      })
      .catch((e) => flash("err", "Couldn't refresh packs: " + e));
  };

  const portPalette = portPaletteFor(findPack(games, config.game));

  const onSetInfoChange = (si: SetInfo) => {
    let entities = state.scoreEntities;
    if (si.format !== state.setInfo.format) {
      entities = reshapeForFormat(entities, si.format, portPalette);
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
      // Stay quiet — the user might still be typing the URL
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
        applyStartggSet(
          state,
          pickerTournament,
          s,
          playerPresets,
          portPalette,
          overrides,
        ),
      );
    }
    setDisambigOpen(false);
    disambigSetRef.current = null;
  };

  const onClear = async () => {
    try {
      const s = (await ClearState()) as unknown as StreamState;
      setSt(s);
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
    setPlayerPresets([
      ...playerPresets,
      { id: "", name: "", gameId: config.game || undefined },
    ]);
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
    const existing = playerPresets.find((p) => {
      const idMatch =
        player.startggPlayerId && p.startggPlayerId === player.startggPlayerId;
      const nameMatch = p.name.toLowerCase() === player.name.toLowerCase();
      if (!idMatch && !nameMatch) return false;
      if (player.character)
        return p.character === player.character || !p.character;
      return true;
    });
    void onSavePlayerPresetRow({
      id: existing?.id ?? "",
      gameId: existing?.gameId || config.game || undefined,
      name: player.name,
      pronouns: player.pronouns,
      prefix: player.prefix,
      aliases: existing?.aliases ?? [],
      character: player.character || undefined,
      costume: player.costume > 0 ? player.costume : undefined,
      startggPlayerId: player.startggPlayerId,
      portColor: portColor || undefined,
    });
  };

  const onSaveCasterAsPreset = (caster: Caster) => {
    if (!caster.name) return;
    const existing = casterPresets.find(
      (p) => p.name.toLowerCase() === caster.name.toLowerCase(),
    );
    void onSaveCasterPresetRow({
      id: existing?.id ?? "",
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

  return (
    <div className="app" ref={appRef}>
      <Sidebar
        activePack={activePack}
        configGame={config.game}
        activeTab={activeTab}
        games={games}
        updateInfo={updateInfo}
        restartNotice={restartNotice}
        configEnableServer={config.enableServer}
        configHttpPort={config.httpPort}
        onTabClick={(id) => setActiveTab(id as TabId)}
        onPickGame={onPickGame}
        onOpenGamesDir={onOpenGamesDir}
        onReloadGames={onReloadGames}
      />

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
              <SetInfoEditor
                value={state.setInfo}
                onChange={onSetInfoChange}
                tournamentUrl={config.startggTournamentUrl ?? ""}
                onTournamentUrlChange={onTournamentUrlChange}
                onTournamentUrlBlur={onTournamentUrlBlur}
                onPickSet={onPickSet}
                onClear={onClear}
              />
              <div className="player-info-row">
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

        {activeTab === "hotkeys" && (
          <main className="content" role="tabpanel">
            <HotkeysEditor
              value={hotkeyConfig}
              onChange={setHotkeyConfig}
              onCommit={(hk) => {
                setHotkeyConfig(hk);
                SetHotkeyConfig(hk as any).catch((e) =>
                  flash("err", "Error saving hotkeys: " + e),
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
