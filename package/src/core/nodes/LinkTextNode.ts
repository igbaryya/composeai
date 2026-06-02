/**
 * A TextNode subclass used in `live` markdown mode to represent the
 * VISIBLE label of a link while remembering the (hidden) URL on the side.
 *
 * Why a custom node rather than Lexical's `@lexical/link` LinkNode:
 *   - LinkNode is an ElementNode that wraps a TextNode child, adding a
 *     real `<a>` wrapper. That works, but it complicates the plugin's
 *     children-equality / per-char format map (which assumes inline =
 *     TextNode and bails on element children) and pulls in another
 *     package dependency. Our needs are minimal — paint as a link, hold
 *     a string `url` — so a TextNode subclass keeps the rest of the
 *     plugin code unchanged.
 *
 * In hybrid mode the markers `[`, `](`, `)` AND the URL all stay in the
 * visible text (rendered as muted tokens via MarkdownTokenNode). No
 * LinkTextNode is created.
 *
 * In live mode the markers + URL are removed from the visible text; the
 * URL is stashed on this node so the serializer can reconstruct
 * `[label](url)` on submit.
 */

import {
  $applyNodeReplacement,
  TextNode,
  addClassNamesToElement,
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical";

export type SerializedLinkTextNode = Spread<
  { url: string },
  SerializedTextNode
>;

const LINK_CLASS = "composer-link";

export class LinkTextNode extends TextNode {
  __url: string;

  constructor(text: string = "", url: string = "", key?: NodeKey) {
    super(text, key);
    this.__url = url;
  }

  static getType(): string {
    return "composeai-link-text";
  }

  static clone(node: LinkTextNode): LinkTextNode {
    return new LinkTextNode(node.__text, node.__url, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    addClassNamesToElement(dom, LINK_CLASS);
    // We deliberately render as a span (the super's element type) with a
    // class rather than an actual `<a>`. The composer is an input — the
    // user can't navigate away from it by clicking — and a real anchor
    // would steal focus on click in some browsers. The CSS already
    // matches `<a>` styling closely; the URL is reachable from the
    // serialized markdown on submit.
    if (this.__url) dom.setAttribute("data-url", this.__url);
    return dom;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const updated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__url !== this.__url) {
      if (this.__url) dom.setAttribute("data-url", this.__url);
      else dom.removeAttribute("data-url");
    }
    return updated;
  }

  static importJSON(serializedNode: SerializedLinkTextNode): LinkTextNode {
    return $createLinkTextNode("", "").updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedLinkTextNode>,
  ): this {
    super.updateFromJSON(serializedNode);
    const writable = this.getWritable() as this;
    writable.__url = serializedNode.url ?? "";
    return writable;
  }

  exportJSON(): SerializedLinkTextNode {
    return {
      ...super.exportJSON(),
      type: LinkTextNode.getType(),
      version: 1,
      url: this.getUrl(),
    };
  }

  getUrl(): string {
    return this.getLatest().__url;
  }

  setUrl(url: string): this {
    const writable = this.getWritable();
    writable.__url = url;
    return writable;
  }

  // Typing at the boundary of the link should NOT extend the link — the
  // user wants their next char to be plain text, not "part of the link
  // label". Lexical honours these by creating a new sibling TextNode for
  // boundary insertions. Internal edits (cursor between chars) still go
  // into this node, which keeps label editing natural.
  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createLinkTextNode(
  text: string = "",
  url: string = "",
): LinkTextNode {
  return $applyNodeReplacement(new LinkTextNode(text, url));
}

export function $isLinkTextNode(
  node: LexicalNode | null | undefined,
): node is LinkTextNode {
  return node instanceof LinkTextNode;
}