/**
 * InContextTray — the "in context" chip row.
 *
 * Mounted twice — once above the editor (EditorShell's `header` slot, via
 * `<Composer />`) and once inside the action band (via `<Toolbar />`, so the
 * chips share the row with Send instead of stranding it on a line of its own).
 * Each instance knows which spot it is (`at`) and bows out unless
 * `inContext.placement` names it, so moving the row is a data change rather
 * than a different tree.
 *
 * The list itself is owned by the host and read straight off the provider —
 * the only state here is whether the overflow `+N` pill has been expanded,
 * which is purely presentational.
 */
import { useState } from "react";
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import { InContextChip } from "./InContextChip";

const DEFAULT_MAX_VISIBLE = 3;
const DEFAULT_PLACEMENT = "top";

interface Props {
  /** Which spot is rendering this instance. */
  at: "top" | "bottom";
}

export function InContextTray({ at }: Props) {
  const { inContext, classNames, sx } = useComposerContext();
  const [expanded, setExpanded] = useState(false);

  if (!inContext) return null;
  if ((inContext.placement ?? DEFAULT_PLACEMENT) !== at) return null;

  const { items, onSelect, onRemove } = inContext;
  const maxVisible = Math.max(1, inContext.maxVisible ?? DEFAULT_MAX_VISIBLE);
  const visible = expanded ? items : items.slice(0, maxVisible);
  const hidden = expanded ? [] : items.slice(maxVisible);

  const tray = slotProps(
    "inContextTray",
    "composer-context-tray",
    classNames,
    sx,
  );

  return (
    <div
      role="group"
      aria-label={inContext.label ?? "In context"}
      data-placement={at}
      {...tray}
    >
      {visible.map((item) => (
        <InContextChip
          key={item.id}
          item={item}
          onSelect={onSelect ? () => onSelect(item) : undefined}
          onRemove={onRemove ? () => onRemove(item) : undefined}
        />
      ))}
      {hidden.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={hidden.map((i) => i.label).join(", ")}
          aria-label={`Show ${hidden.length} more context ${hidden.length === 1 ? "item" : "items"}`}
          className="composer-context-more"
        >
          +{hidden.length}
        </button>
      )}
    </div>
  );
}
