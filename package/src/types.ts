import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { ComposerIcons } from "./internal/icons";

// Re-export so consumers don't have to import from a deep internal path.
export type { ComposerIcons, IconComponent, IconProps } from "./internal/icons";

/**
 * Stylable surfaces inside the composer. Every entry corresponds to a real
 * DOM node the package owns. `classNames` and `sx` props are keyed by these
 * slot names so consumers can reskin a single piece without forking the
 * component.
 */
export type ComposerSlot =
  | "root"
  | "card"
  | "editor"
  | "placeholder"
  | "toolbar"
  | "toolbarButton"
  | "sendButton"
  | "stopButton"
  | "hint"
  | "attachmentTray"
  | "attachmentChip"
  | "mention"
  | "mentionMenu"
  | "mentionItem"
  | "slashMenu"
  | "slashItem"
  | "mermaidPreview";

/**
 * Per-slot className overrides. Strings are merged after the built-in
 * classes (last-wins via standard CSS cascade), so consumers can layer
 * Tailwind utilities or their own classes on top of the defaults.
 *
 * @example
 * ```tsx
 * <Composer
 *   classNames={{
 *     card: "bg-gradient-to-br from-violet-500/10 to-pink-500/10",
 *     sendButton: "bg-violet-600 hover:bg-violet-700",
 *   }}
 * />
 * ```
 */
export type ComposerSlotClassNames = Partial<Record<ComposerSlot, string>>;

/**
 * Lightweight `sx` value: a plain CSS object merged onto a slot's `style`
 * with a few token-aware shortcuts.
 *
 * Token-aware keys (`color`, `bg`, `backgroundColor`, `borderColor`,
 * `outlineColor`, `fill`, `stroke`) accept either a real CSS value
 * (`"#fff"`, `"rgb(...)"`, `"red"`) or one of the composer's design tokens
 * (`"primary"`, `"accent"`, `"border"`, `"card"`, `"muted"`,
 * `"foreground"`, `"background"`, `"destructive"`, `"success"`,
 * `"warning"`), in which case it expands to `hsl(var(--<token>))`.
 *
 * Sizing/spacing keys accept numbers (React adds `px`) or any CSS length
 * string (`"200px"`, `"50%"`, `"clamp(...)"`).
 *
 * No pseudo selectors, no media queries, no responsive arrays — reach for
 * `classNames` when you need those.
 */
export type ComposerSxValue = CSSProperties & {
  /** Shortcut for `backgroundColor`; accepts a token name. */
  bg?: string;
};

/**
 * Per-slot sx overrides. Each value follows {@link ComposerSxValue}.
 *
 * @example
 * ```tsx
 * <Composer
 *   sx={{
 *     card: { bg: "card", borderColor: "primary", borderRadius: 12 },
 *     editor: { minHeight: 80, fontFamily: "JetBrains Mono, monospace" },
 *     sendButton: { bg: "primary", color: "primary-foreground" },
 *   }}
 * />
 * ```
 */
export type ComposerSxMap = Partial<Record<ComposerSlot, ComposerSxValue>>;

/**
 * Design tokens applied as inline CSS custom properties on the composer
 * root, so they cascade into every slot — including the package's built-in
 * CSS — without overriding the consumer app's global theme.
 *
 * Color tokens are HSL components (e.g. `"258 90% 62%"`) so they compose
 * cleanly with opacities (`hsl(var(--primary) / 0.1)`), matching the
 * convention used internally.
 *
 * Sizing tokens (`radius`, `fontSize`) accept a number (treated as `px`)
 * or any CSS length string.
 */
export interface ComposerTokens {
  primary?: string;
  primaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  background?: string;
  foreground?: string;
  card?: string;
  cardForeground?: string;
  popover?: string;
  popoverForeground?: string;
  muted?: string;
  mutedForeground?: string;
  border?: string;
  ring?: string;
  input?: string;
  destructive?: string;
  destructiveForeground?: string;
  success?: string;
  successForeground?: string;
  warning?: string;
  warningForeground?: string;
  /** Outer card corner radius. Number → px. Default `28px`. */
  radius?: number | string;
  /** Editor base font size. Number → px. Default `15px`. */
  fontSize?: number | string;
  /** Font family for the editor and chips. Defaults to inherit. */
  fontFamily?: string;
}

/**
 * Consumer-supplied renderer for fenced code blocks the composer treats as
 * diagrams (currently `mermaid`). When provided, the composer will NOT try to
 * dynamically import the `mermaid` package — your renderer is fully in charge.
 * When omitted, the composer falls back to a lazy `import("mermaid")`; if
 * `mermaid` isn't installed, the diagram is silently skipped.
 *
 * Future fence languages may be routed here too; inspect `language` to
 * decide what to do.
 */
