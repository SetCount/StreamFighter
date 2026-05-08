import type { Caster, Social } from '../types';

type Props = {
    value: Caster[];
    onChange: (v: Caster[]) => void;
};

// Brand glyphs from Simple Icons (CC0). Monochrome via currentColor — color
// only signals selection state, not the brand. `key` is what we store in
// Social.icon; `label` is just an aria-label / tooltip.
const SOCIAL_PLATFORMS = [
    {
        key: 'twitter',
        label: 'X (Twitter)',
        path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    },
    {
        key: 'bluesky',
        label: 'Bluesky',
        path: 'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364-3.911.58-7.386 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z',
    },
    {
        key: 'twitch',
        label: 'Twitch',
        path: 'M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z',
    },
    {
        key: 'discord',
        label: 'Discord',
        path: 'M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z',
    },
] as const;

type SocialKey = typeof SOCIAL_PLATFORMS[number]['key'];

const blankSocial = (): Social => ({ icon: 'twitter', handle: '' });
const blankCaster = (): Caster => ({ name: '', socials: [] });

export default function CastersEditor({ value, onChange }: Props) {
    const setCaster = (i: number, patch: Partial<Caster>) => {
        const next = [...value];
        next[i] = { ...next[i], ...patch };
        onChange(next);
    };
    const setSocial = (ci: number, si: number, patch: Partial<Social>) => {
        const socials = [...value[ci].socials];
        socials[si] = { ...socials[si], ...patch };
        setCaster(ci, { socials });
    };
    const addCaster = () => onChange([...value, blankCaster()]);
    const removeCaster = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const addSocial = (ci: number) =>
        setCaster(ci, { socials: [...value[ci].socials, blankSocial()] });
    const removeSocial = (ci: number, si: number) =>
        setCaster(ci, { socials: value[ci].socials.filter((_, idx) => idx !== si) });

    return (
        <fieldset>
            <legend>Casters</legend>
            {value.length === 0 && <div className="empty">No casters yet.</div>}
            <div className="casters">
                {value.map((c, i) => (
                    <div key={i} className="caster">
                        <div className="caster-head">
                            <input
                                placeholder="Caster name"
                                value={c.name}
                                onChange={ev => setCaster(i, { name: ev.target.value })}
                            />
                            <button className="icon-btn" onClick={() => removeCaster(i)}>×</button>
                        </div>
                        <div className="socials">
                            {c.socials.map((s, si) => (
                                <div key={si} className="social">
                                    <div className="social-pick" role="radiogroup" aria-label="Platform">
                                        {SOCIAL_PLATFORMS.map(p => (
                                            <button
                                                key={p.key}
                                                type="button"
                                                className="social-pick-btn"
                                                role="radio"
                                                aria-checked={s.icon === p.key}
                                                aria-label={p.label}
                                                title={p.label}
                                                onClick={() => setSocial(i, si, { icon: p.key as SocialKey })}
                                            >
                                                <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                                                    <path d={p.path} />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        placeholder="@handle"
                                        value={s.handle}
                                        onChange={ev => setSocial(i, si, { handle: ev.target.value })}
                                    />
                                    <button className="icon-btn" onClick={() => removeSocial(i, si)}>×</button>
                                </div>
                            ))}
                            <button className="add-row" onClick={() => addSocial(i)}>+ Social</button>
                        </div>
                    </div>
                ))}
            </div>
            <button className="add-row" onClick={addCaster}>+ Caster</button>
        </fieldset>
    );
}
