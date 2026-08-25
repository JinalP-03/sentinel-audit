// ---------------------------------------------------------------------------
// Shared design tokens and primitive components.
// Import these into any page so the design system stays consistent.
// ---------------------------------------------------------------------------

/** Card shell — white/dark-900 with a subtle border */
export const card =
  "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

/** Secondary / supporting text */
export const muted = "text-zinc-500 dark:text-zinc-400";

/** Primary body text */
export const primary = "text-zinc-900 dark:text-zinc-100";

// ---------------------------------------------------------------------------
// SectionLabel
// ---------------------------------------------------------------------------

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