export type DiagramRenderer = (params: {
  /** Raw code inside the fence, with the surrounding ``` stripped. */
  code: string;
  /** Language tag from the opening fence — e.g. "mermaid". */
  language: string;
}) => ReactNode;

/**
 * How a click on a quick-prompt chip is interpreted.
 *  - `"sendValue"` (default): drop the prompt into the editor and submit
 *    immediately. The user sees their `onSend` payload fire as if they
 *    typed it and pressed Enter.
 *  - `"initValue"`: drop the prompt into the editor but do NOT submit —
 *    the user can edit it further before sending.
 */
export type ComposerPromptBehavior = "sendValue" | "initValue";

export interface ComposerPromptsConfig {
  /**
   * Full list of prompts the consumer wants to expose. Order is preserved
   * unless `randomize` is `true` (the default).
   */
  items: string[];
  /**
   * What clicking a chip should do. Defaults to `"sendValue"` — clicking
   * a prompt fills the editor and submits immediately, which matches the
   * "starter prompts" UX users see in most AI chat surfaces.
   */
  behavior?: ComposerPromptBehavior;
  /**
   * Optional notification fired whenever the user picks a prompt — useful
   * for analytics. Fires regardless of `behavior`.
   */
  onSelect?: (prompt: string) => void;
  /**
   * Maximum number of chips rendered at once. Defaults to `3`, hard-capped
   * at `5` to keep the chip row from dominating the composer.
   */
  maxToShow?: number;
  /**
   * When `items.length > maxToShow`, pick a random subset on each mount
   * so different sessions see different suggestions. Defaults to `true`.
   * Set `false` to always show the first N items in order.
   */
  randomize?: boolean;
}

export type AttachmentKind = "image" | "audio" | "file";

/**
 * Upload lifecycle for an attachment. Only meaningful when
 * `attachmentOptions.uploadFirst` is enabled.
 *   - `undefined` / `"ready"`: no upload in flight (default; same as today).
 *   - `"uploading"`: `onUpload(file)` is running — chip shows a spinner.
 *   - `"uploaded"`: `onUpload` resolved truthy — chip looks normal again.
 *   - `"failed"`: `onUpload` resolved falsy or threw — chip shows a warning.
 *     The user can dismiss the chip and re-attach to retry.
 */
export type AttachmentStatus = "ready" | "uploading" | "uploaded" | "failed";

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  mimeType: string;
  size: number;
  file: File;
  /** Object URL for previews (revoked when removed). */
  previewUrl?: string;
  /** Optional natural width/height for images. */
  width?: number;
  height?: number;
  /** Optional duration (seconds) for audio. */
  duration?: number;
  /**
   * Upload lifecycle. `undefined` is equivalent to `"ready"` and means
   * "no upload pipeline in play" — the historical default. Populated only
   * when `attachmentOptions.uploadFirst` is on.
   */
  status?: AttachmentStatus;
  /** Optional message surfaced when `status === "failed"`. */
  error?: string;
}

export interface MentionItem {
  id: string;
  label: string;
  description?: string;
  avatarUrl?: string;
  icon?: ReactNode;
}

export interface MentionRef {
  id: string;
  label: string;
}

export interface SlashCommand {
  id: string;
  label: string;
  description?: string;
  group?: string;
  icon?: ReactNode;
  shortcut?: string;
  /**
   * Called when the command is chosen. Receive helpers to mutate the editor.
   * If omitted, the slash text is simply removed.
   */
  onSelect?: (ctx: SlashCommandContext) => void;
}

export interface SlashCommandContext {
  /** Inserts text at the current selection (after removing the slash trigger). */
  insertText: (text: string) => void;
  /** Replaces the slash trigger with raw markdown content. */
  insertMarkdown: (markdown: string) => void;
  /** Closes the menu without changing the editor. */
  cancel: () => void;
  /** Submits the composer immediately. */
  submit: () => void;
}

export interface ComposerSubmitPayload {
  /** Plain text (chips collapsed to their labels). */
  text: string;
  /** Serialized markdown including chips as `@label`. */
  markdown: string;
  attachments: Attachment[];
  mentions: MentionRef[];
}

export interface MentionConfig {
  /** Static list, or async resolver that receives the query (without `@`). */
  items: MentionItem[] | ((query: string) => MentionItem[] | Promise<MentionItem[]>);
  /** Visual character used to render the trigger. Defaults to "@". */
  trigger?: string;
  /** Limit suggestion count. Defaults to 8. */
  maxItems?: number;
  /**
   * When true, serialize mentions to markdown as a link that carries the
   * stable id — `[<trigger><label>](mention:<id>)`, e.g. `[@orca](mention:u_42)`
   * — so the receiving end can resolve mentions by id and render them as
   * clickable chips. Default (false/omitted) keeps the plain `<trigger><label>`
   * form. Only affects the `markdown` field of the submit payload; the
   * structured `mentions: MentionRef[]` array is unchanged either way.
   */
  linkedMention?: boolean;
}

