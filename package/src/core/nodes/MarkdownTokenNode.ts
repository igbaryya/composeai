import {
  $applyNodeReplacement,
  TextNode,
  addClassNamesToElement,
  type EditorConfig,
  type LexicalNode,
  type LexicalUpdateJSON,
  type NodeKey,
  type SerializedTextNode,
} from "lexical";

export type SerializedMarkdownTokenNode = SerializedTextNode;

const TOKEN_CLASS = "composer-md-token";

/**
 * A muted-styled TextNode used to render markdown markers (asterisks,
 * underscores, backticks, tildes) while keeping them part of the source.
 * The caret traverses these characters naturally like normal text.
 */
export class MarkdownTokenNode extends TextNode {
  static getType(): string {
    return "composeai-md-token";
  }

  static clone(node: MarkdownTokenNode): MarkdownTokenNode {
    return new MarkdownTokenNode(node.__text, node.__key);
  }

  constructor(text: string = "", key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    addClassNamesToElement(dom, TOKEN_CLASS);
    return dom;
  }

  static importJSON(
    serializedNode: SerializedMarkdownTokenNode,
  ): MarkdownTokenNode {
    return $createMarkdownTokenNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedMarkdownTokenNode>,
  ): this {
    return super.updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedMarkdownTokenNode {
    return {
      ...super.exportJSON(),
      type: MarkdownTokenNode.getType(),
      version: 1,
    };
  }
}

export function $createMarkdownTokenNode(text: string = ""): MarkdownTokenNode {
  return $applyNodeReplacement(new MarkdownTokenNode(text));
}

export function $isMarkdownTokenNode(
  node: LexicalNode | null | undefined,
): node is MarkdownTokenNode {
  return node instanceof MarkdownTokenNode;
}