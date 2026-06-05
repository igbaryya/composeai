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
 *   │ header (attachment tray)                                              │
 *   │ editor (multi-line, max-h, vertical scroll)                           │
 *   │ toolbar ─────────────────────────────────────────────────── send btn  │
 *   │ footer (mermaid preview)                                              │
 *   └───────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────── multiline === false (inline) ──────────────────┐
 *   │ header (attachment tray)                                              │
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
  mode: Mode;
  /**
   * `false` switches the shell into the inline / single-line layout
   * described above. Mirrors `ComposerProps.multiline`.
   */
  multiline: boolean;
  /** Rendered above the editor (attachment tray). */
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
  mode,
  multiline,
  header,
  toolbar,
  sendButton,
  footer,
}: EditorShellProps) {
  const { classNames, sx, dir } = useComposerContext();
  const isMarkdown = mode === "markdown";

  // Editor padding differs per layout:
  //   multiline: roomy vertical padding for multi-line writing.
  //   inline:    no vertical padding (height drives the size); horizontal
  //              padding hugs the editor between toolbar and send so the
  //              caret never bumps into them.
  const editorClass = multiline
    ? "composer-editor composer-editor--multiline"
    : "composer-editor composer-editor--inline";

  const editor = slotProps("editor", editorClass, classNames, sx);

  // Placeholder mirrors editor padding/typography so the placeholder text
  // sits exactly where the caret will land. In inline mode the placeholder
  // also gets `leading-9` (1.75rem) to vertically center within the 36px row.
  const editorResolved = resolveSx(sx?.editor);
  const placeholderBase = mirrorEditorPadding(editorResolved);
  const placeholderClass = multiline
    ? "composer-placeholder composer-placeholder--multiline"
    : "composer-placeholder composer-placeholder--inline";
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
        // Inline: the editor block is the flex child that fills the row.
        !multiline && "composer-editor-block--inline",
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

  if (!multiline) {
    // Inline layout — header above, then a single horizontal row of
    // [toolbar | editor | send]. We don't render `footer` here because the
    // caller already opts out of <MermaidSlot /> when multiline is false
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