export interface SlashConfig {
  items: SlashCommand[] | ((query: string) => SlashCommand[] | Promise<SlashCommand[]>);
  /**
   * The symbol that opens this menu. Defaults to `"/"`. Any single character
   * works — `"/"` for commands, `"#"` for issues/tags, `":"` for emoji, etc.
   * When registering {@link ComposerFeatures.slashCommands | multiple configs},
   * give each a DISTINCT trigger.
   */
  trigger?: string;
  maxItems?: number;
}

/**
 * One entry in the paperclip's type-picker menu. When `AttachmentsConfig.types`
 * is supplied, clicking the paperclip opens a small popover listing these
 * options; picking one opens the OS file dialog already scoped to that
 * entry's `accept` string.
 */
export interface AttachmentTypeOption {
  /** Stable identifier (used as React key). */
  id: string;
  /** Display label, e.g. "PDF", "Word", "Spreadsheet". */
  label: string;
  /**
   * `accept` attribute passed to the file input when this option is
   * picked. Examples: `".pdf"`, `".docx,.doc"`, `"image/*"`,
   * `".xlsx,.xls,application/vnd.ms-excel"`.
   */
  accept: string;
  /** Optional second line, e.g. `".pdf"` or `"Word document"`. */
  description?: string;
  /** Optional leading icon, rendered to the start of the label. */
  icon?: ReactNode;
}

export interface AttachmentsConfig {
  /**
   * Show the generic "Attach file" picker button (paperclip icon). Honours
   * `accept` so the OS dialog can include any allowed mime — images, PDFs,
   * docs, audio, video, etc. Defaults to `true`.
   */
  file?: boolean;
  /**
   * Show the dedicated "Add image" picker button (image icon). Forces
   * `accept="image/*"` on the underlying input so iOS / Android open the
   * camera-roll picker directly instead of the generic Files app — a UX win
   * on mobile chat apps. **Defaults to `false`** because the paperclip
   * already accepts images via its `accept` string; opt in when the second
   * tap-target is worth it.
   */
  image?: boolean;
  /**
   * Accept attribute string passed to the generic "Attach file" picker.
   * Has no effect on the image-only picker (which is always `image/*`) or
   * on `types` entries (which carry their own `accept`).
   * Defaults to `"image/*,application/pdf,text/*,audio/*,video/*"`.
   */
  accept?: string;
  /**
   * Pre-defined attachment types. When **omitted or empty** (the default),
   * clicking the paperclip opens the OS file picker directly with
   * `accept`. When **non-empty**, the paperclip becomes a popover trigger
   * — clicking it shows the list, and picking an entry opens the dialog
   * scoped to that entry's `accept`. Great for apps that want to nudge
   * users toward specific formats (e.g. "PDF or Word only").
   *
   * @example
   * ```tsx
   * features={{
   *   attachments: {
   *     types: [
   *       { id: "pdf",   label: "PDF",   accept: ".pdf",        description: ".pdf"        },
   *       { id: "word",  label: "Word",  accept: ".docx,.doc",  description: ".docx, .doc" },
   *       { id: "image", label: "Image", accept: "image/*",     description: "PNG, JPG, …" },
   *     ],
   *   },
   * }}
   * ```
   */
  types?: AttachmentTypeOption[];
  /** Max bytes per file. Default 25 MiB. */
  maxSize?: number;
  /** Maximum total attachments. Default 10. */
  maxCount?: number;
}

/**
 * Behavioural switches for attachment lifecycle and submission rules.
 * Lives at the top level (not under `features.attachments`) so the
 * "is the feature on / what file types" config stays cleanly separated
 * from the "what happens when the user attaches / sends" callbacks.
 */
export interface AttachmentOptions {
  /**
   * When `true`, every newly-attached file is immediately handed to
   * `onUpload` in the background. The attachment chip shows a spinner
   * while the upload is in flight and a warning badge if it fails.
   * Sending is blocked until every attachment is either `"uploaded"`
   * or removed. Defaults to `false` — consumers receive raw `File`s in
   * `onSend` and upload themselves.
   *
   * Has no effect unless `onUpload` is also provided.
   */
  uploadFirst?: boolean;
  /**
   * Upload handler invoked once per attached `File` when `uploadFirst`
   * is on. Resolve `true` for success, `false` (or throw) for failure.
   * For richer feedback (URL, server id, …), keep a side map in your app
   * keyed by `file.name` + `file.size` — the composer will hand the
   * same `File` instance back in `onSend`'s payload.
   *
   * @example
   * ```tsx
   * attachmentOptions={{
   *   uploadFirst: true,
   *   onUpload: async (file) => {
   *     const res = await fetch("/api/upload", { method: "POST", body: file });
   *     return res.ok;
   *   },
   * }}
   * ```
   */
  onUpload?: (file: File) => Promise<boolean> | boolean;
  /**
   * Whether the user can submit a message that has attachments but no
   * text. Defaults to `true` — matches Slack / Discord / WhatsApp where
   * dropping a file is itself a valid message. Set to `false` to force
   * users to write at least one character alongside any attachment.
   */
  canSendOnlyAttachment?: boolean;
}

