/**
 * Helpers for inserting/seeding multi-line text into the editor.
 *
 * Why this exists:
 *   The Slack-style markdown detector in `markdown-blocks.ts` operates on a
 *   per-paragraph basis (each `ParagraphNode` IS one block: heading, quote,
 *   code-line, etc.) and uses regexes anchored to the start AND end of the
 *   paragraph's text. So multi-line text needs to live as multiple sibling
 *   paragraphs for fence detection (and headings, lists, etc.) to work.
 *
 *   By default, Lexical's text-paste / `selection.insertText` / our previous
 *   `initialValue` seeding all stuffed multi-line content into a single
 *   paragraph (with `LineBreakNode` children, or with embedded `\n` chars).
 *   That meant pasting or seeding a ```mermaid block silently produced no
 *   diagram, because the fence never matched.
 *
 *   These helpers convert each `\n` into a real paragraph break so the
 *   detector sees what it needs to see.
 *
 *   All `$`-prefixed functions MUST be called inside an `editor.update(...)`
 *   (or `getEditorState().read(...)` where noted) scope.
 */
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type RangeSelection,
} from "lexical";

/** Normalize CRLF / CR to LF so we never end up with stray `\r` in nodes. */
function normalize(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

/**
 * Insert `text` at the current selection. Each `\n` becomes a paragraph
 * break (via `selection.insertParagraph()`). Single-line input is a plain
 * `insertText` — no extra paragraph splitting.
 *
 * The caller must be inside an `editor.update(...)` scope.
 */
export function $insertTextWithParagraphBreaks(text: string): void {
  const lines = normalize(text).split("\n");

  const current = (): RangeSelection | null => {
    const s = $getSelection();
    return $isRangeSelection(s) ? s : null;
  };

  let sel = current();
  if (!sel) {
    // No live selection — typically because the editor has never been
    // focused (auto-demos, scripted ref.insert() calls, restoring drafts
    // before mount, etc.). Drop a caret at the end of the document so the
    // text actually lands somewhere instead of being silently swallowed.
    const root = $getRoot();
    const last = root.getLastChild();
    if (last && "selectEnd" in last && typeof last.selectEnd === "function") {
      (last as { selectEnd: () => void }).selectEnd();
    } else {
      root.selectEnd();
    }
    sel = current();
    if (!sel) return;
  }

  // Replace any currently-selected range before inserting.
  if (!sel.isCollapsed()) {
    sel.removeText();
    sel = current();
    if (!sel) return;
  }

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      sel.insertParagraph();
      sel = current();
      if (!sel) return;
    }
    if (lines[i].length > 0) {
      sel.insertText(lines[i]);
      sel = current();
      if (!sel) return;
    }
  }
}

/**
 * Seed the editor root with `text`, one `ParagraphNode` per `\n`-delimited
 * line. Clears any existing content first. Used by `<Composer initialValue>`.
 *
 * Leaves the caret at the end of the seeded content so that subsequent
 * imperative `insert()` calls (which delegate to
 * `$insertTextWithParagraphBreaks`) land where the user / script expects.
 * Without this, a never-focused editor would silently swallow follow-up
 * inserts because `$getSelection()` returns null.
 *
 * The caller must be inside an `editor.update(...)` scope.
 */
export function $seedInitialValue(text: string): void {
  const root = $getRoot();
  root.clear();
  const lines = normalize(text).split("\n");
  if (lines.length === 0) {
    const para = $createParagraphNode();
    root.append(para);
    para.selectEnd();
    return;
  }
  let last: ReturnType<typeof $createParagraphNode> | null = null;
  for (const line of lines) {
    const para = $createParagraphNode();
    if (line.length > 0) para.append($createTextNode(line));
    root.append(para);
    last = para;
  }
  last?.selectEnd();
}