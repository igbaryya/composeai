/**
 * `<Composer />` — the public chatbox component shipped by `composeai`.
 *
 * Design goals:
 *   - Internally stateful (no `value`/`onChange` round-trip with the parent).
 *   - Plugin-driven: every feature (markdown, attachments, slash, mentions,
 *     mermaid, voice, web, ...) is an opt-in plugin behind `features`.
 *   - Zero coupling to the host application; safe to publish to npm.
 *   - The host only listens via `onSend(payload)` and optionally holds a
 *     `ComposerHandle` ref for imperative control.
 *
 * Demos live in `src/showcase/pages/ComposerPage.tsx` and in the example
 * chat app under `src/app/` — neither belongs to the published library.
 */
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import type { Klass, LexicalNode } from "lexical";
import {
  $createParagraphNode,
  $getRoot,
  ParagraphNode,
} from "lexical";
import { $seedInitialValue } from "./internal/insertText";
import { cn } from "./internal/cn";
import { deriveColorTokens } from "./internal/color";
import { slotProps, tokensToStyle } from "./internal/sx";
import { ComposerProvider, useComposerContext } from "./core/ComposerProvider";
import { EditorShell } from "./core/EditorShell";
import { composerTheme } from "./core/theme";
import { MentionNode } from "./core/nodes/MentionNode";
import { MarkdownTokenNode } from "./core/nodes/MarkdownTokenNode";
import { BlockParagraphNode } from "./core/nodes/BlockParagraphNode";
import { LinkTextNode } from "./core/nodes/LinkTextNode";
import { CodeTokenNode } from "./core/nodes/CodeTokenNode";
import { collectPlainAndMentions, toMarkdown } from "./core/serializer";
import { KeyboardPlugin } from "./plugins/KeyboardPlugin";
import { AutoFocusPlugin } from "./plugins/AutoFocusPlugin";
import { PasteDropPlugin } from "./plugins/PasteDropPlugin";
import { MarkdownPlugin } from "./plugins/MarkdownPlugin";
import { MermaidProvider, MermaidPreview } from "./plugins/MermaidPlugin";
import { SlashCommandPlugin } from "./plugins/SlashCommandPlugin";
import { MentionPlugin } from "./plugins/MentionPlugin";
import { GhostedAutoCompletePlugin } from "./plugins/GhostedAutoCompletePlugin";
import { AttachmentTray } from "./plugins/AttachmentTray";
import { Toolbar } from "./ui/Toolbar";
import { SendButton } from "./ui/SendButton";
import { VoiceButton } from "./plugins/VoicePlugin";
import { HintBar } from "./ui/HintBar";
import { QuickPrompts } from "./ui/QuickPrompts";
import { useComposerHandle } from "./hooks/useComposerHandle";
import { parseShortcut, matchesShortcut } from "./internal/shortcut";
import { focusEditor } from "./internal/focusEditor";
import type { ComposerHandle, ComposerProps, ComposerSubmitPayload } from "./types";

/**
 * ComposeAI — a Lexical-powered, plugin-driven rich input designed for
 * chat / AI assistant interfaces. Internally stateful: parents only listen via
 * `onSend` and (optionally) hold an imperative `ref`.
 */
