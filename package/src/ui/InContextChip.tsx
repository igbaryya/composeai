import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import type { ContextItem } from "../types";

interface Props {
  item: ContextItem;
  /** Provided only when the consumer supplied `inContext.onSelect`. */
  onSelect?: () => void;
  /** Provided only when the consumer supplied `inContext.onRemove`. */
  onRemove?: () => void;
}

/**
 * One "in context" chip. The body is a button when the consumer wants clicks
 * and a plain span otherwise, so an inert indicator never lands in the tab
 * order or reads as actionable to a screen reader.
 */
export function InContextChip({ item, onSelect, onRemove }: Props) {
  const { icons, classNames, sx } = useComposerContext();
  const { context: ContextIcon, close: CloseIcon } = icons;
  const chip = slotProps("inContextChip", "composer-context-chip", classNames, sx);
  // The tooltip is where the full path / source lives — the chip itself stays
  // one truncated line so a long list doesn't crowd out the editor.
  const title = item.description
    ? `${item.label} — ${item.description}`
    : item.label;

  const body = (
    <>
      <span className="composer-context-chip-icon">
        {item.icon ?? <ContextIcon />}
      </span>
      <span className="composer-context-chip-label">{item.label}</span>
    </>
  );

  return (
    <span {...chip} title={title}>
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="composer-context-chip-body"
        >
          {body}
        </button>
      ) : (
        <span className="composer-context-chip-body">{body}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.label} from context`}
          className="composer-context-chip-remove"
        >
          <CloseIcon />
        </button>
      )}
    </span>
  );
}
