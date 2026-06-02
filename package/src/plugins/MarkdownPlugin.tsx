/**
 * Unified Slack-style markdown plugin.
 *
 * Two operating modes, picked via `features.markdown.mode`:
 *
 *   - **hybrid** (default): ALL markdown markers stay visible AND apply
 *     visual styling. The paragraph's text content IS the markdown source.
 *     Nothing is converted to a different Lexical node.
 *
 *   - **live**: Notion-style. Markers vanish once matched; the format
 *     flags / stashed marker / LinkTextNode become the source of truth.
 *     The serializer reconstructs the markdown on submit.
 *
 * Responsibilities (all rolled into one plugin so the rules stay consistent):
 *
 *   1. Inline tokenization
 *      `**bold**`, `*italic*`, `_italic_`, `~~strike~~`, `` `code` ``,
 *      `[label](url)`, `![alt](url)`. Hybrid: markers rendered as muted
 *      `MarkdownTokenNode`s, body picks up format flags. Live: markers
 *      dropped from the visible text; format flags / LinkTextNode hold
 *      the state needed to rebuild the source.
 *
 *   2. Block-marker tokenization (leading marker of the paragraph)
 *      `# `, `> `, `- `, `1. `, ```` ``` ``` `` — hybrid mode emits a
 *      muted token; live mode stashes the marker on the
 *      `BlockParagraphNode` (via `__blockMarker`) and drops the visible
 *      chars so the user sees only the heading / quote / list body.
 *
 *   3. Block styling via DOM attribute
 *      Each paragraph DOM element receives `data-md-block="<kind>"` (e.g.
 *      `heading-2`, `code-line`, `quote`). CSS does the actual visual work
 *      (font sizes, indentation, monospace, left border, etc.). In live
 *      mode the kind is resolved from the stashed marker, so styling
 *      survives the marker chars being hidden.
 *
 *   4. Backspace-at-start escape (live mode only)
 *      Backspace pressed at column 0 of a paragraph with a stashed block
 *      marker clears the marker instead of merging up — the only way to
 *      remove a heading style when the `# ` chars aren't visible.
 *
 * Re-entrancy: a single tagged `editor.update` is scheduled per real user
 * change and re-styles every paragraph idempotently. This catches "context"
 * changes (typing ```` ``` ```` shifts every paragraph below into a code
 * block) without per-paragraph propagation gymnastics.
 */

import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_BACKSPACE_COMMAND,
  type ParagraphNode,
} from "lexical";
import {
  $createMarkdownTokenNode,
  $isMarkdownTokenNode,
} from "../core/nodes/MarkdownTokenNode";
import {
  $isBlockParagraphNode,
  type BlockParagraphNode,
} from "../core/nodes/BlockParagraphNode";
import {
  $createLinkTextNode,
  $isLinkTextNode,
} from "../core/nodes/LinkTextNode";
import { useComposerContext } from "../core/ComposerProvider";
import type { MarkdownMode } from "../types";
import { tokenize, type InlineFormat, type Token } from "./markdown-tokenizer";
import {
  $computeBlockMap,
  $detectBlockFor,
  type BlockInfo,
  type BlockKind,
} from "./markdown-blocks";

// Lexical format flag bits — using `code` for inline code and reusing it for
// link URLs so they render with a monospace tint. `link` doesn't map to a
// native Lexical bit; we surface it via the token coloring instead.
const FORMAT_FLAGS: Record<InlineFormat, number> = {
  bold: 1,
  italic: 2,
  strike: 4,
  underline: 8,
  code: 16,
  link: 0,
};

interface DesiredNode {
  kind: "text" | "token" | "link";
  text: string;
  format: number;
  /** Populated for `link` kind only — the URL to stash on the LinkTextNode. */
  url?: string;
}

