/**
 * GhostedAutoCompletePlugin — inline "ghost text" autocomplete suggested
 * from a fixed list.
 *
 * UX contract:
 *   - Watches the editor's plain-text content. When that text is a prefix
 *     of one of the consumer's `suggestions`, the remainder is rendered
 *     just after the caret in a muted style — same trick GitHub Copilot,
 *     iOS QuickType and shell autocompletion use to nudge users toward
 *     the completion without committing to it.
 *   - **Tab** accepts the suggestion (the remainder is inserted into the
 *     editor and the ghost clears). Escape, a non-matching keystroke, or
 *     moving the caret away dismisses it without committing.
 *   - The ghost only appears when the caret sits at the END of the
 *     document — typing in the middle would render a confusing
 *     "wraparound" suggestion.
 *   - When several suggestions share a prefix, the FIRST match wins. The
 *     consumer is expected to order the list by priority.
 *
 * Why ghost-text instead of a dropdown menu? It's the lowest-friction
 * autocomplete UI for a curated, sentence-shaped suggestion list (chat
 * prompts, templated commands, FAQ answers). There's nothing to click
 * through and nothing to dismiss — just keep typing or hit Tab.
 *
 * Why an overlay div instead of decorating the editor itself? Lexical's
 * source-of-truth model means the editor's text content is what we'd
 * eventually serialize on submit; inserting "soft" ghost characters into
 * the document would either need a custom non-selectable node (heavy)
 * or risk being captured by serializers / cursor traversal. A sibling
 * overlay positioned over the editor's padding box gives us pixel-perfect
 * alignment with zero risk of leaking into the payload.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
} from "lexical";
import { useComposerContext } from "../core/ComposerProvider";
import type { GhostedAutoCompleteConfig } from "../types";

interface Props {
  /**
   * Normalized feature value — either a plain `string[]` shorthand or the
   * full {@link GhostedAutoCompleteConfig} object. Plugin handles both.
   */
  config: string[] | GhostedAutoCompleteConfig;
}

interface ResolvedConfig {
  suggestions: string[];
  caseSensitive: boolean;
  minLength: number;
}

function resolveConfig(config: Props["config"]): ResolvedConfig {
  if (Array.isArray(config)) {
    return { suggestions: config, caseSensitive: false, minLength: 1 };
  }
  return {
    suggestions: config.suggestions,
    caseSensitive: !!config.caseSensitive,
    // `1` (not `0`) so the ghost never appears on an empty editor — the
    // placeholder handles that, and showing a ghost there would feel like
    // the composer is auto-typing on its own.
    minLength: Math.max(1, config.minLength ?? 1),
  };
}

/**
 * Find the first suggestion that starts with `typed` (per `caseSensitive`)
 * and return its UN-typed remainder. Strict-prefix only — if `typed`
 * equals a suggestion exactly, there's nothing to suggest and we return
 * `null`.
 */
function findGhost(
  typed: string,
  suggestions: ReadonlyArray<string>,
  caseSensitive: boolean,
): string | null {
  if (typed.length === 0) return null;
  const needle = caseSensitive ? typed : typed.toLowerCase();
  for (const candidate of suggestions) {
    if (candidate.length <= typed.length) continue;
    const hay = caseSensitive ? candidate : candidate.toLowerCase();
    if (hay.startsWith(needle)) {
      // Preserve the candidate's casing in the remainder — `typed` already
      // sits in the editor, so we only return what's NOT yet typed.
      return candidate.slice(typed.length);
    }
  }
  return null;
}

/**
 * Whether the current selection is collapsed at the very end of the
 * document. Run inside a `getEditorState().read(...)` scope.
 *
 * Used as a gating signal: showing a ghost while the caret is parked
 * mid-paragraph would visually claim the user is about to overwrite
 * trailing text, which they aren't.
 */
function $isCaretAtDocumentEnd(): boolean {
  const sel = $getSelection();
  if (!$isRangeSelection(sel) || !sel.isCollapsed()) return false;
  const root = $getRoot();
  const last = root.getLastDescendant();
  if (last === null) {
    // Empty document — `selectEnd` lands on the root element with
    // offset 0; treat that as "at end".
    return sel.focus.key === root.getKey();
  }
  if (sel.focus.key !== last.getKey()) return false;
  const size =
    "getTextContentSize" in last && typeof last.getTextContentSize === "function"
      ? (last as { getTextContentSize: () => number }).getTextContentSize()
      : last.getTextContent().length;
  return sel.focus.offset === size;
}

interface GhostState {
  typed: string;
  remainder: string;
}