export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  props,
  ref,
) {
  const {
    placeholder = "Send a message…",
    onSend,
    onStop,
    isStreaming,
    autoFocus,
    refocusOnSubmit = true,
    focusShortcut = "mod+/",
    initialValue,
    className,
    classNames,
    sx,
    style,
    tokens,
    color,
    hint = true,
    features,
    toolbarExtras,
    closeMenusOnOutsideClick = true,
    mode = "markdown",
    variant = "compact",
    multiline = true,
    submitOnEnter = true,
    smartNewline = true,
    icons,
    slots,
    renderDiagram,
    prompts,
    attachmentOptions,
    dir,
  } = props;

  // `color` is a brand-colour shorthand: derive primary/accent/ring from
  // a single value, then layer the consumer's explicit `tokens` on top so
  // they always win.
  const tokenStyle = useMemo(() => {
    const derived = color ? deriveColorTokens(color) : null;
    if (!derived && !tokens) return undefined;
    return tokensToStyle({ ...derived, ...tokens });
  }, [color, tokens]);
  const root = slotProps("root", "composer-root", classNames, sx);
  const rootStyle = useMemo(
    () => ({ ...tokenStyle, ...root.style, ...style }),
    [tokenStyle, root.style, style],
  );

  return (
    <ComposerProvider
      features={features}
      isStreaming={isStreaming}
      closeMenusOnOutsideClick={closeMenusOnOutsideClick}
      attachmentOptions={attachmentOptions}
      mode={mode}
      variant={variant}
      multiline={multiline}
      submitOnEnter={submitOnEnter}
      smartNewline={smartNewline}
      focusShortcut={focusShortcut}
      icons={icons}
      slots={slots}
      renderDiagram={renderDiagram}
      dir={dir}
      classNames={classNames}
      sx={sx}
      tokenStyle={tokenStyle}
    >
      <div
        dir={dir}
        data-composer-scope=""
        className={cn(root.className, className)}
        style={Object.keys(rootStyle).length ? rootStyle : undefined}
      >
        {prompts && prompts.items.length > 0 ? (
          <QuickPrompts prompts={prompts} />
        ) : null}
        <ComposerCard
          placeholder={placeholder}
          initialValue={initialValue}
          handleRef={ref}
          onSend={onSend}
          onStop={onStop}
          autoFocus={autoFocus}
          refocusOnSubmit={refocusOnSubmit}
          focusShortcut={focusShortcut}
          isStreaming={!!isStreaming}
          toolbarExtras={toolbarExtras}
          mode={mode}
          variant={variant}
          multiline={multiline}
        />
        <HintBar hint={hint} />
      </div>
    </ComposerProvider>
  );
});

interface CardProps {
  placeholder: string;
  initialValue?: string;
  handleRef: React.ForwardedRef<ComposerHandle>;
  onSend?: ComposerProps["onSend"];
  onStop?: ComposerProps["onStop"];
  autoFocus?: boolean;
  refocusOnSubmit: boolean;
  focusShortcut: ComposerProps["focusShortcut"];
  isStreaming: boolean;
  toolbarExtras: ComposerProps["toolbarExtras"];
  mode: NonNullable<ComposerProps["mode"]>;
  /** See `ComposerProps.variant`. */
  variant: "compact" | "full";
  /** `false` switches the card to the single-line / inline layout. */
  multiline: boolean;
}

// Slack-style: every visible block is a styled paragraph. In `live` markdown
// mode the paragraph also remembers a hidden block marker (e.g. `"# "`) via
// `BlockParagraphNode` — registered as a node-replacement so any
// `$createParagraphNode()` (called by Lexical's internals and our own code)
// mints our subclass instead.
const BLOCK_PARAGRAPH_REPLACEMENT = {
  replace: ParagraphNode,
  with: () => new BlockParagraphNode(),
  withKlass: BlockParagraphNode,
};
const RICH_NODES: InitialConfigType["nodes"] = [
  MentionNode,
  MarkdownTokenNode,
  BlockParagraphNode,
  LinkTextNode,
  CodeTokenNode,
  BLOCK_PARAGRAPH_REPLACEMENT,
];
// Plain-text mode only needs paragraphs (built-in) and mentions — the rest is
// intentionally absent so pasted rich content collapses to plain text.
const PLAIN_NODES: Array<Klass<LexicalNode>> = [MentionNode];

