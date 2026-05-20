import type { Social } from '../types';
import { Icon } from '../icons';

export const SOCIAL_PLATFORMS = [
    { key: 'twitter', label: 'X (Twitter)' },
    { key: 'bluesky', label: 'Bluesky' },
    { key: 'twitch',  label: 'Twitch' },
    { key: 'discord', label: 'Discord' },
] as const;

type SocialKey = typeof SOCIAL_PLATFORMS[number]['key'];

const blankSocial = (): Social => ({ icon: 'twitter', handle: '' });

type Props = {
    value: Social[];
    onChange: (v: Social[]) => void;
};

export default function SocialsEditor({ value, onChange }: Props) {
    const setSocial = (i: number, patch: Partial<Social>) => {
        const next = [...value];
        next[i] = { ...next[i], ...patch };
        onChange(next);
    };
    const add = () => onChange([...value, blankSocial()]);
    const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

    return (
        <div className="socials">
            {value.map((s, si) => (
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
                                onClick={() => setSocial(si, { icon: p.key as SocialKey })}
                            >
                                <Icon name={p.key} width="1em" height="1em" />
                            </button>
                        ))}
                    </div>
                    <input
                        placeholder="@handle"
                        value={s.handle}
                        onChange={ev => setSocial(si, { handle: ev.target.value })}
                    />
                    <button className="icon-btn" onClick={() => remove(si)}>×</button>
                </div>
            ))}
            <button className="add-row" onClick={add}>+ Social</button>
        </div>
    );
}
