import { useEffect, useRef, useState } from 'react';
import type { StartggSet } from '../types';
import { setStateLabel } from '../startgg';
import { Icon } from '../icons';
import './SetPicker.css';

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (s: StartggSet) => void;
    loading: boolean;
    error: string | null;
    sets: StartggSet[];
    tournamentName: string;
    onReload?: () => void;
};

function setSummary(s: StartggSet): string {
    const tags = s.entrants.map(e => e.name || e.players.map(p => p.gamerTag).join(' / '));
    return tags.join(' vs ');
}

function setSearchHaystack(s: StartggSet): string {
    return [s.eventName, s.fullRoundText, setSummary(s)].join(' ').toLowerCase();
}

export default function SetPicker({
    open, onClose, onSelect, loading, error, sets, tournamentName, onReload,
}: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const [filter, setFilter] = useState('');
    const [hideCompleted, setHideCompleted] = useState(true);

    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);

    useEffect(() => {
        if (open) setFilter('');
    }, [open]);

    const f = filter.trim().toLowerCase();
    let filtered = sets;
    if (hideCompleted) filtered = filtered.filter(s => s.state !== 3);
    if (f) filtered = filtered.filter(s => setSearchHaystack(s).includes(f));

    return (
        <dialog ref={ref} className="modal set-picker" onClose={onClose}>
            <header className="modal-header">
                <span className="modal-eyebrow">{tournamentName || 'start.gg'}</span>
                <h2 className="modal-title">Pick a set</h2>
                {onReload && (
                    <button
                        type="button"
                        className="btn-icon"
                        onClick={onReload}
                        disabled={loading}
                        title="Reload sets"
                        aria-label="Reload sets"
                    >
                        <Icon name="refresh" width={16} height={16} />
                    </button>
                )}
                <button
                    type="button"
                    className="btn-icon modal-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <Icon name="close" width={16} height={16} />
                </button>
            </header>
            <div className="modal-body">
                {loading && <div className="empty">Fetching sets…</div>}
                {error && <div className="empty error-msg">{error}</div>}
                {!loading && !error && (
                    <>
                        <div className="set-picker-controls">
                            <input
                                className="set-picker-filter"
                                placeholder="Filter by event, round, or tag…"
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                                autoFocus
                            />
                            <label className="set-picker-toggle">
                                <input
                                    type="checkbox"
                                    checked={hideCompleted}
                                    onChange={e => setHideCompleted(e.target.checked)}
                                />
                                Hide completed
                            </label>
                        </div>
                        {filtered.length === 0 ? (
                            <div className="empty">
                                {sets.length === 0
                                    ? 'No sets found for this tournament.'
                                    : 'No sets match your filter.'}
                            </div>
                        ) : (
                            <div className="set-list">
                                {filtered.map(s => {
                                    const stateLbl = setStateLabel(s.state);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            className="set-row"
                                            onClick={() => onSelect(s)}
                                        >
                                            <span className="set-event">{s.eventName}</span>
                                            <span className="set-round">{s.fullRoundText}</span>
                                            <span className="set-entrants">{setSummary(s)}</span>
                                            {stateLbl && (
                                                <span className={`set-state state-${s.state}`}>{stateLbl}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </dialog>
    );
}
