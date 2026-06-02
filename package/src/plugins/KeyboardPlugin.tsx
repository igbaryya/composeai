import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  type ParagraphNode,
  type Point,
} from "lexical";
import { useComposerContext } from "../core/ComposerProvider";
import { $detectBlockFor, type BlockInfo } from "./markdown-blocks";

interface Props {
  onSubmit: () => void;
}

/**
 * Returns true when the cursor is positioned somewhere where Enter should
 * mean "structural newline" rather than "submit the message".
 *
 * In Slack-style markdown, every block is a styled paragraph and Enter is
 * the user's natural submit affordance — so we only defer in one place:
 * inside (or on the opener of) a fenced code block, where pressing Enter
 * is overwhelmingly likely to mean "add another code line" not "send".
 * Everywhere else, Shift+Enter is the way to insert a soft line break.
 *
 * Run inside a `editor.getEditorState().read(...)` callback.
 */
function $isInsideCodeFence(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;

  const anchorNode = selection.anchor.getNode();
  const top = anchorNode.getTopLevelElement();
  if (!top || !$isParagraphNode(top)) return false;

  const block = $detectBlockFor(top);
  return block.kind === "code-line" || block.kind === "code-fence-open";
}

/**
 * Whether the editor currently holds more than one line of content —
 * either multiple top-level paragraphs or a single paragraph with one
 * or more soft line breaks. Used by the smart-newline behavior to
 * decide whether plain Enter should submit or insert a line break.
 *
 * Run inside a `editor.getEditorState().read(...)` callback.
 */
function $hasMultiLineContent(): boolean {
  const root = $getRoot();
  if (root.getChildrenSize() > 1) return true;
  return root.getTextContent().includes("\n");
}

/**
 * Plain-text offset of `point` measured from the start of `paragraph`.
 * Walks children in order so the result is comparable against
 * `BlockInfo.markerLen` (which is expressed in plain-text characters).
 *
 * Run inside an editor read or update.
 */
function $offsetWithinParagraph(paragraph: ParagraphNode, point: Point): number {
  if (point.type === "element") {
    const children = paragraph.getChildren();
    let offset = 0;
    const limit = Math.min(point.offset, children.length);
    for (let i = 0; i < limit; i++) {
      offset += children[i].getTextContentSize();
    }
    return offset;
  }
  const anchorKey = point.getNode().getKey();
  let offset = 0;
  for (const child of paragraph.getChildren()) {
    if (child.getKey() === anchorKey) return offset + point.offset;
    offset += child.getTextContentSize();
  }
  return offset + point.offset;
}

/**
 * Smart list-continuation. When the cursor sits inside a markdown bullet
 * (`- `, `* `, `+ `) or numbered (`N. `) paragraph and the user presses
 * Enter, we either:
 *
 *   - Exit the list — when the current item is empty (only the marker),
 *     the marker is cleared in place so the user lands in a plain
 *     paragraph ready for regular prose.
 *   - Continue the list — split the paragraph at the cursor and seed
 *     the new paragraph with the next marker. Bullet character is
 *     preserved (`-`/`*`/`+`); numbered items auto-increment.
 *
 * Returns `true` when we handled the Enter and the caller should
 * `return true` from the command (skipping submit + Lexical's default).
 * Returns `false` to fall through to the regular Enter logic — used
 * when the cursor is in/before the marker itself, where splitting would
 * yield a confusing "- - foo" double-marker.
 *
 * Run inside an editor update.
 */
function $handleListContinuation(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  if (!selection.isCollapsed()) return false;

  const anchorNode = selection.anchor.getNode();
  const top = anchorNode.getTopLevelElement();
  if (!top || !$isParagraphNode(top)) return false;

  const block: BlockInfo = $detectBlockFor(top);
  if (block.kind !== "list-bullet" && block.kind !== "list-numbered") {
    return false;
  }

  const text = top.getTextContent();
  const contentAfterMarker = text.slice(block.markerLen);
  const cursorOffset = $offsetWithinParagraph(top, selection.anchor);

  // Cursor in or before the marker — let Lexical do a vanilla split so
  // we don't accidentally produce "- - foo".
  if (cursorOffset < block.markerLen) return false;

  // Empty list item: exit the list by clearing the marker. The (now
  // empty) paragraph stays in place and the markdown plugin will
  // re-style it as plain on its next update tick.
  if (contentAfterMarker.length === 0) {
    top.clear();
    top.select(0, 0);
    return true;
  }

  // Continue the list. Bullet markers preserve their character (`-`,
  // `*`, `+`); numbered markers increment by one based on the current
  // line's number.
  let nextMarker: string;
  if (block.kind === "list-bullet") {
    const ch = text.charAt(0) || "-";
    nextMarker = `${ch} `;
  } else {
    const numMatch = text.match(/^(\d+)/);
    const n = numMatch ? parseInt(numMatch[1], 10) + 1 : 2;
    nextMarker = `${n}. `;
  }

  selection.insertParagraph();
  const newSelection = $getSelection();
  if ($isRangeSelection(newSelection)) {
    newSelection.insertText(nextMarker);
  }
  return true;
}

