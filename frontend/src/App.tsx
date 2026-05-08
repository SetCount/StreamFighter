import { useEffect, useRef, useState } from 'react';
import {
    GetState, SetState, GetConfig, SetConfig, OverlayURL, Update,
} from '../wailsjs/go/main/App';
import type { StreamState, OutputConfig, SetInfo } from './types';
import { reshapeForFormat, canResize, clampScores } from './reshape';
import SetInfoEditor from './components/SetInfoEditor';
import ScoreEntitiesEditor from './components/ScoreEntitiesEditor';
import CastersEditor from './components/CastersEditor';
import ConfigEditor from './components/ConfigEditor';
import './App.css';

function App() {
    const [state, setSt] = useState<StreamState | null>(null);
    const [config, setCfg] = useState<OutputConfig | null>(null);
    const [overlayUrl, setOverlayUrl] = useState('');
    const [status, setStatus] = useState('');
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        Promise.all([GetState(), GetConfig(), OverlayURL()])
            .then(([s, c, u]) => {
                setSt(s as unknown as StreamState);
                setCfg(c as unknown as OutputConfig);
                setOverlayUrl(u);
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

    const openSettings = () => dialogRef.current?.showModal();
    const closeSettings = () => dialogRef.current?.close();

    return (
        <div className="app">
            <header className="topbar">
                <h1>StreamAssist</h1>
                <div className="overlay-url">
                    OBS source: <code>{overlayUrl}</code>
                </div>
                <button className="settings-btn" onClick={openSettings}>Settings</button>
                <button className="update-btn" onClick={onUpdate}>Update</button>
            </header>
            <div className="status-bar" aria-live="polite">{status}</div>

            <main className="content">
                <div className="layout-grid">
                    <div className="layout-main">
                        <SetInfoEditor
                            value={state.setInfo}
                            onChange={onSetInfoChange}
                        />
                        <div className="board">
                            <ScoreEntitiesEditor
                                value={state.scoreEntities}
                                onChange={se => setSt({ ...state, scoreEntities: se })}
                                canResize={canResize(state.setInfo.format)}
                                format={state.setInfo.format}
                                bestOf={state.setInfo.bestOf}
                            />
                        </div>
                    </div>
                    <CastersEditor
                        value={state.casters}
                        onChange={c => setSt({ ...state, casters: c })}
                    />
                </div>
            </main>

            <dialog ref={dialogRef} className="settings-dialog">
                <ConfigEditor
                    value={config}
                    onChange={setCfg}
                    onSave={onSaveConfig}
                    onClose={closeSettings}
                />
            </dialog>
        </div>
    );
}

export default App;
