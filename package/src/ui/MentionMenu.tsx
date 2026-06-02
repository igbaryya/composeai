import { useEffect, useMemo, useRef } from "react";
import { cn } from "../internal/cn";
import { resolveSx, slotProps } from "../internal/sx";
import { Avatar } from "../internal/Avatar";
import { useComposerContext } from "../core/ComposerProvider";
import type { MentionItem } from "../types";

interface Props {
  options: MentionItem[];
  selectedIndex: number;
  /** Renders skeleton rows while an async fetch is in flight + no items yet. */
  isLoading?: boolean;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
}

export function MentionMenu({
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

  const menu = slotProps(
    "mentionMenu",
    "z-50 w-64 origin-top animate-slide-up overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-soft",
    classNames,
    sx,
  );
  const itemStyle = useMemo(() => resolveSx(sx?.mentionItem), [sx]);

  // Only show skeleton when we genuinely have nothing to display — once
  // we have stale items from a previous query we keep showing them while
  // the next fetch resolves to avoid flicker.
  const showSkeleton = isLoading && options.length === 0;

  return (
    <div
      data-composer-popover="open"
      role="listbox"
      aria-label="Mentions"
      aria-busy={isLoading || undefined}
      {...menu}
    >
      <ul ref={listRef} className="max-h-72 overflow-y-auto scrollbar-thin py-1">
        {showSkeleton ? (
          <MentionSkeleton rows={3} />
        ) : null}
        {options.map((item, index) => (
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
              classNames?.mentionItem,
            )}
            style={itemStyle}
          >
            {item.avatarUrl ? (
              <Avatar src={item.avatarUrl} alt={item.label} />
            ) : item.icon ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {item.icon}
              </span>
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.label.slice(0, 1).toUpperCase()}
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
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Three-line shimmer placeholder mirroring the avatar + label + description
 * layout of a real mention row. Pure CSS animation via the `animate-pulse`
 * utility — no JS keyframes, no layout thrash.
 */
function MentionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <li aria-hidden="true" className="px-2.5 py-1.5">
      <ul className="flex flex-col gap-1">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 rounded-md px-0 py-1.5"
          >
            <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-muted" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span
                className="h-2.5 animate-pulse rounded bg-muted"
                style={{ width: `${60 + ((i * 17) % 30)}%` }}
              />
              <span
                className="h-2 animate-pulse rounded bg-muted/70"
                style={{ width: `${35 + ((i * 23) % 25)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading suggestions…</span>
    </li>
  );
}