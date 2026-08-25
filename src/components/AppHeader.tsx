"use client";

import Link from "next/link";

type Page = "audit" | "comparison";

type Props = {
  dark: boolean;
  onToggle: () => void;
  activePage: Page;
};

const NAV: { label: string; href: string; page: Page }[] = [
  { label: "Audit", href: "/", page: "audit" },
  { label: "Model Comparison", href: "/model-comparison", page: "comparison" },
];

export function AppHeader({ dark, onToggle, activePage }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Sentinel
          </span>
          <span className="hidden text-xs text-zinc-400 sm:block dark:text-zinc-600">
            AI Voice Agent Compliance Auditor
          </span>
        </div>

        {/* Right side: nav + dark toggle */}
        <div className="flex items-center gap-1">

          {/* Nav links */}
          {NAV.map(({ label, href, page }) => {
            const active = page === activePage;
            return (
              <Link
                key={page}
                href={href}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {label}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="mx-2 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

          {/* Dark mode toggle */}
          <button
            onClick={onToggle}
            aria-label="Toggle dark mode"
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {dark ? (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71m12.73 0-.71-.71M6.34 6.34l-.71-.71M12 7a5 5 0 100 10A5 5 0 0012 7z"
                  />
                </svg>
                Light
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
                Dark
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
