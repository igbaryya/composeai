/**
 * A drop-in replacement for Lexical's `ParagraphNode` that remembers the
 * markdown block marker (e.g. `"# "`, `"## "`, `"> "`, `` "```ts" ``) that
 * was originally on the paragraph but has been hidden from the visible text
 * in `live` markdown mode.
 *
 * Why we need this:
 * --------------------------------------------------------------------------
 * In hybrid mode the block marker is part of the paragraph's text content
 * (rendered as a muted `MarkdownTokenNode`). The block kind is detected
 * from the text on every restyle pass via `detectBlock()`. The serializer
 * just emits the visible text verbatim.
 *
 * In `live` mode we drop the marker chars so the user sees `# Title` as
 * "Title" — Notion-style. The block kind is no longer recoverable from
 * the visible text (the leading `# ` is gone) so we stash the original
 * marker string on the paragraph node itself. The detector then prefers
 * that marker, and the serializer reconstructs `# Title` for the submit
 * payload.
 *
 * Keeping the marker as a property (rather than as a hidden TextNode child)
 * sidesteps a bunch of caret-navigation footguns: the paragraph's
 * `getTextContent()` cleanly equals the visible text, so existing offset /
 * selection math in the markdown plugin and the rest of the editor needs
 * no changes.
 *
 * Lifecycle:
 *   - Registered as `{replace: ParagraphNode, with: () => new BlockParagraphNode()}`
 *     so every `$createParagraphNode()` actually mints a BlockParagraphNode.
 *   - `__blockMarker` defaults to `""` (regular paragraph).
 *   - `insertNewAfter()` is overridden to return a fresh BlockParagraphNode
 *     with NO marker — pressing Enter at the end of a `# Heading` line
 *     creates a plain paragraph below, the expected behavior.
 *   - `clone()` and `exportJSON()` persist `__blockMarker` across
 *     reconciler clones and editor-state serialisation.
 */

import {
  $applyNodeReplacement,
  ParagraphNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type RangeSelection,
  type SerializedParagraphNode,
  type Spread,
} from "lexical";

export type SerializedBlockParagraphNode = Spread<
  { blockMarker: string },
  SerializedParagraphNode
>;

export class BlockParagraphNode extends ParagraphNode {
  __blockMarker: string;

  constructor(key?: NodeKey) {
    super(key);
    this.__blockMarker = "";
  }

  static getType(): string {
    return "composeai-block-paragraph";
  }

  static clone(node: BlockParagraphNode): BlockParagraphNode {
    const next = new BlockParagraphNode(node.__key);
    next.__blockMarker = node.__blockMarker;
    return next;
  }

  static importJSON(
    serializedNode: SerializedBlockParagraphNode,
  ): BlockParagraphNode {
    return $createBlockParagraphNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedBlockParagraphNode>,
  ): this {
    super.updateFromJSON(serializedNode);
    const writable = this.getWritable() as this;
    writable.__blockMarker = serializedNode.blockMarker ?? "";
    return writable;
  }

  exportJSON(): SerializedBlockParagraphNode {
    return {
      ...super.exportJSON(),
      type: BlockParagraphNode.getType(),
      version: 1,
      blockMarker: this.getBlockMarker(),
    };
  }

  getBlockMarker(): string {
    return this.getLatest().__blockMarker;
  }

  setBlockMarker(marker: string): this {
    const writable = this.getWritable();
    writable.__blockMarker = marker;
    return writable;
  }

  hasBlockMarker(): boolean {
    return this.getLatest().__blockMarker.length > 0;
  }

  // Enter inside a block paragraph should start a clean paragraph below —
  // headings, quotes, lists, fences etc. don't bleed into the next line.
  insertNewAfter(
    rangeSelection: RangeSelection,
    restoreSelection: boolean = false,
  ): ParagraphNode {
    const next = super.insertNewAfter(rangeSelection, restoreSelection);
    // `super.insertNewAfter()` calls `$createParagraphNode()` which the
    // node-replacement machinery turns into a BlockParagraphNode with
    // empty marker. Defensive: explicitly clear it in case future Lexical
    // versions bypass the replacement here.
    if (next instanceof BlockParagraphNode) {
      next.setBlockMarker("");
    }
    return next;
  }
}

export function $createBlockParagraphNode(): BlockParagraphNode {
  return $applyNodeReplacement(new BlockParagraphNode());
}

export function $isBlockParagraphNode(
  node: unknown,
): node is BlockParagraphNode {
  return node instanceof BlockParagraphNode;
}