function readCurrentChildren(paragraph: ParagraphNode): DesiredNode[] | null {
  const out: DesiredNode[] = [];
  for (const child of paragraph.getChildren()) {
    // LinkTextNode is also a TextNode subclass — check it BEFORE the
    // generic text branch so its URL gets surfaced in the diff.
    if ($isLinkTextNode(child)) {
      out.push({
        kind: "link",
        text: child.getTextContent(),
        format: child.getFormat(),
        url: child.getUrl(),
      });
    } else if ($isMarkdownTokenNode(child)) {
      out.push({ kind: "token", text: child.getTextContent(), format: 0 });
    } else if ($isTextNode(child)) {
      out.push({
        kind: "text",
        text: child.getTextContent(),
        format: child.getFormat(),
      });
    } else {
      // Mentions / other inlines — bail out so we don't disturb them.
      return null;
    }
  }
  return out;
}

function nodesEqual(a: DesiredNode[], b: DesiredNode[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    // `text` and `link` are interchangeable for equality purposes: on a
    // subsequent pass the tokenizer no longer sees the URL (it's hidden
    // on the LinkTextNode) and emits a plain text token. Treating them
    // as equal here prevents a wasteful rewrite that would discard the
    // URL. The writer preserves the LinkTextNode in this case.
    const aKind = ai.kind === "link" ? "text" : ai.kind;
    const bKind = bi.kind === "link" ? "text" : bi.kind;
    if (aKind !== bKind) return false;
    if (ai.text !== bi.text) return false;
    if (ai.format !== bi.format) return false;
  }
  return true;
}

function getSelectionOffsetWithin(
  paragraph: ParagraphNode,
): { anchor: number; focus: number } | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const measure = (key: string, offset: number): number | null => {
    let acc = 0;
    for (const child of paragraph.getChildren()) {
      if (child.getKey() === key) return acc + offset;
      acc += child.getTextContentSize();
    }
    return null;
  };

  const measureNodeOffset = (key: string, offset: number): number | null => {
    if (paragraph.getKey() === key) {
      let acc = 0;
      const children = paragraph.getChildren();
      for (let i = 0; i < Math.min(offset, children.length); i++) {
        acc += children[i].getTextContentSize();
      }
      return acc;
    }
    return measure(key, offset);
  };

  const a = measureNodeOffset(selection.anchor.key, selection.anchor.offset);
  const f = measureNodeOffset(selection.focus.key, selection.focus.offset);
  if (a === null || f === null) return null;
  return { anchor: a, focus: f };
}

function setSelectionFromOffsets(
  paragraph: ParagraphNode,
  offsets: { anchor: number; focus: number },
): void {
  type Point = { key: string; offset: number; type: "text" | "element" };
  const locate = (target: number): Point | null => {
    const children = paragraph.getChildren();
    if (children.length === 0) {
      // Empty paragraph (e.g. a live-mode heading where the user hasn't
      // typed a body yet, or a hidden code-fence line) — Lexical
      // represents the caret as an element-type point.
      return { key: paragraph.getKey(), offset: 0, type: "element" };
    }
    let acc = 0;
    for (const child of children) {
      const size = child.getTextContentSize();
      if (target <= acc + size) {
        return {
          key: child.getKey(),
          offset: Math.max(0, target - acc),
          type: "text",
        };
      }
      acc += size;
    }
    const last = children[children.length - 1];
    return {
      key: last.getKey(),
      offset: last.getTextContentSize(),
      type: "text",
    };
  };

  const a = locate(offsets.anchor);
  const f = locate(offsets.focus);
  if (!a || !f) return;
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  selection.anchor.set(a.key, a.offset, a.type);
  selection.focus.set(f.key, f.offset, f.type);
}

function isCodeKind(kind: BlockKind): boolean {
  return (
    kind === "code-line" ||
    kind === "code-fence-open" ||
    kind === "code-fence-close"
  );
}

