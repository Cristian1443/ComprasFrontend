import React from "react";
import { Loader2 } from "lucide-react";

export function UxCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`ux-card ${className}`}>{children}</div>;
}

export function UxEmptyState({
  title,
  description,
  icon,
  className = "",
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <UxCard className={`p-10 text-center ${className}`}>
      {icon ? <div className="mx-auto mb-4 w-fit text-[var(--ui-text-subtle)]">{icon}</div> : null}
      <h3 className="text-xl font-black text-[var(--ui-text)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--ui-text-soft)]">{description}</p>
    </UxCard>
  );
}

export function UxLoadingState({
  text = "Cargando...",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  return (
    <UxCard className={`p-12 text-center ${className}`}>
      <Loader2 className="mx-auto mb-4 animate-spin text-[var(--brand-primary)]" size={34} />
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--ui-text-soft)]">{text}</p>
    </UxCard>
  );
}

export function UxStatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "ux-status-pill-success"
      : tone === "warning"
        ? "ux-status-pill-warning"
        : tone === "danger"
          ? "ux-status-pill-danger"
          : tone === "info"
            ? "ux-status-pill-info"
            : "ux-status-pill-neutral";

  return (
    <span className={`ux-status-pill ${toneClass}`}>
      {children}
    </span>
  );
}
