/**
 * Types a quick-prompt into the editor one character at a time, so picking a
 * chip reads as the composer filling itself in rather than a block of text
 * appearing out of nowhere.
 *
 * Characters are appended at the caret via `$insertTextWithParagraphBreaks`
 * — the same path a real keystroke takes — rather than re-seeding the root
 * each frame. That keeps every tick cheap and, more importantly, feeds the
 * markdown detector the incremental insertions it's built around, so markup
 * inside a prompt forms exactly as if the user had typed it.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  COMMAND_PRIORITY_CRITICAL,
  HISTORY_MERGE_TAG,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
} from "lexical";
import {
  $insertTextWithParagraphBreaks,
  $seedInitialValue,
  normalizeNewlines,
} from "../internal/insertText";
import { focusEditor } from "../internal/focusEditor";

/** Per-character delay, in ms — brisk typing, not the placeholder's stroll. */
const TYPE_SPEED = 18;
/** Floor, so a very long prompt doesn't drop under timer resolution. */
const MIN_TYPE_SPEED = 6;
/** Whole-prompt budget. Longer prompts type proportionally faster. */
const MAX_DURATION = 1200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface PromptTypewriter {
  /** Clear the editor and type `text` into it. Cancels any run in flight. */
  type: (text: string) => void;
  /** Stop mid-run, leaving whatever has been typed so far in place. */
  cancel: () => void;
}

export function usePromptTypewriter(editor: LexicalEditor): PromptTypewriter {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const type = useCallback(
    (text: string) => {
      cancel();
      const full = normalizeNewlines(text);
      // Newlines are normalized before splitting so a CRLF can't be torn into
      // two ticks and produce two paragraph breaks. Splitting by spread walks
      // code points, so emoji and other surrogate pairs stay whole.
      const chars = [...full];

      if (chars.length === 0 || prefersReducedMotion()) {
        editor.update(() => {
          $seedInitialValue(full);
        });
        focusEditor(editor);
        return;
      }

      // Start from a clean document — picking a prompt means "use this as the
      // draft", same as the instant path it replaces.
      editor.update(() => {
        $seedInitialValue("");
      });
      focusEditor(editor);

      const speed = Math.max(
        MIN_TYPE_SPEED,
        Math.min(TYPE_SPEED, MAX_DURATION / chars.length),
      );
      let index = 0;
      const tick = () => {
        // Every tick merges into one history entry, so the finished prompt
        // undoes in a single Cmd+Z instead of one per character.
        editor.update(
          () => {
            $insertTextWithParagraphBreaks(chars[index]);
          },
          { tag: HISTORY_MERGE_TAG },
        );
        index += 1;
        timerRef.current =
          index < chars.length ? setTimeout(tick, speed) : null;
      };
      timerRef.current = setTimeout(tick, speed);
    },
    [editor, cancel],
  );

  // A keystroke means the user has taken over — stop typing at them.
  // CRITICAL is the *observer* priority here, not an escalation: handlers run
  // highest-first, and KeyboardPlugin consumes keys like Enter at HIGH, so
  // anything lower would simply never see them. Returning `false` keeps the
  // key propagating to every handler that would have got it.
  useEffect(
    () =>
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        () => {
          cancel();
          return false;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    [editor, cancel],
  );

  useEffect(() => cancel, [cancel]);

  // Stable identity — the returned object is a dep of the subscription that
  // drives it, and a fresh one per render would resubscribe on every keystroke.
  return useMemo(() => ({ type, cancel }), [type, cancel]);
}
