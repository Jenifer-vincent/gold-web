import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:mb-8">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
            {eyebrow}
          </div>
        )}
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
