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
    "composer-menu composer-menu--slash",
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
      <ul ref={listRef} className="composer-menu-list">
        {showSkeleton && <SlashSkeleton rows={4} />}
        {Object.entries(grouped).map(([group, entries]) => (
          <li key={group}>
            <div className="composer-menu-group">{group}</div>
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
                  className={cn("composer-menu-item", classNames?.slashItem)}
                  style={itemStyle}
                >
                  {item.icon && (
                    <span className="composer-menu-icon">{item.icon}</span>
                  )}
                  <span className="composer-menu-text">
                    <span className="composer-menu-label">{item.label}</span>
                    {item.description && (
                      <span className="composer-menu-desc">
                        {item.description}
                      </span>
                    )}
                  </span>
                  {item.shortcut && (
                    <span className="composer-menu-shortcut">
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
    <li aria-hidden="true" className="composer-skel-row">
      <span className="composer-skel-grouplabel composer-pulse" />
      <ul className="composer-skel-group">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="composer-skel-line">
            <span className="composer-skel-avatar composer-skel-avatar--square composer-pulse" />
            <span className="composer-skel-text">
              <span
                className="composer-skel-bar composer-pulse"
                style={{ width: `${50 + ((i * 19) % 35)}%` }}
              />
              <span
                className="composer-skel-bar--sm composer-pulse"
                style={{ width: `${30 + ((i * 13) % 30)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <span className="composer-sr-only">Loading commands…</span>
    </li>
  );
}