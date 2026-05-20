import { useId } from 'react';
import type { OverlayAppearance } from '../types';
import { DEFAULT_APPEARANCE } from '../types';
import Segmented from './Segmented';

const FONT_SUGGESTIONS = [
    '"Arial Black", Impact, "Arial Narrow", sans-serif',
    'Impact, "Arial Narrow", sans-serif',
    'Georgia, "Times New Roman", serif',
    '"Courier New", Courier, monospace',
];

type Props = {
    value: OverlayAppearance;
    onChange: (v: OverlayAppearance) => void;
    onCommit: (v: OverlayAppearance) => void;
};

export default function OverlayEditor({ value, onChange, onCommit }: Props) {
    const id = useId();
    const set = (patch: Partial<OverlayAppearance>) => onChange({ ...value, ...patch });
    const commit = (patch?: Partial<OverlayAppearance>) => {
        const next = patch ? { ...value, ...patch } : value;
        if (patch) onChange(next);
        onCommit(next);
    };
    const fontListId = `${id}-fonts`;

    return (
        <fieldset className="overlay-editor">
            <legend>Overlay Appearance</legend>

            <label className="overlay-layout-row">
                Layout
                <Segmented<string>
                    value={value.layout || 'dual'}
                    options={[
                        { value: 'dual', label: 'Dual sidebar' },
                        { value: 'single', label: 'Single left panel' },
                    ]}
                    onChange={v => commit({ layout: v })}
                />
                <small className="hint">
                    Dual: cam + panel on each side of the game. Single: one wide left
                    panel with both cams, score, casters, sponsors.
                </small>
            </label>

            <div className="grid">
                <label className="fw-color">
                    Accent color
                    <div className="color-row">
                        <input
                            type="color"
                            value={value.accent}
                            onInput={e => set({ accent: (e.target as HTMLInputElement).value })}
                            onBlur={() => commit()}
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
                            onBlur={() => commit()}
                        />
                    </div>
                </label>
                <label className="fw-color">
                    Sidebar background
                    <div className="color-row">
                        <input
                            type="color"
                            value={value.sidebarBg}
                            onInput={e => set({ sidebarBg: (e.target as HTMLInputElement).value })}
                            onBlur={() => commit()}
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
                            onBlur={() => commit()}
                        />
                    </div>
                </label>
                <label className="fw-slider">
                    Cam area height — {value.camHeight}px
                    <input
                        type="range" min={150} max={540}
                        value={value.camHeight}
                        onChange={e => set({ camHeight: Number(e.target.value) })}
                        onBlur={() => commit()}
                        onMouseUp={() => commit()}
                        onTouchEnd={() => commit()}
                        onKeyUp={() => commit()}
                    />
                </label>
                <label className="fw-slider">
                    Player name size — {value.nameFontSize}px
                    <input
                        type="range" min={16} max={64}
                        value={value.nameFontSize}
                        onChange={e => set({ nameFontSize: Number(e.target.value) })}
                        onBlur={() => commit()}
                        onMouseUp={() => commit()}
                        onTouchEnd={() => commit()}
                        onKeyUp={() => commit()}
                    />
                </label>
                <label className="fw-slider">
                    Round label size — {value.roundFontSize}px
                    <input
                        type="range" min={16} max={64}
                        value={value.roundFontSize}
                        onChange={e => set({ roundFontSize: Number(e.target.value) })}
                        onBlur={() => commit()}
                        onMouseUp={() => commit()}
                        onTouchEnd={() => commit()}
                        onKeyUp={() => commit()}
                    />
                </label>
                <label className="span-full">
                    Player name font
                    <input
                        list={fontListId}
                        value={value.nameFont}
                        onChange={e => set({ nameFont: e.target.value })}
                        onBlur={() => commit()}
                        placeholder='"Arial Black", Impact, sans-serif'
                    />
                    <datalist id={fontListId}>
                        {FONT_SUGGESTIONS.map(f => <option key={f} value={f} />)}
                    </datalist>
                </label>
                <label className="span-full">
                    Logo image URL
                    <input
                        type="text"
                        value={value.logoUrl ?? ''}
                        onChange={e => set({ logoUrl: e.target.value })}
                        onBlur={() => commit()}
                        placeholder="https://… or /overlay/logo.png (blank = built-in mark)"
                    />
                </label>
            </div>

            <div className="sponsor-section">
                <div className="sponsor-section-title">Sponsor Rotator</div>
                <div className="sponsor-grid">
                    <label className="fw-num">
                        Interval (s)
                        <input
                            type="number"
                            min={1}
                            value={value.sponsorInterval ?? 5}
                            onChange={e => set({ sponsorInterval: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="fw-num">
                        Width (px)
                        <input
                            type="number"
                            min={0}
                            value={value.sponsorWidth ?? 200}
                            onChange={e => set({ sponsorWidth: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="fw-num">
                        Height (px)
                        <input
                            type="number"
                            min={0}
                            value={value.sponsorHeight ?? 0}
                            onChange={e => set({ sponsorHeight: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="fw-num">
                        Padding (px)
                        <input
                            type="number"
                            min={0}
                            value={value.sponsorPadding ?? 16}
                            onChange={e => set({ sponsorPadding: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                </div>
            </div>

            <button
                type="button"
                className="reset-btn"
                onClick={() => {
                    const next = { ...DEFAULT_APPEARANCE };
                    onChange(next);
                    onCommit(next);
                }}
            >
                Reset to defaults
            </button>
        </fieldset>
    );
}
