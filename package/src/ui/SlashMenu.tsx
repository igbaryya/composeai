import { useEffect, useMemo, useRef } from "react";
import { cn } from "../internal/cn";
import { resolveSx, slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import type { SlashCommand } from "../types";

interface Props {
  options: SlashCommand[];
  selectedIndex: number;
  /** Renders skeleton rows while an async fetch is in flight + no items yet. */
  isLoading?: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export function SlashMenu({
  options,
  selectedIndex,
  isLoading = false,
  onSelect,
  onHover,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const { classNames, sx } = useComposerContext();

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${selectedIndex}"]`,
    );
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const grouped = options.reduce<Record<string, { item: SlashCommand; index: number }[]>>(
    (acc, item, index) => {
      const g = item.group ?? "Commands";
      if (!acc[g]) acc[g] = [];
      acc[g].push({ item, index });
      return acc;
    },
    {},
  );

  const menu = slotProps(
    "slashMenu",
    "z-50 w-72 origin-top animate-slide-up overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-soft",
    classNames,
    sx,
  );
  const itemStyle = useMemo(() => resolveSx(sx?.slashItem), [sx]);

  const showSkeleton = isLoading && options.length === 0;

  return (
    <div
      data-composer-popover="open"
      role="listbox"
      aria-label="Slash commands"
      aria-busy={isLoading || undefined}
      {...menu}
    >
      <ul ref={listRef} className="max-h-72 overflow-y-auto scrollbar-thin py-1">
        {showSkeleton && <SlashSkeleton rows={4} />}
        {Object.entries(grouped).map(([group, entries]) => (
          <li key={group}>
            <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {group}
            </div>
            <ul>
              {entries.map(({ item, index }) => (
                <li
                  key={item.id}
                  data-index={index}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(index);
                  }}
                  onMouseEnter={() => onHover(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 px-2.5 py-1.5 text-sm",
                    selectedIndex === index
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground",
                    classNames?.slashItem,
                  )}
                  style={itemStyle}
                >
                  {item.icon && (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate font-medium">{item.label}</span>
                    {item.description && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {item.description}
                      </span>
                    )}
                  </span>
                  {item.shortcut && (
                    <span className="ms-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {item.shortcut}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Shimmer rows shown while an async slash-commands resolver is in flight
 * and we don't yet have any items to display. Mirrors the icon + label +
 * description layout of a real command row.
 */
function SlashSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <li aria-hidden="true" className="px-2.5 py-1.5">
      <div className="px-0.5 pb-1.5 pt-0.5">
        <span className="block h-2 w-16 animate-pulse rounded bg-muted/70" />
      </div>
      <ul className="flex flex-col gap-1">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 rounded-md px-0 py-1.5"
          >
            <span className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-muted" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span
                className="h-2.5 animate-pulse rounded bg-muted"
                style={{ width: `${50 + ((i * 19) % 35)}%` }}
              />
              <span
                className="h-2 animate-pulse rounded bg-muted/70"
                style={{ width: `${30 + ((i * 13) % 30)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading commands…</span>
    </li>
  );
}