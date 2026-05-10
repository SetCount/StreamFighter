import { useId } from 'react';
import type { OverlayAppearance } from '../types';
import { DEFAULT_APPEARANCE } from '../types';

const FONT_SUGGESTIONS = [
    '"Arial Black", Impact, "Arial Narrow", sans-serif',
    'Impact, "Arial Narrow", sans-serif',
    'Georgia, "Times New Roman", serif',
    '"Courier New", Courier, monospace',
];

type Props = {
    value: OverlayAppearance;
    onChange: (v: OverlayAppearance) => void;
};

export default function OverlayEditor({ value, onChange }: Props) {
    const id = useId();
    const set = (patch: Partial<OverlayAppearance>) => onChange({ ...value, ...patch });
    const fontListId = `${id}-fonts`;

    return (
        <fieldset className="overlay-editor">
            <legend>Overlay Appearance</legend>

            <div className="grid">
                <label>
                    Accent color
                    <div className="color-row">
                        <input
                            type="color"
                            value={value.accent}
                            onInput={e => set({ accent: (e.target as HTMLInputElement).value })}
                        />
                        <input
                            type="text"
                            value={value.accent}
                            maxLength={7}
                            className="color-text"
                            onChange={e => {
                                const v = e.target.value;
                                if (/^#[0-9a-fA-F]{6}$/.test(v)) set({ accent: v });
                            }}
                        />
                    </div>
                </label>
                <label>
                    Sidebar background
                    <div className="color-row">
                        <input
                            type="color"
                            value={value.sidebarBg}
                            onInput={e => set({ sidebarBg: (e.target as HTMLInputElement).value })}
                        />
                        <input
                            type="text"
                            value={value.sidebarBg}
                            maxLength={7}
                            className="color-text"
                            onChange={e => {
                                const v = e.target.value;
                                if (/^#[0-9a-fA-F]{6}$/.test(v)) set({ sidebarBg: v });
                            }}
                        />
                    </div>
                </label>
            </div>

            <div className="grid" style={{ marginTop: 14 }}>
                <label>
                    Sidebar width — {value.sidebarWidth}px
                    <input
                        type="range" min={160} max={400}
                        value={value.sidebarWidth}
                        onChange={e => set({ sidebarWidth: Number(e.target.value) })}
                    />
                </label>
                <label>
                    Cam area height — {value.camHeight}px
                    <input
                        type="range" min={150} max={540}
                        value={value.camHeight}
                        onChange={e => set({ camHeight: Number(e.target.value) })}
                    />
                </label>
                <label>
                    Player name size — {value.nameFontSize}px
                    <input
                        type="range" min={16} max={64}
                        value={value.nameFontSize}
                        onChange={e => set({ nameFontSize: Number(e.target.value) })}
                    />
                </label>
                <label>
                    Round label size — {value.roundFontSize}px
                    <input
                        type="range" min={16} max={64}
                        value={value.roundFontSize}
                        onChange={e => set({ roundFontSize: Number(e.target.value) })}
                    />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                    Player name font
                    <input
                        list={fontListId}
                        value={value.nameFont}
                        onChange={e => set({ nameFont: e.target.value })}
                        placeholder='"Arial Black", Impact, sans-serif'
                    />
                    <datalist id={fontListId}>
                        {FONT_SUGGESTIONS.map(f => <option key={f} value={f} />)}
                    </datalist>
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                    Logo image URL
                    <input
                        type="text"
                        value={value.logoUrl ?? ''}
                        onChange={e => set({ logoUrl: e.target.value })}
                        placeholder="https://… or /overlay/logo.png (blank = built-in mark)"
                    />
                </label>
            </div>

            <div className="checkboxes">
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.showSetInfo}
                        onChange={e => set({ showSetInfo: e.target.checked })}
                    />
                    Show set info (bottom-left of game overlay)
                </label>
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={value.showLogo}
                        onChange={e => set({ showLogo: e.target.checked })}
                    />
                    Show logo (bottom-right of game overlay)
                </label>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    type="button"
                    onClick={() => onChange({ ...DEFAULT_APPEARANCE })}
                >
                    Reset to defaults
                </button>
            </div>
        </fieldset>
    );
}
