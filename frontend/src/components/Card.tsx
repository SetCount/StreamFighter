import type { CSSProperties, ReactNode } from "react";

type Variant = "default" | "accent" | "entity" | "compact" | "flat";

type Props = {
  variant?: Variant;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

const VARIANT_CLASS: Record<Variant, string> = {
  default: "",
  accent: "card--accent",
  entity: "card--entity",
  compact: "card--compact",
  flat: "card--flat",
};

export function Card({
  variant = "default",
  className,
  style,
  children,
}: Props) {
  const cls = ["card", VARIANT_CLASS[variant], className]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={cls} style={style}>
      {children}
    </section>
  );
}

type CardHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  swatch?: string;
};

export function CardHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  swatch,
}: CardHeaderProps) {
  return (
    <header className="card-header">
      <div>
        {eyebrow && <div className="card-eyebrow">{eyebrow}</div>}
        <h2 className="card-title">
          {swatch && (
            <span className="card-swatch" style={{ background: swatch }} />
          )}
          {title}
        </h2>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="card-actions">{actions}</div>}
    </header>
  );
}

type CardSectionProps = {
  title?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function CardSection({
  title,
  hint,
  children,
  className,
}: CardSectionProps) {
  const cls = ["card-section", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      {title && <h3 className="card-section-title">{title}</h3>}
      {hint && <p className="card-section-hint">{hint}</p>}
      {children}
    </div>
  );
}