/**
 * Walk the paragraph's existing children and produce a per-character map of
 * the format flags currently in effect. Used by live-mode `$applyStyling`
 * so plain-text tokens (i.e. text the new tokenizer pass doesn't claim
 * with a marker) keep whatever format they had before — without this we'd
 * lose every previously-applied format on the very next keystroke (the
 * paragraph text no longer contains `**` markers, so the tokenizer just
 * sees plain text and would otherwise reset the format to 0).
 *
 * MarkdownTokenNodes (block-marker leaders) are counted as format=0 even
 * though they're TextNode subclasses; that matches what `$applyStyling`
 * emits for the block prefix in live mode.
 */
function buildCurrentFormatMap(paragraph: ParagraphNode): number[] {
  const out: number[] = [];
  for (const child of paragraph.getChildren()) {
    if (!$isTextNode(child)) continue;
    const text = child.getTextContent();
    const fmt = $isMarkdownTokenNode(child) ? 0 : child.getFormat();
    for (let i = 0; i < text.length; i++) out.push(fmt);
  }
  return out;
}

/**
 * Build a function that maps a SOURCE-text offset (the paragraph before the
 * rewrite, which still contains every character the user typed) to a TARGET
 * offset (the paragraph after the rewrite, where in `live` mode the inline
 * marker characters have been dropped).
 *
 * In `hybrid` mode the mapping is the identity, so we skip this work
 * entirely and let the caller pass source offsets straight through.
 *
 * In `live` mode only INLINE markers are dropped — block markers stay
 * visible (see `$applyStyling`). So the prefix-sum starts by keeping the
 * leading block-marker chars 1:1 and only marks inline `marker` tokens as
 * dropped. The caret then lands at the end of the visible content — the
 * same place it would have been if the inline markers had been invisible
 * all along.
 */
/**
 * For each inline token, decide whether its chars stay visible (`true`) or
 * are dropped (`false`) in `live` mode. Markers are always dropped. Most
 * `formatted` tokens are kept. Link sequences are a special case: the
 * label stays visible, the URL is dropped (it's stashed on a LinkTextNode
 * by the desired-children pass).
 */
function buildKeptMask(tokens: Token[]): boolean[] {
  const mask = new Array<boolean>(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    mask[i] = tokens[i].type !== "marker";
  }
  // Walk again to look for link sequences and flip the URL token off.
  // Mirrors the detection in `$applyStyling`'s token loop — keep these
  // in sync.
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "marker") continue;
    if (t.text !== "[" && t.text !== "!") continue;
    const offset = t.text === "!" ? 1 : 0;
    const open = tokens[i + offset];
    const label = tokens[i + offset + 1];
    const mid = tokens[i + offset + 2];
    const url = tokens[i + offset + 3];
    const close = tokens[i + offset + 4];
    if (
      open?.type === "marker" &&
      open.text === "[" &&
      label?.type === "formatted" &&
      label.format === "link" &&
      mid?.type === "marker" &&
      mid.text === "](" &&
      url?.type === "formatted" &&
      close?.type === "marker" &&
      close.text === ")"
    ) {
      mask[i + offset + 3] = false; // URL — dropped
    }
  }
  return mask;
}

