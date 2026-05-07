import type { Caster, Social } from '../types';

type Props = {
    value: Caster[];
    onChange: (v: Caster[]) => void;
};

const SOCIAL_ICONS = [
    'twitter', 'bluesky', 'youtube', 'twitch', 'discord', 'instagram', 'tiktok',
];

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
        <section className="card">
            <header className="card-head">
                <h2>Casters</h2>
                <button onClick={addCaster}>+ Caster</button>
            </header>
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
                                    <select
                                        value={s.icon}
                                        onChange={ev => setSocial(i, si, { icon: ev.target.value })}
                                    >
                                        {SOCIAL_ICONS.map(icon => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
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
        </section>
    );
}
