import type { OutputConfig } from '../types';

type Props = {
    value: OutputConfig;
    onChange: (v: OutputConfig) => void;
    onCommit: (v: OutputConfig) => void;
    startggToken: string;
    onTokenChange: (v: string) => void;
    onTokenBlur: () => void;
};

export default function ConfigEditor({
    value, onChange, onCommit,
    startggToken, onTokenChange, onTokenBlur,
}: Props) {
    const set = (patch: Partial<OutputConfig>) => onChange({ ...value, ...patch });
    const commit = (patch?: Partial<OutputConfig>) => {
        const next = patch ? { ...value, ...patch } : value;
        if (patch) onChange(next);
        onCommit(next);
    };
    const setAppearance = (patch: Partial<OutputConfig['overlayAppearance']>) =>
        onChange({ ...value, overlayAppearance: { ...value.overlayAppearance, ...patch } });
    const commitAppearance = (patch: Partial<OutputConfig['overlayAppearance']>) => {
        const next = { ...value, overlayAppearance: { ...value.overlayAppearance, ...patch } };
        onChange(next);
        onCommit(next);
    };
    return (
        <fieldset className="config-editor">
            <legend>Output Config</legend>
            <div className="grid">
                <label className="fw-long">
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
                <label className="fw-path">
                    Output Directory
                    <input
                        value={value.outputDir}
                        onChange={e => set({ outputDir: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label className="fw-path">
                    Overlay HTML Path
                    <input
                        value={value.overlayPath}
                        onChange={e => set({ overlayPath: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label className="fw-path">
                    Games Directory
                    <input
                        value={value.gamesDir}
                        onChange={e => set({ gamesDir: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label className="fw-path">
                    Sponsors Directory
                    <input
                        value={value.sponsorsDir ?? ''}
                        onChange={e => set({ sponsorsDir: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label className="fw-num">
                    HTTP Port
                    <input
                        type="number"
                        value={value.httpPort}
                        onChange={e => set({ httpPort: Number(e.target.value) })}
                        onBlur={() => commit()}
                    />
                </label>
            </div>
            <fieldset>
                <legend>Sponsor Rotator</legend>
                <div className="grid">
                    <label className="fw-mid">
                        Corner
                        <select
                            value={value.overlayAppearance.sponsorCorner ?? 'bottom-right'}
                            onChange={e => commitAppearance({ sponsorCorner: e.target.value })}
                        >
                            <option value="top-left">Top Left</option>
                            <option value="top-right">Top Right</option>
                            <option value="bottom-left">Bottom Left</option>
                            <option value="bottom-right">Bottom Right</option>
                        </select>
                    </label>
                    <label className="fw-num">
                        Interval (sec)
                        <input
                            type="number"
                            min={1}
                            value={value.overlayAppearance.sponsorInterval ?? 5}
                            onChange={e => setAppearance({ sponsorInterval: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="fw-num">
                        Width (px)
                        <input
                            type="number"
                            min={0}
                            value={value.overlayAppearance.sponsorWidth ?? 200}
                            onChange={e => setAppearance({ sponsorWidth: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="fw-num-md">
                        Height (px, 0 = auto)
                        <input
                            type="number"
                            min={0}
                            value={value.overlayAppearance.sponsorHeight ?? 0}
                            onChange={e => setAppearance({ sponsorHeight: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="fw-num">
                        Padding (px)
                        <input
                            type="number"
                            min={0}
                            value={value.overlayAppearance.sponsorPadding ?? 16}
                            onChange={e => setAppearance({ sponsorPadding: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                </div>
            </fieldset>
            <div className="checkboxes">
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.writeFieldFiles}
                        onChange={e => commit({ writeFieldFiles: e.target.checked })}
                    />
                    Write per-field text files
                </label>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.writeJson}
                        onChange={e => commit({ writeJson: e.target.checked })}
                    />
                    Write state.json snapshot
                </label>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.enableServer}
                        onChange={e => commit({ enableServer: e.target.checked })}
                    />
                    Run overlay HTTP server
                </label>
            </div>
        </fieldset>
    );
}
