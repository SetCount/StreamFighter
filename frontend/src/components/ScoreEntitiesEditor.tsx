import { useState, type CSSProperties } from "react";
import type { ScoreEntity, Player, GamePack, PlayerPreset } from "../types";
import { winCount } from "../reshape";
import { findPack, findCharacter, portraitURL, stockURL } from "../assets";
import { PORT_COLORS, paletteFor } from "../portColors";
import { Icon } from "../icons";
import CharacterPicker from "./CharacterPicker";
import { Card, CardHeader } from "./Card";
import "./ScoreEntitiesEditor.css";

type Props = {
  value: ScoreEntity[];
  onChange: (v: ScoreEntity[]) => void;
  canResize: boolean;
  format: string;
  bestOf: number;
  games: GamePack[];
  gameId: string;
  assetsBase: string;
  presets?: PlayerPreset[];
  onSavePlayerAsPreset?: (player: Player, portColor: string) => void;
};

const blankPlayer = (): Player => ({
  name: "",
  character: "",
  costume: 0,
});

function entityRole(format: string): string {
  if (format === "2v2") return "Team";
  if (format === "1v1") return "Player";
  return "Entity";
}

export default function ScoreEntitiesEditor({
  value,
  onChange,
  canResize,
  format,
  bestOf,
  games,
  gameId,
  assetsBase,
  presets = [],
  onSavePlayerAsPreset,
}: Props) {
  const pipCount = winCount(bestOf);
  const pack = findPack(games, gameId);
  const palette = paletteFor(pack, format);
  const role = entityRole(format);
  const blankEntity = (i: number): ScoreEntity => ({
    players: [blankPlayer()],
    currentScore: 0,
    portColor: palette[i] ?? palette[0] ?? PORT_COLORS[0],
  });
  const [pickerFor, setPickerFor] = useState<{ ei: number; pi: number } | null>(
    null,
  );

  const setEntity = (i: number, patch: Partial<ScoreEntity>) => {
    const next = [...value];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const setPlayer = (ei: number, pi: number, patch: Partial<Player>) => {
    const players = [...value[ei].players];
    players[pi] = { ...players[pi], ...patch };
    setEntity(ei, { players });
  };
  const onPipClick = (i: number, n: number) => {
    const current = value[i].currentScore;
    setEntity(i, { currentScore: current >= n ? n - 1 : n });
  };

  const addEntity = () => onChange([...value, blankEntity(value.length)]);
  const removeEntity = (i: number) =>
    onChange(value.filter((_, idx) => idx !== i));
  const addPlayer = (ei: number) =>
    setEntity(ei, { players: [...value[ei].players, blankPlayer()] });
  const removePlayer = (ei: number, pi: number) =>
    setEntity(ei, {
      players: value[ei].players.filter((_, idx) => idx !== pi),
    });

  // When picking a character we default to the first available costume
  // in the pack so the portrait renders immediately. If no costumes are
  // loaded we fall back to 0 (unset) and the stock row stays empty.
  // When the typed name matches a preset (by name or alias,
  // case-insensitive), apply it: name, character/costume (only if the
  // preset defines them), startgg ID, and port color (preset wins).
  // Plain edits that don't hit a preset just update the name.
  const onNameChange = (ei: number, pi: number, raw: string) => {
    const lc = raw.toLowerCase();
    const wasLc = value[ei].players[pi].name.toLowerCase();
    const match = presets.find(
      (p) =>
        p.name.toLowerCase() === lc ||
        p.aliases?.some((a) => a.toLowerCase() === lc),
    );
    if (match && wasLc !== lc) {
      const cur = value[ei].players[pi];
      const playerPatch: Partial<Player> = {
        name: match.name,
        pronouns: match.pronouns,
        prefix: match.prefix,
        character: match.character ?? cur.character,
        costume: match.costume ?? cur.costume,
        startggPlayerId: match.startggPlayerId,
      };
      if (match.portColor) {
        const players = [...value[ei].players];
        players[pi] = { ...players[pi], ...playerPatch };
        setEntity(ei, { players, portColor: match.portColor });
      } else {
        setPlayer(ei, pi, playerPatch);
      }
    } else {
      setPlayer(ei, pi, { name: raw });
    }
  };

  const onPickCharacter = (charId: string | null) => {
    if (pickerFor) {
      const char = charId ? findCharacter(pack, charId) : undefined;
      const firstCostume = char?.costumes[0]?.index ?? 0;
      setPlayer(pickerFor.ei, pickerFor.pi, {
        character: charId ?? "",
        costume: firstCostume,
      });
    }
    setPickerFor(null);
  };

  const swapEntities = (a: number, b: number) => {
    const next = [...value];
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next);
  };

  return (
    <div className="entity-board">
      <datalist id="player-preset-names">
        {presets.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      {value.map((e, i) => (
        <div key={i} className="entity-slot">
          {i > 0 && (
            <button
              type="button"
              className="btn-icon entity-swap"
              aria-label={`Swap ${role} ${i} and ${role} ${i + 1}`}
              title="Swap"
              onClick={() => swapEntities(i - 1, i)}
            >
              <Icon name="swap" width={16} height={16} />
            </button>
          )}

          <Card
            variant="entity"
            style={{ "--port-color": e.portColor || "transparent" } as CSSProperties}
          >
            <CardHeader
              eyebrow={`${role} ${i + 1}`}
              title={
                e.players[0]?.name?.trim()
                  ? e.players[0].name
                  : <span className="entity-name-placeholder">Unnamed</span>
              }
              swatch={e.portColor || "transparent"}
              actions={
                canResize && (
                  <button
                    type="button"
                    className="btn-icon is-danger"
                    onClick={() => removeEntity(i)}
                    disabled={value.length <= 2}
                    aria-label={`Remove ${role}`}
                    title="Remove"
                  >
                    ×
                  </button>
                )
              }
            />

            <div className="entity-meters">
              <div className="entity-meter">
                <span className="entity-meter-label">
                  {format === "2v2" ? "Team color" : "Port"}
                </span>
                <div
                  className="color-swatches"
                  role="radiogroup"
                  aria-label={format === "2v2" ? "Team Color" : "Port Color"}
                >
                  {palette.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="color-swatch"
                      role="radio"
                      aria-checked={e.portColor === c}
                      aria-label={c}
                      style={{ background: c }}
                      onClick={() => setEntity(i, { portColor: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="entity-meter">
                <span className="entity-meter-label">
                  Score <span className="entity-meter-value">{e.currentScore}/{pipCount}</span>
                </span>
                <div className="pips" role="group" aria-label="Score">
                  {Array.from({ length: pipCount }, (_, idx) => idx + 1).map(
                    (n) => (
                      <button
                        key={n}
                        type="button"
                        className="pip"
                        aria-pressed={e.currentScore >= n}
                        aria-label={`Score ${n}`}
                        onClick={() => onPipClick(i, n)}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="entity-players">
              {e.players.map((p, pi) => {
                const char = findCharacter(pack, p.character);
                const costumes = char?.costumes ?? [];
                return (
                  <div key={pi} className="entity-player">
                    <div className="entity-player-head">
                      <input
                        className="entity-player-name"
                        placeholder="Player name"
                        value={p.name}
                        list="player-preset-names"
                        onChange={(ev) => onNameChange(i, pi, ev.target.value)}
                      />
                      {onSavePlayerAsPreset && p.name && (
                        <button
                          type="button"
                          className="btn-icon btn-icon-soft"
                          title="Save as preset"
                          aria-label="Save as preset"
                          onClick={() => onSavePlayerAsPreset(p, e.portColor)}
                        >
                          ⊕
                        </button>
                      )}
                      {canResize && (
                        <button
                          type="button"
                          className="btn-icon is-danger"
                          onClick={() => removePlayer(i, pi)}
                          disabled={e.players.length <= 1}
                          aria-label="Remove player"
                          title="Remove"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    <div className="entity-player-extras">
                      <input
                        placeholder="Pronouns"
                        value={p.pronouns ?? ""}
                        onChange={(ev) =>
                          setPlayer(i, pi, {
                            pronouns: ev.target.value || undefined,
                          })
                        }
                      />
                      <input
                        placeholder="Prefix / Team tag"
                        value={p.prefix ?? ""}
                        onChange={(ev) =>
                          setPlayer(i, pi, { prefix: ev.target.value || undefined })
                        }
                      />
                    </div>

                    <button
                      type="button"
                      className={`entity-portrait ${p.character ? "is-filled" : "is-empty"}`}
                      onClick={() => setPickerFor({ ei: i, pi })}
                      aria-label="Choose character"
                    >
                      {p.character && p.costume > 0 ? (
                        <img
                          src={portraitURL(
                            assetsBase,
                            gameId,
                            p.character,
                            p.costume,
                          )}
                          alt={char?.name ?? p.character}
                        />
                      ) : (
                        <span className="entity-portrait-empty">
                          <span className="entity-portrait-empty-icon">+</span>
                          <span>
                            {p.character ? (char?.name ?? p.character) : "Choose character"}
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
                              setPlayer(i, pi, { costume: cos.index })
                            }
                          >
                            <img
                              src={stockURL(
                                assetsBase,
                                gameId,
                                p.character,
                                cos.index,
                              )}
                              alt=""
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {canResize && (
                <button
                  type="button"
                  className="btn-add entity-add-player"
                  onClick={() => addPlayer(i)}
                >
                  + Player
                </button>
              )}
            </div>
          </Card>
        </div>
      ))}

      {canResize && (
        <button type="button" className="btn-add entity-add-card" onClick={addEntity}>
          + {role}
        </button>
      )}

      <CharacterPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={onPickCharacter}
        pack={pack}
        assetsBase={assetsBase}
      />
    </div>
  );
}
