/**
 * QuickPrompts — a chip row of "starter" prompts rendered above the composer.
 *
 * Each chip click pipes through the provider's `runPrompt` channel; the
 * subscriber (registered by `ComposerInner`, which owns the editor state and
 * the submit function) then either:
 *   - inserts the prompt into the editor (`behavior: "initValue"`) so the
 *     user can edit it before sending, or
 *   - inserts AND immediately submits (`behavior: "sendValue"`, default).
 *
 * Visible subset selection is stable per mount: with `randomize: true`
 * (default) the picked items are shuffled once via Fisher-Yates and then
 * frozen for the lifetime of the component, so the chips don't reshuffle on
 * every parent re-render.
 */
import { useMemo } from "react";
import { cn } from "../internal/cn";
import { useComposerContext } from "../core/ComposerProvider";
import type { ComposerPromptsConfig } from "../types";

const DEFAULT_MAX = 3;
const HARD_CAP = 5;

interface Props {
  prompts: ComposerPromptsConfig;
}

function pickDisplay(
  items: string[],
  maxToShow: number | undefined,
  randomize: boolean | undefined,
): string[] {
  const cleaned = items.filter((s) => typeof s === "string" && s.length > 0);
  if (cleaned.length === 0) return [];
  const max = Math.min(Math.max(1, maxToShow ?? DEFAULT_MAX), HARD_CAP);
  if (cleaned.length <= max) return cleaned;
  if (randomize === false) return cleaned.slice(0, max);
  // Fisher-Yates — uses Math.random; fine for UI selection (not security).
  const arr = [...cleaned];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, max);
}

export function QuickPrompts({ prompts }: Props) {
  const { runPrompt, icons } = useComposerContext();
  const { sparkle: SparkleIcon } = icons;

  // Stable per mount. We DO want to re-pick if the consumer hands us a
  // brand-new items array (e.g. after fetching a fresh batch from the
  // server), so the array reference participates in the dep list.
  const display = useMemo(
    () => pickDisplay(prompts.items, prompts.maxToShow, prompts.randomize),
    [prompts.items, prompts.maxToShow, prompts.randomize],
  );

  if (display.length === 0) return null;

  const behavior = prompts.behavior ?? "sendValue";

  const handleClick = (prompt: string) => {
    prompts.onSelect?.(prompt);
    runPrompt(prompt, behavior);
  };

  return (
    <div
      role="group"
      aria-label="Quick prompts"
      className="flex flex-wrap items-center gap-2 px-1 pb-1"
    >
      {display.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => handleClick(p)}
          title={p}
          className={cn(
            "group inline-flex max-w-full items-center gap-1.5 rounded-full",
            "border border-border bg-card/60 px-3 py-1.5 text-xs",
            "text-muted-foreground backdrop-blur transition-all",
            "hover:-translate-y-px hover:border-primary/40 hover:bg-card",
            "hover:text-foreground hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
        >
          <SparkleIcon className="h-3 w-3 shrink-0 text-primary opacity-70 group-hover:opacity-100" />
          <span className="truncate" style={{ maxWidth: "32ch" }}>
            {p}
          </span>
        </button>
      ))}
    </div>
  );
}