export interface MermaidConfig {
  /**
   * Keep the raw ```mermaid source visible in the editor while the preview
   * renders below. Defaults to `true` — the user sees both the code they
   * wrote and the live diagram. Set to `false` to hide the source block
   * once it parses (the diagram preview is still shown), useful when you
   * only want the rendered output in the conversation surface.
   */
  keepSource?: boolean;
}

/**
 * Two visual contracts for inline / block markdown styling. Default is
 * `"hybrid"` because it preserves the source byte-for-byte and is what
 * the composer originally shipped with; consumers who want the more
 * conventional "WYSIWYG-ish" feel opt into `"live"`.
 *
 *  - `"hybrid"` — markers stay visible (rendered in a muted style) AND the
 *                 inner text receives the matching format. Typing `**a**`
 *                 leaves you with `**a**` on screen, the `**` dimmed and
 *                 the `a` bold. This is what Slack / Discord / iMessage do.
 *                 The document IS the markdown source.
 *
 *  - `"live"`   — markers are consumed as soon as the closing one is typed.
 *                 `**a**` collapses to bold **a** with no asterisks left on
 *                 screen; `# Title` becomes a styled paragraph with no
 *                 leading `#`. This is what Notion / Tiptap / Lexical's
 *                 own `MarkdownShortcutPlugin` do. The document is the
 *                 *rendered* state; we reconstruct markdown only at submit.
 *
 * Both modes produce the same `markdown` payload on submit — the
 * difference is purely how the editor LOOKS while you're typing.
 */
export type MarkdownMode = "hybrid" | "live";

/**
 * Fine-grained markdown configuration. Pass `markdown: true` (or omit it)
 * to keep the default behaviour, or supply this object to switch modes /
 * scope the change.
 *
 * @example
 * ```tsx
 * // Notion-like: markers vanish once matched.
 * <Composer features={{ markdown: { mode: "live" } }} />
 * ```
 */
export interface MarkdownConfig {
  /** Visual mode shared by inline and block constructs. Default: `"hybrid"`. */
  mode?: MarkdownMode;
}

/**
 * Inline ghost-text autocomplete configuration. When the user's current
 * text is a prefix of one of the suggestions, the remaining characters
 * are rendered after the caret in a muted style. Pressing **Tab** accepts
 * the suggestion (the remainder is inserted into the editor); Escape, a
 * non-matching keystroke, or moving the caret away dismisses it.
 *
 * Operates on the editor's plain-text content (chips collapsed to their
 * labels) and matches against the start of the document — perfect for
 * search-bar–style inputs, command palettes, or templated prompts.
 *
 * Pass an array for the simplest case (`ghostedAutoComplete: [...]`) or
 * a config object for finer control.
 *
 * @example
 * ```tsx
 * <Composer features={{ ghostedAutoComplete: ["My cat is playing", "Hello world"] }} />
 * ```
 *
 * @example
 * ```tsx
 * <Composer
 *   features={{
 *     ghostedAutoComplete: {
 *       suggestions: ["Summarize this thread", "Translate to English"],
 *       caseSensitive: false,
 *       minLength: 2,
 *     },
 *   }}
 * />
 * ```
 */
export interface GhostedAutoCompleteConfig {
  /**
   * Static list of completion suggestions. The first entry whose prefix
   * matches the editor's current text wins — so order this list by
   * priority / likelihood.
   */
  suggestions: string[];
  /**
   * When `false` (default), matching is case-insensitive — `"my cat"`
   * matches `"My cat is playing"`. Set to `true` to require an exact
   * case match.
   */
  caseSensitive?: boolean;
  /**
   * Minimum number of characters the user must have typed before a
   * ghost suggestion is shown. Defaults to `1` — the ghost never
   * appears on an empty editor (that's what `placeholder` is for).
   */
  minLength?: number;
}

/**
 * Editor helpers handed to a {@link CustomAction} when it's clicked, so a
 * custom toolbar button can mutate the composer the same way a slash command
 * can. All three are safe to call outside any Lexical update scope — they wrap
 * `editor.update(...)` internally.
 */