function buildLiveOffsetMap(
  text: string,
  leadingDrop: number,
  tokens: Token[] | null,
  trailingDrop: number = 0,
): (srcOffset: number) => number {
  const kept = new Array<number>(text.length + 1);
  kept[0] = 0;
  let cursor = 0;
  // Leading block-marker chars that we just stashed on the paragraph in
  // live mode → dropped (mapped to target offset 0).
  for (let i = 0; i < leadingDrop && cursor < text.length; i++) {
    kept[cursor + 1] = kept[cursor];
    cursor++;
  }
  // Inline body — walk tokens in order. Drop / keep per `buildKeptMask`
  // so link-sequence collapsing (URL → dropped) matches the desired-
  // children pass. (HR / code-line / code-fence paragraphs pass `null`
  // for `tokens` because we don't tokenize inline markers inside them.)
  if (tokens) {
    const mask = buildKeptMask(tokens);
    for (let ti = 0; ti < tokens.length; ti++) {
      const t = tokens[ti];
      const isKept = mask[ti];
      for (let i = 0; i < t.text.length && cursor < text.length; i++) {
        kept[cursor + 1] = kept[cursor] + (isKept ? 1 : 0);
        cursor++;
      }
    }
  }
  // Any chars that aren't covered by leadingDrop or tokens — the trailing
  // run, normally kept verbatim. `trailingDrop` lets the caller mark the
  // last N source chars as dropped (used for code-fence close lines in
  // live mode, where the whole text becomes invisible).
  const trailDropStart = text.length - trailingDrop;
  for (; cursor < text.length; cursor++) {
    const dropped = cursor >= trailDropStart;
    kept[cursor + 1] = kept[cursor] + (dropped ? 0 : 1);
  }
  return (srcOffset: number) =>
    kept[Math.max(0, Math.min(srcOffset, text.length))];
}

