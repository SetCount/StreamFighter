import type { Caster, CasterPreset } from '../types';
import SocialsEditor from './SocialsEditor';

type Props = {
    value: Caster[];
    onChange: (v: Caster[]) => void;
    presets?: CasterPreset[];
};

const blankCaster = (): Caster => ({ name: '', pronouns: '', socials: [] });

export default function CastersEditor({ value, onChange, presets = [] }: Props) {
    const setCaster = (i: number, patch: Partial<Caster>) => {
        const next = [...value];
        next[i] = { ...next[i], ...patch };
        onChange(next);
    };
    const addCaster = () => onChange([...value, blankCaster()]);
    const removeCaster = (i: number) => onChange(value.filter((_, idx) => idx !== i));

    // Apply a preset whenever the typed name newly matches one (case-insensitive,
    // including aliases-style — casters don't have aliases yet, but the same
    // shape leaves room). Replaces the socials list outright; if the user
    // wants to keep custom socials, they should rename the caster.
    const onNameChange = (i: number, raw: string) => {
        const lc = raw.toLowerCase();
        const wasLc = value[i].name.toLowerCase();
        const match = presets.find(p => p.name.toLowerCase() === lc);
        if (match && wasLc !== lc) {
            setCaster(i, { name: match.name, pronouns: match.pronouns ?? '', socials: match.socials ?? [] });
        } else {
            setCaster(i, { name: raw });
        }
    };

    return (
        <fieldset>
            <legend>Casters</legend>
            <datalist id="caster-preset-names">
                {presets.map(p => <option key={p.id} value={p.name} />)}
            </datalist>
            {value.length === 0 && <div className="empty">No casters yet.</div>}
            <div className="casters">
                {value.map((c, i) => (
                    <div key={i} className="caster">
                        <div className="caster-head">
                            <input
                                placeholder="Caster name"
                                value={c.name}
                                list="caster-preset-names"
                                onChange={ev => onNameChange(i, ev.target.value)}
                            />
                            <input
                                className="pronouns"
                                placeholder="Pronouns"
                                value={c.pronouns ?? ''}
                                onChange={ev => setCaster(i, { pronouns: ev.target.value })}
                            />
                            <button className="icon-btn" onClick={() => removeCaster(i)}>×</button>
                        </div>
                        <SocialsEditor
                            value={c.socials}
                            onChange={s => setCaster(i, { socials: s })}
                        />
                    </div>
                ))}
            </div>
            <button className="add-row" onClick={addCaster}>+ Caster</button>
        </fieldset>
    );
}