function ComposerCard({
  placeholder,
  initialValue,
  handleRef,
  onSend,
  onStop,
  autoFocus,
  refocusOnSubmit,
  focusShortcut,
  isStreaming,
  toolbarExtras,
  mode,
  variant,
  multiline,
}: CardProps) {
  const { webEnabled, isDraggingFiles, classNames, sx } = useComposerContext();
  const card = slotProps("card", "composer-card", classNames, sx);

  // LexicalComposer must wrap everything that touches editor state, including
  // the toolbar and send button (so they can `useLexicalComposerContext()`).
  // Living here — one level above EditorShell — also means the inline layout
  // can place those siblings into the same flex row as the editor block.
  const initialConfig: InitialConfigType = useMemo(
    () => ({
      namespace: "composeai",
      theme: composerTheme,
      onError: (error) => {
        console.error("[Composer]", error);
      },
      nodes: mode === "markdown" ? RICH_NODES : PLAIN_NODES,
      editorState: initialValue ? undefined : null,
    }),
    [mode, initialValue],
  );

  return (
    <div
      data-composer-root=""
      data-composer-variant={variant}
      data-composer-inline={variant === "full" && !multiline ? "" : undefined}
      data-composer-web={webEnabled ? "" : undefined}
      data-composer-dragging={isDraggingFiles ? "" : undefined}
      {...card}
    >
      <div
        aria-hidden
        data-composer-overlay=""
        className="composer-overlay-glow"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)/0.08) 0%, transparent 40%, hsl(var(--primary)/0.06) 100%)",
        }}
      />
      {isDraggingFiles && (
        <div
          aria-hidden
          data-composer-overlay=""
          className="composer-overlay-drop"
        >
          Drop to attach
        </div>
      )}
      <LexicalComposer initialConfig={initialConfig}>
        <ComposerInner
          placeholder={placeholder}
          mode={mode}
          variant={variant}
          multiline={multiline}
          handleRef={handleRef}
          onSend={onSend}
          onStop={onStop}
          autoFocus={autoFocus}
          refocusOnSubmit={refocusOnSubmit}
          focusShortcut={focusShortcut}
          isStreaming={isStreaming}
          toolbarExtras={toolbarExtras}
          initialValue={initialValue}
        />
      </LexicalComposer>
    </div>
  );
}

interface InnerProps {
  placeholder: string;
  mode: NonNullable<ComposerProps["mode"]>;
  variant: "compact" | "full";
  multiline: boolean;
  handleRef: React.ForwardedRef<ComposerHandle>;
  onSend?: ComposerProps["onSend"];
  onStop?: ComposerProps["onStop"];
  autoFocus?: boolean;
  refocusOnSubmit: boolean;
  focusShortcut: ComposerProps["focusShortcut"];
  isStreaming: boolean;
  toolbarExtras: ComposerProps["toolbarExtras"];
  initialValue?: string;
}

