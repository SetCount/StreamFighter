import type { Caster, CasterPreset } from "../types";
import SocialsEditor from "./SocialsEditor";
import { Card, CardHeader } from "./Card";
import "./CastersEditor.css";

type Props = {
  value: Caster[];
  onChange: (v: Caster[]) => void;
  presets?: CasterPreset[];
  onSaveCasterAsPreset?: (caster: Caster) => void;
};

const blankCaster = (): Caster => ({ name: "", pronouns: "", socials: [] });

export default function CastersEditor({
  value,
  onChange,
  presets = [],
  onSaveCasterAsPreset,
}: Props) {
  const setCaster = (i: number, patch: Partial<Caster>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const addCaster = () => onChange([...value, blankCaster()]);
  const removeCaster = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));

  // Apply a preset whenever the typed name newly matches one (case-insensitive,
  // including aliases-style — casters don't have aliases yet, but the same
  // shape leaves room). Replaces the socials list outright; if the user
  // wants to keep custom socials, they should rename the caster.
  const onNameChange = (i: number, raw: string) => {
    const lc = raw.toLowerCase();
    const wasLc = value[i].name.toLowerCase();
    const match = presets.find((p) => p.name.toLowerCase() === lc);
    if (match && wasLc !== lc) {
      setCaster(i, {
        name: match.name,
        pronouns: match.pronouns ?? "",
        socials: match.socials ?? [],
      });
    } else {
      setCaster(i, { name: raw });
    }
  };

  return (
    <Card>
      <CardHeader
        title="Casters"
        eyebrow={`${value.length || "No"} on air`}
        actions={
          <button type="button" className="btn-add" onClick={addCaster}>
            + Caster
          </button>
        }
      />
      <datalist id="caster-preset-names">
        {presets.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>
      {value.length === 0 ? (
        <p className="empty">
          No casters yet — add one to overlay their tag, pronouns, and socials.
        </p>
      ) : (
        <div className="casters-list">
          {value.map((c, i) => (
            <div key={i} className="caster-row">
              <div className="caster-row-head">
                <input
                  className="caster-name"
                  placeholder="Caster name"
                  value={c.name}
                  list="caster-preset-names"
                  onChange={(ev) => onNameChange(i, ev.target.value)}
                />
                <input
                  className="caster-pronouns"
                  placeholder="Pronouns"
                  value={c.pronouns ?? ""}
                  onChange={(ev) => setCaster(i, { pronouns: ev.target.value })}
                />
                {onSaveCasterAsPreset && c.name && (
                  <button
                    type="button"
                    className="btn-icon btn-icon-soft"
                    title="Save as preset"
                    aria-label="Save as preset"
                    onClick={() => onSaveCasterAsPreset(c)}
                  >
                    ⊕
                  </button>
                )}
                <button
                  type="button"
                  className="btn-icon is-danger"
                  onClick={() => removeCaster(i)}
                  title="Remove caster"
                  aria-label="Remove caster"
                >
                  ×
                </button>
              </div>
              <SocialsEditor
                value={c.socials}
                onChange={(s) => setCaster(i, { socials: s })}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
