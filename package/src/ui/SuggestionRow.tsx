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
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {items.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSelect(s)}
          className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur transition-all hover:-translate-y-px hover:border-primary/40 hover:bg-card hover:text-foreground hover:shadow-sm"
        >
          <SparkleIcon className="h-3 w-3 text-primary opacity-70 group-hover:opacity-100" />
          {s}
        </button>
      ))}
    </div>
  );
}