export interface CustomActionContext {
  /** Insert plain text at the current selection. */
  insertText: (text: string) => void;
  /**
   * Insert markdown at the current selection. Multi-line aware: each newline
   * becomes a real paragraph break so fences / lists / headings form.
   */
  insertMarkdown: (markdown: string) => void;
  /** Submit the composer immediately (same pipeline as the Send button). */
  submit: () => void;
}

/**
 * A consumer-defined toolbar action. Renders as a button in the `full`
 * variant's toolbar and as a row in the compact variant's "+" popover, placed
 * between the built-in actions and `toolbarExtras`.
 *
 * @example
 * ```tsx
 * features={{
 *   custom: [
 *     {
 *       title: "Insert template",
 *       icon: <FileIcon />,
 *       onClick: ({ insertMarkdown }) => insertMarkdown("## Summary\n- "),
 *     },
 *     {
 *       title: "Formal tone",
 *       icon: <WandIcon />,
 *       active: tone === "formal",
 *       onClick: () => setTone((t) => (t === "formal" ? "neutral" : "formal")),
 *     },
 *   ],
 * }}
 * ```
 */
export interface CustomAction {
  /** Stable identifier (React key). Falls back to the array index if omitted. */
  id?: string;
  /** Tooltip text and accessible label for the control. */
  title: string;
  /** Leading icon — the toolbar button glyph / the menu-row icon. */
  icon: ReactNode;
  /** Click handler. Receives editor helpers ({@link CustomActionContext}). */
  onClick: (ctx: CustomActionContext) => void;
  /** Render in a pressed / highlighted state — for toggle-style actions. */
  active?: boolean;
  /** Disable the control (greyed out, not clickable). */
  disabled?: boolean;
}

export interface ComposerFeatures {
  /** `true` (default) → hybrid mode. Pass a {@link MarkdownConfig} to opt
   *  into `"live"` (Notion-style) or otherwise customise behaviour. */
  markdown?: boolean | MarkdownConfig;
  attachments?: boolean | AttachmentsConfig;
  mentions?: false | MentionConfig;
  /**
   * Trigger-driven command menus. Each {@link SlashConfig} binds a trigger
   * symbol (`trigger`, default `"/"`) to a list of {@link SlashCommand}s, and
   * every command runs a callback action via `onSelect(ctx)` when chosen.
   *
   * Pass a SINGLE config for one trigger, or an ARRAY to register **multiple
   * trigger symbols at once** — each with its own menu and actions. This lets a
   * consumer wire, say, `"/"` → commands AND `"#"` → issues side-by-side
   * (alongside the separate `@` mentions menu). Give each config a distinct
   * `trigger`.
   *
   * @example
   * ```tsx
   * features={{
   *   slashCommands: [
   *     { trigger: "/", items: commands },   // each command's onSelect runs an action
   *     { trigger: "#", items: issues },     // insert a link, etc.
   *   ],
   * }}
   * ```
   */
  slashCommands?: false | SlashConfig | SlashConfig[];
  voice?: boolean;
  mermaid?: boolean | MermaidConfig;
  web?: boolean;
  /**
   * Consumer-defined toolbar actions. Each entry ({@link CustomAction})
   * renders as a button in the `full` variant's toolbar and as a row in the
   * compact variant's "+" popover, between the built-in actions and
   * `toolbarExtras`. The click handler receives editor helpers
   * ({@link CustomActionContext}) so it can insert text/markdown or submit.
   * Defaults to `[]` (no custom actions).
   */
  custom?: CustomAction[];
  /**
   * Inline ghost-text autocomplete suggested from a list. Accepts a plain
   * `string[]` shorthand or a {@link GhostedAutoCompleteConfig} for
   * case-sensitivity / minimum-length tuning. Press **Tab** to accept the
   * suggestion. Disabled by default.
   */
  ghostedAutoComplete?: false | string[] | GhostedAutoCompleteConfig;
}

export interface ComposerHandle {
  focus(): void;
  clear(): void;
  insert(text: string): void;
  submit(): void;
  addAttachments(files: File[]): void;
}

/**
 * Render-props received by a custom send-button slot. Returned by the
 * library so consumer components can be completely chrome-free while still
 * inheriting the gating logic (uploads pending, empty editor, streaming).
 *
 * `className` / `style` carry the resolved values from
 * `classNames.sendButton` and `sx.sendButton`, so a consumer who wants
 * "their button but with my colours" can just spread them; a consumer
 * doing a from-scratch design can ignore both.
 */