function $applyStyling(
  paragraph: ParagraphNode,
  block: BlockInfo,
  mode: MarkdownMode,
): boolean {
  const text = paragraph.getTextContent();

  const current = readCurrentChildren(paragraph);
  if (current === null) return false; // contains non-text inlines

  const desired: DesiredNode[] = [];
  const isLive = mode === "live";

  // Per-character format map of what's CURRENTLY in the paragraph, only
  // needed in live mode. Used so plain-text tokens (text the new
  // tokenizer pass doesn't claim with a marker pair) keep whatever
  // format they had before. Without this, typing any character after a
  // matched `**bold**` re-runs the plugin, the tokenizer sees no
  // markers, and we'd drop bold back to plain text — the regression
  // that triggered this code path.
  const currentFmt = isLive ? buildCurrentFormatMap(paragraph) : null;

  // ─── Block marker handling ──────────────────────────────────────────────
  //
  // Hybrid mode: keep the marker chars in the visible text, emit them as a
  // muted MarkdownTokenNode. The user sees `# Heading` with `# ` greyed
  // out, the text content is the markdown source verbatim.
  //
  // Live mode: hide the marker entirely. We stash the marker string on the
  // BlockParagraphNode so the serializer can rebuild `# Heading` on submit,
  // then drop the chars from the visible body.
  //
  // Also handles mode toggling:
  //   live → hybrid: a paragraph with a stashed marker has it promoted
  //                  back to a visible token, and the caret shifts right
  //                  by markerLen so it stays on the same character.
  //   hybrid → live: visible marker chars in the text get stashed and
  //                  sliced off; caret is mapped via buildLiveOffsetMap.
  const stashedNow =
    $isBlockParagraphNode(paragraph) ? paragraph.getBlockMarker() : "";
  let body = text;
  let stashedMarkerForOffsetMap = ""; // chars we just sliced off (live-mode pass)
  let hybridPromoteShift = 0;          // chars we just put BACK (hybrid promote)
  if (block.markerLen > 0 && text.length >= block.markerLen) {
    const marker = text.slice(0, block.markerLen);
    if (isLive) {
      if (stashedNow !== marker && $isBlockParagraphNode(paragraph)) {
        paragraph.setBlockMarker(marker);
      }
      stashedMarkerForOffsetMap = marker;
      body = text.slice(marker.length);
    } else {
      desired.push({ kind: "token", text: marker, format: 0 });
      body = text.slice(marker.length);
      // Hybrid mode shouldn't carry a stale stash from a previous live run.
      if (stashedNow.length > 0 && $isBlockParagraphNode(paragraph)) {
        paragraph.setBlockMarker("");
      }
    }
  } else if (!isLive && stashedNow.length > 0) {
    // Mode toggle: live → hybrid. Surface the hidden marker so the user
    // sees the raw markdown again. Clearing the stash here means
    // subsequent hybrid passes detect it from the (now visible) text.
    desired.push({ kind: "token", text: stashedNow, format: 0 });
    hybridPromoteShift = stashedNow.length;
    if ($isBlockParagraphNode(paragraph)) {
      paragraph.setBlockMarker("");
    }
  }

  // Track absolute source position as we walk the inline tokens, so plain
  // text tokens can look up their existing format from `currentFmt`. In
  // hybrid mode the block marker contributes `markerLen` chars (the
  // visible muted token), in live-mode case (a) we've sliced them off so
  // srcPos starts at the same offset but the live offset map will
  // collapse them.
  let srcPos = block.markerLen;

  // We capture the inline-tokenizer result so the live-mode offset map can
  // see exactly which chars are markers. Code / HR paragraphs skip inline
  // tokenization (their content is rendered verbatim) so they pass null.
  let inlineTokens: Token[] | null = null;
  // Code-fence open/close lines in live mode: their whole text IS the
  // marker (`` ``` `` or ` ```lang `). Stash on the paragraph and drop the
  // visible body so the paragraph renders as an empty styled divider.
  // Tracked separately from `stashedMarkerForOffsetMap` because the source
  // chars here aren't a `markerLen` prefix — they're the entire body.
  let trailingDropForOffsetMap = 0;
  if (isCodeKind(block.kind)) {
    if (
      isLive &&
      (block.kind === "code-fence-open" || block.kind === "code-fence-close") &&
      body.length > 0 &&
      $isBlockParagraphNode(paragraph)
    ) {
      // The fence line. Stash it and emit nothing; CSS handles the visual.
      if (paragraph.getBlockMarker() !== body) {
        paragraph.setBlockMarker(body);
      }
      trailingDropForOffsetMap = body.length;
      body = "";
    } else if (body.length > 0) {
      // Hybrid mode, or code-line content — render verbatim.
      desired.push({ kind: "text", text: body, format: 0 });
    }
  } else if (block.kind === "hr") {
    // HR is a special case: in hybrid mode the whole line is a token so
    // CSS can paint a rule across it. In live mode we collapse it the
    // same way so the user can still see / edit / delete the `---` they
    // typed — a fully-invisible HR would be undeletable without remembering
    // it's there. (Real Notion-style HRs would need a DecoratorNode, which
    // is more work than this flag merits for v1.)
    if (body.length > 0) {
      desired.push({ kind: "token", text: body, format: 0 });
    }
  } else {
    inlineTokens = tokenize(body);
    for (let ti = 0; ti < inlineTokens.length; ti++) {
      const t = inlineTokens[ti];
      const tokenLen = t.text.length;

      // ─── Link sequence (live mode collapse) ────────────────────────────
      // Tokens for `[label](url)` come as: marker `[`, formatted label,
      // marker `](`, formatted url (in code format), marker `)`. Image
      // links additionally start with a marker `!`. In live mode we
      // collapse the whole sequence into a single LinkTextNode that
      // shows the label and remembers the URL — the markers + URL
      // vanish from the visible text. Hybrid mode falls through to the
      // regular per-token rendering below.
      if (
        isLive &&
        t.type === "marker" &&
        (t.text === "[" || t.text === "!") &&
        ti + 4 < inlineTokens.length
      ) {
        const offset = t.text === "!" ? 1 : 0; // skip the bang for images
        const open = inlineTokens[ti + offset];
        const label = inlineTokens[ti + offset + 1];
        const mid = inlineTokens[ti + offset + 2];
        const url = inlineTokens[ti + offset + 3];
        const close = inlineTokens[ti + offset + 4];
        if (
          open?.type === "marker" &&
          open.text === "[" &&
          label?.type === "formatted" &&
          label.format === "link" &&
          mid?.type === "marker" &&
          mid.text === "](" &&
          url?.type === "formatted" &&
          close?.type === "marker" &&
          close.text === ")"
        ) {
          desired.push({
            kind: "link",
            text: label.text,
            format: 0,
            url: url.text,
          });
          // Advance srcPos past every consumed token (including the
          // optional leading `!`) so the format map / offset map stay
          // in lockstep with the source text.
          srcPos += t.text.length;
          if (offset === 1) {
            // Already counted the `!` above; advance past the rest.
            srcPos +=
              open.text.length +
              label.text.length +
              mid.text.length +
              url.text.length +
              close.text.length;
            ti += 5;
          } else {
            srcPos +=
              label.text.length +
              mid.text.length +
              url.text.length +
              close.text.length;
            ti += 4;
          }
          continue;
        }
      }

      if (t.type === "marker") {
        if (!isLive) {
          desired.push({ kind: "token", text: t.text, format: 0 });
        }
        // live mode → drop the marker chars from the output
      } else if (t.type === "formatted") {
        // Fresh marker pair in the source text — use its format. We
        // deliberately don't OR in the existing format here: the
        // pre-existing chars under this token (in live mode) had a
        // format inherited from typing context, and the user's
        // intent when wrapping with markers is to *set* the new
        // format, not combine it.
        desired.push({
          kind: "text",
          text: t.text,
          format: FORMAT_FLAGS[t.format],
        });
      } else if (isLive && currentFmt) {
        // Plain text in live mode — preserve the existing per-char
        // format. Walk the source range, split into runs of equal
        // format so each run becomes its own DesiredNode (Lexical
        // merges them later if formats match adjacent nodes anyway).
        let runStart = 0;
        let runFmt = currentFmt[srcPos] ?? 0;
        for (let i = 1; i < tokenLen; i++) {
          const f = currentFmt[srcPos + i] ?? 0;
          if (f !== runFmt) {
            desired.push({
              kind: "text",
              text: t.text.slice(runStart, i),
              format: runFmt,
            });
            runStart = i;
            runFmt = f;
          }
        }
        desired.push({
          kind: "text",
          text: t.text.slice(runStart),
          format: runFmt,
        });
      } else {
        // Plain text in hybrid mode — format is always 0; the only way
        // text gets a format in hybrid is via a `formatted` token.
        desired.push({ kind: "text", text: t.text, format: 0 });
      }
      srcPos += tokenLen;
    }
  }

  if (nodesEqual(current, desired)) return false;

  // Snapshot URLs from any existing LinkTextNodes so a rewrite triggered
  // by an unrelated change (e.g. typing after a link) can re-attach them
  // to the rebuilt text nodes. Keyed by visible label — duplicates inside
  // the same paragraph fall back to the first match.
  const preservedLinkUrls = new Map<string, string>();
  for (const child of paragraph.getChildren()) {
    if ($isLinkTextNode(child)) {
      const label = child.getTextContent();
      const url = child.getUrl();
      if (label && url && !preservedLinkUrls.has(label)) {
        preservedLinkUrls.set(label, url);
      }
    }
  }

  const srcOffsets = getSelectionOffsetWithin(paragraph);
  for (const child of paragraph.getChildren()) child.remove();
  for (const node of desired) {
    if (node.kind === "token") {
      paragraph.append($createMarkdownTokenNode(node.text));
    } else if (node.kind === "link") {
      const t = $createLinkTextNode(node.text, node.url ?? "");
      if (node.format !== 0) t.setFormat(node.format);
      paragraph.append(t);
    } else {
      // Plain text — but if this label was previously a LinkTextNode, the
      // URL has only been "hidden" by the latest tokenizer pass; restore
      // it so the link survives unrelated paragraph edits.
      const preservedUrl = preservedLinkUrls.get(node.text);
      const t = preservedUrl
        ? $createLinkTextNode(node.text, preservedUrl)
        : $createTextNode(node.text);
      if (node.format !== 0) t.setFormat(node.format);
      paragraph.append(t);
    }
  }
  // Caret restoration:
  //   live mode   — prefix-sum offset map (we just dropped some chars).
  //   hybrid mode — identity, except on a `live → hybrid` promotion where
  //                 we put `hybridPromoteShift` chars BACK at the start of
  //                 the paragraph and need to push the caret right.
  if (srcOffsets) {
    if (isLive) {
      const map = buildLiveOffsetMap(
        text,
        stashedMarkerForOffsetMap.length,
        inlineTokens,
        trailingDropForOffsetMap,
      );
      setSelectionFromOffsets(paragraph, {
        anchor: map(srcOffsets.anchor),
        focus: map(srcOffsets.focus),
      });
    } else {
      setSelectionFromOffsets(paragraph, {
        anchor: srcOffsets.anchor + hybridPromoteShift,
        focus: srcOffsets.focus + hybridPromoteShift,
      });
    }
  }
  return true;
}

