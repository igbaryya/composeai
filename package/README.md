# composeai

**The modern React composer for AI applications.**

![ComposeAI composer — markdown, mentions, and links](https://i.ibb.co/PsKB3xyz/Screenshot-2026-06-02-at-19-19-11.png)

![ComposeAI composer — attachments via paste, drop, or paperclip](https://i.ibb.co/GQy0PQk6/Screenshot-2026-06-02-at-19-20-39.png)

`composeai` is a drop-in `<Composer />` for AI chat and assistant UIs — the input box behind copilots, support bots, agent workspaces, and any surface where users compose prompts for an LLM. It is built on Lexical, ships its own styles, and is designed to feel like a first-party ChatGPT or Slack composer on day one.

### Why composeai?

Building an AI chat input means solving dozens of UX problems at once: markdown that feels native, @mentions that survive edits, /commands for agent actions, file uploads with spinner states, voice-to-text, a Stop button during streaming, keyboard shortcuts, RTL, theming, and a submit payload your backend can actually use. `composeai` handles all of that behind opt-in `features` flags — you wire `onSend` and focus on your model.

### Design principles

- **Internally stateful** — no `value` / `onChange` round-trip. Parents listen via `onSend`.
- **Plugin-driven** — every feature (markdown, attachments, mentions, slash, voice, mermaid, web) is opt-in.
- **AI-native submit payload** — `{ text, markdown, attachments, mentions }` ready for your API layer.
- **Slack-style markdown stack** — every block is a styled `ParagraphNode`; works in `hybrid` (markers stay visible) or `live` (Notion-style: markers vanish).
- **Streaming-ready** — `isStreaming` + `onStop` swap Send for Stop while the model generates.
- **Tiny dependency surface** — `react`, `react-dom`, `lexical`, `@lexical/react`. Mermaid is an optional peer dep.
- **BYO icons** — ships inlined SVGs; replace any one with your own component.
- **Themeable** — `color` shorthand, full `tokens`, per-slot `classNames` + `sx`, no global CSS leakage.

**Links:** [Live demo](https://igbaryya.github.io/composeai/) · [GitHub](https://github.com/igbaryya/composeai)

## Install

```bash
npm install composeai lexical @lexical/react
# optional, only if you use mermaid diagrams and don't pass `renderDiagram`:
npm install mermaid
```

## Minimal usage

```tsx
import { Composer, type ComposerSubmitPayload } from "composeai";
import "composeai/composer.css";

export function Chat() {
  return (
    <Composer
      placeholder="Send a message…"
      onSend={(p: ComposerSubmitPayload) => console.log(p)}
    />
  );
}
```

`payload` is `{ text, markdown, attachments, mentions }`. The composer clears
itself after a successful submit.

## Common configurations

### Live (Notion-style) markdown

Markers vanish once matched. Block markers (`#`, `>`, `- `, code fences) and
link syntax (`[label](url)`) collapse too — you see the rendered result, not
the raw markdown. The submit payload still carries reconstructed markdown.

```tsx
<Composer features={{ markdown: { mode: "live" } }} />
```

### Mentions + slash commands

```tsx
<Composer
  features={{
    mentions: {
      items: [{ id: "u1", label: "Ada Lovelace", description: "Engineering" }],
    },
    slashCommands: {
      items: [{ id: "summarize", label: "Summarize", onSelect: (ctx) => ctx.insertText("/summarize ") }],
    },
  }}
/>
```

#### Multiple trigger symbols

`slashCommands` also accepts an **array** of configs, so you can bind several
trigger symbols at once — each with its own menu and per-command action. Give
each a distinct `trigger`.

```tsx
<Composer
  features={{
    slashCommands: [
      // "/" → commands that run an action (open a dialog, toggle a mode, …)
      { trigger: "/", items: [
        { id: "announce", label: "Announcement", onSelect: () => openAnnouncement() },
      ] },
      // "#" → issues that insert a link
      { trigger: "#", items: (q) => searchIssues(q).then((rows) =>
        rows.map((i) => ({ id: i.id, label: i.title, onSelect: (ctx) => ctx.insertMarkdown(`[#${i.number}](/issues/${i.number})`) })),
      ) },
    ],
    mentions: { items: members }, // "@" stays its own separate menu
  }}
