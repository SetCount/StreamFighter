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
    return (
        <fieldset className="config-editor">
            <legend>Output</legend>
            <div className="grid">
                <label className="span-full">
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
                        onBlur={() => commit()}
                    />
                </label>
                <label>
                    Overlay HTML Path
                    <input
                        value={value.overlayPath}
                        onChange={e => set({ overlayPath: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label>
                    Games Directory
                    <input
                        value={value.gamesDir}
                        onChange={e => set({ gamesDir: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label>
                    Sponsors Directory
                    <input
                        value={value.sponsorsDir ?? ''}
                        onChange={e => set({ sponsorsDir: e.target.value })}
                        onBlur={() => commit()}
                    />
                </label>
                <label>
                    HTTP Port
                    <input
                        type="number"
                        value={value.httpPort}
                        onChange={e => set({ httpPort: Number(e.target.value) })}
                        onBlur={() => commit()}
                    />
                </label>
            </div>
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