function $restyleAllParagraphs(mode: MarkdownMode): void {
  const root = $getRoot();
  const map = $computeBlockMap();
  for (const child of root.getChildren()) {
    if (!$isParagraphNode(child)) continue;
    const info = map.get(child.getKey()) ?? $detectBlockFor(child);
    $applyStyling(child, info, mode);
  }
}

/**
 * UX nicety: when a paragraph transitions to `code-fence-close` and is the
 * last block in the document, append an empty paragraph after it and move
 * the caret there. This way typing ```` ``` ```` to close a code block also
 * "exits" the block — the user can immediately start typing the next message
 * line (or press Enter to submit). They can still arrow / click back into
 * the close-fence line to edit it.
 *
 * Triggered only on the *transition* into the close kind (tracked via
 * `prevKinds`) so navigating back to the line and re-entering it doesn't
 * keep appending paragraphs.
 */
function $autoEscapeClosedFence(prevKinds: Map<string, BlockKind>): void {
  const map = $computeBlockMap();
  const root = $getRoot();

  for (const child of root.getChildren()) {
    if (!$isParagraphNode(child)) continue;
    const key = child.getKey();
    const info = map.get(key);
    if (!info) continue;
    const oldKind = prevKinds.get(key);
    if (
      info.kind === "code-fence-close" &&
      oldKind !== "code-fence-close" &&
      child.getNextSibling() === null
    ) {
      const next = $createParagraphNode();
      child.insertAfter(next);
      next.select();
    }
  }

  prevKinds.clear();
  for (const [k, v] of map) prevKinds.set(k, v.kind);
}

