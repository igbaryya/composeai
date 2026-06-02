# composeai

**The modern React composer for AI applications.**

A drop-in message composer for chatbots, copilots, agent interfaces, and any product that needs a ChatGPT-grade input — without building it from scratch. Built on Lexical, fully plugin-driven, and internally stateful: your chat logic stays simple — listen on `onSend`, wire to your model, done.

Every feature you'd expect from a production AI chat surface is opt-in behind `features`:

- **Rich markdown** — hybrid (Slack-style) or live (Notion-style) editing
- **@mentions** and **/slash commands** — typeahead menus with stable chip IDs
- **Attachments** — paste, drag-drop, optional upload pipeline
- **Voice input** — Web Speech API with MediaRecorder fallback
- **Streaming UX** — swap Send for Stop while the model is generating
- **Quick prompts**, **Mermaid previews**, **ghost autocomplete**, and full theming

This repository ships the **`composeai` npm library** and a live **demo gallery** that exercises every capability.

## Monorepo layout

```text
.
├── package/         composeai — the publishable library
├── demo/            Vite + React app that exercises every feature
├── README.md
└── package.json     workspace root (npm workspaces)
```

## Quick start

```bash
npm install
npm run dev         # demo at http://localhost:5173
npm run typecheck   # whole-monorepo TS check
npm run build       # production build of the demo
```

## What's inside the library

| Capability                      | Notes                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Lexical-based rich editor       | Custom Slack-style markdown stack — every block is a styled `ParagraphNode`                       |
| Hybrid **and** live markdown    | `features.markdown.mode: "hybrid" \| "live"` — markers stay visible, or vanish Notion-style       |
| Headings / lists / quotes / fences | All recognised inline; in live mode block markers (`# `, `> `, `- `, ```` ``` ````) collapse too |
| Inline links                    | `[label](url)` — live mode hides the URL on a `LinkTextNode`; serializer rebuilds the markdown    |
| Mentions                        | Editable chips with stable IDs that survive label edits                                           |
| Slash commands                  | Caret-anchored typeahead with smart positioning                                                   |
| Attachments                     | Paperclip + paste + drag-drop, optional type-picker popover, optional `uploadFirst` pipeline      |
| Voice input                     | Web Speech API with MediaRecorder fallback                                                        |
| Mermaid diagrams                | `mermaid` is an **optional** peer dep — lazy-imported, or pass `renderDiagram` to skip entirely   |
| Quick prompts                   | Starter chips above the composer (`sendValue` or `initValue` behaviour)                           |
| Slots                           | Replace any chrome piece wholesale (currently `sendButton`, `stopButton`) via render-prop slots   |
| Theming                         | `color` shorthand, full `tokens` map, `classNames` + `sx` per-slot, dark-mode-friendly            |
| RTL / `dir="auto"` ready        | Chrome is laid out with CSS logical properties; caret motion flips correctly                      |
| Imperative API                  | `ref` exposes `focus / clear / insert / submit / addAttachments`                                  |
| Single dependency footprint     | Only `react`, `react-dom`, `lexical`, `@lexical/react` are required at runtime                    |

## Repo layout

```text
package/                       composeai (publishable)
  src/
    Composer.tsx               public entry — wires LexicalComposer + plugins
    types.ts                   ComposerProps / Features / Tokens / Slots
    core/
      ComposerProvider.tsx     context for slots, classNames, sx, attachments
      EditorShell.tsx          layout shell (multiline vs single-line)
      serializer.ts            editor state → text / markdown / mentions
      nodes/                   MentionNode, MarkdownTokenNode,
                               BlockParagraphNode, LinkTextNode
    plugins/                   one file per feature — all opt-in
    ui/                        SendButton, Toolbar, MentionMenu, …
    internal/                  cn, icons, sx, color, Portal, Tooltip, …
    composer.css               package-shipped styles
  package.json                 published manifest

demo/                          live playground (Vite + Tailwind)
  src/
    App.tsx                    routes + sidebar
    Sidebar.tsx                grouped demo navigation
    HomePage.tsx               overview / API reference / gallery
    demos.tsx                  every demo spec (used by HomePage + routes)
    MessageContent.tsx         renders the bubble after submit
    EmptyState.tsx             per-demo blank-state UI
  index.html                   Vite entry
```

## Using the composer

The full prop reference and a live API table lives at the demo's home page
(`npm run dev` → root URL). A minimal snippet:

```tsx
import {
  Composer,
  type ComposerHandle,
  type ComposerSubmitPayload,
} from "composeai";
import "composeai/composer.css";

function Chat() {
  return (
    <Composer
      placeholder="Send a message…"
      features={{
        markdown: { mode: "live" },   // Notion-style: markers vanish once matched
        attachments: true,
        mentions:  { items: people },
        slashCommands: { items: commands },
        voice: true,
        mermaid: true,
      }}
      onSend={(payload: ComposerSubmitPayload) => {
        console.log(payload.text, payload.markdown, payload.attachments, payload.mentions);
      }}
    />
  );
}
```

See [`package/README.md`](./package/README.md) for the library-only reference.

## Contributing

The library is the **only** thing that ships. Anything under `demo/` is a
sandbox — keep it out of the library by never importing from `../../demo/`
inside `package/src/`. CI enforcement is on the TODO list; for now, the
typecheck (`npm run typecheck`) and the dev server (`npm run dev`) are the
two signals that matter.

Plugin layout: `package/src/plugins/`. Add a `MyPlugin.tsx`, wire it through
`Composer.tsx` behind a flag in `features`, and document it on the demo's
home page so the gallery surfaces it.

## License

MIT.