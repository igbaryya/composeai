/**
 * MentionNode — an inline ElementNode that wraps an editable `TextNode`
 * containing the mention's label. The chip carries the mention's stable
 * `id` and its trigger character (`@`, `#`, …) on the wrapping element so
 * the user can backspace through the label one character at a time and
 * the ID stays glued to whatever is left.
 *
 * Why ElementNode (not DecoratorNode)?
 *   - The old DecoratorNode chip was atomic: one backspace removed the
 *     entire mention, even when the label was "First Last" with a space.
 *   - As an ElementNode the chip's children are real TextNodes, so the
 *     caret traverses them naturally; backspace, selection, IME, and
 *     paste all "just work".
 *
 * The trigger character (`@`/`#`/…) is rendered via a CSS `::before`
 * pseudo-element keyed off `data-mention-prefix`, so it's visible but
 * NOT part of the editable text content. That guarantees the user can
 * never backspace the prefix away — they can only shorten the label
 * itself. When the label becomes empty the entire chip is removed by
 * Lexical (`canBeEmpty() = false`).
 */
import {
  $applyNodeReplacement,
  $createTextNode,
  ElementNode,
  type DOMConversionMap,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedElementNode,
  type Spread,
} from "lexical";

export type SerializedMentionNode = Spread<
  {
    mentionId: string;
    mentionPrefix: string;
  },
  SerializedElementNode
>;

export class MentionNode extends ElementNode {
  /** Stable identifier supplied by the consumer's MentionItem. */
  __id: string;
  /** Trigger character shown via CSS `::before` (e.g. "@" or "#"). */
  __prefix: string;

  static getType(): string {
    return "composeai-mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(node.__id, node.__prefix, node.__key);
  }

  constructor(id: string, prefix: string = "@", key?: NodeKey) {
    super(key);
    this.__id = id;
    this.__prefix = prefix;
  }

  // ── Stable accessors ────────────────────────────────────────────────
  getMentionId(): string {
    return this.__id;
  }

  getMentionPrefix(): string {
    return this.__prefix;
  }

  /**
   * The current label text. Reflects user edits — if the user backspaced
   * "@John Doe" down to "@John", this returns "John".
   */
  getMentionLabel(): string {
    return this.getTextContent();
  }

  // ── Behavior flags ──────────────────────────────────────────────────
  isInline(): boolean {
    return true;
  }

  /**
   * Returning false makes Lexical auto-remove the element as soon as its
   * children collection becomes empty. That implements "delete the whole
   * mention when I remove all the text" with zero plugin code.
   */
  canBeEmpty(): boolean {
    return false;
  }

  /**
   * Prevent adjacent text outside the chip from accidentally merging
   * INTO the chip — typing "x" right after a mention should produce
   * "@John|x", not "@Johnx".
   */
  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  // ── DOM ─────────────────────────────────────────────────────────────
  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement("span");
    span.className = "composer-mention";
    span.setAttribute("data-mention-id", this.__id);
    span.setAttribute("data-mention-prefix", this.__prefix);
    return span;
  }

  updateDOM(prev: MentionNode, dom: HTMLElement): boolean {
    // Keep the data attributes in sync if id/prefix ever change. Children
    // are reconciled by Lexical, so we return false to keep the existing
    // DOM element.
    if (prev.__id !== this.__id) dom.setAttribute("data-mention-id", this.__id);
    if (prev.__prefix !== this.__prefix) {
      dom.setAttribute("data-mention-prefix", this.__prefix);
    }
    return false;
  }

  exportDOM(): DOMExportOutput {
    const el = document.createElement("span");
    el.setAttribute("data-mention-id", this.__id);
    el.setAttribute("data-mention-prefix", this.__prefix);
    // For the exported DOM we inline the prefix into the text so the
    // mention survives copy/paste into apps that don't load our CSS.
    el.textContent = `${this.__prefix}${this.getTextContent()}`;
    return { element: el };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (node: HTMLElement) => {
        if (!node.hasAttribute("data-mention-id")) return null;
        return {
          conversion: () => {
            const id = node.getAttribute("data-mention-id") ?? "";
            const prefix = node.getAttribute("data-mention-prefix") ?? "@";
            const rawText = node.textContent ?? "";
            // Strip the prefix we may have inlined during exportDOM.
            const label = rawText.startsWith(prefix)
              ? rawText.slice(prefix.length)
              : rawText;
            const mention = $createMentionNode(id, prefix);
            if (label) {
              mention.append($createTextNode(label));
            }
            return { node: mention };
          },
          priority: 1,
        };
      },
    };
  }

  // ── JSON ────────────────────────────────────────────────────────────
  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      type: MentionNode.getType(),
      version: 1,
      mentionId: this.__id,
      mentionPrefix: this.__prefix,
    };
  }

  static importJSON(json: SerializedMentionNode): MentionNode {
    // Children (the label TextNode) are restored by Lexical's default
    // ElementNode JSON handling — we only need to recover id + prefix.
    return $createMentionNode(json.mentionId, json.mentionPrefix ?? "@");
  }
}

export function $createMentionNode(
  id: string,
  prefix: string = "@",
): MentionNode {
  return $applyNodeReplacement(new MentionNode(id, prefix));
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}