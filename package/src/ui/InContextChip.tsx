import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import type { ContextItem } from "../types";

interface Props {
  item: ContextItem;
  /** Provided only when the consumer supplied `inContext.onSelect`. */
  onSelect?: () => void;
  /** Provided only when the consumer supplied `inContext.onRemove`. */
  onRemove?: () => void;
  /** Provided only when the consumer supplied `inContext.onRestore`. */
  onRestore?: () => void;
}

/**
 * One "in context" chip. The body is a button when the consumer wants clicks
 * and a plain span otherwise, so an inert indicator never lands in the tab
 * order or reads as actionable to a screen reader.
 *
 * A withheld item keeps its chip — struck through, and with the dismiss `×`
 * swapped for a restore control. That's the whole point of the flag: since
 * dismissing takes one click, the way back has to stay on screen rather than
 * the item vanishing with no trace.
 */
export function InContextChip({ item, onSelect, onRemove, onRestore }: Props) {
  const { icons, classNames, sx } = useComposerContext();
  const {
    context: ContextIcon,
    close: CloseIcon,
    restore: RestoreIcon,
  } = icons;
  const chip = slotProps("inContextChip", "composer-context-chip", classNames, sx);

  // The tooltip is where the full path / source lives — the chip itself stays
  // one truncated line so a long list doesn't crowd out the editor.
  const detail = item.description
    ? `${item.label} — ${item.description}`
    : item.label;
  const title = item.withheld ? `${detail} (withheld)` : detail;

  // Exactly one trailing control, and only when the consumer wired up the
  // matching callback — same gating as `onSelect` on the body.
  const action = item.withheld
    ? onRestore && {
        onClick: onRestore,
        icon: <RestoreIcon />,
        label: `Restore ${item.label} to context`,
      }
    : onRemove && {
        onClick: onRemove,
        icon: <CloseIcon />,
        label: `Remove ${item.label} from context`,
      };

  const body = (
    <>
      <span className="composer-context-chip-icon">
        {item.icon ?? <ContextIcon />}
      </span>
      <span className="composer-context-chip-label">{item.label}</span>
    </>
  );

  return (
    <span {...chip} data-withheld={item.withheld ? "" : undefined} title={title}>
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
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.label}
          className="composer-context-chip-action"
        >
          {action.icon}
        </button>
      )}
    </span>
  );
}
