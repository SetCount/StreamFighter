import type { OutputConfig } from '../types';

type Props = {
    value: OutputConfig;
    onChange: (v: OutputConfig) => void;
    onSave: () => void;
    onClose?: () => void;
    startggToken: string;
    onTokenChange: (v: string) => void;
    onTokenBlur: () => void;
};

export default function ConfigEditor({
    value, onChange, onSave, onClose,
    startggToken, onTokenChange, onTokenBlur,
}: Props) {
    const set = (patch: Partial<OutputConfig>) => onChange({ ...value, ...patch });
    const setAppearance = (patch: Partial<OutputConfig['overlayAppearance']>) =>
        onChange({ ...value, overlayAppearance: { ...value.overlayAppearance, ...patch } });
    return (
        <fieldset className="config-editor">
            <legend>Output Config</legend>
            <div className="dialog-actions">
                <button onClick={onSave}>Save Config</button>
                {onClose && (
                    <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
                )}
            </div>
            <div className="grid">
                <label>
                    StartGG Token
                    <input
                        type="password"
                        autoComplete="off"
                        placeholder="from start.gg/admin/profile/developer"
                        value={startggToken}
                        onChange={e => onTokenChange(e.target.value)}
                        onBlur={onTokenBlur}
                    />
                </label>
                <label>
                    Output Directory
                    <input
                        value={value.outputDir}
                        onChange={e => set({ outputDir: e.target.value })}
                    />
                </label>
                <label>
                    Overlay HTML Path
                    <input
                        value={value.overlayPath}
                        onChange={e => set({ overlayPath: e.target.value })}
                    />
                </label>
                <label>
                    Games Directory
                    <input
                        value={value.gamesDir}
                        onChange={e => set({ gamesDir: e.target.value })}
                    />
                </label>
                <label>
                    Sponsors Directory
                    <input
                        value={value.sponsorsDir ?? ''}
                        onChange={e => set({ sponsorsDir: e.target.value })}
                    />
                </label>
                <label>
                    HTTP Port
                    <input
                        type="number"
                        value={value.httpPort}
                        onChange={e => set({ httpPort: Number(e.target.value) })}
                    />
                </label>
            </div>
            <fieldset>
                <legend>Sponsor Rotator</legend>
                <div className="grid">
                    <label>
                        Corner
                        <select
                            value={value.overlayAppearance.sponsorCorner ?? 'bottom-right'}
                            onChange={e => setAppearance({ sponsorCorner: e.target.value })}
                        >
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                        </select>
                    </label>
                    <label>
                        Interval (seconds)
                        <input
                            type="number"
                            min={1}
                            value={value.overlayAppearance.sponsorInterval ?? 5}
                            onChange={e => setAppearance({ sponsorInterval: Number(e.target.value) })}
                        />
                    </label>
                    <label>
                        Width (px)
                        <input
                            type="number"
                            min={0}
                            value={value.overlayAppearance.sponsorWidth ?? 200}
                            onChange={e => setAppearance({ sponsorWidth: Number(e.target.value) })}
                        />
                    </label>
                    <label>
                        Height (px, 0 = auto)
                        <input
                            type="number"
                            min={0}
                            value={value.overlayAppearance.sponsorHeight ?? 0}
                            onChange={e => setAppearance({ sponsorHeight: Number(e.target.value) })}
                        />
                    </label>
                    <label>
                        Padding (px)
                        <input
                            type="number"
                            min={0}
                            value={value.overlayAppearance.sponsorPadding ?? 16}
                            onChange={e => setAppearance({ sponsorPadding: Number(e.target.value) })}
                        />
                    </label>
                </div>
            </fieldset>
            <div className="checkboxes">
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.writeFieldFiles}
                        onChange={e => set({ writeFieldFiles: e.target.checked })}
                    />
                    Write per-field text files
                </label>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.writeJson}
                        onChange={e => set({ writeJson: e.target.checked })}
                    />
                    Write state.json snapshot
                </label>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.enableServer}
                        onChange={e => set({ enableServer: e.target.checked })}
                    />
                    Run overlay HTTP server
                </label>
            </div>
        </fieldset>
    );
}
