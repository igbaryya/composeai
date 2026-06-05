import { cn } from "../internal/cn";
import { useComposerContext } from "../core/ComposerProvider";

export interface SuggestionRowProps {
  /** Suggestion labels. Clicking one calls `onSelect` with that string. */
  items: string[];
  onSelect: (value: string) => void;
  className?: string;
}

export function SuggestionRow({ items, onSelect, className }: SuggestionRowProps) {
  const { icons } = useComposerContext();
  const { sparkle: SparkleIcon } = icons;
  return (
    <div className={cn("composer-suggestions", className)}>
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="composer-suggestion"
        >
          <SparkleIcon />
          {s}
        </button>
      ))}
    </div>
  );
}