export interface SendButtonRenderProps {
  /** True when the editor has something sendable (text, or attachments
   *  if `canSendOnlyAttachment` is true) AND no uploads are pending or
   *  failed. Same gate the default button uses for its disabled state. */
  canSend: boolean;
  /** Invoke this to send. Matches the internal submit pipeline 1:1 —
   *  serializes editor state, fires `onSend`, clears, etc. */
  onSend: () => void;
  /** Resolved className from `classNames.sendButton` + sx-derived classes. */
  className?: string;
  /** Resolved inline styles from `sx.sendButton` tokens. */
  style?: CSSProperties;
}

/**
 * Render-props received by a custom stop-button slot. Only mounted while
 * `isStreaming` is true on `<Composer />`.
 */
export interface StopButtonRenderProps {
  /** Invoke this to ask the host to stop generation; fires the
   *  `onStop` prop on `<Composer />`. */
  onStop: () => void;
  /** Resolved className from `classNames.stopButton` + sx-derived classes. */
  className?: string;
  /** Resolved inline styles from `sx.stopButton` tokens. */
  style?: CSSProperties;
}

/**
 * Component-level escape hatches. When a slot is provided the library skips
 * rendering its own element and renders yours instead, passing the same
 * runtime data it would have used internally (callbacks, gating flags,
 * resolved styles). Slots compose with `icons`, `classNames`, and `sx` —
 * use whichever level matches the depth of customization you need:
 *
 *   icons       — swap the SVG inside the default button
 *   classNames  — append classes to the default button
 *   sx          — token-driven inline styles on the default button
 *   slots       — replace the entire button (or other slot) wholesale
 *
 * @example
 * ```tsx
 * <Composer
 *   slots={{
 *     sendButton: ({ canSend, onSend, className }) => (
 *       <button
 *         type="button"
 *         disabled={!canSend}
 *         onClick={onSend}
 *         className={`flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-40 ${className ?? ""}`}
 *       >
 *         <span>Send</span>
 *         <kbd className="text-xs opacity-75">⏎</kbd>
 *       </button>
 *     ),
 *   }}
 * />
 * ```
 */
export interface ComposerSlots {
  /** Replace the send button. Receives {@link SendButtonRenderProps}. */
  sendButton?: ComponentType<SendButtonRenderProps>;
  /** Replace the stop button (rendered while `isStreaming`).
   *  Receives {@link StopButtonRenderProps}. */
  stopButton?: ComponentType<StopButtonRenderProps>;
}

