/**
 * Block-level markdown detector. Operates on a single paragraph's text and
 * (when relevant) the running "are we inside a fenced code block" state of
 * the previous paragraphs.
 *
 * Block kinds supported:
 *   - paragraph        — default; no special block
 *   - heading 1..6     — `# `, `## `, … `###### `
 *   - quote            — `> `
 *   - list-bullet      — `- `, `* `, `+ `
 *   - list-numbered    — `1. `, `42. `, etc.
 *   - hr               — `---`, `***`, `___` alone on a line
 *   - code-fence-open  — `` ``` `` or ` ```lang ` alone on a line
 *   - code-fence-close — `` ``` `` alone on a line, when currently inside
 *   - code-line        — any paragraph that lives between an open and close
 *                        fence
 *
 * The detector is *line-conservative*: a block kind is only returned when
 * the marker is at the very start of the paragraph (after optional leading
 * whitespace) and the rest of the line is shaped correctly. This avoids
 * false-positive promotion of mid-sentence `## sharps`.
 */

import { $getRoot, $isParagraphNode, type ParagraphNode } from "lexical";
import { $isBlockParagraphNode } from "../core/nodes/BlockParagraphNode";

export type BlockKind =
  | "paragraph"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "heading-5"
  | "heading-6"
  | "quote"
  | "list-bullet"
  | "list-numbered"
  | "hr"
  | "code-fence-open"
  | "code-fence-close"
  | "code-line";

export interface BlockInfo {
  kind: BlockKind;
  /** Length of the leading marker (e.g. `## ` = 3). 0 for paragraph / hr / code-line. */
  markerLen: number;
  /** For fence opens, the language tag if any (`mermaid`, `ts`, …). */
  lang?: string;
}

