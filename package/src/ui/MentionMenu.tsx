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

  const menu = slotProps("mentionMenu", "composer-menu", classNames, sx);
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
      <ul ref={listRef} className="composer-menu-list">
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
            className={cn("composer-menu-item", classNames?.mentionItem)}
            style={itemStyle}
          >
            {item.avatarUrl ? (
              <Avatar src={item.avatarUrl} alt={item.label} />
            ) : item.icon ? (
              <span className="composer-menu-avatar">{item.icon}</span>
            ) : (
              <span className="composer-menu-avatar">
                {item.label.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="composer-menu-text">
              <span className="composer-menu-label">{item.label}</span>
              {item.description && (
                <span className="composer-menu-desc">{item.description}</span>
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
 * layout of a real mention row. Pure CSS animation via the `composer-pulse`
 * class — no JS keyframes, no layout thrash.
 */
function MentionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <li aria-hidden="true" className="composer-skel-row">
      <ul className="composer-skel-group">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="composer-skel-line">
            <span className="composer-skel-avatar composer-pulse" />
            <span className="composer-skel-text">
              <span
                className="composer-skel-bar composer-pulse"
                style={{ width: `${60 + ((i * 17) % 30)}%` }}
              />
              <span
                className="composer-skel-bar--sm composer-pulse"
                style={{ width: `${35 + ((i * 23) % 25)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
      <span className="composer-sr-only">Loading suggestions…</span>
    </li>
  );
}