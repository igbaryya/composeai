/**
 * Inline-markdown tokenizer used by `MarkdownPlugin`. Produces a flat
 * stream of tokens — markers stay visible (rendered via MarkdownTokenNode)
 * while content carries the matching inline format.
 *
 * Supported inline marks:
 *   **bold**   __bold__
 *   *italic*   _italic_
 *   ~~strike~~   ~strike~          — CommonMark *and* Slack syntax
 *   `code`
 *   [label](url)          — link
 *   ![alt](url)           — image (alt text shown like a link)
 *
 * Notes:
 *   - Markers are non-greedy and must not have whitespace immediately adjacent
 *     to the inner text (matches CommonMark behaviour).
 *   - Nested marks are not supported in this first iteration — the outermost
 *     match wins and the inner content is treated as plain text.
 *   - Newlines never appear inside a single inline mark.
 *   - Link / image URLs are rendered as styled (not muted) text and produce
 *     an additional `link` format on the URL itself for theming.
 */

export type InlineFormat =
  | "bold"
  | "italic"
  | "underline"
  | "code"
  | "strike"
  | "link";

export type Token =
  | { type: "text"; text: string }
  | { type: "marker"; text: string; format: InlineFormat }
  | { type: "formatted"; text: string; format: InlineFormat };

interface PairedPattern {
  open: string;
  close: string;
  format: InlineFormat;
}

// Order matters: longer markers must be tried first so `**` is not eaten by `*`,
// and `~~` is not eaten by single-tilde Slack-style strike.
const PAIRED_PATTERNS: PairedPattern[] = [
  { open: "**", close: "**", format: "bold" },
  { open: "__", close: "__", format: "bold" },
  { open: "~~", close: "~~", format: "strike" },
  { open: "`", close: "`", format: "code" },
  { open: "*", close: "*", format: "italic" },
  { open: "_", close: "_", format: "italic" },
  { open: "~", close: "~", format: "strike" }, // Slack-style strike
];

// `[label](url)` or `![alt](url)` — captured by a single regex anchored at i.
const LINK_RE = /^(!?)\[([^\]\n]+)\]\(([^)\n\s]+)\)/;

function isInvalidInner(inner: string): boolean {
  if (inner.length === 0) return true;
  if (/\n/.test(inner)) return true;
  if (/^\s|\s$/.test(inner)) return true;
  return false;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let buf = "";

  const flushBuf = () => {
    if (buf.length > 0) {
      tokens.push({ type: "text", text: buf });
      buf = "";
    }
  };

  while (i < text.length) {
    // 1) Link / image — matched first because `[` is not a paired marker.
    const ch = text[i];
    if (ch === "[" || (ch === "!" && text[i + 1] === "[")) {
      const m = text.slice(i).match(LINK_RE);
      if (m) {
        const [whole, bang, label, url] = m;
        flushBuf();
        if (bang) {
          tokens.push({ type: "marker", text: "!", format: "link" });
        }
        tokens.push({ type: "marker", text: "[", format: "link" });
        tokens.push({ type: "formatted", text: label, format: "link" });
        tokens.push({ type: "marker", text: "](", format: "link" });
        tokens.push({ type: "formatted", text: url, format: "code" });
        tokens.push({ type: "marker", text: ")", format: "link" });
        i += whole.length;
        continue;
      }
    }

    // 2) Paired inline markers — bold / italic / strike / code.
    let matched = false;
    for (const pat of PAIRED_PATTERNS) {
      if (!text.startsWith(pat.open, i)) continue;
      const searchStart = i + pat.open.length;
      let endIdx = -1;
      let probe = searchStart;
      while (probe < text.length) {
        const candidate = text.indexOf(pat.close, probe);
        if (candidate === -1) break;
        // Reject doubled-marker false positives for single-char patterns.
        if (pat.open.length === 1) {
          const prev = text[candidate - 1];
          const next = text[candidate + 1];
          if (prev === pat.close || next === pat.close) {
            probe = candidate + 1;
            continue;
          }
        }
        endIdx = candidate;
        break;
      }
      if (endIdx === -1) continue;
      const inner = text.slice(searchStart, endIdx);
      if (isInvalidInner(inner)) continue;
      // Don't let single-char `*italic*` / `_italic_` / `~strike~` swallow
      // a half-typed double pair. We check BOTH sides of the open:
      //
      //   text[i+1] === open  → we're the first of a `**` opener that the
      //                         user is still typing (`**hello**`).
      //   text[i-1] === open  → we're the second of a `**` opener that
      //                         already exists; matching here would eat
      //                         half the bold marker.
      //
      // The second check matters especially in `live` mode: matching the
      // italic on `**test*` would consume the inner `*`s the moment the
      // 7th char is typed, leaving the closing 8th `*` orphaned — the
      // bold pair could then never form. In hybrid mode the markers stay
      // visible so the next keystroke recovers, but the visual flicker is
      // still unwanted. Both modes benefit from the symmetric guard.
      if (pat.open.length === 1) {
        if (text[i + 1] === pat.open[0]) continue;
        if (text[i - 1] === pat.open[0]) continue;
      }
      flushBuf();
      tokens.push({ type: "marker", text: pat.open, format: pat.format });
      tokens.push({ type: "formatted", text: inner, format: pat.format });
      tokens.push({ type: "marker", text: pat.close, format: pat.format });
      i = endIdx + pat.close.length;
      matched = true;
      break;
    }
    if (matched) continue;

    buf += text[i];
    i += 1;
  }
  flushBuf();
  return tokens;
}

/** Concatenated text length of a token. */
export function tokenLength(t: Token): number {
  return t.text.length;
}