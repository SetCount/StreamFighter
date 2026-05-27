import { useId, useRef } from 'react';
import type { OverlayAppearance, GamePack, LayoutRegistry } from '../types';
import { DEFAULT_APPEARANCE } from '../types';
import Segmented from './Segmented';
import { Card, CardHeader, CardSection } from './Card';
import './SettingsForms.css';
import './OverlayEditor.css';

const FONT_SUGGESTIONS = [
    '"Arial Black", Impact, "Arial Narrow", sans-serif',
    'Impact, "Arial Narrow", sans-serif',
    'Georgia, "Times New Roman", serif',
    '"Courier New", Courier, monospace',
];

const LAYOUT_LABELS: Record<string, string> = {
    dual: 'Dual sidebar',
    single: 'Single left panel',
    widescreen: 'Widescreen bar',
};

type Props = {
    value: OverlayAppearance;
    onChange: (v: OverlayAppearance) => void;
    onCommit: (v: OverlayAppearance) => void;
    gameId: string;
    games: GamePack[];
    layoutRegistry: LayoutRegistry;
};

export default function OverlayEditor({ value, onChange, onCommit, gameId, games, layoutRegistry }: Props) {
    const id = useId();
    const fontListId = `${id}-fonts`;

    const set = (patch: Partial<OverlayAppearance>) => onChange({ ...value, ...patch });
    const commit = (patch?: Partial<OverlayAppearance>) => {
        const next = patch ? { ...value, ...patch } : value;
        if (patch) onChange(next);
        onCommit(next);
    };

    // Debounced commit for slider drags: each onChange schedules a commit
    // ~200ms after the last input event, replacing any pending one. The
    // setTimeout closure captures the latest `next` snapshot, so clearing
    // earlier timers naturally drops their stale values.
    const debounceRef = useRef<number | null>(null);
    const scheduleCommit = (next: OverlayAppearance) => {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
            onCommit(next);
            debounceRef.current = null;
        }, 200);
    };
    const onSlide = (patch: Partial<OverlayAppearance>) => {
        const next = { ...value, ...patch };
        onChange(next);
        scheduleCommit(next);
    };

    const activePack = games.find(g => g.id === gameId);
    const availableARs = activePack?.aspectRatios ?? [];
    const currentAR = value.gameAspect || availableARs[0] || '4:3';
    const compatibleLayouts = layoutRegistry[currentAR] ?? ['dual', 'single'];

    return (
        <div className="settings-stack">
            <Card>
                <CardHeader
                    title="Overlay appearance"
                    subtitle="What the OBS browser source renders. Changes save automatically."
                    actions={
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                                const next = { ...DEFAULT_APPEARANCE };
                                onChange(next);
                                onCommit(next);
                            }}
                        >
                            Reset to defaults
                        </button>
                    }
                />

                {(availableARs.length > 1 || compatibleLayouts.length > 1) && (
                    <CardSection title="Layout">
                        {availableARs.length > 1 && (
                            <label className="overlay-segmented-row">
                                <span className="settings-label">Aspect ratio</span>
                                <Segmented<string>
                                    value={currentAR}
                                    options={availableARs.map(ar => ({ value: ar, label: ar }))}
                                    onChange={ar => {
                                        let layout = value.layout;
                                        const valid = layoutRegistry[ar] ?? [];
                                        if (valid.length > 0 && !valid.includes(layout)) {
                                            layout = valid[0];
                                        }
                                        commit({ gameAspect: ar, layout });
                                    }}
                                />
                            </label>
                        )}
                        <label className="overlay-segmented-row">
                            <span className="settings-label">Layout</span>
                            <Segmented<string>
                                value={value.layout || compatibleLayouts[0] || 'dual'}
                                options={compatibleLayouts.map(l => ({
                                    value: l,
                                    label: LAYOUT_LABELS[l] ?? l,
                                }))}
                                onChange={v => commit({ layout: v })}
                            />
                        </label>
                    </CardSection>
                )}

                <CardSection
                    title="Colors"
                    hint="Render in the OBS overlay only — they don't preview here."
                >
                    <div className="overlay-color-grid">
                        <label className="settings-field">
                            <span className="settings-label">Accent</span>
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
                        <label className="settings-field">
                            <span className="settings-label">Sidebar background</span>
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
                    </div>
                </CardSection>

                <CardSection
                    title="Typography"
                    hint={<>Picks the font and size used for tags and round labels in the overlay.</>}
                >
                    <label className="settings-field">
                        <span className="settings-label">Player name font</span>
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
                    <div className="overlay-slider-grid">
                        <div className="slider-row">
                            <div className="slider-row-head">
                                <span className="slider-row-label">Player name size</span>
                                <span className="slider-row-value">{value.nameFontSize}px</span>
                            </div>
                            <input
                                type="range" min={16} max={64}
                                value={value.nameFontSize}
                                onChange={e => onSlide({ nameFontSize: Number(e.target.value) })}
                            />
                        </div>
                        <div className="slider-row">
                            <div className="slider-row-head">
                                <span className="slider-row-label">Round label size</span>
                                <span className="slider-row-value">{value.roundFontSize}px</span>
                            </div>
                            <input
                                type="range" min={16} max={64}
                                value={value.roundFontSize}
                                onChange={e => onSlide({ roundFontSize: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                </CardSection>

                <CardSection title="Cameras">
                    <div className="slider-row">
                        <div className="slider-row-head">
                            <span className="slider-row-label">Camera area height</span>
                            <span className="slider-row-value">{value.camHeight}px</span>
                        </div>
                        <input
                            type="range" min={150} max={540}
                            value={value.camHeight}
                            onChange={e => onSlide({ camHeight: Number(e.target.value) })}
                        />
                    </div>
                </CardSection>

                <CardSection
                    title="Brand"
                    hint="Leave blank to use the built-in StreamFighter mark."
                >
                    <label className="settings-field">
                        <span className="settings-label">Logo image URL</span>
                        <input
                            type="text"
                            value={value.logoUrl ?? ''}
                            onChange={e => set({ logoUrl: e.target.value })}
                            onBlur={() => commit()}
                            placeholder="https://… or /overlay/logo.png"
                        />
                    </label>
                </CardSection>
            </Card>

            <Card>
                <CardHeader
                    title="Sponsor rotator"
                    subtitle="Cycles images from the Sponsors directory in the overlay's bottom-left slot."
                />
                <div className="sponsor-grid">
                    <label className="settings-field">
                        <span className="settings-label">Interval (s)</span>
                        <input
                            type="number"
                            min={1}
                            value={value.sponsorInterval ?? 5}
                            onChange={e => set({ sponsorInterval: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="settings-field">
                        <span className="settings-label">Width (px)</span>
                        <input
                            type="number"
                            min={0}
                            value={value.sponsorWidth ?? 200}
                            onChange={e => set({ sponsorWidth: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="settings-field">
                        <span className="settings-label">Height (px)</span>
                        <input
                            type="number"
                            min={0}
                            value={value.sponsorHeight ?? 0}
                            onChange={e => set({ sponsorHeight: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                    <label className="settings-field">
                        <span className="settings-label">Padding (px)</span>
                        <input
                            type="number"
                            min={0}
                            value={value.sponsorPadding ?? 16}
                            onChange={e => set({ sponsorPadding: Number(e.target.value) })}
                            onBlur={() => commit()}
                        />
                    </label>
                </div>
            </Card>
        </div>
    );
}