/>
```

### Attachments — with upload pipeline

```tsx
<Composer
  features={{
    attachments: {
      types: [
        { id: "pdf",  label: "PDF",  accept: ".pdf",         description: ".pdf"        },
        { id: "word", label: "Word", accept: ".docx,.doc",   description: ".docx, .doc" },
      ],
      maxSize: 25 * 1024 * 1024,
      maxCount: 5,
    },
  }}
  attachmentOptions={{
    uploadFirst: true,
    onUpload: async (file) => (await fetch("/api/upload", { method: "POST", body: file })).ok,
    canSendOnlyAttachment: true,
  }}
/>
```

### Single-line composer

```tsx
<Composer multiline={false} placeholder="Search anything…" />
```

### Streaming / Stop button

```tsx
const [streaming, setStreaming] = useState(false);
<Composer
  isStreaming={streaming}
  onStop={() => abort()}
  onSend={async (p) => {
    setStreaming(true);
    await streamReply(p);
    setStreaming(false);
  }}
/>
```

### Theming with one color

```tsx
<Composer color="#7c3aed" />
```

Internally derives `--primary`, `--primary-foreground`, `--accent`,
`--accent-foreground`, `--ring` from this single value — every "hot" surface
(focus ring, mention chips, Web pill, hover bg) re-tints in one shot.

### Replace a chrome piece with a slot

```tsx
<Composer
  slots={{
    sendButton: ({ canSend, onSend, className }) => (
      <button
        type="button"
        disabled={!canSend}
        onClick={onSend}
        className={`rounded-xl bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-40 ${className ?? ""}`}
      >
        Send <kbd className="text-xs opacity-75">⏎</kbd>
      </button>
    ),
  }}
/>
```

### Imperative control via ref

```tsx
const ref = useRef<ComposerHandle>(null);

<button onClick={() => ref.current?.insert(" Hi!")}>Insert</button>
<button onClick={() => ref.current?.submit()}>Send programmatically</button>

<Composer ref={ref} />
```

`ComposerHandle` exposes `focus()`, `clear()`, `insert(text)`, `submit()`,
`addAttachments(files)`.

## Props (overview)

| Prop                       | Type                                  | Default       | Purpose                                                                            |
| -------------------------- | ------------------------------------- | ------------- | ---------------------------------------------------------------------------------- |
| `onSend`                   | `(payload) => void`                   | —             | Fires on submit. Payload: text + markdown + attachments + mentions.                |
| `onStop`                   | `() => void`                          | —             | Fires when the Stop button is clicked while `isStreaming`.                         |
| `isStreaming`              | `boolean`                             | `false`       | Renders the Send button as Stop and blocks new submissions.                        |
| `initialValue`             | `string`                              | —             | Markdown to seed the editor. Multi-line → split into paragraphs.                   |
| `placeholder`              | `string`                              | `"Send a message…"` |                                                                              |
| `autoFocus`                | `boolean`                             | `false`       | Focus the editor on mount.                                                         |
| `refocusOnSubmit`          | `boolean`                             | `true`        | Return focus to the editor after a Send-button / programmatic submit.              |
| `focusShortcut`            | `string \| false`                     | `"mod+/"`     | Global focus shortcut. Accepts `mod`/`cmd`/`ctrl`/`alt`/`shift` + key.             |
| `mode`                     | `"markdown" \| "text"`                | `"markdown"`  | `"text"` disables markdown styling and pasted-rich-text handling.                  |
| `features`                 | `ComposerFeatures`                    | `{}`          | Plugin switchboard — see below.                                                    |
| `multiline`                | `boolean`                             | `true`        | When `false`, Enter never inserts a newline (single-line input mode).              |
| `submitOnEnter`            | `boolean`                             | `true`        | When `false`, only Cmd/Ctrl+Enter (or the button) submits.                         |
| `smartNewline`             | `boolean`                             | `true`        | Once the draft has >1 line, Enter inserts a newline instead of submitting.         |
| `hint`                     | `boolean \| ReactNode`                | `true`        | Helper line under the composer.                                                    |
| `prompts`                  | `ComposerPromptsConfig`               | —             | Starter-prompt chips above the composer.                                           |
| `attachmentOptions`        | `AttachmentOptions`                   | —             | `uploadFirst`, `onUpload`, `canSendOnlyAttachment`.                                |
| `closeMenusOnOutsideClick` | `boolean`                             | `true`        | Close typeahead menus on outside click.                                            |
| `dir`                      | `"ltr" \| "rtl" \| "auto"`            | `"ltr"`       | Writing direction. Flips chrome via CSS logical properties.                        |
| `toolbarExtras`            | `ReactNode`                           | —             | Custom controls appended to the toolbar.                                           |
| `renderDiagram`            | `(p) => ReactNode`                    | —             | Diagram renderer. When set, the lazy `import("mermaid")` is skipped.               |
| `icons`                    | `Partial<ComposerIcons>`              | —             | Per-icon overrides.                                                                |
| `slots`                    | `ComposerSlots`                       | —             | Replace whole chrome pieces — currently `sendButton`, `stopButton`.                |
| `color`                    | `string` (HSL/hex/rgb/hsl)            | —             | Single-color brand shorthand.                                                      |
| `tokens`                   | `ComposerTokens`                      | —             | Full design-token map applied as inline CSS variables.                             |
| `classNames`               | `ComposerSlotClassNames`              | —             | Per-slot className overrides.                                                      |
| `sx`                       | `ComposerSxMap`                       | —             | Per-slot inline-style overrides with token shortcuts.                              |
| `className` / `style`      | `string` / `CSSProperties`            | —             | Standard React shorthands for the root.                                            |
| `ref`                      | `Ref<ComposerHandle>`                 | —             | Imperative handle. See above.                                                      |

### `features.*`

| Feature         | Type                          | Default | Notes                                                                              |
| --------------- | ----------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `markdown`      | `boolean \| MarkdownConfig`   | `true`  | `{ mode: "hybrid" \| "live" }` — `live` hides markers Notion-style.                |
| `attachments`   | `boolean \| AttachmentsConfig`| `false` | `{ file, image, accept, types, maxSize, maxCount }`.                               |
| `mentions`      | `false \| MentionConfig`      | `false` | `{ items, trigger, maxItems }`. `items` may be async — UI shows a skeleton.        |
| `slashCommands` | `false \| SlashConfig \| SlashConfig[]` | `false` | `{ items, trigger, maxItems }`. Pass an **array** to register multiple trigger symbols at once (e.g. `/` commands + `#` issues), each with its own action menu. |
| `voice`         | `boolean`                     | `false` | Web Speech + MediaRecorder fallback. Requires HTTPS or localhost.                  |
| `mermaid`       | `boolean \| MermaidConfig`    | `false` | `{ keepSource }`. Optional peer dep — lazy import or pass `renderDiagram`.         |
| `web`           | `boolean`                     | `false` | Adds a "Web" toggle pill — flags a turn as web-grounded for downstream routing.    |

