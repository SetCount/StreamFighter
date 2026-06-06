import "./Segmented.css";

type Option<T> = { value: T; label: string };

type Props<T extends string | number> = {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
};

export default function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: Props<T>) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className="segmented-btn"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
