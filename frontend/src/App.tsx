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
  GetSecrets,
  SetSecrets,
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
  Caster,
  Player,
  PlayerPreset,
  CasterPreset,
  StartggSet,
} from "./types";
import { reshapeForFormat, canResize, clampScores } from "./reshape";
import { applyStartggSet, collectAmbiguities } from "./startgg";
import type { Ambiguity } from "./startgg";
import { findPack } from "./assets";
import { portPaletteFor } from "./portColors";
import SetInfoEditor from "./components/SetInfoEditor";
import ScoreEntitiesEditor from "./components/ScoreEntitiesEditor";
import CastersEditor from "./components/CastersEditor";
import ConfigEditor from "./components/ConfigEditor";
import OverlayEditor from "./components/OverlayEditor";
import PresetsEditor from "./components/PresetsEditor";
import SetPicker from "./components/SetPicker";
import PresetDisambiguator from "./components/PresetDisambiguator";
import { BrowserOpenURL } from "../wailsjs/runtime/runtime";
import "./App.css";

function heightForFormat(format: string): number {
  if (format === "2v2") return 1400;
  if (format === "1v1") return 800;
  return 850;
}

function App() {
  const [state, setSt] = useState<StreamState | null>(null);
  const [config, setCfg] = useState<OutputConfig | null>(null);
  const [gameUrl, setGameUrl] = useState("");
  const [betweenUrl, setBetweenUrl] = useState("");
  const [assetsBase, setAssetsBase] = useState("");
  const [games, setGames] = useState<GamePack[]>([]);
  const [status, setStatus] = useState("");
  const [token, setToken] = useState("");
  const [playerPresets, setPlayerPresets] = useState<PlayerPreset[]>([]);
  const [casterPresets, setCasterPresets] = useState<CasterPreset[]>([]);
  const [activeTab, setActiveTab] = useState<"player" | "presets" | "output" | "appearance">(
    "player",
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSets, setPickerSets] = useState<StartggSet[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerTournament, setPickerTournament] = useState("");
  const pickerUrlRef = useRef("");

  const [disambigOpen, setDisambigOpen] = useState(false);
  const [disambigAmbiguities, setDisambigAmbiguities] = useState<Ambiguity[]>([]);
  const disambigSetRef = useRef<StartggSet | null>(null);

  useEffect(() => {
    Promise.all([
      GetState(),
      GetConfig(),
      GameOverlayURL(),
      BetweenOverlayURL(),
      AssetsBaseURL(),
      ListGames(),
      GetSecrets(),
      ListPlayerPresets(),
      ListCasterPresets(),
    ])
      .then(([s, c, gu, bu, a, g, sec, pp, cp]) => {
        const st = s as unknown as StreamState;
        setSt(st);
        setCfg(c as unknown as OutputConfig);
        setGameUrl(gu);
        setBetweenUrl(bu);
        setAssetsBase(a);
        setGames((g ?? []) as unknown as GamePack[]);
        setToken((sec as any)?.startggToken ?? "");
        setPlayerPresets((pp ?? []) as unknown as PlayerPreset[]);
        setCasterPresets((cp ?? []) as unknown as CasterPreset[]);
        ResizeWindow(1280, heightForFormat(st.setInfo.format));
      })
      .catch((e) => setStatus("Failed to load: " + e));
  }, []);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (!state) return;
    if (!loadedRef.current) {
      loadedRef.current = true;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await SetState(state as any);
        await Update();
      } catch (e: any) {
        setStatus("Error: " + e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [state]);

  if (!state || !config) {
    return <div className="loading">Loading…</div>;
  }

  const commitConfig = (next: OutputConfig) => {
    const portChanged = next.httpPort !== config.httpPort;
    const serverChanged = next.enableServer !== config.enableServer;
    setCfg(next);
    SetConfig(next as any)
      .then(() => {
        if (portChanged || serverChanged) {
          setStatus("Saved — port/server changes need restart");
        } else {
          setStatus("");
        }
      })
      .catch((e) => setStatus("Error saving config: " + e));
  };

  const onPickGame = (id: string) => {
    commitConfig({ ...config, game: id });
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
      setStatus("Error: " + e);
    }
  };

  const onTokenChange = (v: string) => setToken(v);
  const onTokenBlur = () => {
    SetSecrets({ startggToken: token } as any).catch((e) =>
      setStatus("Error saving token: " + e),
    );
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
      setStatus("Saved player preset");
    } catch (e: any) {
      setStatus("Error: " + e);
    }
  };
  const onDeletePlayerPresetRow = async (id: string) => {
    try {
      await DeletePlayerPreset(id);
      setPlayerPresets(playerPresets.filter((p) => p.id !== id));
    } catch (e: any) {
      setStatus("Error: " + e);
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
      setStatus("Saved caster preset");
    } catch (e: any) {
      setStatus("Error: " + e);
    }
  };
  const onDeleteCasterPresetRow = async (id: string) => {
    try {
      await DeleteCasterPreset(id);
      setCasterPresets(casterPresets.filter((c) => c.id !== id));
    } catch (e: any) {
      setStatus("Error: " + e);
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

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "player", label: "Player Info" },
    { id: "presets", label: "Presets" },
    { id: "output", label: "Output" },
    { id: "appearance", label: "Appearance" },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="overlay-urls">
            {[
              { label: "Game", url: gameUrl },
              { label: "Between", url: betweenUrl },
            ].map(({ label, url }) => (
              <div key={label} className="overlay-url-row">
                <span className="overlay-url-label">{label}:</span>
                <code>{url}</code>
                <button
                  className="url-action"
                  title="Copy link"
                  onClick={() => {
                    navigator.clipboard.writeText(url);
                    setStatus(`Copied ${label} URL`);
                  }}
                >
                  <Icon name="copy" width={18} height={18} />
                </button>
                <button
                  className="url-action"
                  title="Open in browser"
                  onClick={() => BrowserOpenURL(url)}
                >
                  <Icon name="open" width={18} height={18} />
                </button>
              </div>
            ))}
          </div>
        <select
          className="game-select"
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
      </header>

      <nav className="tabs" role="tablist" aria-label="Section">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {status ? (
        <div className="status-bar" aria-live="polite">
          {status}
        </div>
      ) : (
        <></>
      )}

      {activeTab === "player" && (
        <main className="content" role="tabpanel">
          <div className="content-actions">
            <button className="clear-btn" onClick={onClear}>Clear</button>
          </div>
          <div className="layout-grid">
            <div>
              <SetInfoEditor
                value={state.setInfo}
                onChange={onSetInfoChange}
                tournamentUrl={config.startggTournamentUrl ?? ""}
                onTournamentUrlChange={onTournamentUrlChange}
                onTournamentUrlBlur={onTournamentUrlBlur}
                onPickSet={onPickSet}
              />
              <CastersEditor
                value={state.casters}
                onChange={(c) => setSt({ ...state, casters: c })}
                presets={casterPresets}
                onSaveCasterAsPreset={onSaveCasterAsPreset}
              />
            </div>

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

      {activeTab === "output" && (
        <main className="content" role="tabpanel">
          <ConfigEditor
            value={config}
            onChange={setCfg}
            onCommit={commitConfig}
            startggToken={token}
            onTokenChange={onTokenChange}
            onTokenBlur={onTokenBlur}
          />
        </main>
      )}

      {activeTab === "appearance" && (
        <main className="content" role="tabpanel">
          <OverlayEditor
            value={config.overlayAppearance}
            onChange={(a) => setCfg({ ...config, overlayAppearance: a })}
            onCommit={(a) =>
              commitConfig({ ...config, overlayAppearance: a })
            }
          />
        </main>
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
