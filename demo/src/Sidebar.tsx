/**
 * Persistent navigation listing every composer demo. On mobile it slides in
 * as an overlay; on desktop it collapses inline.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Github, Search, Sparkles, X } from "lucide-react";
import { DEMOS, HOME, type DemoSpec } from "./demos";

interface Props {
  open: boolean;
  onClose: () => void;
  activeId: string;
  onPick: (id: string) => void;
}

/**
 * Lower-cased haystack for a single demo. Pre-built once per demo so the
 * search filter stays cheap as the user types — we only do a single
 * `includes` call per demo per keystroke.
 */
function demoHaystack(demo: DemoSpec): string {
  return `${demo.title} ${demo.tagline} ${demo.group} ${demo.id}`.toLowerCase();
}

export function Sidebar({ open, onClose, activeId, onPick }: Props) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Group demos preserving the declared order. Filtering is applied first
  // so groups that have no matches collapse away from the nav entirely.
  const orderedGroupNames = useMemo(
    () => Array.from(new Set(DEMOS.map((d) => d.group))),
    [],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const isSearching = trimmedQuery.length > 0;

  const filteredDemos = useMemo(() => {
    if (!isSearching) return DEMOS;
    return DEMOS.filter((d) => demoHaystack(d).includes(trimmedQuery));
  }, [isSearching, trimmedQuery]);

  const groups = useMemo(
    () =>
      filteredDemos.reduce<Record<string, DemoSpec[]>>((acc, demo) => {
        (acc[demo.group] ||= []).push(demo);
        return acc;
      }, {}),
    [filteredDemos],
  );

  // Whether the pinned Home entry should appear under the current query.
  // Always visible without a query; otherwise only if it matches.
  const homeMatches =
    !isSearching ||
    `${HOME.title} ${HOME.tagline} ${HOME.group} ${HOME.id}`
      .toLowerCase()
      .includes(trimmedQuery);

  const noMatches = isSearching && filteredDemos.length === 0 && !homeMatches;

  // Global ⌘K / Ctrl+K shortcut to jump straight to the search field —
  // mirrors the affordance most command-palette-style sidebars expose.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={
          // On desktop the sidebar is sticky-positioned at the top of the
          // viewport with `h-screen`. This works in BOTH layouts:
          //   - Home: the document scrolls, so the sidebar pins to the top
          //     while body content scrolls past it (native browser scroll).
          //   - Demos: the outer container is `h-screen overflow-hidden`, so
          //     the document doesn't scroll — sticky degrades to static and
          //     the sidebar simply fills the viewport. Same end result.
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-card transition-all duration-200 md:sticky md:top-0 md:inset-y-auto md:h-screen md:self-start " +
          (open
            ? "translate-x-0 md:w-72"
            : "-translate-x-full md:w-0 md:overflow-hidden md:border-r-0")
        }
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">
                ComposeAI
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                demo gallery
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-border px-3 py-2">
          <label className="relative block">
            <span className="sr-only">Search demos</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Search demos…"
              spellCheck={false}
              autoComplete="off"
              className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-14 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[9px] font-medium text-muted-foreground"
              >
                ⌘K
              </kbd>
            )}
          </label>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
          {/* Pinned Home/overview link sits above the demo groups so it's
              always reachable without scrolling. Hidden when it doesn't
              match the active query so the result list stays tight. */}
          {homeMatches && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => onPick(HOME.id)}
                className={
                  "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors " +
                  (activeId === HOME.id
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")
                }
              >
                <span
                  className={
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors " +
                    (activeId === HOME.id
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground")
                  }
                >
                  {HOME.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-tight">
                    {HOME.title}
                  </span>
                  <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                    {HOME.tagline}
                  </span>
                </span>
              </button>
            </div>
          )}

          {noMatches && (
            <div className="px-2 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                No demos match{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-2 text-[11px] font-medium text-primary hover:underline"
              >
                Clear search
              </button>
            </div>
          )}

          {orderedGroupNames
            .filter((g) => groups[g] && groups[g].length > 0)
            .map((groupName) => (
            <div key={groupName} className="mb-4">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {groupName}
              </div>
              <ul className="space-y-0.5">
                {groups[groupName].map((demo) => {
                  const isActive = demo.id === activeId;
                  return (
                    <li key={demo.id}>
                      <button
                        type="button"
                        onClick={() => onPick(demo.id)}
                        className={
                          "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors " +
                          (isActive
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground")
                        }
                      >
                        <span
                          className={
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors " +
                            (isActive
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground group-hover:bg-background group-hover:text-foreground")
                          }
                        >
                          {demo.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium leading-tight">
                            {demo.title}
                          </span>
                          <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                            {demo.tagline}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" />
            <span className="font-mono">composeai</span>
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              v0.1.0
            </span>
          </a>
        </div>
      </aside>
    </>
  );
}