const BLOCK_ATTR = "data-md-block";
const LANG_ATTR = "data-md-lang";

function syncBlockAttributes(
  editor: ReturnType<typeof useLexicalComposerContext>[0],
): void {
  editor.getEditorState().read(() => {
    const root = editor.getRootElement();
    if (!root) return;

    const seen = new Set<HTMLElement>();
    const map = $computeBlockMap();
    for (const [key, info] of map) {
      const el = editor.getElementByKey(key);
      if (!(el instanceof HTMLElement)) continue;
      seen.add(el);
      if (info.kind === "paragraph") {
        if (el.hasAttribute(BLOCK_ATTR)) el.removeAttribute(BLOCK_ATTR);
      } else {
        if (el.getAttribute(BLOCK_ATTR) !== info.kind) {
          el.setAttribute(BLOCK_ATTR, info.kind);
        }
      }
      // Language tag (code-fence-open only) — used by CSS to render a
      // small label since the visible `` ```ts `` chars are hidden in
      // live mode. Cleared for non-fence-open blocks so a paragraph that
      // *was* a fence and is now plain doesn't keep a stale label.
      if (info.kind === "code-fence-open" && info.lang) {
        if (el.getAttribute(LANG_ATTR) !== info.lang) {
          el.setAttribute(LANG_ATTR, info.lang);
        }
      } else if (el.hasAttribute(LANG_ATTR)) {
        el.removeAttribute(LANG_ATTR);
      }
    }

    // Strip the attribute from any paragraph the reconciler kept around but
    // that we no longer recognise (defensive — e.g. after delete).
    const stale = root.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}]`);
    stale.forEach((el) => {
      if (!seen.has(el)) {
        el.removeAttribute(BLOCK_ATTR);
        el.removeAttribute(LANG_ATTR);
      }
    });
  });
}

const RESTYLE_TAG = "md-restyle";

export function MarkdownPlugin() {
  const [editor] = useLexicalComposerContext();
  const { markdownMode } = useComposerContext();
  const prevKindsRef = useRef<Map<string, BlockKind>>(new Map());
  // Ref-mirror so the long-lived update listener inside the effect always
  // sees the current mode without being torn down on every flag change.
  // (Effect itself depends on `markdownMode` too, so when it actually
  // changes we also re-run the initial restyle pass below.)
  const modeRef = useRef<MarkdownMode>(markdownMode);
  modeRef.current = markdownMode;

  useEffect(() => {
    const prevKinds = prevKindsRef.current;
    // Initial pass so any `initialValue` gets styled immediately, AND so
    // toggling between modes at runtime restyles the document end-to-end
    // (collapsing markers when switching to `live`, re-emitting them when
    // switching back to `hybrid`). We seed `prevKinds` with the
    // *post-style* state so the auto-escape doesn't fire on a fence the
    // user pre-loaded as initial content.
    editor.update(
      () => {
        $restyleAllParagraphs(modeRef.current);
        const map = $computeBlockMap();
        prevKinds.clear();
        for (const [k, v] of map) prevKinds.set(k, v.kind);
      },
      { tag: RESTYLE_TAG },
    );
    syncBlockAttributes(editor);

    let scheduled = false;

    const unregisterUpdate = editor.registerUpdateListener(
      ({ tags, dirtyElements, dirtyLeaves }) => {
        // DOM attributes are pure — sync after every render.
        syncBlockAttributes(editor);

        // Re-style content only when something actually changed and the
        // change wasn't our own restyle pass.
        if (tags.has(RESTYLE_TAG)) return;
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        if (scheduled) return;
        scheduled = true;
        queueMicrotask(() => {
          scheduled = false;
          editor.update(
            () => {
              $restyleAllParagraphs(modeRef.current);
              $autoEscapeClosedFence(prevKinds);
            },
            { tag: RESTYLE_TAG },
          );
        });
      },
    );

    // Backspace at the start of a live-mode paragraph that carries a
    // stashed block marker → clear the marker instead of merging up. This
    // is the only way for the user to "remove the heading style" since
    // the `# ` chars aren't in the visible text anymore. Mirrors Notion's
    // behaviour: backspace at the start of a heading converts it to plain.
    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      () => {
        if (modeRef.current !== "live") return false;
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        if (selection.anchor.offset !== 0) return false;

        const anchor = selection.anchor.getNode();
        const top = anchor.getTopLevelElement();
        if (!top || !$isParagraphNode(top)) return false;
        if (!$isBlockParagraphNode(top)) return false;
        if (!(top as BlockParagraphNode).hasBlockMarker()) return false;

        // Verify the cursor is at the very start of the visible body
        // (offset 0 in the first child, or element-type at the paragraph).
        if (selection.anchor.type === "element") {
          if (selection.anchor.getNode().getKey() !== top.getKey()) {
            return false;
          }
        } else {
          const first = top.getFirstChild();
          if (!first || first.getKey() !== anchor.getKey()) return false;
        }

        editor.update(() => {
          const latest = top.getLatest();
          if ($isBlockParagraphNode(latest)) {
            (latest as BlockParagraphNode).setBlockMarker("");
          }
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterUpdate();
      unregisterBackspace();
    };
  }, [editor, markdownMode]);

  return null;
}