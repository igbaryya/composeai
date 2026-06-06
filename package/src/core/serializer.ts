import {
  $getRoot,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import type { MentionRef } from "../types";
import { $isMentionNode } from "./nodes/MentionNode";
import { $isMarkdownTokenNode } from "./nodes/MarkdownTokenNode";
import { $isBlockParagraphNode } from "./nodes/BlockParagraphNode";
import { $isLinkTextNode } from "./nodes/LinkTextNode";
import { detectBlock, type BlockKind } from "../plugins/markdown-blocks";

/**
 * Walks the editor tree and produces:
 *   - text: plain text (chips collapse to `@label`, markdown tokens dropped).
 *   - mentions: discovered MentionNodes in document order.
 *
 * "Plain text" means what the user *intended* to write — markers like `**`
 * around `bold` are stripped, leaving just `bold`.
 */
export function collectPlainAndMentions(editor: LexicalEditor): {
  text: string;
  mentions: MentionRef[];
} {
  return editor.getEditorState().read(() => {
    const root = $getRoot();
    const mentions: MentionRef[] = [];

    const walkInline = (parent: LexicalNode): string => {
      if (!$isElementNode(parent)) return "";
      let out = "";
      for (const child of parent.getChildren()) {
        if ($isMentionNode(child)) {
          // Label reflects any edits the user made (e.g. backspacing
          // "John Doe" down to "John"). The id is the stable handle
          // assigned when the chip was first inserted.
          const label = child.getMentionLabel();
          mentions.push({
            id: child.getMentionId(),
            label,
          });
          out += `${child.getMentionPrefix()}${label}`;
          continue;
        }
        if ($isMarkdownTokenNode(child)) continue;
        if ($isLineBreakNode(child)) {
          out += "\n";
          continue;
        }
        if ($isTextNode(child)) {
          out += child.getTextContent();
          continue;
        }
        if ($isElementNode(child)) {
          out += walkInline(child);
        }
      }
      return out;
    };

    const blocks: string[] = [];
    for (const child of root.getChildren()) {
      if ($isElementNode(child)) {
        blocks.push(walkInline(child));
      } else if ($isTextNode(child)) {
        blocks.push(child.getTextContent());
      }
    }

    return { text: blocks.join("\n").replace(/\n+$/g, ""), mentions };
  });
}

/**
 * Lexical format-flag bits we care about for serialization. Mirrors
 * `FORMAT_FLAGS` in MarkdownPlugin so the two stay in lockstep — if you
 * touch one, touch the other.
 */
const FORMAT_BIT = {
  bold: 1,
  italic: 2,
  strike: 4,
  // underline (8) — no widely-supported markdown syntax; we drop it on
  // serialize rather than invent one.
  code: 16,
} as const;

/**
 * Wrap text with markdown markers based on its Lexical format flags. Used
 * by the serializer when running against a `live`-mode document where the
 * markers were stripped out of the editor source and need to be
 * reconstructed at submit time.
 *
 * In `hybrid` mode the markers are already in the document text (carried
 * by `MarkdownTokenNode`s), so this helper isn't called.
 *
 * Order matters: code wraps innermost (backticks shouldn't be confused
 * with surrounding bold/italic), then bold (`**`), italic (`*`), strike
 * (`~~`). Combining bold + italic produces `***text***` — CommonMark
 * accepts it; renderers that don't fall back to plain bold which is fine.
 */
function wrapByFormat(text: string, format: number): string {
  if (!text) return text;
  let out = text;
  if (format & FORMAT_BIT.code) out = `\`${out}\``;
  if (format & FORMAT_BIT.bold) out = `**${out}**`;
  if (format & FORMAT_BIT.italic) out = `*${out}*`;
  if (format & FORMAT_BIT.strike) out = `~~${out}~~`;
  return out;
}

/**
 * Serializes the editor to markdown.
 *
 * Two paths, picked by whether the document contains any
 * `MarkdownTokenNode` children (which only the `hybrid`-mode plugin
 * produces — so the presence of one is a reliable mode-detector that
 * doesn't require threading the mode through every call site):
 *
 *  - HYBRID: the document text IS the markdown source. Markers from
 *    `MarkdownTokenNode` + body from `TextNode` are concatenated
 *    verbatim. No format-flag inspection needed.
 *
 *  - LIVE: the document text is the *rendered* state — inline markers
 *    were consumed by the plugin and only the Lexical format flag on
 *    each TextNode remembers that "foo" was bold. We rebuild the
 *    markers by wrapping each TextNode according to its format.
 *
 * Inter-paragraph separator: see {@link joinWithCommonMarkSpacing}.
 */
export function toMarkdown(
  editor: LexicalEditor,
  opts?: { linkedMention?: boolean },
): string {
  const linkedMention = opts?.linkedMention === true;
  return editor.getEditorState().read(() => {
    const root = $getRoot();

    // Detect mode by content. A live-mode document never contains
    // MarkdownTokenNodes for inline markers; a hybrid-mode document
    // emits them on every formatted span. (Block markers still live as
    // tokens in both modes — see the comment in MarkdownPlugin — so
    // checking specifically for *inline* format-flag-bearing siblings
    // isn't necessary; presence of any non-leading token is enough.)
    let usingLive = true;
    const scan = (node: LexicalNode): void => {
      if ($isMarkdownTokenNode(node)) {
        const prev = node.getPreviousSibling();
        // Leading-token-of-paragraph = block marker; ignore. Any other
        // token is an inline marker → hybrid mode.
        if (prev !== null) usingLive = false;
      } else if ($isElementNode(node)) {
        for (const child of node.getChildren()) {
          if (!usingLive) return; // early-out
          scan(child);
        }
      }
    };
    for (const child of root.getChildren()) {
      if (!usingLive) break;
      scan(child);
    }

    const lines: string[] = [];

    const serializeParagraph = (paragraph: LexicalNode): string => {
      if (!$isElementNode(paragraph)) return "";
      let out = "";
      for (const child of paragraph.getChildren()) {
        if ($isMentionNode(child)) {
          const prefix = child.getMentionPrefix();
          const label = child.getMentionLabel();
          if (linkedMention) {
            // `[@label](mention:id)` — the whole `@label` is the link text so
            // the trigger stays glued to the label, and the stable id rides
            // along in the destination for id-based resolution downstream.
            out += `[${prefix}${label}](mention:${child.getMentionId()})`;
          } else {
            out += `${prefix}${label}`;
          }
          continue;
        }
        if ($isLineBreakNode(child)) {
          out += "\n";
          continue;
        }
        if ($isMarkdownTokenNode(child)) {
          // Tokens are markdown markers verbatim (hybrid mode), or block
          // markers (both modes). Either way, just emit the text.
          out += child.getTextContent();
          continue;
        }
        if ($isLinkTextNode(child)) {
          // Live-mode link node: visible label + stashed URL → `[label](url)`.
          // If the URL happens to be empty (shouldn't normally happen)
          // we fall back to the bare label so the user sees their text.
          const label = child.getTextContent();
          const url = child.getUrl();
          out += url ? `[${label}](${url})` : label;
          continue;
        }
        if ($isTextNode(child)) {
          const text = child.getTextContent();
          if (usingLive) {
            out += wrapByFormat(text, child.getFormat());
          } else {
            out += text;
          }
          continue;
        }
        if ($isElementNode(child)) {
          out += serializeParagraph(child);
        }
      }
      return out;
    };

    for (const child of root.getChildren()) {
      if ($isParagraphNode(child)) {
        const body = serializeParagraph(child);
        // Live-mode paragraphs may carry the block marker (`# `, ` ```ts `,
        // `> ` etc.) as a stashed prop on the BlockParagraphNode. Prepend
        // it here so the rendered markdown matches what the user typed
        // even though those chars never appeared in the editor's visible
        // text. Hybrid-mode paragraphs always have empty stash.
        if ($isBlockParagraphNode(child) && child.hasBlockMarker()) {
          lines.push(child.getBlockMarker() + body);
        } else {
          lines.push(body);
        }
      } else if ($isTextNode(child)) {
        lines.push(child.getTextContent());
      }
    }

    return joinWithCommonMarkSpacing(lines).trim();
  });
}

/**
 * Block kinds whose paragraphs continue across un-blanked following lines
 * in CommonMark (the "lazy continuation" rule). When one of these is
 * immediately followed by a plain paragraph in the editor, we must emit a
 * blank line in the markdown so the next paragraph doesn't get sucked
 * into the list item / block quote.
 */
function isLazyContinuationBlock(kind: BlockKind): boolean {
  return kind === "list-bullet" || kind === "list-numbered" || kind === "quote";
}

function joinWithCommonMarkSpacing(lines: string[]): string {
  if (lines.length === 0) return "";

  // Walk the document in order so fence parity (we're inside a ``` block
  // or not) is computed correctly — block detection is fence-sensitive.
  let insideCode = false;
  const blocks = lines.map((line) => {
    const info = detectBlock(line, insideCode);
    if (info.kind === "code-fence-open") insideCode = true;
    else if (info.kind === "code-fence-close") insideCode = false;
    return info;
  });

  let out = lines[0];
  for (let i = 1; i < lines.length; i++) {
    const prev = blocks[i - 1];
    const next = blocks[i];
    const nextText = lines[i];

    // Only "plain paragraph" follow-ups trigger lazy continuation —
    // empty lines already produce a blank in the join, and other block
    // markers (`-`, `#`, `>`, fences, hr) terminate the list/quote on
    // their own and don't need an extra separator.
    const needsBlankSeparator =
      isLazyContinuationBlock(prev.kind) &&
      next.kind === "paragraph" &&
      nextText.length > 0;

    out += needsBlankSeparator ? "\n\n" : "\n";
    out += nextText;
  }
  return out;
}