## Markdown modes

The composer ships two visual contracts for markdown — both produce the same
`markdown` field on submit:

- **hybrid** (default) — Slack / Discord / iMessage feel. Markers stay visible
  in a muted style, and the inner text picks up the format. The document IS
  the markdown source.

- **live** — Notion / Tiptap feel. As soon as the closing marker lands the
  marker characters vanish. Headings drop `# `, fences drop `` ``` ``, and
  `[label](url)` collapses to a styled link with the URL hidden on a
  `LinkTextNode`. Backspace at column 0 of a heading clears the heading style
  (the only way to escape it since the `# ` chars aren't visible).

```tsx
<Composer features={{ markdown: { mode: "live" } }} />
```

## Submit behaviour matrix

| Combination                                            | What Enter does                                          |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `multiline:true, submitOnEnter:true, smartNewline:true` (default) | Send while single-line; newline once draft is multi-line. Cmd/Ctrl+Enter always sends. Lists auto-continue (`- `, `N. `). |
| `multiline:true, submitOnEnter:true, smartNewline:false` | Send always. Shift+Enter for newline.                  |
| `multiline:true, submitOnEnter:false`                  | Enter inserts newline. Cmd/Ctrl+Enter sends.             |
| `multiline:false, submitOnEnter:true`                  | Send always; no newlines.                                |
| `multiline:false, submitOnEnter:false`                 | Plain input; only the button / `ref.submit()` sends.     |

## Submit payload

```ts
interface ComposerSubmitPayload {
  text: string;          // plain text — chips collapse to "@label", markers stripped
  markdown: string;      // markdown source — chips as "@label", live-mode markers reconstructed
  attachments: Attachment[];
  mentions: MentionRef[]; // { id, label }[] — id is stable across label edits
}
```

## Bundle impact

The library itself is small. The peer deps you'll already have:

- `lexical` + `@lexical/react` (required)
- `mermaid` (optional — `import("mermaid")` is **only** called when a
  `mermaid` fence appears AND `renderDiagram` is not supplied)

No `clsx`, no `tailwind-merge`, no `lucide-react` — all inlined.

## Browser support

Same target as Lexical: modern evergreen browsers (Chrome / Edge / Firefox /
Safari). Voice input requires the Web Speech API or `MediaRecorder` —
gracefully no-ops where neither is available.

## License

MIT — see [LICENSE](./LICENSE).