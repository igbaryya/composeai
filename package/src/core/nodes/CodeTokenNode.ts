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

/** Syntax-highlight token classes for fenced code (currently mermaid only).
 *  `text` covers whitespace / anything uncoloured so the node stream stays
 *  uniform (no plain TextNodes interleaved that Lexical might merge). */
export type CodeTokenKind =
  | "keyword"
  | "arrow"
  | "string"
  | "comment"
  | "number"
  | "punct"
  | "ident"
  | "text";

export type SerializedCodeTokenNode = Spread<
  { codeKind: CodeTokenKind },
  SerializedTextNode
>;

const BASE_CLASS = "composer-code-tok";

/**
 * A TextNode subclass that paints a single syntax-highlight token inside a
 * fenced code block. The caret traverses these exactly like normal text — the
 * only difference is the per-kind CSS class, so highlighting is purely cosmetic
 * and never changes the serialized source.
 */
export class CodeTokenNode extends TextNode {
  __codeKind: CodeTokenKind;

  static getType(): string {
    return "composeai-code-token";
  }

  static clone(node: CodeTokenNode): CodeTokenNode {
    return new CodeTokenNode(node.__text, node.__codeKind, node.__key);
  }

  constructor(text: string = "", codeKind: CodeTokenKind = "text", key?: NodeKey) {
    super(text, key);
    this.__codeKind = codeKind;
  }

  getCodeKind(): CodeTokenKind {
    return this.getLatest().__codeKind;
  }

  setCodeKind(kind: CodeTokenKind): this {
    const self = this.getWritable();
    self.__codeKind = kind;
    return self;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    addClassNamesToElement(dom, BASE_CLASS, `${BASE_CLASS}--${this.__codeKind}`);
    return dom;
  }

  updateDOM(
    prevNode: this,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const updated = super.updateDOM(prevNode, dom, config);
    if (prevNode.__codeKind !== this.__codeKind) {
      dom.classList.remove(`${BASE_CLASS}--${prevNode.__codeKind}`);
      dom.classList.add(`${BASE_CLASS}--${this.__codeKind}`);
    }
    return updated;
  }

  static importJSON(serializedNode: SerializedCodeTokenNode): CodeTokenNode {
    return $createCodeTokenNode("", serializedNode.codeKind).updateFromJSON(
      serializedNode,
    );
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedCodeTokenNode>,
  ): this {
    return super.updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedCodeTokenNode {
    return {
      ...super.exportJSON(),
      type: CodeTokenNode.getType(),
      version: 1,
      codeKind: this.__codeKind,
    };
  }
}

export function $createCodeTokenNode(
  text: string = "",
  codeKind: CodeTokenKind = "text",
): CodeTokenNode {
  return $applyNodeReplacement(new CodeTokenNode(text, codeKind));
}

export function $isCodeTokenNode(
  node: LexicalNode | null | undefined,
): node is CodeTokenNode {
  return node instanceof CodeTokenNode;
}