export interface ComposerProps {
  /** Initial markdown to seed the editor. */
  initialValue?: string;
  /** Called when the user submits. */
  onSend?: (payload: ComposerSubmitPayload) => void;
  /** Called when the stop button is clicked while `isStreaming`. */
  onStop?: () => void;
  isStreaming?: boolean;
  /** Focus the editor on mount. Defaults to `false`. */
  autoFocus?: boolean;
  /**
   * Return focus to the editor after a successful send. Defaults to `true`.
   *
   * Sends triggered by the keyboard (Enter, Cmd/Ctrl+Enter) already keep
   * focus naturally; this prop guarantees the same after Send-button
   * clicks, quick-prompt `sendValue`, or imperative `ref.submit()` so the
   * user can keep typing without a second click. Set to `false` if your
   * UX moves focus elsewhere on send (e.g. a confirmation modal).
   */
  refocusOnSubmit?: boolean;
  /**
   * Global keyboard shortcut that focuses the composer from anywhere on
   * the page. Defaults to `"mod+/"` — `mod` resolves to ⌘ on macOS and
   * Ctrl on Windows/Linux. Pass any combo of `mod` / `cmd` / `meta` /
   * `ctrl` / `alt` / `option` / `shift` plus a single key, separated by
   * `+` (e.g. `"mod+k"`, `"shift+mod+/"`, `"alt+l"`).
   *
   * Set to `false` (or `null`) to disable. The listener is registered on
   * `window` and ignored while a popover / mention / slash menu intercepts
   * the key first.
   */
  focusShortcut?: string | false | null;
  placeholder?: string;
  /**
   * Shorthand for `classNames.root`. Kept for back-compat; if both are set,
   * the two are merged (`className` first, then `classNames.root`).
   */
  className?: string;
  /**
   * Per-slot className overrides. See {@link ComposerSlotClassNames}.
   */
  classNames?: ComposerSlotClassNames;
  /**
   * Per-slot inline-style overrides converted by the lightweight sx engine.
   * See {@link ComposerSxMap}.
   */
  sx?: ComposerSxMap;
  /**
   * Standard React `style` applied to the outer root in addition to (and
   * after) any `sx.root` resolved values. Use for dimensions/positioning of
   * the composer as a whole.
   */
  style?: CSSProperties;
  /**
   * Design tokens applied as inline CSS custom properties on the root, so
   * they cascade into every slot — including the package's built-in CSS —
   * without leaking to the rest of the app. See {@link ComposerTokens}.
   */
  tokens?: ComposerTokens;
  /**
   * Single brand color shorthand. Accepts any of:
   *   - HSL components (preferred): `"258 90% 62%"`
   *   - hex: `"#7c3aed"` / `"#abc"`
   *   - `rgb(...)` / `rgba(...)`
   *   - `hsl(...)` / `hsla(...)`
   *
   * Internally derives `--primary`, `--primary-foreground`, `--accent`,
   * `--accent-foreground`, and `--ring` from this one value. That re-tints
   * every "hot" surface — hover backgrounds, selected menu rows, mention
   * chips, the mention-list avatar, the Web pill, focus ring — without
   * touching the neutral chrome (card, border, foreground text).
   *
   * Anything you also pass via `tokens` overrides the derived value, so
   * `color` is just a sensible default you can fine-tune.
   *
   * @example
   * ```tsx
   * <Composer color="#7c3aed" />
   * ```
   */
  color?: string;
  /** Hint text under the composer. `false` hides; `true` shows default. */
  hint?: boolean | ReactNode;
  /**
   * Editor mode.
   *   - `"markdown"` (default): rich-text editor that understands markdown.
   *     Enables block shortcuts (`# `, `- `, `> `, ```` ``` ````), inline
   *     live styling (`**bold**`, `*italic*`, etc.), mermaid previews, and
   *     paste-as-rich-text. The serialized payload contains markdown.
   *   - `"text"`: plain-text editor. No markdown styling, no block shortcuts,
   *     no mermaid. Pasted content is reduced to plain text. The serialized
   *     `markdown` field of `onSend` simply equals the text.
   *
   * Mentions, slash commands, attachments and voice are independent of
   * `mode` and work in both.
   */
  mode?: "markdown" | "text";
  /**
   * Visual layout of the composer card.
   *
   *   - `"compact"` (default): a slim chat-bar that reads as a single line
   *     and grows as the user types or presses **Shift+Enter**. The quick
   *     actions that would otherwise sit in the toolbar (attach, image, web,
   *     and any `toolbarExtras`) collapse behind a single **"+"** button that
   *     opens a popover; the voice button floats to the right, beside Send.
   *     This keeps the resting state to one tidy row while still exposing
   *     everything one tap away.
   *
   *   - `"full"`: the classic layout — a multi-line editor area with a full
   *     toolbar row (all action buttons visible) above the Send button.
   *     Honours `multiline` exactly as before (`multiline: false` collapses
   *     it to the inline single-row bar).
   *
   * Independent of `multiline`: `variant` controls the *chrome layout*, while
   * `multiline` controls whether newlines are allowed. The compact variant
   * defaults to `multiline: true` so Shift+Enter can grow it.
   */
  variant?: "compact" | "full";
  /** Toggle / configure built-in plugins. */
  features?: ComposerFeatures;
  /** Extra controls rendered after the built-in toolbar buttons. */
  toolbarExtras?: ReactNode;
  /**
   * Close any open typeahead menu (slash, mentions) when the user clicks
   * or taps outside the composer. Defaults to `true`. Set `false` to keep
   * the menu open until the user dismisses it explicitly (Escape, selecting
   * an item, or moving the caret past the trigger).
   */
  closeMenusOnOutsideClick?: boolean;
  /**
   * Whether the editor is allowed to hold more than one line of content.
   * Defaults to `true`. When `false`, the composer behaves like a
   * single-line input: Enter never inserts a newline (Shift+Enter is also
   * suppressed), and `smartNewline` is implicitly disabled.
   */
  multiline?: boolean;
  /**
   * Whether pressing Enter (no modifiers) submits the message. Defaults to
   * `true`. When `false`, Enter only inserts a newline (assuming
   * `multiline` is `true`); the user can still submit with
   * Cmd/Ctrl+Enter or via the Send button / imperative `ref.submit()`.
   */
  submitOnEnter?: boolean;
  /**
   * Smart list continuation on Enter. Defaults to `true`. Only takes
   * effect in markdown mode when `multiline` is `true`.
   *
   * When the cursor sits inside a list paragraph (`- `, `* `, `+ `, or
   * `N. `), Enter continues the list with the next marker (bullet
   * character preserved, numbers auto-incremented). Pressing Enter on an
   * empty list item exits the list — the marker is cleared and the cursor
   * stays on the now-plain line, where the next Enter sends.
   *
   * This is the ONLY case where plain Enter inserts a line rather than
   * submitting. Everywhere else Enter sends (subject to `submitOnEnter`)
   * regardless of how many lines the draft already holds, and Shift+Enter
   * is the newline gesture. Set to `false` to disable list continuation so
   * Enter inside a bullet sends like anywhere else.
   *
   * NOTE: earlier versions also blocked Enter from submitting once the
   * editor held more than one line (forcing Cmd/Ctrl+Enter). That rule was
   * removed — Enter now sends whether the draft is one line or many.
   */
  smartNewline?: boolean;
  /**
   * Override any built-in icon with your own React component. The library
   * ships small lucide-style SVGs by default; provide your own to match
   * your design system (Heroicons, Phosphor, Material, etc). Any slot you
   * leave out keeps its default.
   *
   * @example
   * ```tsx
   * <Composer icons={{ send: MyArrowIcon, voice: MyMicIcon }} />
   * ```
   */
  icons?: Partial<ComposerIcons>;
  /**
   * Component-level overrides for chrome pieces (currently `sendButton`
   * and `stopButton`). Each entry, when provided, REPLACES the library's
   * default element while still receiving the runtime data it would have
   * used (callbacks, gating flags, resolved styles). See {@link ComposerSlots}
   * and the per-slot render-prop interfaces ({@link SendButtonRenderProps},
   * {@link StopButtonRenderProps}) for the contract.
   *
   * Composes with `icons` / `classNames` / `sx`: use those for cosmetic
   * tweaks, reach for `slots` only when you need different DOM, behaviour,
   * or accessibility wrapping (e.g. a tooltip-wrapped button, a split
   * "Send / Send & schedule" dropdown, a labelled pill).
   *
   * @example
   * ```tsx
   * <Composer
   *   slots={{
   *     sendButton: ({ canSend, onSend }) => (
   *       <MyBrandButton disabled={!canSend} onClick={onSend}>
   *         Send <kbd>⏎</kbd>
   *       </MyBrandButton>
   *     ),
   *   }}
   * />
   * ```
   */
  slots?: ComposerSlots;
  /**
   * Render mermaid (or other future diagram-language) fences yourself instead
   * of relying on the lazy-imported `mermaid` package. Recommended for
   * production apps that already have a diagram pipeline — set this and you
   * can omit `mermaid` from your install entirely.
   *
   * Receives the raw fenced code and the language tag, returns any ReactNode.
   *
   * @example
   * ```tsx
   * <Composer
   *   renderDiagram={({ code }) => <MyDiagram source={code} />}
   * />
   * ```
   */
  renderDiagram?: DiagramRenderer;
  /**
   * "Starter" prompts shown as a clickable chip row above the composer.
   * Clicking a chip either fills the editor (`behavior: "initValue"`) or
   * fills + submits (`behavior: "sendValue"`, default). Useful as a
   * zero-typing entry point on an empty chat surface.
   *
   * @example
   * ```tsx
   * <Composer
   *   prompts={{
   *     items: [
   *       "Summarize today's stand-up",
   *       "Draft a release email",
   *       "Find bugs in this snippet",
   *       "Brainstorm names for my project",
   *       "Plan next sprint",
   *     ],
   *     maxToShow: 3,           // show 3 chips out of 5
   *     randomize: true,        // pick a different 3 each mount
   *     behavior: "sendValue",  // click → fill + submit
   *     onSelect: (p) => track("prompt_picked", { p }),
   *   }}
   * />
   * ```
   */
  prompts?: ComposerPromptsConfig;
  /**
   * Attachment lifecycle and submission rules — `uploadFirst` for
   * server-side upload pipelines (spinner + warning chip states),
   * `onUpload` for the callback, `canSendOnlyAttachment` to require
   * text alongside attachments. See {@link AttachmentOptions}.
   *
   * @example
   * ```tsx
   * <Composer
   *   features={{ attachments: true }}
   *   attachmentOptions={{
   *     uploadFirst: true,
   *     onUpload: async (file) => (await fetch("/api/upload", { method: "POST", body: file })).ok,
   *     canSendOnlyAttachment: false,
   *   }}
   * />
   * ```
   */
  attachmentOptions?: AttachmentOptions;
  /**
   * Writing direction. The composer's chrome (toolbar, attachment tray,
   * popovers, hint, mention chips, send button) is laid out with CSS
   * logical properties so a single attribute flips left↔right correctly.
   *
   *   - `"ltr"` (default behaviour when omitted): left-to-right.
   *   - `"rtl"`: right-to-left — Arabic, Hebrew, Persian, Urdu, …
   *   - `"auto"`: the browser picks per-paragraph based on the first
   *     strong character. Useful for chat surfaces that mix scripts.
   *
   * Applied to the outer composer root *and* the Lexical contenteditable so
   * caret movement, text alignment, and per-line direction (in `"auto"`
   * mode) all behave correctly.
   *
   * @example
   * ```tsx
   * <Composer dir="rtl" placeholder="اكتب رسالة..." onSend={...} />
   * ```
   */
  dir?: "ltr" | "rtl" | "auto";
}