import { useEffect, useRef, useState } from 'react';
import {
    GetState, SetState, GetConfig, SetConfig, OverlayURL, AssetsBaseURL, Update, ListGames,
    GetSecrets, SetSecrets,
    ListPlayerPresets, SavePlayerPreset, DeletePlayerPreset,
    ListCasterPresets, SaveCasterPreset, DeleteCasterPreset,
    FetchStartggSets, FetchStartggTournament,
} from '../wailsjs/go/main/App';
import type {
    StreamState, OutputConfig, SetInfo, GamePack,
    PlayerPreset, CasterPreset, StartggSet,
} from './types';
import { reshapeForFormat, canResize, clampScores } from './reshape';
import { applyStartggSet } from './startgg';
import SetInfoEditor from './components/SetInfoEditor';
import ScoreEntitiesEditor from './components/ScoreEntitiesEditor';
import CastersEditor from './components/CastersEditor';
import ConfigEditor from './components/ConfigEditor';
import PresetsEditor from './components/PresetsEditor';
import SetPicker from './components/SetPicker';
import './App.css';

function App() {
    const [state, setSt] = useState<StreamState | null>(null);
    const [config, setCfg] = useState<OutputConfig | null>(null);
    const [overlayUrl, setOverlayUrl] = useState('');
    const [assetsBase, setAssetsBase] = useState('');
    const [games, setGames] = useState<GamePack[]>([]);
    const [status, setStatus] = useState('');
    const [token, setToken] = useState('');
    const [playerPresets, setPlayerPresets] = useState<PlayerPreset[]>([]);
    const [casterPresets, setCasterPresets] = useState<CasterPreset[]>([]);

    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSets, setPickerSets] = useState<StartggSet[]>([]);
    const [pickerLoading, setPickerLoading] = useState(false);
    const [pickerError, setPickerError] = useState<string | null>(null);
    const [pickerTournament, setPickerTournament] = useState('');

    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        Promise.all([
            GetState(), GetConfig(), OverlayURL(), AssetsBaseURL(), ListGames(),
            GetSecrets(), ListPlayerPresets(), ListCasterPresets(),
        ])
            .then(([s, c, u, a, g, sec, pp, cp]) => {
                setSt(s as unknown as StreamState);
                setCfg(c as unknown as OutputConfig);
                setOverlayUrl(u);
                setAssetsBase(a);
                setGames((g ?? []) as unknown as GamePack[]);
                setToken((sec as any)?.startggToken ?? '');
                setPlayerPresets((pp ?? []) as unknown as PlayerPreset[]);
                setCasterPresets((cp ?? []) as unknown as CasterPreset[]);
            })
            .catch(e => setStatus('Failed to load: ' + e));
    }, []);

    if (!state || !config) {
        return <div className="loading">Loading…</div>;
    }

    const onUpdate = async () => {
        setStatus('Updating…');
        try {
            await SetState(state as any);
            await Update();
            setStatus('Updated ' + new Date().toLocaleTimeString());
        } catch (e: any) {
            setStatus('Error: ' + e);
        }
    };

    const onSaveConfig = async () => {
        setStatus('Saving config…');
        try {
            await SetConfig(config as any);
            setStatus('Config saved (port/server changes need restart)');
        } catch (e: any) {
            setStatus('Error: ' + e);
        }
    };

    const onPickGame = (id: string) => {
        const next = { ...config, game: id };
        setCfg(next);
        SetConfig(next as any).catch(e => setStatus('Error saving game: ' + e));
    };

    const onSetInfoChange = (si: SetInfo) => {
        let entities = state.scoreEntities;
        if (si.format !== state.setInfo.format) {
            entities = reshapeForFormat(entities, si.format);
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
        SetConfig(config as any).catch(e => setStatus('Error saving URL: ' + e));
        const url = (config.startggTournamentUrl ?? '').trim();
        if (!url) return;
        try {
            const t = await FetchStartggTournament(url);
            const name = (t as any)?.name ?? '';
            if (!name) return;
            setSt(prev => prev
                ? { ...prev, setInfo: { ...prev.setInfo, tournamentName: name } }
                : prev);
        } catch {
            // Stay quiet — the user might still be typing the URL, or the
            // token might not be set yet. Pick Set will surface the error.
        }
    };

    const onPickSet = async () => {
        setPickerOpen(true);
        setPickerLoading(true);
        setPickerError(null);
        setPickerSets([]);
        try {
            const res = await FetchStartggSets(config.startggTournamentUrl ?? '');
            setPickerSets((res?.sets ?? []) as unknown as StartggSet[]);
            setPickerTournament(res?.tournament?.name ?? '');
        } catch (e: any) {
            setPickerError(String(e?.message ?? e));
        } finally {
            setPickerLoading(false);
        }
    };
    const onSelectSet = (s: StartggSet) => {
        setSt(applyStartggSet(state, pickerTournament, s, playerPresets));
        setPickerOpen(false);
    };

    const onTokenChange = (v: string) => setToken(v);
    const onTokenBlur = () => {
        SetSecrets({ startggToken: token } as any)
            .catch(e => setStatus('Error saving token: ' + e));
    };

    const onAddPlayerPreset = () => {
        setPlayerPresets([...playerPresets, { id: '', name: '' }]);
    };
    const onSavePlayerPresetRow = async (p: PlayerPreset) => {
        try {
            const saved = await SavePlayerPreset(p as any) as unknown as PlayerPreset;
            const next = [...playerPresets];
            const idx = p.id
                ? next.findIndex(x => x.id === p.id)
                : next.findIndex(x => !x.id && x.name === p.name);
            if (idx >= 0) next[idx] = saved; else next.push(saved);
            setPlayerPresets(next);
            setStatus('Saved player preset');
        } catch (e: any) {
            setStatus('Error: ' + e);
        }
    };
    const onDeletePlayerPresetRow = async (id: string) => {
        try {
            await DeletePlayerPreset(id);
            setPlayerPresets(playerPresets.filter(p => p.id !== id));
        } catch (e: any) {
            setStatus('Error: ' + e);
        }
    };

    const onAddCasterPreset = () => {
        setCasterPresets([...casterPresets, { id: '', name: '', socials: [] }]);
    };
    const onSaveCasterPresetRow = async (c: CasterPreset) => {
        try {
            const saved = await SaveCasterPreset(c as any) as unknown as CasterPreset;
            const next = [...casterPresets];
            const idx = c.id
                ? next.findIndex(x => x.id === c.id)
                : next.findIndex(x => !x.id && x.name === c.name);
            if (idx >= 0) next[idx] = saved; else next.push(saved);
            setCasterPresets(next);
            setStatus('Saved caster preset');
        } catch (e: any) {
            setStatus('Error: ' + e);
        }
    };
    const onDeleteCasterPresetRow = async (id: string) => {
        try {
            await DeleteCasterPreset(id);
            setCasterPresets(casterPresets.filter(c => c.id !== id));
        } catch (e: any) {
            setStatus('Error: ' + e);
        }
    };

    const openSettings = () => dialogRef.current?.showModal();
    const closeSettings = () => dialogRef.current?.close();

    return (
        <div className="app">
            <header className="topbar">
                <div style={{ "display": "flex", "flexDirection": "column", "flexGrow": "1" }}>
                    <h1>StreamAssist</h1>
                    <div className="overlay-url">
                        OBS source: <code>{overlayUrl}</code>
                    </div>
                </div>
                <select
                    className="game-select"
                    value={config.game}
                    onChange={e => onPickGame(e.target.value)}
                    aria-label="Game"
                >
                    <option value="">— Game —</option>
                    {games.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
                <button className="settings-btn" onClick={openSettings}>Settings</button>
                <button className="update-btn" onClick={onUpdate}>Update</button>
            </header>
            <div className="status-bar" aria-live="polite">{status}</div>

            <main className="content">
                <SetInfoEditor
                    value={state.setInfo}
                    onChange={onSetInfoChange}
                    tournamentUrl={config.startggTournamentUrl ?? ''}
                    onTournamentUrlChange={onTournamentUrlChange}
                    onTournamentUrlBlur={onTournamentUrlBlur}
                    onPickSet={onPickSet}
                />
                <div className="layout-grid">
                    <div className="board">
                        <ScoreEntitiesEditor
                            value={state.scoreEntities}
                            onChange={se => setSt({ ...state, scoreEntities: se })}
                            canResize={canResize(state.setInfo.format)}
                            format={state.setInfo.format}
                            bestOf={state.setInfo.bestOf}
                            games={games}
                            gameId={config.game}
                            assetsBase={assetsBase}
                            presets={playerPresets}
                        />
                    </div>
                    <CastersEditor
                        value={state.casters}
                        onChange={c => setSt({ ...state, casters: c })}
                        presets={casterPresets}
                    />
                </div>
            </main>

            <dialog ref={dialogRef} className="settings-dialog">
                <ConfigEditor
                    value={config}
                    onChange={setCfg}
                    onSave={onSaveConfig}
                    onClose={closeSettings}
                    startggToken={token}
                    onTokenChange={onTokenChange}
                    onTokenBlur={onTokenBlur}
                />
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
            </dialog>

            <SetPicker
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onSelect={onSelectSet}
                loading={pickerLoading}
                error={pickerError}
                sets={pickerSets}
                tournamentName={pickerTournament}
            />
        </div>
    );
}

export default App;