/**
 * Handles Enter / Shift+Enter / Cmd|Ctrl+Enter with the rules described
 * by the `multiline`, `submitOnEnter`, and `smartNewline` props on
 * `<Composer />`. The behavior matrix, with all three defaulting to
 * `true`:
 *
 *   - Cmd/Ctrl+Enter: always submit (when `submitOnEnter` is on or the
 *     editor is configured to never submit on Enter — the modifier is
 *     the universal "force send" gesture).
 *   - Shift+Enter: insert a hard paragraph break (NOT a soft
 *     `LineBreakNode`) so the markdown plugin can tokenize each line
 *     independently. Swallowed when `multiline` is false.
 *   - Inside an open code fence: defer to Lexical so Enter splits the
 *     paragraph into a new code line — unless `multiline` is false.
 *   - Plain Enter, `multiline` false: submit when `submitOnEnter`, else
 *     swallow (single-line input with no submit affordance).
 *   - Plain Enter, `multiline` true, `smartNewline` true: insert a
 *     newline once the editor already holds more than one line;
 *     otherwise submit (when `submitOnEnter`). When the cursor sits in
 *     a markdown list paragraph (`- `, `* `, `+ `, `N. `) the list is
 *     continued instead (next marker auto-inserted, double-Enter exits)
 *     — this fires before any submit decision so a single bullet line
 *     can be extended without an accidental send.
 *   - Plain Enter, `multiline` true, `smartNewline` false: submit when
 *     `submitOnEnter`, else insert a newline (Lexical default). List
 *     continuation is intentionally off in this mode.
 *
 * Slash/mention menus still get first refusal via the
 * `data-composer-popover="open"` marker.
 */
export function KeyboardPlugin({ onSubmit }: Props) {
  const [editor] = useLexicalComposerContext();
  const {
    triggerSubmit,
    multiline,
    submitOnEnter,
    smartNewline,
    mode,
  } = useComposerContext();

  useEffect(() => {
    const trySubmit = (event: KeyboardEvent) => {
      event.preventDefault();
      triggerSubmit();
      onSubmit();
      return true;
    };

    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event) return false;

        // If a typeahead popover (slash, mentions) is open, yield to its
        // own KEY_ENTER_COMMAND handler at COMMAND_PRIORITY_LOW so the
        // highlighted option is selected. We MUST NOT call
        // event.preventDefault() or return true here — both would steal
        // the keystroke before the typeahead ever sees it.
        if (document.querySelector('[data-composer-popover="open"]')) {
          return false;
        }

        const isModEnter = event.metaKey || event.ctrlKey;
        const isShiftEnter = event.shiftKey;

        // Cmd/Ctrl+Enter is the universal "force submit" gesture — it
        // always wins regardless of the other props.
        if (isModEnter) return trySubmit(event);

        // Shift+Enter: insert a new paragraph, NOT a soft-break
        // `LineBreakNode`. The Slack-style markdown stack
        // (`markdown-blocks.ts`, `MarkdownPlugin`, `serializer.ts`,
        // `insertText.ts`) operates strictly per-paragraph — block kind
        // (heading, list, quote, code-fence, …) is detected from the
        // paragraph's text, styling is applied per `<p>` via
        // `data-md-block`, and CSS for headings uses `::first-line`.
        // A `LineBreakNode` inside a paragraph would leave any line
        // after the break untokenized in the editor (e.g. `# foo`
        // styled as a heading, the `# bar` line after Shift+Enter
        // unstyled) even though the serialized markdown still produces
        // two real headings — so the editor view silently disagrees
        // with the rendered bubble. Treating Shift+Enter as a hard
        // paragraph break (the same gesture Slack, Discord, ChatGPT
        // and Claude all use) restores per-line consistency and
        // matches how pasted/initial multi-line text is already
        // ingested by this composer.
        if (isShiftEnter) {
          if (!multiline) {
            event.preventDefault();
            return true;
          }
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          selection.insertParagraph();
          event.preventDefault();
          return true;
        }

        // Inside a fenced code block we always want a new code line,
        // unless multi-line content is disallowed entirely.
        let inCodeFence = false;
        let hasMultiLine = false;
        editor.getEditorState().read(() => {
          inCodeFence = $isInsideCodeFence();
          hasMultiLine = $hasMultiLineContent();
        });
        if (inCodeFence) {
          if (!multiline) {
            event.preventDefault();
            return true;
          }
          return false;
        }

        // Single-line composer: Enter submits or is a no-op.
        if (!multiline) {
          if (!submitOnEnter) {
            event.preventDefault();
            return true;
          }
          return trySubmit(event);
        }

        // Smart list continuation: when typing a markdown bullet or
        // numbered item, Enter continues the list (auto-incrementing
        // numbers, preserving the bullet character) and Enter on an
        // empty item exits the list. Runs before the submit / smart
        // newline branches so a single-line bullet doesn't get sent
        // when the user clearly meant to add a second item.
        //
        // NB: we call `$handleListContinuation` directly, NOT via
        // `editor.update(...)`. Lexical dispatches KEY_ENTER_COMMAND
        // from inside its own `updateEditor` wrapper, so we're already
        // in a writable context. A nested `editor.update` would be
        // queued and run AFTER this command returns — by which point
        // we'd have already submitted, which is exactly the bug we're
        // trying to avoid.
        if (smartNewline && mode === "markdown") {
          if ($handleListContinuation()) {
            event.preventDefault();
            return true;
          }
        }

        // Smart newline: once the editor holds >1 line, plain Enter
        // adds a newline instead of submitting. Cmd/Ctrl+Enter (handled
        // above) is the way to send. This protects long drafts from
        // accidental submission.
        if (smartNewline && hasMultiLine) return false;

        if (!submitOnEnter) return false;

        return trySubmit(event);
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [
    editor,
    onSubmit,
    triggerSubmit,
    multiline,
    submitOnEnter,
    smartNewline,
    mode,
  ]);

  return null;
}