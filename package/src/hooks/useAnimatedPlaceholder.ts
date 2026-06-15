import { useEffect, useRef, useState } from "react";

/**
 * Tuning knobs for {@link useAnimatedPlaceholder}. All values are in
 * milliseconds. Defaults give a calm, readable typewriter cadence.
 */
export interface AnimatedPlaceholderTiming {
  /** Delay between revealing each character while typing. */
  typeSpeed?: number;
  /** Delay between removing each character while deleting. */
  deleteSpeed?: number;
  /** How long a fully-typed phrase rests before it starts deleting. */
  holdDuration?: number;
  /** Pause on the empty string before the next phrase begins typing. */
  pauseDuration?: number;
}

export interface AnimatedPlaceholderOptions extends AnimatedPlaceholderTiming {
  /**
   * When `true` the phrase list cycles forever. When `false` (default) the
   * list plays through once and then settles — on {@link settleTo} if given,
   * otherwise on the last phrase (left on screen).
   */
  loop?: boolean;
  /**
   * Static text to rest on once a non-looping run finishes. When omitted the
   * last phrase stays on screen instead. Ignored while `loop` is `true`.
   */
  settleTo?: string;
}

/** A single frame of the animation, surfaced to the caller. */
export interface AnimatedPlaceholderState {
  /** The text to render right now. */
  text: string;
  /** `true` while the typewriter is running — drives the blinking caret. */
  active: boolean;
}

const DEFAULT_TIMING: Required<AnimatedPlaceholderTiming> = {
  typeSpeed: 55,
  deleteSpeed: 28,
  holdDuration: 1800,
  pauseDuration: 450,
};

type Phase = "typing" | "holding" | "deleting" | "pausing" | "settling";

/**
 * Drives a typewriter animation over a list of placeholder phrases: each
 * phrase is revealed one character at a time, held, erased, and the next
 * begins. With `loop` it cycles forever; without it (the default) it plays
 * through once and settles (see {@link AnimatedPlaceholderOptions.settleTo}).
 *
 * Returns the current frame as {@link AnimatedPlaceholderState}, or `null`
 * when there's nothing to animate (no phrases, or `enabled === false`) so the
 * caller can fall back to a static placeholder. The animation is paused (and
 * the loop torn down) while `enabled` is false — pass `!hasText` so typing
 * stops it the moment the placeholder is hidden anyway.
 *
 * Respects `prefers-reduced-motion`: the first phrase is shown statically with
 * no animation.
 */
export function useAnimatedPlaceholder(
  phrases: string[] | undefined,
  enabled: boolean,
  options?: AnimatedPlaceholderOptions,
): AnimatedPlaceholderState | null {
  const [state, setState] = useState<AnimatedPlaceholderState>({
    text: "",
    active: true,
  });

  // Latest options live in a ref so changing the settle target / timing never
  // restarts the running loop (which would reset the animation mid-phrase).
  const optsRef = useRef<AnimatedPlaceholderOptions>({});
  optsRef.current = options ?? {};

  const active = enabled && Array.isArray(phrases) && phrases.length > 0;
  // A stable key from the phrase contents: re-runs the effect only when the
  // *words* change, not when a parent hands us a fresh array literal.
  const key = active ? phrases!.join("␟") : "";
  const loop = !!options?.loop;

  // Keep the array itself out of the dep list; read it through a ref instead.
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  useEffect(() => {
    if (!active) {
      setState({ text: "", active: true });
      return;
    }

    const list = phrasesRef.current!;
    const lastIdx = list.length - 1;

    const reduceMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      // No motion: surface the first phrase statically, no caret.
      setState({ text: list[0], active: false });
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let phraseIdx = 0;
    let charIdx = 0;
    let phase: Phase = "typing";

    const tick = () => {
      const timing = { ...DEFAULT_TIMING, ...optsRef.current };
      const { typeSpeed, deleteSpeed, holdDuration, pauseDuration } = timing;
      const settleTo = optsRef.current.settleTo;
      const current = list[phraseIdx];
      const isLast = phraseIdx === lastIdx;

      switch (phase) {
        case "typing": {
          charIdx += 1;
          setState({ text: current.slice(0, charIdx), active: true });
          if (charIdx >= current.length) {
            phase = "holding";
            timer = setTimeout(tick, holdDuration);
          } else {
            timer = setTimeout(tick, typeSpeed);
          }
          break;
        }
        case "holding": {
          // End of a non-looping run: either rest on a given settle target
          // (delete the phrase first, then show it) or just leave the last
          // phrase on screen with the caret off.
          if (!loop && isLast) {
            if (settleTo !== undefined) {
              phase = "settling";
              timer = setTimeout(tick, deleteSpeed);
            } else {
              setState({ text: current, active: false });
            }
          } else {
            phase = "deleting";
            timer = setTimeout(tick, deleteSpeed);
          }
          break;
        }
        case "deleting": {
          charIdx -= 1;
          setState({ text: current.slice(0, Math.max(0, charIdx)), active: true });
          if (charIdx <= 0) {
            phase = "pausing";
            timer = setTimeout(tick, pauseDuration);
          } else {
            timer = setTimeout(tick, deleteSpeed);
          }
          break;
        }
        case "pausing": {
          phraseIdx = phraseIdx >= lastIdx ? 0 : phraseIdx + 1;
          charIdx = 0;
          phase = "typing";
          timer = setTimeout(tick, typeSpeed);
          break;
        }
        case "settling": {
          // Erase the final phrase, then come to rest on the settle target.
          charIdx -= 1;
          if (charIdx <= 0) {
            setState({ text: settleTo ?? "", active: false });
          } else {
            setState({ text: current.slice(0, charIdx), active: true });
            timer = setTimeout(tick, deleteSpeed);
          }
          break;
        }
      }
    };

    timer = setTimeout(tick, DEFAULT_TIMING.typeSpeed);
    return () => clearTimeout(timer);
  }, [active, key, loop]);

  return active ? state : null;
}