function ComposerInner({
  placeholder,
  mode,
  variant,
  multiline,
  handleRef,
  onSend,
  onStop,
  autoFocus,
  refocusOnSubmit,
  focusShortcut,
  isStreaming,
  toolbarExtras,
  initialValue,
}: InnerProps) {
  const [editor] = useLexicalComposerContext();
  const {
    features,
    attachments,
    clearAttachments,
    registerRunPrompt,
    attachmentOptions,
  } = useComposerContext();
  const canSendOnlyAttachment = attachmentOptions.canSendOnlyAttachment !== false;
  const hasUploadingAttachment = attachments.some((a) => a.status === "uploading");
  const hasFailedAttachment = attachments.some((a) => a.status === "failed");
  const uploadsBlocking = hasUploadingAttachment || hasFailedAttachment;
  const markdownEnabled = mode === "markdown" && features.markdown;
  const [hasText, setHasText] = useState<boolean>(
    !!initialValue && initialValue.trim().length > 0,
  );
  // Tracks whether the editor holds more than one line — drives the compact
  // variant's reflow (single row → editor-on-top with an actions footer,
  // ChatGPT-style) once the user presses Enter / Shift+Enter.
  const [isMultiLine, setIsMultiLine] = useState<boolean>(
    !!initialValue && initialValue.includes("\n"),
  );

  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;
  const refocusOnSubmitRef = useRef(refocusOnSubmit);
  refocusOnSubmitRef.current = refocusOnSubmit;

  const submit = useCallback(() => {
    if (isStreaming) return;
    // Block while uploads are pending or have failed — the user has visible
    // chips telling them what's going on; sending mid-flight would lose the
    // attachments. Failed chips also block until the user removes them
    // (re-attaching the same file is the retry path).
    if (uploadsBlocking) return;
    let payload: ComposerSubmitPayload | null = null;
    const linkedMention =
      typeof features.mentions === "object" && !!features.mentions.linkedMention;
    editor.getEditorState().read(() => {
      const { text, mentions } = collectPlainAndMentions(editor);
      const markdown = toMarkdown(editor, { linkedMention });
      const trimmed = text.trim();
      // Always require *something* to send. Attachments-only is allowed by
      // default; `canSendOnlyAttachment: false` flips that off — the user
      // must write at least one character even if files are attached.
      if (!trimmed) {
        if (attachments.length === 0) return;
        if (!canSendOnlyAttachment) return;
      }
      payload = {
        text: trimmed,
        markdown,
        attachments: [...attachments],
        mentions,
      };
    });
    if (!payload) return;
    onSendRef.current?.(payload);
    // Focus management is bundled INTO the editor.update via `onUpdate`,
    // which fires after Lexical commits the mutation AND its reconciler
    // has applied selection. If we ran focus/blur before then (as a
    // sibling statement after `editor.update`), the selection
    // restoration on the freshly-cleared root would resurrect focus on
    // the contenteditable and silently undo a blur we just performed.
    //
    // Reads are via refs so prop changes don't churn this callback:
    //   - `refocusOnSubmit: true`  → explicitly focus the editor. Covers
    //     Send-button clicks, `sendValue` quick-prompts, and imperative
    //     `ref.submit()`. Keyboard sends already keep focus implicitly,
    //     so the call is a harmless no-op for them.
    //   - `refocusOnSubmit: false` → explicitly BLUR the root element so
    //     the prop is symmetric across triggers: clicking Send leaves
    //     focus where it naturally went (the button), and pressing Enter
    //     removes focus from the editor instead of letting it linger.
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      },
      {
        onUpdate: () => {
          if (refocusOnSubmitRef.current) {
            focusEditor(editor);
          } else {
            const root = editor.getRootElement();
            if (root) root.blur();
          }
        },
      },
    );
    clearAttachments();
  }, [
    editor,
    attachments,
    clearAttachments,
    isStreaming,
    canSendOnlyAttachment,
    uploadsBlocking,
  ]);

  useComposerHandle(handleRef, submit);

  // Global focus shortcut (Cmd/Ctrl+/ by default). Configurable via
  // `focusShortcut`; pass `false` / `null` / `""` to disable entirely.
  // Registered on `window` because the whole point is to grab focus from
  // anywhere on the page — including from inside other inputs that don't
  // know about us.
  useEffect(() => {
    if (!focusShortcut) return;
    const parsed = parseShortcut(focusShortcut);
    if (!parsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (!matchesShortcut(parsed, e)) return;
      // `defaultPrevented` lets a more-local handler (e.g. a popover) win
      // when both are bound to the same combo. We never compete with a
      // child that already consumed the key.
      if (e.defaultPrevented) return;
      e.preventDefault();
      focusEditor(editor);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, focusShortcut]);

  // Seed initial value once on mount. Splits on `\n` so each line becomes
  // its own paragraph — required for the per-paragraph markdown / mermaid
  // detectors to recognise multi-line blocks (e.g. a ```mermaid fence).
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (!initialValue) return;
    editor.update(() => {
      $seedInitialValue(initialValue);
    });
  }, [editor, initialValue]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        setHasText(text.trim().length > 0);
        // More than one top-level paragraph, or a soft break inside one,
        // means the bar should expand into its stacked (footer) layout.
        setIsMultiLine(root.getChildrenSize() > 1 || text.includes("\n"));
      });
    });
  }, [editor]);

  // Quick-prompts bridge: the chip row lives above the editor so it doesn't
  // own the editor state or the submit function. It pipes its clicks through
  // the provider; we subscribe here to do the actual work. We deliberately
  // *replace* whatever is in the editor — `initValue` means "use this as the
  // starting point", which is unambiguous (and matches every other quick-
  // prompt UX I've seen).
  useEffect(() => {
    return registerRunPrompt((prompt, behavior) => {
      editor.update(() => {
        $seedInitialValue(prompt);
      });
      if (behavior === "sendValue") {
        // Defer to the next microtask so Lexical commits the update above
        // before `submit` reads the editor state. Without this, `submit`
        // would serialize the *previous* state and ignore the prompt.
        queueMicrotask(() => submit());
      } else {
        focusEditor(editor);
      }
    });
  }, [editor, registerRunPrompt, submit]);

  const isCompact = variant === "compact";
  // Mermaid previews depend on a ```fence forming, which needs newlines. The
  // inline (`multiline === false`) layout can't form one, so we only run the
  // detector when `multiline` is on and the markdown mermaid feature is enabled.
  const mermaidActive = multiline && mode === "markdown" && !!features.mermaid;
  const toolbarSlot = (
    <Toolbar extras={toolbarExtras} variant={variant} submit={submit} />
  );
  const sendButton = (
    <SendButton
      canSend={
        // Same gate as `submit`, kept in sync so the disabled state is
        // never out of step with what would actually happen on click.
        !uploadsBlocking &&
        (hasText || (attachments.length > 0 && canSendOnlyAttachment))
      }
      isStreaming={isStreaming}
      onSend={submit}
      onStop={onStop}
    />
  );
  // In the compact variant the voice button leaves the toolbar (which has
  // collapsed into the "+" popover) and floats beside Send as a trailing
  // cluster. In the full variant voice stays in the toolbar and Send is
  // rendered on its own.
  const sendButtonSlot =
    isCompact && features.voice ? (
      <>
        <VoiceButton />
        {sendButton}
      </>
    ) : (
      sendButton
    );

  const content = (
    <>
      <EditorShell
        placeholder={placeholder}
        mode={mode}
        variant={variant}
        multiline={multiline}
        expanded={isCompact && isMultiLine}
        header={<AttachmentTray />}
        toolbar={toolbarSlot}
        sendButton={sendButtonSlot}
        // Diagram preview placement differs by variant. The `full` layout has
        // room for an always-on preview row, so it renders inline as a footer.
        // The `compact` chat-bar instead collapses diagrams behind a trigger
        // beside the "+" (see <MermaidQuickAction> in the compact Toolbar), so
        // it gets no footer here — the <MermaidProvider> below feeds both.
        footer={mermaidActive && !isCompact ? <MermaidPreview /> : null}
      />

      <KeyboardPlugin onSubmit={submit} />
      <AutoFocusPlugin enabled={!!autoFocus} />
      <PasteDropPlugin />
      {markdownEnabled && <MarkdownPlugin />}
      {features.slashCommands &&
        // One typeahead per config — a single config or an array of them, so
        // consumers can register several trigger symbols (each with its own
        // action menu) at once. Keyed by trigger; give each a distinct symbol.
        (Array.isArray(features.slashCommands)
          ? features.slashCommands
          : [features.slashCommands]
        ).map((cfg, i) => (
          <SlashCommandPlugin key={cfg.trigger ?? `slash-${i}`} config={cfg} onSubmit={submit} />
        ))}
      {features.mentions && <MentionPlugin config={features.mentions} />}
      {features.ghostedAutoComplete && (
        <GhostedAutoCompletePlugin config={features.ghostedAutoComplete} />
      )}
    </>
  );

  // When mermaid is active, wrap the whole subtree in the detector/provider so
  // both the inline footer (full) and the compact "+" quick action can read the
  // detected diagrams from context.
  return mermaidActive ? <MermaidProvider>{content}</MermaidProvider> : content;
}