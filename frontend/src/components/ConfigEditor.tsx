import type { OutputConfig } from '../types';

type Props = {
    value: OutputConfig;
    onChange: (v: OutputConfig) => void;
    onSave: () => void;
    onClose?: () => void;
};

export default function ConfigEditor({ value, onChange, onSave, onClose }: Props) {
    const set = (patch: Partial<OutputConfig>) => onChange({ ...value, ...patch });
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
                    HTTP Port
                    <input
                        type="number"
                        value={value.httpPort}
                        onChange={e => set({ httpPort: Number(e.target.value) })}
                    />
                </label>
            </div>
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
