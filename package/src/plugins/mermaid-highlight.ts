/**
 * Tiny, line-oriented mermaid syntax tokenizer used to colourise ```mermaid
 * fences in the editor. It is intentionally lightweight — enough to give
 * flowchart / sequence / class diagrams a code-editor feel — and never changes
 * the underlying text (every character is emitted in exactly one token, so the
 * concatenation of token texts equals the input line).
 *
 * The composer styles fences one paragraph (= one line) at a time, so this
 * works per line and keeps no cross-line state. Fenced strings that span lines
 * are rare in mermaid, so the trade-off is fine.
 */
import type { CodeTokenKind } from "../core/nodes/CodeTokenNode";

export interface MermaidToken {
  text: string;
  kind: CodeTokenKind;
}

// Diagram types + structural keywords across the common diagram kinds.
const KEYWORDS = new Set([
  "flowchart", "graph", "sequenceDiagram", "classDiagram", "stateDiagram",
  "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie", "gitGraph",
  "mindmap", "timeline", "quadrantChart", "requirementDiagram", "C4Context",
  "subgraph", "end", "direction", "participant", "actor", "note", "loop",
  "alt", "opt", "par", "and", "else", "rect", "activate", "deactivate",
  "class", "state", "click", "call", "href", "style", "linkStyle", "classDef",
  "section", "title", "accTitle", "accDescr", "over", "as",
  // flowchart directions
  "TB", "TD", "BT", "RL", "LR",
]);

const ARROW_CHARS = new Set(["-", "=", ".", "<", ">"]);
const WS_RE = /\s/;
// No `-`: dashes are always part of an arrow/link run, so a node id glued to
// an arrow (`Idea-->Draft`) doesn't swallow the leading dashes.
const WORD_RE = /[A-Za-z0-9_]/;
const DIGIT_RE = /[0-9]/;

export function tokenizeMermaidLine(line: string): MermaidToken[] {
  const out: MermaidToken[] = [];
  const push = (text: string, kind: CodeTokenKind) => {
    if (text) out.push({ text, kind });
  };

  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];

    // Whitespace — kept as an uncoloured token.
    if (WS_RE.test(c)) {
      let j = i + 1;
      while (j < n && WS_RE.test(line[j])) j++;
      push(line.slice(i, j), "text");
      i = j;
      continue;
    }

    // Line comment: `%% …`
    if (c === "%" && line[i + 1] === "%") {
      push(line.slice(i), "comment");
      i = n;
      continue;
    }

    // Double-quoted string / label.
    if (c === '"') {
      let j = i + 1;
      while (j < n && line[j] !== '"') j++;
      j = Math.min(j + 1, n);
      push(line.slice(i, j), "string");
      i = j;
      continue;
    }

    // Brackets that wrap node shapes / labels.
    if ("[](){}|".includes(c)) {
      push(c, "punct");
      i++;
      continue;
    }

    // Arrow / link runs: maximal run of arrow chars, plus an optional trailing
    // edge marker (`x` / `o`, as in `--x`, `--o`).
    if (ARROW_CHARS.has(c)) {
      let j = i + 1;
      while (j < n && ARROW_CHARS.has(line[j])) j++;
      if (j < n && (line[j] === "x" || line[j] === "o") && j - i >= 2) j++;
      const run = line.slice(i, j);
      const isArrow =
        run.length >= 2 || run.includes(">") || run.includes("<");
      push(run, isArrow ? "arrow" : "punct");
      i = j;
      continue;
    }

    // Misc punctuation.
    if (":;,&+*".includes(c)) {
      push(c, "punct");
      i++;
      continue;
    }

    // Numbers.
    if (DIGIT_RE.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(line[j])) j++;
      push(line.slice(i, j), "number");
      i = j;
      continue;
    }

    // Words — keyword or identifier.
    if (WORD_RE.test(c)) {
      let j = i + 1;
      while (j < n && WORD_RE.test(line[j])) j++;
      const word = line.slice(i, j);
      push(word, KEYWORDS.has(word) ? "keyword" : "ident");
      i = j;
      continue;
    }

    // Anything else — leave uncoloured.
    push(c, "text");
    i++;
  }

  return out;
}
