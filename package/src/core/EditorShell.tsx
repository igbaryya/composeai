/**
 * EditorShell — slot-based layout for the composer card.
 *
 * The Lexical `<LexicalComposer>` lives one level up (in `ComposerCard`)
 * so that every consumer of editor state — including the toolbar / send
 * button — can sit as a sibling of the editor itself. That lets the
 * `multiline === false` ("inline") variant collapse toolbar, editor and
 * send into a single horizontal row without the toolbar/send having to
 * portal in from a deeper subtree.
 *
 * Two layouts are supported, picked via `multiline`:
 *
 *   ┌───────────────────────── multiline (default) ─────────────────────────┐
 *   │ header (top-placed in-context row, attachment tray)                   │
 *   │ editor (multi-line, max-h, vertical scroll)                           │
 *   │ toolbar + bottom-placed in-context row ──────────────────── send btn  │
 *   │ footer (mermaid preview)                                              │
 *   └───────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────── multiline === false (inline) ──────────────────┐
 *   │ header (top-placed in-context row, attachment tray)                   │
 *   │ toolbar │ editor (single-line, horizontal scroll)        │ send btn   │
 *   │ footer (NOT rendered — mermaid can't form without newlines anyway)    │
 *   └───────────────────────────────────────────────────────────────────────┘
 */
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../internal/cn";
import { useComposerContext } from "./ComposerProvider";
import { resolveSx, slotProps } from "../internal/sx";
import type { ComposerProps } from "../types";

type Mode = NonNullable<ComposerProps["mode"]>;

interface EditorShellProps {
  placeholder: string;
  /**
   * `true` when `placeholder` is a frame of the typewriter animation rather
   * than static text — adds a blinking caret after the text so it reads as
   * live typing. Mirrors whether `ComposerProps.animatedPlaceholder` is active.
   */
  animated?: boolean;
  mode: Mode;
  /**
   * Chrome layout. `"compact"` renders the slim chat-bar — a single growable
   * row of `[ + ] [ editor ] [ voice · send ]`. `"full"` renders the classic
   * layout and defers to `multiline` for stacked-vs-inline. Mirrors
   * `ComposerProps.variant`.
   */
  variant: "compact" | "full";
  /**
   * `false` switches the shell into the inline / single-line layout
   * described above. Mirrors `ComposerProps.multiline`.
   */
  multiline: boolean;
  /**
   * Compact variant only: when `true` the bar reflows from a single row into
   * the stacked ChatGPT-style layout — editor on top, actions on a wrapped
   * second line below (`+` at the start, voice·send at the end). Driven by
   * whether the editor currently holds more than one line. The reflow is
   * expressed purely in CSS (see `data-composer-expanded`); the DOM is the
   * same in both states.
   */
  expanded?: boolean;
  /** Rendered above the editor (top-placed in-context row, attachment tray). */
  header?: ReactNode;
  /** Toolbar contents — rendered below the editor (multiline) or to its
   *  start (inline). Toolbar omits a wrapping div so we can position it
   *  via grid placement in either layout. */
  toolbar?: ReactNode;
  /** Send button — rendered to the right of the toolbar (multiline) or to
   *  the end of the editor row (inline). */
  sendButton?: ReactNode;
  /** Rendered below the toolbar row (mermaid preview). Skipped in inline
   *  mode by the caller — single-line input can't form a mermaid fence. */
  footer?: ReactNode;
}

