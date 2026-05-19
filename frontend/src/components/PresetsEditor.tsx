import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import type { PlayerPreset, CasterPreset, GamePack } from "../types";
import {
  findPack,
  findCharacter,
  selectURL,
  portraitURL,
  stockURL,
} from "../assets";
import { portPaletteFor } from "../portColors";
import CharacterPicker from "./CharacterPicker";
import SocialsEditor from "./SocialsEditor";

type Props = {
  players: PlayerPreset[];
  casters: CasterPreset[];
  games: GamePack[];
  gameId: string;
  assetsBase: string;
  onSavePlayer: (p: PlayerPreset) => Promise<void>;
  onDeletePlayer: (id: string) => Promise<void>;
  onAddPlayer: () => void;
  onChangePlayers: (next: PlayerPreset[]) => void;
  onSaveCaster: (c: CasterPreset) => Promise<void>;
  onDeleteCaster: (id: string) => Promise<void>;
  onAddCaster: () => void;
  onChangeCasters: (next: CasterPreset[]) => void;
};

const pKey = (p: PlayerPreset, i: number) => p.id || `new-${i}`;
const cKey = (c: CasterPreset, i: number) => c.id || `cnew-${i}`;

export default function PresetsEditor({
  players,
  casters,
  games,
  gameId,
  assetsBase,
  onSavePlayer,
  onDeletePlayer,
  onAddPlayer,
  onChangePlayers,
  onSaveCaster,
  onDeleteCaster,
  onAddCaster,
  onChangeCasters,
}: Props) {
  const pack = findPack(games, gameId);
  const portPalette = portPaletteFor(pack);
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const [expandedP, setExpandedP] = useState<Set<string>>(
    () => new Set(players.filter((p) => !p.id).map((p, i) => pKey(p, i))),
  );
  const [expandedC, setExpandedC] = useState<Set<string>>(
    () => new Set(casters.filter((c) => !c.id).map((c, i) => cKey(c, i))),
  );

  const prevPLen = useRef(players.length);
  useEffect(() => {
    if (players.length > prevPLen.current) {
      const i = players.length - 1;
      setExpandedP((s) => new Set([...s, pKey(players[i], i)]));
    }
    prevPLen.current = players.length;
  }, [players.length]);

  const prevCLen = useRef(casters.length);
  useEffect(() => {
    if (casters.length > prevCLen.current) {
      const i = casters.length - 1;
      setExpandedC((s) => new Set([...s, cKey(casters[i], i)]));
    }
    prevCLen.current = casters.length;
  }, [casters.length]);

  const toggleP = (k: string) =>
    setExpandedP((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const toggleC = (k: string) =>
    setExpandedC((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const setPlayer = (i: number, patch: Partial<PlayerPreset>) => {
    const next = [...players];
    next[i] = { ...next[i], ...patch };
    onChangePlayers(next);
  };
  const removePlayer = (i: number) => {
    const p = players[i];
    if (p.id) void onDeletePlayer(p.id);
    else onChangePlayers(players.filter((_, idx) => idx !== i));
  };
  const onPickCharacter = (charId: string | null) => {
    if (pickerFor !== null) {
      const char = charId ? findCharacter(pack, charId) : undefined;
      setPlayer(pickerFor, {
        character: charId ?? "",
        costume: char?.costumes[0]?.index ?? 0,
      });
    }
    setPickerFor(null);
  };

  const setCaster = (i: number, patch: Partial<CasterPreset>) => {
    const next = [...casters];
    next[i] = { ...next[i], ...patch };
    onChangeCasters(next);
  };
  const removeCaster = (i: number) => {
    const c = casters[i];
    if (c.id) void onDeleteCaster(c.id);
    else onChangeCasters(casters.filter((_, idx) => idx !== i));
  };

  return (
    <>
      <div className="presets-columns">
        {/* ── Player Presets ── */}
        <fieldset className="presets-section">
          <legend>Player Presets</legend>
          <div className="preset-list">
            {players.map((p, i) => {
              const k = pKey(p, i);
              const isOpen = expandedP.has(k);
              const char = findCharacter(pack, p.character ?? "");
              const costumes = char?.costumes ?? [];
              const thumbSrc = p.character
                ? p.costume && p.costume > 0
                  ? stockURL(assetsBase, gameId, p.character, p.costume)
                  : selectURL(assetsBase, gameId, p.character)
                : null;
              const meta = [p.pronouns, p.prefix].filter(Boolean).join(" · ");
              return (
                <div
                  key={k}
                  className="preset-row"
                  style={
                    {
                      "--port-color": p.portColor || "transparent",
                    } as CSSProperties
                  }
                >
                  <div
                    className="preset-header"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggleP(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleP(k);
                      }
                    }}
                  >
                    <div className="preset-thumb">
                      {thumbSrc ? (
                        <img src={thumbSrc} alt={char?.name ?? p.character} />
                      ) : (
                        <div className="preset-thumb-empty" />
                      )}
                    </div>
                    <div className="preset-name-col">
                      <span className={`preset-name${!p.name ? " empty" : ""}`}>
                        {p.name || "New preset"}
                      </span>
                      {meta && <span className="preset-meta">{meta}</span>}
                    </div>
                    {p.portColor && (
                      <span
                        className="color-dot"
                        style={{ background: p.portColor }}
                      />
                    )}
                    <span className="expand-toggle" aria-hidden="true">
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlayer(i);
                      }}
                      aria-label="Remove preset"
                    >
                      ×
                    </button>
                  </div>
                  {isOpen && (
                    <div className="preset-body">
                      <input
                        className="name"
                        placeholder="Tag"
                        value={p.name}
                        onChange={(ev) =>
                          setPlayer(i, { name: ev.target.value })
                        }
                      />
                      <div className="player-extras">
                        <input
                          className="pronouns"
                          placeholder="Pronouns"
                          value={p.pronouns ?? ""}
                          onChange={(ev) =>
                            setPlayer(i, {
                              pronouns: ev.target.value || undefined,
                            })
                          }
                        />
                        <input
                          className="prefix"
                          placeholder="Prefix"
                          value={p.prefix ?? ""}
                          onChange={(ev) =>
                            setPlayer(i, { prefix: ev.target.value || undefined })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="player-portrait"
                        onClick={() => setPickerFor(i)}
                        aria-label="Choose character"
                      >
                        {p.character && (p.costume ?? 0) > 0 ? (
                          <img
                            src={portraitURL(
                              assetsBase,
                              gameId,
                              p.character,
                              p.costume!,
                            )}
                            alt={char?.name ?? p.character}
                          />
                        ) : (
                          <span className="portrait-empty">
                            {p.character
                              ? (char?.name ?? p.character)
                              : "Click to choose character"}
                          </span>
                        )}
                      </button>
                      {p.character && costumes.length > 0 && (
                        <div
                          className="stock-row"
                          role="radiogroup"
                          aria-label="Costume"
                        >
                          {costumes.map((cos) => (
                            <button
                              key={cos.index}
                              type="button"
                              role="radio"
                              aria-checked={p.costume === cos.index}
                              aria-label={`Costume ${cos.index}`}
                              className="stock-btn"
                              onClick={() =>
                                setPlayer(i, { costume: cos.index })
                              }
                            >
                              <img
                                src={stockURL(
                                  assetsBase,
                                  gameId,
                                  p.character!,
                                  cos.index,
                                )}
                                alt=""
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      <label>
                        Color
                        <div
                          className="color-swatches"
                          role="radiogroup"
                          aria-label="Port Color"
                        >
                          <button
                            type="button"
                            className="color-swatch clear-swatch"
                            role="radio"
                            aria-checked={!p.portColor}
                            aria-label="No preference"
                            title="No preference"
                            onClick={() =>
                              setPlayer(i, { portColor: undefined })
                            }
                          />
                          {portPalette.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className="color-swatch"
                              role="radio"
                              aria-checked={p.portColor === c}
                              aria-label={c}
                              style={{ background: c }}
                              onClick={() => setPlayer(i, { portColor: c })}
                            />
                          ))}
                        </div>
                      </label>
                      <details className="preset-secondary">
                        <summary>Aliases &amp; Start.gg</summary>
                        <label>
                          Aliases (comma-separated)
                          <input
                            placeholder="alt-tag, old-tag"
                            value={(p.aliases ?? []).join(", ")}
                            onChange={(ev) =>
                              setPlayer(i, {
                                aliases: ev.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter((s) => s.length > 0),
                              })
                            }
                          />
                        </label>
                        <label>
                          StartGG ID
                          <input
                            type="number"
                            placeholder="0"
                            value={p.startggPlayerId ?? ""}
                            onChange={(ev) =>
                              setPlayer(i, {
                                startggPlayerId: ev.target.value
                                  ? Number(ev.target.value)
                                  : undefined,
                              })
                            }
                          />
                        </label>
                      </details>
                      <div className="preset-actions">
                        <button onClick={() => onSavePlayer(p)}>Save</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="add-row" onClick={onAddPlayer}>
            + Player Preset
          </button>
        </fieldset>

        {/* ── Caster Presets ── */}
        <fieldset className="presets-section">
          <legend>Caster Presets</legend>
          <div className="preset-list">
            {casters.map((c, i) => {
              const k = cKey(c, i);
              const isOpen = expandedC.has(k);
              const handlesMeta = [c.pronouns, ...c.socials
                .map((s) => s.handle)]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={k} className="preset-row">
                  <div
                    className="preset-header"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => toggleC(k)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleC(k);
                      }
                    }}
                  >
                    <div className="preset-name-col">
                      <span className={`preset-name${!c.name ? " empty" : ""}`}>
                        {c.name || "New caster"}
                      </span>
                      {handlesMeta && (
                        <span className="preset-meta">{handlesMeta}</span>
                      )}
                    </div>
                    <span className="expand-toggle" aria-hidden="true">
                      {isOpen ? "▾" : "▸"}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCaster(i);
                      }}
                      aria-label="Remove preset"
                    >
                      ×
                    </button>
                  </div>
                  {isOpen && (
                    <div className="preset-body">
                      <input
                        className="name"
                        placeholder="Caster name"
                        value={c.name}
                        onChange={(ev) =>
                          setCaster(i, { name: ev.target.value })
                        }
                      />
                      <input
                        className="pronouns"
                        placeholder="Pronouns"
                        value={c.pronouns ?? ""}
                        onChange={(ev) =>
                          setCaster(i, { pronouns: ev.target.value || undefined })
                        }
                      />
                      <SocialsEditor
                        value={c.socials}
                        onChange={(s) => setCaster(i, { socials: s })}
                      />
                      <div className="preset-actions">
                        <button onClick={() => onSaveCaster(c)}>Save</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button className="add-row" onClick={onAddCaster}>
            + Caster Preset
          </button>
        </fieldset>
      </div>

      <CharacterPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={onPickCharacter}
        pack={pack}
        assetsBase={assetsBase}
      />
    </>
  );
}
