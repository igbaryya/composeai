/**
 * QuickPrompts — a chip row of "starter" prompts rendered above the composer.
 *
 * Each chip click pipes through the provider's `runPrompt` channel; the
 * subscriber (registered by `ComposerInner`, which owns the editor state and
 * the submit function) then either:
 *   - inserts the prompt into the editor (`behavior: "initValue"`, default) so
 *     the user can edit it before sending, or
 *   - inserts AND immediately submits (`behavior: "sendValue"`).
 *
 * The row scrolls horizontally rather than wrapping — one tidy line whatever
 * the prompt lengths — and fades out at whichever edge still has content past
 * it. The fade is a mask, not an overlay, because the composer sits on an
 * arbitrary app background we can't paint a gradient against.
 *
 * Visible subset selection is stable per mount: with `randomize: true`
 * (default) the picked items are shuffled once via Fisher-Yates and then
 * frozen for the lifetime of the component, so the chips don't reshuffle on
 * every parent re-render.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useComposerContext } from "../core/ComposerProvider";
import type { ComposerPromptsConfig } from "../types";

const DEFAULT_MAX = 3;

interface Props {
  prompts: ComposerPromptsConfig;
}

interface Overflow {
  /** Content scrolled past the leading edge. */
  start: boolean;
  /** Content still waiting past the trailing edge. */
  end: boolean;
}

const NO_OVERFLOW: Overflow = { start: false, end: false };

function pickDisplay(
  items: string[],
  maxToShow: number | undefined,
  randomize: boolean | undefined,
): string[] {
  const cleaned = items.filter((s) => typeof s === "string" && s.length > 0);
  if (cleaned.length === 0) return [];
  // No upper bound: the row is a single scrolling line now, so extra chips
  // cost horizontal scroll rather than stacking rows over the composer.
  const max = Math.max(1, maxToShow ?? DEFAULT_MAX);
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

/**
 * Tracks which edges of the chip scroller still have content past them, so
 * the CSS can fade only those. `scrollLeft` counts up from the *logical*
 * start and runs negative in RTL, so both edges are read off its magnitude
 * and the result stays direction-agnostic.
 *
 * `items` is a dep, not data: a new chip list changes the scroll width
 * without resizing the scroller, so the ResizeObserver alone would miss it.
 */
function useScrollOverflow(items: string[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<Overflow>(NO_OVERFLOW);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const offset = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    // 1px slack — fractional layout widths otherwise leave a fade stuck on
    // at a hard scroll stop.
    const next: Overflow = { start: offset > 1, end: offset < max - 1 };
    setOverflow((prev) =>
      prev.start === next.start && prev.end === next.end ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // Catches the composer being resized under a fixed chip list.
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync, items]);

  return { ref, overflow };
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
  const { ref, overflow } = useScrollOverflow(display);

  if (display.length === 0) return null;

  const behavior = prompts.behavior ?? "initValue";

  const handleClick = (prompt: string) => {
    prompts.onSelect?.(prompt);
    runPrompt(prompt, behavior);
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Quick prompts"
      className="composer-prompts"
      data-overflow-start={overflow.start ? "" : undefined}
      data-overflow-end={overflow.end ? "" : undefined}
    >
      {display.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => handleClick(p)}
          title={p}
          className="composer-prompt"
        >
          <SparkleIcon />
          <span className="composer-prompt-text" style={{ maxWidth: "32ch" }}>
            {p}
          </span>
        </button>
      ))}
    </div>
  );
}
