import { useState, useRef, useEffect, useMemo } from "react";
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
import { Card, CardHeader, CardSection } from "./Card";
import "./PresetsEditor.css";

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

type GameGroup = {
  gameId: string;
  gameName: string;
  presets: { preset: PlayerPreset; globalIndex: number }[];
};

function groupByGame(
  players: PlayerPreset[],
  games: GamePack[],
  currentGameId: string,
): GameGroup[] {
  const byGame = new Map<string, { preset: PlayerPreset; globalIndex: number }[]>();
  for (let i = 0; i < players.length; i++) {
    const gid = players[i].gameId ?? "";
    let arr = byGame.get(gid);
    if (!arr) {
      arr = [];
      byGame.set(gid, arr);
    }
    arr.push({ preset: players[i], globalIndex: i });
  }

  const groups: GameGroup[] = [];
  const gameMap = new Map(games.map((g) => [g.id, g]));

  if (byGame.has(currentGameId)) {
    const g = gameMap.get(currentGameId);
    groups.push({
      gameId: currentGameId,
      gameName: g?.name ?? currentGameId,
      presets: byGame.get(currentGameId)!,
    });
    byGame.delete(currentGameId);
  }

  const others = [...byGame.entries()]
    .filter(([gid]) => gid !== "")
    .sort(([, a], [, b]) => {
      const nameA = gameMap.get(a[0]?.preset.gameId ?? "")?.name ?? "";
      const nameB = gameMap.get(b[0]?.preset.gameId ?? "")?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  for (const [gid, presets] of others) {
    const g = gameMap.get(gid);
    groups.push({
      gameId: gid,
      gameName: g?.name ?? gid,
      presets,
    });
  }

  if (byGame.has("")) {
    groups.push({
      gameId: "",
      gameName: "No Game",
      presets: byGame.get("")!,
    });
  }

  return groups;
}

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
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const [expandedP, setExpandedP] = useState<Set<string>>(
    () => new Set(players.filter((p) => !p.id).map((p, i) => pKey(p, i))),
  );
  const [expandedC, setExpandedC] = useState<Set<string>>(
    () => new Set(casters.filter((c) => !c.id).map((c, i) => cKey(c, i))),
  );

  // Saved-flash highlight for ~1.2s after a Save click.
  const [flashed, setFlashed] = useState<Set<string>>(new Set());
  const flash = (key: string) => {
    setFlashed((s) => new Set(s).add(key));
    window.setTimeout(() => {
      setFlashed((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }, 1200);
  };

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
  const savePlayer = async (i: number) => {
    const p = players[i];
    await onSavePlayer(p);
    flash(pKey(p, i));
  };
  const onPickCharacter = (charId: string | null) => {
    if (pickerFor !== null) {
      const presetGameId = players[pickerFor]?.gameId ?? gameId;
      const pack = findPack(games, presetGameId);
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
  const saveCaster = async (i: number) => {
    const c = casters[i];
    await onSaveCaster(c);
    flash(cKey(c, i));
  };

  const gameGroups = useMemo(
    () => groupByGame(players, games, gameId),
    [players, games, gameId],
  );

  const pickerPack = useMemo(() => {
    if (pickerFor === null) return findPack(games, gameId);
    const presetGameId = players[pickerFor]?.gameId ?? gameId;
    return findPack(games, presetGameId);
  }, [pickerFor, players, games, gameId]);

  return (
    <>
      <div className="presets-columns">
        {/* ── Player Presets ── */}
        <Card>
          <CardHeader
            title="Player presets"
            eyebrow={`${players.length} saved`}
            actions={
              <button type="button" className="btn-add" onClick={onAddPlayer}>
                + Preset
              </button>
            }
          />

          {gameGroups.map((group) => {
            const gPack = findPack(games, group.gameId);
            const gPortPalette = portPaletteFor(gPack);
            return (
              <div key={group.gameId || "__none"} className="preset-game-group">
                {gameGroups.length > 1 && (
                  <div className="preset-game-heading">{group.gameName}</div>
                )}
                <div className="preset-list">
                  {group.presets.map(({ preset: p, globalIndex: i }) => {
                    const k = pKey(p, i);
                    const isOpen = expandedP.has(k);
                    const isFlashed = flashed.has(k);
                    const char = findCharacter(gPack, p.character ?? "");
                    const costumes = char?.costumes ?? [];
                    const thumbSrc = p.character
                      ? p.costume && p.costume > 0
                        ? stockURL(assetsBase, group.gameId, p.character, p.costume)
                        : selectURL(assetsBase, group.gameId, p.character)
                      : null;
                    const meta = [p.pronouns, p.prefix].filter(Boolean).join(" · ");
                    return (
                      <Card
                        key={k}
                        variant="compact"
                        className={`preset-card ${isOpen ? "is-open" : ""}`}
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
                            className="btn-icon is-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlayer(i);
                            }}
                            aria-label="Remove preset"
                            title="Remove preset"
                          >
                            ×
                          </button>
                        </div>
                        {isOpen && (
                          <div className="preset-body">
                            <label className="settings-field">
                              <span className="settings-label">Tag</span>
                              <input
                                placeholder="Tag"
                                value={p.name}
                                onChange={(ev) =>
                                  setPlayer(i, { name: ev.target.value })
                                }
                              />
                            </label>
                            <div className="preset-extras-grid">
                              <label className="settings-field">
                                <span className="settings-label">Pronouns</span>
                                <input
                                  placeholder="he/him"
                                  value={p.pronouns ?? ""}
                                  onChange={(ev) =>
                                    setPlayer(i, {
                                      pronouns: ev.target.value || undefined,
                                    })
                                  }
                                />
                              </label>
                              <label className="settings-field">
                                <span className="settings-label">Prefix</span>
                                <input
                                  placeholder="Sponsor / Team"
                                  value={p.prefix ?? ""}
                                  onChange={(ev) =>
                                    setPlayer(i, { prefix: ev.target.value || undefined })
                                  }
                                />
                              </label>
                            </div>

                            <button
                              type="button"
                              className={`entity-portrait ${p.character ? "is-filled" : "is-empty"}`}
                              onClick={() => setPickerFor(i)}
                              aria-label="Choose character"
                            >
                              {p.character && (p.costume ?? 0) > 0 ? (
                                <img
                                  src={portraitURL(
                                    assetsBase,
                                    group.gameId,
                                    p.character,
                                    p.costume!,
                                  )}
                                  alt={char?.name ?? p.character}
                                />
                              ) : (
                                <span className="entity-portrait-empty">
                                  <span className="entity-portrait-empty-icon">+</span>
                                  <span>
                                    {p.character
                                      ? (char?.name ?? p.character)
                                      : "Choose character"}
                                  </span>
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
                                        group.gameId,
                                        p.character!,
                                        cos.index,
                                      )}
                                      alt=""
                                    />
                                  </button>
                                ))}
                              </div>
                            )}

                            <label className="settings-field">
                              <span className="settings-label">Color</span>
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
                                {gPortPalette.map((c) => (
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

                            <CardSection
                              title="Identifiers"
                              hint="Aliases let typed names auto-match this preset. Start.gg ID matches even when the player renames."
                            >
                              <label className="settings-field">
                                <span className="settings-label">Aliases</span>
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
                              <label className="settings-field">
                                <span className="settings-label">Start.gg user ID</span>
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
                            </CardSection>

                            <div className="preset-actions">
                              <button
                                type="button"
                                className={`btn btn-primary ${isFlashed ? "btn-confirm" : ""}`}
                                onClick={() => savePlayer(i)}
                              >
                                {isFlashed ? "Saved" : "Save"}
                              </button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </Card>

        {/* ── Caster Presets ── */}
        <Card>
          <CardHeader
            title="Caster presets"
            eyebrow={`${casters.length} saved`}
            actions={
              <button type="button" className="btn-add" onClick={onAddCaster}>
                + Preset
              </button>
            }
          />

          <div className="preset-list">
            {casters.map((c, i) => {
              const k = cKey(c, i);
              const isOpen = expandedC.has(k);
              const isFlashed = flashed.has(k);
              const handlesMeta = [c.pronouns, ...c.socials
                .map((s) => s.handle)]
                .filter(Boolean)
                .join(" · ");
              return (
                <Card
                  key={k}
                  variant="compact"
                  className={`preset-card ${isOpen ? "is-open" : ""}`}
                >
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
                      className="btn-icon is-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCaster(i);
                      }}
                      aria-label="Remove preset"
                      title="Remove preset"
                    >
                      ×
                    </button>
                  </div>
                  {isOpen && (
                    <div className="preset-body">
                      <div className="preset-extras-grid">
                        <label className="settings-field">
                          <span className="settings-label">Name</span>
                          <input
                            placeholder="Caster name"
                            value={c.name}
                            onChange={(ev) =>
                              setCaster(i, { name: ev.target.value })
                            }
                          />
                        </label>
                        <label className="settings-field">
                          <span className="settings-label">Pronouns</span>
                          <input
                            placeholder="they/them"
                            value={c.pronouns ?? ""}
                            onChange={(ev) =>
                              setCaster(i, { pronouns: ev.target.value || undefined })
                            }
                          />
                        </label>
                      </div>
                      <SocialsEditor
                        value={c.socials}
                        onChange={(s) => setCaster(i, { socials: s })}
                      />
                      <div className="preset-actions">
                        <button
                          type="button"
                          className={`btn btn-primary ${isFlashed ? "btn-confirm" : ""}`}
                          onClick={() => saveCaster(i)}
                        >
                          {isFlashed ? "Saved" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </Card>
      </div>

      <CharacterPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={onPickCharacter}
        pack={pickerPack}
        assetsBase={assetsBase}
      />
    </>
  );
}