export function EditorShell({
  placeholder,
  animated,
  mode,
  variant,
  multiline,
  expanded,
  header,
  toolbar,
  sendButton,
  footer,
}: EditorShellProps) {
  const { classNames, sx, dir } = useComposerContext();
  const isMarkdown = mode === "markdown";
  const isCompact = variant === "compact";
  // Both the compact bar and the inline (multiline === false) layout make the
  // editor the flex child that fills the row. In the compact bar's expanded
  // state it stays that same flex child and only its basis changes (it claims
  // a whole line — see the `[data-composer-expanded]` rules), so the class
  // never flips and the contenteditable is never torn down mid-sentence.
  const fillEditor = isCompact || !multiline;

  // Editor padding differs per layout:
  //   compact:   tight vertical padding; the row grows as lines are added.
  //   multiline: roomy vertical padding for multi-line writing.
  //   inline:    no vertical padding (height drives the size); horizontal
  //              padding hugs the editor between toolbar and send so the
  //              caret never bumps into them.
  const editorClass = isCompact
    ? "composer-editor composer-editor--compact"
    : multiline
      ? "composer-editor composer-editor--multiline"
      : "composer-editor composer-editor--inline";

  const editor = slotProps("editor", editorClass, classNames, sx);

  // Placeholder mirrors editor padding/typography so the placeholder text
  // sits exactly where the caret will land. In inline mode the placeholder
  // also gets `leading-9` (1.75rem) to vertically center within the 36px row.
  const editorResolved = resolveSx(sx?.editor);
  const placeholderBase = mirrorEditorPadding(editorResolved);
  const placeholderClass = cn(
    isCompact
      ? "composer-placeholder composer-placeholder--compact"
      : multiline
        ? "composer-placeholder composer-placeholder--multiline"
        : "composer-placeholder composer-placeholder--inline",
    // Adds the blinking caret after the typewriter text.
    animated && "composer-placeholder--animated",
  );
  const placeholderProps = slotProps(
    "placeholder",
    placeholderClass,
    classNames,
    sx,
    placeholderBase,
  );

  const contentEditable = (
    <ContentEditable {...editor} aria-label="Message" spellCheck dir={dir} />
  );
  const placeholderEl = (
    <div {...placeholderProps} dir={dir}>
      {placeholder}
    </div>
  );

  const editorBlock = (
    <div
      className={cn(
        "composer-editor-block",
        // Inline + compact: the editor block is the flex child that fills the
        // row between the leading actions and the trailing send cluster.
        fillEditor && "composer-editor-block--inline",
      )}
    >
      {isMarkdown ? (
        <RichTextPlugin
          contentEditable={contentEditable}
          placeholder={placeholderEl}
          ErrorBoundary={LexicalErrorBoundary}
        />
      ) : (
        <PlainTextPlugin
          contentEditable={contentEditable}
          placeholder={placeholderEl}
          ErrorBoundary={LexicalErrorBoundary}
        />
      )}
    </div>
  );

  if (isCompact) {
    const actions = toolbar && (
      <div className="composer-compact-actions">{toolbar}</div>
    );
    const sendCluster = sendButton && (
      <div className="composer-compact-send">{sendButton}</div>
    );

    // One row serves both states. Resting (single line) it reads left to
    // right: the "+" quick-actions trigger, the editor filling the middle,
    // and the trailing voice·send cluster, all bottom-aligned.
    //
    // Expanded (multi-line) the same row wraps — the editor claims the whole
    // first line and the controls unfold onto a second one, ChatGPT-style.
    // Doing that in CSS rather than by swapping React subtrees is what lets
    // the growth animate, and it keeps Lexical's root element mounted while
    // the user is mid-sentence.
    return (
      <>
        {header}
        <div
          className="composer-compact-row"
          data-composer-expanded={expanded ? "" : undefined}
        >
          {actions}
          {editorBlock}
          {sendCluster}
        </div>
        <HistoryPlugin />
        {footer}
      </>
    );
  }

  if (!multiline) {
    // Inline layout — header above, then a single horizontal row of
    // [toolbar | editor | send]. We don't render `footer` here because the
    // caller already opts out of the mermaid preview when multiline is false
    // (no newlines means no fences can ever form).
    return (
      <>
        {header}
        <div className="composer-inline-row">
          {toolbar && (
            <div className="composer-inline-toolbar">{toolbar}</div>
          )}
          {editorBlock}
          {sendButton && (
            <div className="composer-inline-send">{sendButton}</div>
          )}
        </div>
        <HistoryPlugin />
      </>
    );
  }

  // Multi-line layout — header, editor, toolbar+send row (justify-between),
  // footer. Matches the historical structure exactly.
  return (
    <>
      {header}
      {editorBlock}
      {(toolbar || sendButton) && (
        <div className="composer-toolbar-row">
          {toolbar ?? <span />}
          {sendButton}
        </div>
      )}
      <HistoryPlugin />
      {footer}
    </>
  );
}

// Keys we copy from `sx.editor` onto the placeholder so the placeholder text
// stays aligned with the editor's caret/text origin when the consumer
// customises the editor's padding or typography.
const PLACEHOLDER_MIRROR_KEYS: ReadonlyArray<keyof CSSProperties> = [
  "padding",
  "paddingInline",
  "paddingInlineStart",
  "paddingInlineEnd",
  "paddingBlock",
  "paddingBlockStart",
  "paddingTop",
  "paddingLeft",
  "paddingRight",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
];

function mirrorEditorPadding(
  editorStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  if (!editorStyle) return undefined;
  const out: Record<string, unknown> = {};
  for (const key of PLACEHOLDER_MIRROR_KEYS) {
    const v = (editorStyle as Record<string, unknown>)[key as string];
    if (v !== undefined) out[key as string] = v;
  }
  return Object.keys(out).length ? (out as CSSProperties) : undefined;
}