const HEADING_RE = /^(#{1,6}) /;
const QUOTE_RE = /^> /;
const BULLET_RE = /^[-*+] /;
const NUMBERED_RE = /^\d+\. /;
const HR_RE = /^(?:---|\*\*\*|___)\s*$/;
// Opener: three backticks, optional language tag, then anything (GFM
// "info string" — we accept trailing comments etc).
const FENCE_OPEN_RE = /^```([A-Za-z0-9_-]*)(?:\s.*)?$/;
// Closer: three backticks with nothing meaningful after (strict so we don't
// confuse a new fence opener with a close).
const FENCE_CLOSE_RE = /^```\s*$/;

const PLAIN: BlockInfo = { kind: "paragraph", markerLen: 0 };

/**
 * Resolve a BlockInfo from a hidden marker stashed on a `BlockParagraphNode`
 * (live mode). The marker contains the same chars that would have been in
 * the visible text in hybrid mode, so we can run them through the regular
 * detector instead of duplicating the lookup table.
 *
 * Returns `null` if the marker doesn't decode — caller falls back to
 * text-based detection.
 */
function detectFromMarker(marker: string): BlockInfo | null {
  if (marker.length === 0) return null;
  // The marker is by definition a syntactically valid block prefix, so
  // dropping a sentinel char to feed the detector is safe. (E.g. `"# "` →
  // detect heading on `"# x"`.) Code fences are a special case because the
  // open-fence detector requires the whole line to match the regex; we
  // pass the marker as-is — `"```ts"` matches the FENCE_OPEN_RE.
  if (FENCE_OPEN_RE.test(marker)) {
    const m = marker.match(FENCE_OPEN_RE);
    return {
      kind: "code-fence-open",
      markerLen: 0,
      lang: (m && m[1]) || undefined,
    };
  }
  if (FENCE_CLOSE_RE.test(marker)) {
    return { kind: "code-fence-close", markerLen: 0 };
  }
  const probed = detectBlock(`${marker}x`, false);
  if (probed.kind === "paragraph") return null;
  // Live mode: marker chars are NOT in the visible text, so markerLen
  // should be reported as 0. The plugin keeps its own copy via the
  // stashed marker for serialization.
  return { ...probed, markerLen: 0 };
}

export function detectBlock(text: string, insideCode: boolean): BlockInfo {
  // Inside a fenced block, only the closing fence escapes; everything else
  // is treated as a code line so its content is left untouched.
  if (insideCode) {
    if (FENCE_CLOSE_RE.test(text)) {
      return { kind: "code-fence-close", markerLen: 0 };
    }
    return { kind: "code-line", markerLen: 0 };
  }

  const openMatch = text.match(FENCE_OPEN_RE);
  if (openMatch) {
    return { kind: "code-fence-open", markerLen: 0, lang: openMatch[1] || undefined };
  }

  if (text.length === 0) return PLAIN;

  const h = text.match(HEADING_RE);
  if (h) {
    const level = h[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    return { kind: (`heading-${level}` as BlockKind), markerLen: h[0].length };
  }

  if (QUOTE_RE.test(text)) {
    return { kind: "quote", markerLen: 2 };
  }

  if (BULLET_RE.test(text)) {
    return { kind: "list-bullet", markerLen: 2 };
  }

  const num = text.match(NUMBERED_RE);
  if (num) {
    return { kind: "list-numbered", markerLen: num[0].length };
  }

  if (HR_RE.test(text)) {
    return { kind: "hr", markerLen: 0 };
  }

  return PLAIN;
}

/**
 * Resolve a single paragraph's BlockInfo, taking into account both the
 * stashed marker (live mode) and the visible text (hybrid mode).
 * Code-line detection still requires knowing the running fence state, so
 * callers pass `insideCode` separately.
 */
function $resolveBlockFor(
  paragraph: ParagraphNode,
  insideCode: boolean,
): BlockInfo {
  if ($isBlockParagraphNode(paragraph) && paragraph.hasBlockMarker()) {
    const fromMarker = detectFromMarker(paragraph.getBlockMarker());
    if (fromMarker !== null) {
      // Inside a fence the stashed marker for the close line is also a
      // fence; we still honour the running state for correctness.
      if (insideCode && fromMarker.kind !== "code-fence-close") {
        return { kind: "code-line", markerLen: 0 };
      }
      return fromMarker;
    }
  }
  return detectBlock(paragraph.getTextContent(), insideCode);
}

/** Map paragraph NodeKey → resolved BlockInfo, computed in document order
 *  so fence parity is honoured across siblings. Run inside an editor read. */
export function $computeBlockMap(): Map<string, BlockInfo> {
  const map = new Map<string, BlockInfo>();
  const root = $getRoot();
  let insideCode = false;
  let codeLang: string | undefined;

  for (const child of root.getChildren()) {
    if (!$isParagraphNode(child)) continue;
    let info = $resolveBlockFor(child, insideCode);
    if (info.kind === "code-fence-open") {
      insideCode = true;
      codeLang = info.lang;
    } else if (info.kind === "code-fence-close") {
      insideCode = false;
      codeLang = undefined;
    } else if (info.kind === "code-line" && codeLang) {
      // Carry the open fence's language onto each body line so syntax
      // highlighting (e.g. mermaid) knows what it's looking at.
      info = { ...info, lang: codeLang };
    }
    map.set(child.getKey(), info);
  }
  return map;
}

/** Cheap point-lookup: is this specific paragraph inside an open code fence? */
export function $isParagraphInsideCodeFence(paragraph: ParagraphNode): boolean {
  const root = paragraph.getParent();
  if (!root) return false;

  let inside = false;
  for (const child of root.getChildren()) {
    if (child === paragraph) return inside;
    if (!$isParagraphNode(child)) continue;
    // Honour both stashed markers (live mode) and visible markers (hybrid).
    if ($isBlockParagraphNode(child) && child.hasBlockMarker()) {
      const marker = child.getBlockMarker();
      if (inside) {
        if (FENCE_CLOSE_RE.test(marker)) inside = false;
      } else {
        if (FENCE_OPEN_RE.test(marker)) inside = true;
      }
      continue;
    }
    const text = child.getTextContent();
    if (inside) {
      if (FENCE_CLOSE_RE.test(text)) inside = false;
    } else {
      if (FENCE_OPEN_RE.test(text)) inside = true;
    }
  }
  return inside;
}

/** Returns the BlockInfo for a single paragraph in context (walks earlier
 *  siblings to determine fence parity). */
export function $detectBlockFor(paragraph: ParagraphNode): BlockInfo {
  const inside = $isParagraphInsideCodeFence(paragraph);
  return $resolveBlockFor(paragraph, inside);
}