export function GhostedAutoCompletePlugin({ config }: Props) {
  const [editor] = useLexicalComposerContext();
  const { multiline } = useComposerContext();
  const resolved = useMemo(() => resolveConfig(config), [config]);

  const [ghost, setGhost] = useState<GhostState | null>(null);
  // Ref mirror so key-command handlers (which need a stable identity
  // across renders) can read the latest ghost without re-subscribing on
  // every state change — re-subscribing churns the command priority
  // stack and racy popovers.
  const ghostRef = useRef<GhostState | null>(null);
  ghostRef.current = ghost;

  // Recompute the ghost whenever the editor state changes. We read the
  // plain text (chips collapse to their labels) and the selection, then
  // probe the suggestion list for a strict-prefix match.
  useEffect(() => {
    const compute = () => {
      editor.getEditorState().read(() => {
        if (!$isCaretAtDocumentEnd()) {
          setGhost(null);
          return;
        }
        const typed = $getRoot().getTextContent();
        if (typed.length < resolved.minLength) {
          setGhost(null);
          return;
        }
        const remainder = findGhost(
          typed,
          resolved.suggestions,
          resolved.caseSensitive,
        );
        if (!remainder) {
          setGhost(null);
          return;
        }
        // Only nudge React when something actually changed — avoids
        // overlay flicker for every cursor-move tick Lexical emits.
        setGhost((prev) =>
          prev && prev.typed === typed && prev.remainder === remainder
            ? prev
            : { typed, remainder },
        );
      });
    };
    compute();
    return editor.registerUpdateListener(compute);
  }, [editor, resolved]);

  // Tab accepts the ghost. We hijack KEY_TAB_COMMAND at HIGH priority so
  // the keystroke is fully consumed before the browser ever sees it —
  // otherwise focus would jump to the next focusable in the toolbar
  // (Send button, etc.) and the user would lose their composing context.
  // When no ghost is showing we let the key fall through so Tab keeps its
  // normal "leave the editor" semantics.
  const acceptGhost = useCallback(() => {
    const current = ghostRef.current;
    if (!current) return false;
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        sel.insertText(current.remainder);
      }
    });
    setGhost(null);
    return true;
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        if (!ghostRef.current) return false;
        event?.preventDefault();
        return acceptGhost();
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, acceptGhost]);

  // Escape clears the ghost (matches the "dismiss the suggestion"
  // gesture in shells / IDEs) but only when there's something to clear —
  // otherwise we'd swallow Escape from anything else that wants it.
  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        if (!ghostRef.current) return false;
        setGhost(null);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  if (!ghost) return null;
  return (
    <GhostOverlay
      typed={ghost.typed}
      remainder={ghost.remainder}
      multiline={multiline}
    />
  );
}

interface OverlayProps {
  typed: string;
  remainder: string;
  multiline: boolean;
}

/**
 * Renders the ghost text inside the editor's padding box via a portal,
 * so the suggestion floats exactly where the next typed character would
 * land — no measuring, no math.
 *
 * Implementation: we lay an absolutely-positioned, pointer-events:none
 * div over the editor's parent (`.composer-editor-block`) and fill it
 * with `[invisible-typed][muted-remainder]`. The invisible span occupies
 * the same horizontal space as the user's text, so the visible remainder
 * starts precisely at the caret.
 *
 * Limitations (acceptable for the curated-suggestion use case):
 *   - Doesn't follow per-paragraph block styling (headings render at
 *     larger sizes than this overlay). Ghost autocomplete is most useful
 *     in plain prompts / search bars where this isn't a factor.
 *   - In multiline mode, if the editor scrolls past its viewport the
 *     overlay stays anchored to the box (it doesn't scroll with the
 *     content). For multi-paragraph drafts the suggestion will simply
 *     be clipped — same as a placeholder hint would be.
 */
function GhostOverlay({ typed, remainder, multiline }: OverlayProps) {
  const [editor] = useLexicalComposerContext();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = editor.getRootElement();
    // The contenteditable is wrapped by the EditorShell's
    // `.composer-editor-block` div, which is `position: relative` —
    // perfect anchor for our absolute overlay.
    const block = root?.closest<HTMLElement>(".composer-editor-block") ?? null;
    setContainer(block);
  }, [editor]);

  if (!container) return null;

  // Mirror the editor's padding / typography so the overlay text lines
  // up exactly with the contenteditable's own text origin. We keep the
  // two padding strings in lock-step with `EditorShell.tsx`'s
  // `editorClass` — when one changes, change both.
  const paddingClass = multiline
    ? "composer-ghost-overlay--multiline px-5 py-3.5"
    : "composer-ghost-overlay--inline px-2 leading-9";

  return createPortal(
    <div
      aria-hidden
      data-composer-ghost=""
      className={`composer-ghost-overlay pointer-events-none absolute inset-0 select-none ${paddingClass}`}
    >
      <span className="composer-ghost-overlay-typed" aria-hidden>
        {typed}
      </span>
      <span className="composer-ghost-suggestion">{remainder}</span>
    </div>,
    container,
  );
}