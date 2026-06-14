/**
 * Catalog of demo scenarios shown in the sidebar. Each spec configures the
 * `<Composer />` differently and supplies copy for its empty state.
 */
import { useState, type ReactNode, type Ref, type RefObject } from "react";
import {
  Brush,
  Code2,
  CornerDownLeft,
  Crosshair,
  FileText,
  Focus,
  Globe2,
  Hash,
  Home as HomeIcon,
  Image as ImageIcon,
  Keyboard,
  Languages,
  Layers,
  Lightbulb,
  MessagesSquare,
  Mic,
  Minus,
  MousePointerClick,
  Palette,
  Paperclip,
  PenLine,
  Pill,
  Send,
  Sliders,
  Sparkles,
  Square,
  Type as TypeIcon,
  Wand2,
  Workflow,
  Zap,
} from "lucide-react";
import { Composer } from "composeai";
import type {
  AttachmentOptions,
  ComposerFeatures,
  ComposerHandle,
  ComposerProps,
  ComposerPromptsConfig,
  ComposerSlotClassNames,
  ComposerSubmitPayload,
  ComposerSxMap,
  ComposerTokens,
  MentionItem,
  SlashCommand,
} from "composeai";

export interface DemoSpec {
  id: string;
  title: string;
  group: string;
  icon: ReactNode;
  /** Short tagline shown in the sidebar. */
  tagline: string;
  /** Long description rendered inside the empty-state card. */
  description: ReactNode;
  /**
   * Setup steps the consumer needs to do BEFORE this demo works. Surfaced
   * as a callout above the "Try it" list. Use sparingly — only when the
   * feature has a non-obvious dependency (e.g. optional peer package, OS
   * permission). Each entry is a single requirement (may include inline
   * code, links, etc.).
   */
  prerequisites?: ReactNode[];
  /** Bullets the user can try in this demo. */
  tryIt: string[];
  features?: ComposerFeatures;
  /** Editor mode. Defaults to "markdown" when omitted. */
  mode?: ComposerProps["mode"];
  /** See `ComposerProps.variant`. Defaults to "compact" when omitted. */
  variant?: ComposerProps["variant"];
  /** See `ComposerProps.multiline`. */
  multiline?: ComposerProps["multiline"];
  /** See `ComposerProps.submitOnEnter`. */
  submitOnEnter?: ComposerProps["submitOnEnter"];
  /** See `ComposerProps.smartNewline`. */
  smartNewline?: ComposerProps["smartNewline"];
  /**
   * See `ComposerProps.autoFocus`. App.tsx defaults this to `true` so most
   * demos land you straight in the editor; set it explicitly here to
   * opt out (e.g. the "Manual focus only" demo).
   */
  autoFocus?: ComposerProps["autoFocus"];
  /** See `ComposerProps.refocusOnSubmit`. */
  refocusOnSubmit?: ComposerProps["refocusOnSubmit"];
  /** See `ComposerProps.focusShortcut`. */
  focusShortcut?: ComposerProps["focusShortcut"];
  /** See `ComposerProps.dir`. */
  dir?: ComposerProps["dir"];
  placeholder?: string;
  initialValue?: string;
  /** Quick-prompts forwarded to <Composer />. */
  prompts?: ComposerPromptsConfig;
  /** Attachment lifecycle & rules forwarded to <Composer />. */
  attachmentOptions?: AttachmentOptions;
  hint?: boolean | ReactNode;
  toolbarExtras?: ReactNode;
  /** Per-slot className overrides forwarded to <Composer />. */
  classNames?: ComposerSlotClassNames;
  /** Per-slot sx forwarded to <Composer />. */
  sx?: ComposerSxMap;
  /** Component-level slot overrides forwarded to <Composer />. */
  slots?: ComposerProps["slots"];
  /** Inline style applied to the composer root. */
  style?: ComposerProps["style"];
  /** Design tokens forwarded to <Composer />. */
  tokens?: ComposerTokens;
  /** Single brand-colour shorthand forwarded to <Composer />. */
  color?: string;
  /**
   * Fully replace how the composer is rendered for this demo. When set,
   * App.tsx delegates the entire Composer subtree to this function, which
   * can hold its own state to drive interactive demos (e.g. live colour
   * swatches that update the `color` prop).
   */
  renderComposer?: (ctx: {
    ref: Ref<ComposerHandle>;
    onSend: (payload: ComposerSubmitPayload) => void;
    placeholder: string;
  }) => ReactNode;
  /**
   * Extra UI rendered just above the composer. Receives the composer's
   * imperative ref so demos can drive it from outside (e.g. focus, insert).
   */
  extraAboveComposer?: (ctx: { ref: RefObject<ComposerHandle | null> }) => ReactNode;
  /**
   * Copy-pasteable TSX snippet shown in the empty-state code block.
   * Should be a self-contained example illustrating how to wire this demo's
   * configuration into a real app.
   */
  code: string;
}

/** Hint under the composer: explicit `hint`, else the demo tagline overview. */
export function resolveDemoHint(demo: DemoSpec): boolean | ReactNode {
  if (demo.hint !== undefined) return demo.hint;
  return demo.tagline;
}

// ─────────────────────────────────────────────────────────────────────
// Sample data shared across demos
// ─────────────────────────────────────────────────────────────────────

const MEMBERS: MentionItem[] = [
  { id: "u1", label: "Alex Carter", description: "Design Lead" },
  { id: "u2", label: "Beatrice Wong", description: "Frontend Engineer" },
  { id: "u3", label: "Carlos Diaz", description: "Product Manager" },
  { id: "u4", label: "Dana Park", description: "Backend Engineer" },
  { id: "u5", label: "Erin Liu", description: "Designer" },
  { id: "u6", label: "Felix Brown", description: "Researcher" },
  { id: "u7", label: "Greta Sanchez", description: "QA" },
  { id: "u8", label: "Hiro Tanaka", description: "Staff Engineer" },
];

const CHANNELS: MentionItem[] = [
  { id: "c1", label: "general", description: "Team-wide chat" },
  { id: "c2", label: "engineering", description: "Builds, deploys, incidents" },
  { id: "c3", label: "design-crit", description: "Weekly design crits" },
  { id: "c4", label: "random", description: "Memes & life updates" },
];

const SLASH: SlashCommand[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "Summarize the conversation so far",
    group: "AI",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    shortcut: "S",
    onSelect: ({ insertText }) => insertText("Please summarize the above."),
  },
  {
    id: "improve",
    label: "Improve writing",
    description: "Polish tone and clarity",
    group: "AI",
    icon: <Wand2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Improve this writing: "),
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    description: "Generate ideas around a topic",
    group: "AI",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Brainstorm five ideas about "),
  },
  {
    id: "code",
    label: "Write code",
    description: "Generate or refactor code",
    group: "Tools",
    icon: <Code2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Write code that "),
  },
  {
    id: "diagram",
    label: "Insert mermaid diagram",
    description: "Drop in a starter flowchart",
    group: "Tools",
    icon: <Workflow className="h-3.5 w-3.5" />,
    onSelect: ({ insertMarkdown }) =>
      insertMarkdown("```mermaid\nflowchart LR\n  A --> B\n  B --> C\n```"),
  },
  {
    id: "doc",
    label: "Reference doc",
    description: "Insert a markdown file template",
    group: "Tools",
    icon: <FileText className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Doc: "),
  },
  {
    id: "send-as-is",
    label: "Send as-is",
    description: "Skip the menu and submit immediately",
    group: "Actions",
    icon: <Zap className="h-3.5 w-3.5" />,
    onSelect: ({ submit }) => submit(),
  },
];

const HELP_COMMANDS: SlashCommand[] = [
  {
    id: "help",
    label: "Show help",
    description: "Open the help center",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("[help requested]"),
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    description: "See all hotkeys",
    icon: <Zap className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Show me the shortcuts."),
  },
];

// ─────────────────────────────────────────────────────────────────────
// Arabic sample data — used by the RTL demos
// ─────────────────────────────────────────────────────────────────────

const MEMBERS_AR: MentionItem[] = [
  { id: "ar-u1", label: "علي حسن", description: "قائد التصميم" },
  { id: "ar-u2", label: "فاطمة الزهراء", description: "مهندسة واجهات" },
  { id: "ar-u3", label: "محمد ياسين", description: "مدير المنتج" },
  { id: "ar-u4", label: "ليلى الراشد", description: "مهندسة خلفية" },
  { id: "ar-u5", label: "يوسف عبد الله", description: "باحث" },
  { id: "ar-u6", label: "نور الدين", description: "ضمان الجودة" },
];

const SLASH_AR: SlashCommand[] = [
  {
    id: "ar-summarize",
    label: "تلخيص",
    description: "تلخيص المحادثة حتى الآن",
    group: "ذكاء اصطناعي",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("لخّص ما سبق من فضلك."),
  },
  {
    id: "ar-improve",
    label: "تحسين الكتابة",
    description: "تحسين النبرة والوضوح",
    group: "ذكاء اصطناعي",
    icon: <Wand2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("حسّن صياغة هذا النص: "),
  },
  {
    id: "ar-brainstorm",
    label: "عصف ذهني",
    description: "توليد أفكار حول موضوع",
    group: "ذكاء اصطناعي",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("اقترح خمس أفكار حول "),
  },
  {
    id: "ar-diagram",
    label: "إدراج مخطط Mermaid",
    description: "إضافة مخطط انسيابي مبدئي",
    group: "أدوات",
    icon: <Workflow className="h-3.5 w-3.5" />,
    onSelect: ({ insertMarkdown }) =>
      insertMarkdown("```mermaid\nflowchart RL\n  بداية --> منتصف\n  منتصف --> نهاية\n```"),
  },
  {
    id: "ar-send",
    label: "إرسال كما هو",
    description: "تخطّى القائمة وأرسل مباشرة",
    group: "إجراءات",
    icon: <Zap className="h-3.5 w-3.5" />,
    onSelect: ({ submit }) => submit(),
  },
];

// ─────────────────────────────────────────────────────────────────────
// Hebrew sample data — used by the RTL demos
// ─────────────────────────────────────────────────────────────────────

const MEMBERS_HE: MentionItem[] = [
  { id: "he-u1", label: "נועה כהן", description: "ראשת עיצוב" },
  { id: "he-u2", label: "אבי לוי", description: "מהנדס פרונט" },
  { id: "he-u3", label: "תמר ברק", description: "מנהלת מוצר" },
  { id: "he-u4", label: "יונתן שמיר", description: "מהנדס בק־אנד" },
  { id: "he-u5", label: "מיכל אביטל", description: "מעצבת" },
  { id: "he-u6", label: "דניאל פרץ", description: "חוקר" },
  { id: "he-u7", label: "שירה מזרחי", description: "בקרת איכות" },
  { id: "he-u8", label: "איתי גולן", description: "מהנדס מערכת" },
];

const CHANNELS_HE: MentionItem[] = [
  { id: "he-c1", label: "כללי", description: "ערוץ הצוות הראשי" },
  { id: "he-c2", label: "הנדסה", description: "בילדים, פריסות, אירועים" },
  { id: "he-c3", label: "עיצוב", description: "ביקורות עיצוב שבועיות" },
  { id: "he-c4", label: "אקראי", description: "ממים ועדכוני חיים" },
];

const SLASH_HE: SlashCommand[] = [
  {
    id: "he-summarize",
    label: "סיכום",
    description: "לסכם את השיחה עד עכשיו",
    group: "בינה מלאכותית",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("אנא סכם את ההודעות שלמעלה."),
  },
  {
    id: "he-improve",
    label: "לשפר ניסוח",
    description: "ללטש את הטון ואת הבהירות",
    group: "בינה מלאכותית",
    icon: <Wand2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("שפר את הניסוח של הטקסט הבא: "),
  },
  {
    id: "he-brainstorm",
    label: "סיעור מוחות",
    description: "ליצור רעיונות סביב נושא",
    group: "בינה מלאכותית",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("הצע חמישה רעיונות בנושא "),
  },
  {
    id: "he-code",
    label: "כתיבת קוד",
    description: "ליצור או לעבד קוד",
    group: "כלים",
    icon: <Code2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("כתוב קוד שעושה: "),
  },
  {
    id: "he-diagram",
    label: "הוסף תרשים Mermaid",
    description: "להכניס תרשים זרימה לדוגמה",
    group: "כלים",
    icon: <Workflow className="h-3.5 w-3.5" />,
    onSelect: ({ insertMarkdown }) =>
      insertMarkdown(
        "```mermaid\nflowchart RL\n  התחלה --> אמצע\n  אמצע --> סיום\n```",
      ),
  },
  {
    id: "he-send",
    label: "שלח כמו שזה",
    description: "דלג על התפריט ושלח עכשיו",
    group: "פעולות",
    icon: <Zap className="h-3.5 w-3.5" />,
    onSelect: ({ submit }) => submit(),
  },
];

async function fetchMembers(query: string): Promise<MentionItem[]> {
  // Deliberately slow (3s) so the loading skeleton in the mention menu is
  // easy to see in this demo. Real apps would obviously be faster.
  await new Promise((r) => setTimeout(r, 3000));
  const q = query.toLowerCase();
  return MEMBERS.filter((m) => m.label.toLowerCase().includes(q));
}

// ─────────────────────────────────────────────────────────────────────
// Demo specs
// ─────────────────────────────────────────────────────────────────────

const offAll: ComposerFeatures = {
  attachments: false,
  voice: false,
  web: false,
  mermaid: false,
};

export const DEMOS: DemoSpec[] = [
  // — Foundations
  {
    id: "basic",
    title: "Basic",
    group: "Foundations",
    icon: <MessagesSquare className="h-4 w-4" />,
    tagline: "Minimum viable composer",
    description: (
      <>
        The minimum setup. Only <code>onSend</code> is wired — every other
        plugin is turned off. The composer is internally stateful, so your
        typing survives parent re-renders.
      </>
    ),
    tryIt: [
      "Press Enter to submit, Shift+Enter for a newline.",
      "Press ⌘/ or Ctrl+/ from anywhere to refocus the editor.",
    ],
    features: offAll,
    placeholder: "Say hi…",
    code: `import { Composer, type ComposerSubmitPayload } from "composeai";
import "composeai/composer.css";

export function MyComposer() {
  const handleSend = (payload: ComposerSubmitPayload) => {
    console.log(payload.text);
  };

  return (
    <Composer
      placeholder="Say hi…"
      onSend={handleSend}
      features={{
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
      }}
      hint="Minimum viable composer"
    />
  );
}
`,
  },

  {
    id: "compact",
    title: "Compact (default)",
    group: "Foundations",
    icon: <Minus className="h-4 w-4" />,
    tagline: "Single-line chat-bar that grows on Shift+Enter",
    description: (
      <>
        The default layout (<code>variant="compact"</code>). At rest it reads
        as a single line: <strong>+</strong> on the left, editor in the middle,
        voice mic and Send on the right. Press <kbd>Enter</kbd> /{" "}
        <kbd>Shift</kbd>+<kbd>Enter</kbd> and it reflows ChatGPT-style — the
        editor jumps to its own full-width line and the actions drop into a
        footer row beneath it. The quick actions (attach, image, web, and any
        <code>toolbarExtras</code>) live behind the <strong>+</strong> popover;
        only the voice mic floats beside Send.
      </>
    ),
    tryIt: [
      "Press Shift+Enter — the bar reflows: editor on top, + and voice·Send drop into a footer row.",
      "Delete back to one line — it collapses to the single-row resting state.",
      "Click the + button — attach, image, and web collapse into the popover; the mic stays by Send.",
    ],
    features: { mermaid: false },
    placeholder: "Message…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function CompactComposer() {
  return (
    <Composer
      // variant="compact" is the default — shown here for clarity.
      variant="compact"
      placeholder="Message…"
      onSend={(payload) => console.log(payload)}
      features={{ attachments: true, voice: true, web: true }}
    />
  );
}
`,
  },

  {
    id: "full-layout",
    title: "Classic (full)",
    group: "Foundations",
    icon: <Layers className="h-4 w-4" />,
    tagline: "Roomy editor with a full toolbar row",
    description: (
      <>
        Opt into <code>variant="full"</code> for the classic layout: a roomy
        multi-line editor area with every action button laid out in a toolbar
        row above the Send button — no <strong>+</strong> popover, voice stays
        inline. Honours <code>multiline</code> exactly as before (set{" "}
        <code>multiline=&#123;false&#125;</code> to collapse it to the inline
        pill bar).
      </>
    ),
    tryIt: [
      "Compare with the Compact demo — here the toolbar buttons are all visible at once.",
      "Type a few lines — the editor area expands vertically with the toolbar pinned below.",
    ],
    variant: "full",
    features: { mermaid: false },
    placeholder: "Write a message…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function FullComposer() {
  return (
    <Composer
      variant="full"
      placeholder="Write a message…"
      onSend={(payload) => console.log(payload)}
      features={{ attachments: true, voice: true, web: true }}
    />
  );
}
`,
  },

  {
    id: "quick-prompts",
    title: "Quick prompts",
    group: "Foundations",
    icon: <Sparkles className="h-4 w-4" />,
    tagline: "Starter chips above the composer",
    description: (
      <>
        Hand <code>&lt;Composer /&gt;</code> a list of starter prompts and it
        renders a chip row above the input. A click either fills the editor (
        <code>behavior: "initValue"</code>) so the user can keep typing, or
        fills <em>and</em> submits (<code>behavior: "sendValue"</code>,
        default) — perfect for an empty-state "what do you want to do?"
        surface. With <code>randomize: true</code> (default) the visible
        subset is shuffled on each mount, so different sessions see
        different suggestions out of a larger pool.
      </>
    ),
    tryIt: [
      "Click any chip — the prompt is sent immediately (default behavior).",
      "Refresh the page a few times — the visible 3 chips rotate from the pool of 6.",
      "Look at the console — onSelect fires with the picked prompt.",
    ],
    features: offAll,
    placeholder: "Or type your own…",
    prompts: {
      behavior: "sendValue",
      maxToShow: 3,
      randomize: true,
      items: [
        "Summarize today's stand-up",
        "Draft a release email",
        "Find bugs in this snippet",
        "Brainstorm names for my project",
        "Plan next sprint",
        "Explain useEffect to a junior dev",
      ],
      onSelect: (prompt) =>
        console.log("[quick-prompts] picked:", prompt),
    },
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function QuickPromptsComposer() {
  return (
    <Composer
      placeholder="Or type your own…"
      onSend={(payload) => console.log(payload)}
      prompts={{
        items: [
          "Summarize today's stand-up",
          "Draft a release email",
          "Find bugs in this snippet",
          "Brainstorm names for my project",
          "Plan next sprint",
          "Explain useEffect to a junior dev",
        ],
        behavior: "sendValue", // click → fill + submit (default)
        maxToShow: 3,           // show 3 of the 6 (hard-capped at 5)
        randomize: true,        // pick a different 3 on each mount
        onSelect: (prompt) => track("quick_prompt_picked", { prompt }),
      }}
      hint="Starter chips above the composer"
    />
  );
}
`,
  },

  {
    id: "plain-text",
    title: "Plain text",
    group: "Foundations",
    icon: <TypeIcon className="h-4 w-4" />,
    tagline: 'mode="text" — no markdown at all',
    description: (
      <>
        Switches the editor from rich-text to a pure plain-text input.
        Markdown styling, block shortcuts (<code># </code>, <code>- </code>,{" "}
        <code>```</code>), and mermaid previews are all disabled. Pasting
        formatted content reduces it to plain text. The serialized{" "}
        <code>markdown</code> field of <code>onSend</code> simply equals{" "}
        <code>text</code>.
      </>
    ),
    tryIt: [
      "Type **hello** — the asterisks stay literal, no bold is rendered.",
      'Start a line with "# " — no heading is created.',
      "Paste a rich snippet from a doc — only the text comes through.",
    ],
    features: offAll,
    mode: "text",
    placeholder: "Plain text only…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

// Pass mode="text" to disable markdown parsing entirely. Mentions, slash
// commands, attachments, and voice still work — they're independent of mode.
export function PlainTextComposer() {
  return (
    <Composer
      mode="text"
      placeholder="Plain text only…"
      onSend={(payload) => console.log(payload.text)}
      features={{
        attachments: false,
        voice: false,
        web: false,
      }}
      hint='mode="text" — no markdown at all'
    />
  );
}
`,
  },

  {
    id: "inline-markdown",
    title: "Inline markdown — hybrid",
    group: "Foundations",
    icon: <TypeIcon className="h-4 w-4" />,
    tagline: "Markers stay visible, styling applies live (default)",
    description: (
      <>
        Type <code>**bold**</code>, <code>*italic*</code>, <code>`code`</code>,
        <code>~~strike~~</code>, or a link like <code>[label](url)</code> —
        the markers stay visible (muted) while the inner text picks up the
        matching format. Caret traversal is natural; selection and IME
        work as you'd expect. This is the default mode (
        <code>features.markdown</code> = <code>true</code>); for the
        Notion-style "markers vanish" variant see the next demo.
      </>
    ),
    tryIt: [
      "Type **hello** and watch 'hello' go bold while the asterisks stay visible.",
      "Mix ~~deprecated~~ with `code` and *italic* in the same line.",
      "Type a link: [docs](https://igbaryya.dev).",
    ],
    features: offAll,
    placeholder: "Try **bold**, *italic*, `code`, ~~strike~~, [link](url) …",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function InlineMarkdownComposer() {
  return (
    <Composer
      placeholder="Try **bold**, *italic*, \`code\`, ~~strike~~ …"
      onSend={(payload) => {
        // payload.markdown preserves the formatting markers
        console.log(payload.markdown);
      }}
      features={{
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
      }}
      hint="Markers stay visible, styling applies live (default)"
    />
  );
}
`,
  },

  {
    id: "inline-markdown-live",
    title: "Inline markdown — live",
    group: "Foundations",
    icon: <Sparkles className="h-4 w-4" />,
    tagline: "Notion-style: markers vanish once matched",
    description: (
      <>
        Opt into <code>features.markdown.mode</code> = <code>"live"</code> to
        get the conventional WYSIWYG-ish feel: the moment you type the
        closing <code>**</code>, all four asterisks vanish and the text
        between them stays bold. Block markers (<code>#</code>, <code>##</code>,
        <code>&gt;</code>, <code>-</code>, code fences) and link syntax
        (<code>[label](url)</code>) collapse the same way — you see the
        rendered result, not the raw markdown. Backspace at the start of a
        heading or quote line clears the block style (à la Notion). The
        submit payload's <code>markdown</code> field still contains the
        full source (reconstructed from format flags + stashed markers),
        so the downstream renderer doesn't care which mode you used.
      </>
    ),
    tryIt: [
      "Type **hello** — the moment the closing ** lands, all four asterisks vanish and 'hello' stays bold.",
      "Type # Title — the # vanishes and 'Title' renders as a heading. Backspace at column 0 to clear the heading style.",
      "Type [React](https://igbaryya.dev) — only 'React' stays visible, styled as a link.",
      "Type ``` then Enter to open a code block — the fence chars vanish; the language tag (if any) shows as a small label.",
      "Send the message — payload.markdown still contains '# Title', '[React](url)', and '```', reconstructed from stashed markers.",
    ],
    features: {
      attachments: false,
      voice: false,
      web: false,
      mermaid: false,
      markdown: { mode: "live" },
    },
    placeholder: "Type **bold** — markers vanish once matched…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function LiveMarkdownComposer() {
  return (
    <Composer
      placeholder="Type **bold** — markers vanish once matched…"
      onSend={(payload) => {
        // payload.markdown is reconstructed from the format flags
        // (e.g. "Hello **world**") even though the editor never showed
        // the asterisks once they matched.
        console.log(payload.markdown);
      }}
      features={{
        markdown: { mode: "live" },
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
      }}
      hint="Notion-style: markers vanish once matched"
    />
  );
}
`,
  },

  {
    id: "block-markdown",
    title: "Block markdown",
    group: "Foundations",
    icon: <PenLine className="h-4 w-4" />,
    tagline: "# heading · > quote · - list · ``` code · ---",
    description: (
      <>
        Slack-style: every block marker is detected line-by-line and the
        paragraph receives the matching visual style — heading sizes,
        quote rule, code block tint — while the marker itself stays
        visible as a muted token. Nothing is destructively converted, so
        deleting a single character on the marker line instantly reverts
        the paragraph to plain text.
      </>
    ),
    tryIt: [
      'Type "# Heading" — the "# " stays muted, the rest is sized as h1.',
      'Type "> quote" — a left-rail and italic styling appear.',
      'Type "- item" then Enter then "- item" — Slack-style list rows.',
      'Type triple-backticks then Enter, then a few lines of code, then triple-backticks again.',
      'Type "---" on its own line for a horizontal rule.',
    ],
    features: offAll,
    placeholder: "Start a line with #, >, -, 1. or ``` …",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

// Block markers are detected per-line and styled in place — no node-type
// conversion happens, so the text content remains valid markdown source.
// onSend's payload.markdown is just what the user sees, verbatim.
export function BlockMarkdownComposer() {
  return (
    <Composer
      placeholder="Start a line with #, -, >, or \\\`\\\`\\\` …"
      onSend={(payload) => console.log(payload.markdown)}
      features={{
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
      }}
      hint="# heading · > quote · - list · \`\`\` code · ---"
    />
  );
}
`,
  },

  // — Attachments
  {
    id: "attachments",
    title: "Attachments",
    group: "Attachments",
    icon: <Paperclip className="h-4 w-4" />,
    tagline: "Paste, drop, or click the paperclip",
    description: (
      <>
        Paste a screenshot from your clipboard, drag a file from your
        desktop, or click the paperclip. The default picker accepts images,
        PDFs, text, audio, and video — that's why a single button is enough
        for most apps. Image chips can be zoomed; any chip cancels with the
        × button.
      </>
    ),
    tryIt: [
      "Take a screenshot (⌘⇧4 on macOS) and paste it here.",
      "Drag a PDF onto the composer — the box outlines in primary.",
      "Hover an image chip and click the zoom icon for the lightbox.",
    ],
    features: { ...offAll, attachments: true },
    placeholder: "Paste a screenshot or drop a file…",
    code: `import { Composer, type Attachment } from "composeai";
import "composeai/composer.css";

export function AttachmentsComposer() {
  return (
    <Composer
      placeholder="Paste a screenshot or drop a file…"
      onSend={(payload) => {
        console.log(payload.text);
        payload.attachments.forEach((a: Attachment) => {
          console.log(a.kind, a.name, a.size, a.file);
        });
      }}
      // \`attachments: true\` enables paste / drop / paperclip with sensible
      // defaults (≤ 25 MiB per file, ≤ 10 files, images+PDF+text+audio+video).
      features={{ attachments: true }}
      hint="Paste, drop, or click the paperclip"
    />
  );
}
`,
  },

  {
    id: "attachments-image-button",
    title: "Attachments + image button",
    group: "Attachments",
    icon: <ImageIcon className="h-4 w-4" />,
    tagline: "Add a dedicated camera-roll picker for mobile UX",
    description: (
      <>
        On iOS / Android, <code>accept="image/*"</code> opens the photo-roll
        picker directly — much faster than navigating the Files app. Set{" "}
        <code>{`attachments: { image: true }`}</code> to add a second button
        wired to that picker. The paperclip still accepts everything; the
        image button is purely a shortcut.
      </>
    ),
    tryIt: [
      "Click the image icon — note it forces image/* in the OS dialog.",
      "Click the paperclip — same accept string as the default demo.",
      'Try `{ file: false, image: true }` to keep ONLY the image button.',
    ],
    features: {
      ...offAll,
      attachments: { image: true },
    },
    placeholder: "Two pickers: any file, or images-only…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function AttachmentsWithImageButton() {
  return (
    <Composer
      placeholder="Two pickers: any file, or images-only…"
      onSend={(payload) => console.log(payload.attachments)}
      // Add the image-only picker alongside the paperclip. Both run
      // through the same validation pipeline.
      features={{ attachments: { image: true } }}
      hint="Add a dedicated camera-roll picker for mobile UX"
    />
  );
}
`,
  },

  {
    id: "constrained-attachments",
    title: "Constrained attachments",
    group: "Attachments",
    icon: <ImageIcon className="h-4 w-4" />,
    tagline: "Images only, max 2MB, max 3 files",
    description: (
      <>
        Same UI, but configured with <code>accept</code>, <code>maxSize</code>,
        and <code>maxCount</code>. Files outside the rules are silently
        dropped (replace with your own toast in a real app).
      </>
    ),
    tryIt: [
      "Try dropping a 5MB PDF — it'll be rejected.",
      "Try adding 5 images — only the first 3 stick.",
    ],
    features: {
      ...offAll,
      attachments: {
        accept: "image/*",
        maxSize: 2 * 1024 * 1024,
        maxCount: 3,
      },
    },
    placeholder: "Images only, ≤ 2MB, ≤ 3 files…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function ConstrainedAttachments() {
  return (
    <Composer
      placeholder="Images only, ≤ 2MB, ≤ 3 files…"
      onSend={(payload) => console.log(payload.attachments)}
      features={{
        attachments: {
          accept: "image/*",
          maxSize: 2 * 1024 * 1024, // 2MB per file
          maxCount: 3,              // up to 3 files total
        },
      }}
      hint="Images only, max 2MB, max 3 files"
    />
  );
}
`,
  },

  {
    id: "upload-first",
    title: "Upload-first (server pipeline)",
    group: "Attachments",
    icon: <Paperclip className="h-4 w-4" />,
    tagline: "Spinner while uploading, warning chip on failure",
    description: (
      <>
        Set <code>attachmentOptions.uploadFirst</code> + provide{" "}
        <code>onUpload(file)</code> and the composer wires the lifecycle for
        you: every newly-attached chip shows a spinner while your handler
        runs, flips to normal on success, or turns into a destructive
        warning chip on failure. The send button stays disabled until every
        chip resolves. This demo simulates a 1.6&nbsp;s upload and randomly
        fails ~25% of attempts so you can see both states.
      </>
    ),
    prerequisites: [
      <>
        Provide an <code>async onUpload(file)</code> that returns{" "}
        <code>true</code> for success or <code>false</code>/throws for
        failure. Network calls, S3 presigned-URL uploads, GraphQL mutations
        — anything that resolves a boolean works.
      </>,
      <>
        Hover any failed chip to see the error message; click the × to
        dismiss it and re-attach the same file to retry.
      </>,
    ],
    tryIt: [
      "Click the paperclip and add 2–3 files — the spinners appear instantly.",
      "Wait ~1.6s — most resolve, ~1 in 4 will turn red.",
      "Notice the send button stays disabled while anything is pending.",
      "Remove the failed chip — send becomes available again.",
    ],
    features: {
      ...offAll,
      attachments: true,
    },
    placeholder: "Drop files and watch them upload…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function UploadFirstComposer() {
  return (
    <Composer
      placeholder="Drop files and watch them upload…"
      features={{ attachments: true }}
      attachmentOptions={{
        uploadFirst: true,
        // Real-world: POST to your backend; return res.ok.
        // The composer hands you the same File instance back in
        // \`onSend(payload).attachments\` once the user finally submits,
        // so you can correlate by file.name / file.size if needed.
        onUpload: async (file) => {
          const res = await fetch("/api/upload", { method: "POST", body: file });
          return res.ok;
        },
      }}
      onSend={(payload) => {
        console.log("submitting", payload.text, payload.attachments);
      }}
      hint="Spinner while uploading, warning chip on failure"
    />
  );
}
`,
    renderComposer: ({ ref, onSend, placeholder }) => (
      <Composer
        ref={ref}
        autoFocus
        placeholder={placeholder}
        onSend={onSend}
        hint="Spinner while uploading, warning chip on failure"
        features={{ ...offAll, attachments: true }}
        attachmentOptions={{
          uploadFirst: true,
          onUpload: async () => {
            await new Promise((r) => setTimeout(r, 1600));
            // ~25% failure rate so the warning state is easy to demo.
            return Math.random() > 0.25;
          },
        }}
      />
    ),
  },

  {
    id: "require-text-with-attachment",
    title: "Require text with attachments",
    group: "Attachments",
    icon: <PenLine className="h-4 w-4" />,
    tagline: "canSendOnlyAttachment: false — captions mandatory",
    description: (
      <>
        Set <code>attachmentOptions.canSendOnlyAttachment</code> to{" "}
        <code>false</code> and an attachment alone no longer counts as a
        valid message — the user must write at least one character. Useful
        for surfaces where context is mandatory (support tickets, code
        review uploads, structured forms).
      </>
    ),
    tryIt: [
      "Attach an image — note the send button stays disabled.",
      "Type any character — send lights up.",
      "Clear the text — send goes back to disabled even with the image attached.",
    ],
    features: { ...offAll, attachments: true },
    attachmentOptions: {
      canSendOnlyAttachment: false,
    },
    placeholder: "Add a caption with your file…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function CaptionRequiredComposer() {
  return (
    <Composer
      placeholder="Add a caption with your file…"
      features={{ attachments: true }}
      attachmentOptions={{
        // Attachments alone aren't enough — the user must type something.
        canSendOnlyAttachment: false,
      }}
      onSend={(payload) => console.log(payload)}
      hint="canSendOnlyAttachment: false — captions mandatory"
    />
  );
}
`,
  },

  {
    id: "typed-attachments",
    title: "Typed attachments",
    group: "Attachments",
    icon: <FileText className="h-4 w-4" />,
    tagline: "Paperclip → popover → pick a format first",
    description: (
      <>
        Hand <code>attachments.types</code> a list of formats and the
        paperclip becomes a small dropdown. Clicking a row opens the OS
        file picker already scoped to that type's <code>accept</code> — so
        the user is nudged toward the format you want without you having
        to write any validation. Paste / drop still bypass the popover and
        flow through your global <code>accept</code>.
      </>
    ),
    tryIt: [
      "Click the paperclip — the type menu pops up above it.",
      "Pick PDF — the OS dialog only shows .pdf files.",
      "Press ↓/↑ to navigate the menu, Enter to choose, Esc to close.",
    ],
    features: {
      ...offAll,
      attachments: {
        types: [
          {
            id: "pdf",
            label: "PDF",
            description: ".pdf",
            accept: ".pdf,application/pdf",
            icon: <FileText className="h-3.5 w-3.5" />,
          },
          {
            id: "word",
            label: "Word",
            description: ".docx, .doc",
            accept:
              ".docx,.doc,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            icon: <FileText className="h-3.5 w-3.5" />,
          },
          {
            id: "image",
            label: "Image",
            description: "PNG, JPG, …",
            accept: "image/*",
            icon: <ImageIcon className="h-3.5 w-3.5" />,
          },
          {
            id: "audio",
            label: "Audio",
            description: "MP3, WAV, …",
            accept: "audio/*",
            icon: <Mic className="h-3.5 w-3.5" />,
          },
        ],
      },
    },
    placeholder: "Click the paperclip to pick a format…",
    code: `import { Composer } from "composeai";
import { FileText, Image, Mic } from "lucide-react";
import "composeai/composer.css";

export function TypedAttachments() {
  return (
    <Composer
      placeholder="Click the paperclip to pick a format…"
      onSend={(payload) => console.log(payload.attachments)}
      features={{
        attachments: {
          // Supplying \`types\` flips the paperclip into a popover.
          // Without \`types\` (or with []), the paperclip behaves as
          // a single-click button — its default behavior.
          types: [
            {
              id: "pdf",
              label: "PDF",
              description: ".pdf",
              accept: ".pdf,application/pdf",
              icon: <FileText className="h-3.5 w-3.5" />,
            },
            {
              id: "word",
              label: "Word",
              description: ".docx, .doc",
              accept: ".docx,.doc",
              icon: <FileText className="h-3.5 w-3.5" />,
            },
            {
              id: "image",
              label: "Image",
              description: "PNG, JPG, …",
              accept: "image/*",
              icon: <Image className="h-3.5 w-3.5" />,
            },
            {
              id: "audio",
              label: "Audio",
              description: "MP3, WAV, …",
              accept: "audio/*",
              icon: <Mic className="h-3.5 w-3.5" />,
            },
          ],
        },
      }}
      hint="Paperclip → popover → pick a format first"
    />
  );
}
`,
  },

  // — Smart triggers
  {
    id: "mentions",
    title: "Mentions",
    group: "Smart triggers",
    icon: <Sparkles className="h-4 w-4" />,
    tagline: "Atomic @ chips",
    description: (
      <>
        Type <code>@</code> and a few letters to filter teammates. Selecting
        an item inserts an atomic chip — one backspace removes the whole
        mention.
      </>
    ),
    tryIt: [
      "Type @ then ‘al’ to find Alex.",
      "Backspace once over the chip and watch it disappear.",
      "Chain multiple mentions: @ali @ber @car",
    ],
    features: { ...offAll, mentions: { items: MEMBERS } },
    placeholder: "Type @ to mention a teammate…",
    code: `import { Composer, type MentionItem } from "composeai";
import "composeai/composer.css";

const MEMBERS: MentionItem[] = [
  { id: "u1", label: "Alex Carter",   description: "Design Lead" },
  { id: "u2", label: "Beatrice Wong", description: "Frontend Engineer" },
  { id: "u3", label: "Carlos Diaz",   description: "Product Manager" },
];

export function MentionsComposer() {
  return (
    <Composer
      placeholder="Type @ to mention a teammate…"
      onSend={(payload) => {
        // payload.mentions: [{ id, label }]
        console.log(payload.mentions);
      }}
      features={{ mentions: { items: MEMBERS } }}
      hint="Atomic @ chips"
    />
  );
}
`,
  },

  {
    id: "async-mentions",
    title: "Async mentions",
    group: "Smart triggers",
    icon: <Sparkles className="h-4 w-4" />,
    tagline: "Items fetched per query",
    description: (
      <>
        Same as Mentions but the items array is a function that returns a{" "}
        <code>Promise</code>. We simulate 250ms latency to demonstrate the
        loading behavior.
      </>
    ),
    tryIt: [
      "Type @ — items appear after a small delay.",
      "Keep typing to refine the query; results update live.",
    ],
    features: { ...offAll, mentions: { items: fetchMembers } },
    placeholder: "Type @ — items load async…",
    code: `import { Composer, type MentionItem } from "composeai";
import "composeai/composer.css";

async function fetchMembers(query: string): Promise<MentionItem[]> {
  const res = await fetch(\`/api/members?q=\${encodeURIComponent(query)}\`);
  return res.json();
}

export function AsyncMentionsComposer() {
  return (
    <Composer
      placeholder="Type @ — items load async…"
      onSend={(payload) => console.log(payload.mentions)}
      features={{ mentions: { items: fetchMembers } }}
      hint="Items fetched per query"
    />
  );
}
`,
  },

  {
    id: "channel-mentions",
    title: "Channel mentions",
    group: "Smart triggers",
    icon: <Hash className="h-4 w-4" />,
    tagline: "Custom # trigger",
    description: (
      <>
        Override the trigger character with <code>trigger: "#"</code> to
        surface a different list (channels) without changing any logic.
      </>
    ),
    tryIt: ["Type # then ‘eng’ to find #engineering."],
    features: {
      ...offAll,
      mentions: { trigger: "#", items: CHANNELS },
    },
    placeholder: "Type # to link a channel…",
    code: `import { Composer, type MentionItem } from "composeai";
import "composeai/composer.css";

const CHANNELS: MentionItem[] = [
  { id: "c1", label: "general",     description: "Team-wide chat" },
  { id: "c2", label: "engineering", description: "Builds, deploys, incidents" },
  { id: "c3", label: "design-crit", description: "Weekly design crits" },
];

export function ChannelMentionsComposer() {
  return (
    <Composer
      placeholder="Type # to link a channel…"
      onSend={(payload) => console.log(payload.mentions)}
      features={{
        mentions: { trigger: "#", items: CHANNELS },
      }}
      hint="Custom # trigger"
    />
  );
}
`,
  },

  {
    id: "slash",
    title: "Slash commands",
    group: "Smart triggers",
    icon: <Zap className="h-4 w-4" />,
    tagline: "Type / for a command menu",
    description: (
      <>
        Caret-anchored typeahead. Arrow keys + Enter, or click. Commands can
        insert text, insert raw markdown (e.g. a mermaid block), or even
        submit the composer directly.
      </>
    ),
    tryIt: [
      "Type / to open the menu.",
      "Filter by typing — try /sum, /img, /diag.",
      "Pick ‘Insert mermaid diagram’ to drop in a fenced block.",
    ],
    features: { ...offAll, slashCommands: { items: SLASH } },
    placeholder: "Type / to open the menu…",
    code: `import { Composer, type SlashCommand } from "composeai";
import { Sparkles, Wand2, Workflow } from "lucide-react";
import "composeai/composer.css";

const SLASH: SlashCommand[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "Summarize the conversation so far",
    group: "AI",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Please summarize the above."),
  },
  {
    id: "improve",
    label: "Improve writing",
    icon: <Wand2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Improve this writing: "),
  },
  {
    id: "diagram",
    label: "Insert mermaid diagram",
    icon: <Workflow className="h-3.5 w-3.5" />,
    onSelect: ({ insertMarkdown }) =>
      insertMarkdown("\\\`\\\`\\\`mermaid\\nflowchart LR\\n  A --> B\\n\\\`\\\`\\\`"),
  },
];

export function SlashComposer() {
  return (
    <Composer
      placeholder="Type / to open the menu…"
      onSend={(payload) => console.log(payload)}
      features={{ slashCommands: { items: SLASH } }}
      hint="Type / for a command menu"
    />
  );
}
`,
  },

  {
    id: "help-commands",
    title: "Help (?) commands",
    group: "Smart triggers",
    icon: <Lightbulb className="h-4 w-4" />,
    tagline: "Custom ? trigger",
    description: (
      <>
        Same plugin, different trigger. Set <code>trigger: "?"</code> to
        surface help, ergonomics or app-specific commands without conflicting
        with the regular slash menu.
      </>
    ),
    tryIt: ["Type ? to open the help menu."],
    features: {
      ...offAll,
      slashCommands: { trigger: "?", items: HELP_COMMANDS },
    },
    placeholder: "Type ? to open the help menu…",
    code: `import { Composer, type SlashCommand } from "composeai";
import { Lightbulb, Zap } from "lucide-react";
import "composeai/composer.css";

const HELP_COMMANDS: SlashCommand[] = [
  {
    id: "help",
    label: "Show help",
    description: "Open the help center",
    icon: <Lightbulb className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("[help requested]"),
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    icon: <Zap className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Show me the shortcuts."),
  },
];

export function HelpCommandsComposer() {
  return (
    <Composer
      placeholder="Type ? to open the help menu…"
      onSend={(payload) => console.log(payload)}
      features={{
        slashCommands: { trigger: "?", items: HELP_COMMANDS },
      }}
      hint="Custom ? trigger"
    />
  );
}
`,
  },

  {
    id: "ghosted-autocomplete",
    title: "Ghosted autocomplete",
    group: "Smart triggers",
    icon: <PenLine className="h-4 w-4" />,
    tagline: "Inline ghost-text from a fixed suggestion list",
    description: (
      <>
        Hand <code>&lt;Composer /&gt;</code> a list of likely sentences and
        it will inline-suggest the rest as soon as the user's typed prefix
        matches one. The remainder renders in a muted style right after
        the caret — think shell autocomplete or iOS QuickType. Pressing{" "}
        <kbd>Tab</kbd> accepts the suggestion, Escape (or typing something
        else) dismisses it. The feature only fires when the caret is at
        the end of the document, so editing in the middle of an existing
        draft never triggers a phantom ghost.
      </>
    ),
    tryIt: [
      "Start typing 'My cat' — 'is playing' appears as ghost text after the caret.",
      "Press Tab to accept the suggestion.",
      "Try 'Hello' or 'Translate' — each gets its own completion.",
      "Press Escape mid-suggestion to dismiss the ghost without accepting it.",
    ],
    features: {
      ...offAll,
      ghostedAutoComplete: [
        "My cat is playing",
        "Hello world, how are you today?",
        "Translate this to English",
        "Summarize the meeting notes",
      ],
    },
    placeholder: "Try typing 'My cat'…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

// Pass an array of likely completions. The first whose prefix matches
// the editor's current text wins, so order by priority / likelihood.
export function GhostedAutoCompleteComposer() {
  return (
    <Composer
      placeholder="Try typing 'My cat'…"
      onSend={(payload) => console.log(payload.text)}
      features={{
        ghostedAutoComplete: [
          "My cat is playing",
          "Hello world, how are you today?",
          "Translate this to English",
          "Summarize the meeting notes",
        ],
      }}
      hint="Inline ghost-text from a fixed suggestion list"
    />
  );
}

// Full config — opt into case-sensitive matching and require the user
// to type at least 2 chars before any ghost is shown.
export function GhostedAutoCompleteStrict() {
  return (
    <Composer
      placeholder="Start typing…"
      onSend={(payload) => console.log(payload.text)}
      features={{
        ghostedAutoComplete: {
          suggestions: ["SELECT * FROM users", "SELECT id FROM orders"],
          caseSensitive: true,
          minLength: 2,
        },
      }}
    />
  );
}
`,
  },

  // — Rich
  {
    id: "mermaid",
    title: "Mermaid diagrams",
    group: "Rich",
    icon: <Workflow className="h-4 w-4" />,
    tagline: "Live preview of ```mermaid fences",
    description: (
      <>
        Open a ``` <code>mermaid</code> fence and a sparkle button appears
        beside the <strong>+</strong> — press it to pop the rendered diagram
        open (the compact bar stays uncluttered until you ask for the preview).
        The mermaid library is dynamic-imported on first sighting so it never
        ships in the baseline bundle. Markdown styling still works around the
        fence — type <code>**bold**</code> and you see Slack-style bold while
        the mermaid source stays put.
      </>
    ),
    prerequisites: [
      <>
        Install the optional peer dependency in your app:{" "}
        <code className="rounded bg-amber-500/15 px-1 font-mono">
          npm install mermaid
        </code>
        . The composer dynamic-imports it on first sighting, so it stays out
        of your baseline bundle.
      </>,
      <>
        Prefer your own renderer? Skip the install and pass{" "}
        <code className="rounded bg-amber-500/15 px-1 font-mono">
          renderDiagram={"{({ code }) => <YourDiagram src={code} />}"}
        </code>{" "}
        on <code>&lt;Composer /&gt;</code> — every detected fence is routed
        to your callback.
      </>,
    ],
    tryIt: [
      "Press the sparkle button beside the + to pop the diagram preview open.",
      "Edit the seeded diagram and watch the SVG re-render.",
      "Below the fence, type **bold** — markers stay, ‘bold’ goes bold.",
      "Click the tile to open the lightbox.",
    ],
    features: { ...offAll, mermaid: true },
    variant: "compact",
    placeholder: "Try ```mermaid …",
    initialValue:
      "```mermaid\nflowchart LR\n  Idea --> Draft\n  Draft --> Review\n  Review --> Ship\n```",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

const SEED = [
  "\\\`\\\`\\\`mermaid",
  "flowchart LR",
  "  Idea --> Draft",
  "  Draft --> Review",
  "  Review --> Ship",
  "\\\`\\\`\\\`",
].join("\\n");

export function MermaidComposer() {
  return (
    <Composer
      placeholder="Try \\\`\\\`\\\`mermaid …"
      initialValue={SEED}
      onSend={(payload) => console.log(payload.markdown)}
      // \`mermaid: true\` is shorthand for \`{ keepSource: true }\` — the
      // raw fence stays visible alongside the rendered diagram.
      features={{ mermaid: true }}
      hint="Live preview of \`\`\`mermaid fences"
    />
  );
}
`,
  },

  {
    id: "mermaid-preview-only",
    title: "Mermaid (preview only)",
    group: "Rich",
    icon: <Workflow className="h-4 w-4" />,
    tagline: "keepSource: false — hide the fence",
    description: (
      <>
        Same plugin, configured with{" "}
        <code>{`{ mermaid: { keepSource: false } }`}</code>. The raw
        ``` <code>mermaid</code> fence is visually hidden once it parses —
        the user only sees the rendered diagram. The source still lives in
        the editor state, so it's part of the serialized{" "}
        <code>markdown</code> payload on submit.
      </>
    ),
    prerequisites: [
      <>
        Install the optional peer dependency:{" "}
        <code className="rounded bg-amber-500/15 px-1 font-mono">
          npm install mermaid
        </code>
        . Or pass a <code>renderDiagram</code> prop to use your own diagram
        renderer instead.
      </>,
    ],
    tryIt: [
      "Notice the seeded fence is hidden — only the diagram tile shows.",
      "Type some text below — it appears as normal text in the editor.",
      "Submit and inspect the payload — the mermaid source is still there.",
    ],
    features: { ...offAll, mermaid: { keepSource: false } },
    variant: "full",
    placeholder: "The mermaid fence above is hidden…",
    initialValue:
      "```mermaid\nflowchart LR\n  Plan --> Build --> Ship\n```\n\nAdd a note next to the diagram and submit.",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

const SEED = [
  "\\\`\\\`\\\`mermaid",
  "flowchart LR",
  "  Plan --> Build --> Ship",
  "\\\`\\\`\\\`",
  "",
  "Add a note next to the diagram and submit.",
].join("\\n");

export function PreviewOnlyMermaid() {
  return (
    <Composer
      placeholder="The mermaid fence above is hidden…"
      initialValue={SEED}
      onSend={(payload) => {
        // The raw fence is still in payload.markdown — only its visual
        // representation in the editor is hidden.
        console.log(payload.markdown);
      }}
      features={{ mermaid: { keepSource: false } }}
      hint="keepSource: false — hide the fence"
    />
  );
}
`,
  },

  {
    id: "voice",
    title: "Voice input",
    group: "Rich",
    icon: <Mic className="h-4 w-4" />,
    tagline: "Speech → text, with mic-fallback",
    description: (
      <>
        Click the mic. Web Speech API transcribes live where available; on
        unsupported browsers the recording becomes an audio attachment
        instead. Requires HTTPS or <code>localhost</code>.
      </>
    ),
    prerequisites: [
      <>
        Served over <code>https://</code> or <code>localhost</code> — the
        browser blocks <code>getUserMedia()</code> and the Web Speech API on
        plain HTTP origins.
      </>,
      <>
        Grant microphone permission when the browser prompts on first use.
      </>,
      <>
        Live transcription works in Chromium (Chrome, Edge, Arc, Brave) and
        Safari. Firefox falls back to recording an audio attachment.
      </>,
    ],
    tryIt: [
      "Press the mic — see the elapsed timer.",
      "Speak a short phrase, then press the mic again to stop.",
    ],
    features: { ...offAll, voice: true },
    placeholder: "Press the mic and start speaking…",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

// Requires HTTPS or localhost. On browsers without the Web Speech API the
// recording is captured as an audio attachment instead.
export function VoiceComposer() {
  return (
    <Composer
      placeholder="Press the mic and start speaking…"
      onSend={(payload) => console.log(payload)}
      features={{ voice: true }}
      hint="Speech → text, with mic-fallback"
    />
  );
}
`,
  },

  // — Control
  {
    id: "initial-draft",
    title: "Initial draft",
    group: "Control",
    icon: <FileText className="h-4 w-4" />,
    tagline: "Seed the editor on mount",
    description: (
      <>
        Pass <code>initialValue</code> to restore a draft. Used by apps that
        persist unsent text across navigations.
      </>
    ),
    tryIt: ["Edit the seeded draft and submit."],
    features: offAll,
    placeholder: "",
    initialValue:
      "Quick draft — I started this earlier and want to keep going from here…",
    code: `import { useEffect, useState } from "react";
import { Composer } from "composeai";
import "composeai/composer.css";

export function DraftComposer() {
  const [draft, setDraft] = useState<string | null>(null);

  // Restore from localStorage on mount.
  useEffect(() => {
    setDraft(window.localStorage.getItem("draft") ?? "");
  }, []);

  if (draft === null) return null;

  return (
    <Composer
      initialValue={draft}
      onSend={(payload) => {
        window.localStorage.removeItem("draft");
        console.log(payload);
      }}
      hint="Seed the editor on mount"
    />
  );
}
`,
  },

  {
    id: "custom-hint",
    title: "Custom hint",
    group: "Control",
    icon: <Sliders className="h-4 w-4" />,
    tagline: "Replace the helper line under the composer",
    description: (
      <>
        The <code>hint</code> prop accepts any ReactNode — or set it to{" "}
        <code>false</code> to hide it. Useful for legal copy, model labels,
        or status indicators.
      </>
    ),
    tryIt: ["Look just below the composer."],
    features: offAll,
    placeholder: "Hint below is custom…",
    hint: (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        <Sparkles className="h-3 w-3" />
        All responses are encrypted end-to-end.
      </span>
    ),
    code: `import { Composer } from "composeai";
import { Sparkles } from "lucide-react";
import "composeai/composer.css";

export function HintComposer() {
  return (
    <Composer
      placeholder="Hint below is custom…"
      onSend={(payload) => console.log(payload)}
      hint={
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <Sparkles className="h-3 w-3" />
          All responses are encrypted end-to-end.
        </span>
      }
    />
  );
}
`,
  },

  {
    id: "toolbar-extras",
    title: "Toolbar extras",
    group: "Control",
    icon: <Sliders className="h-4 w-4" />,
    tagline: "Slot custom controls into the toolbar",
    description: (
      <>
        Pass any node via <code>toolbarExtras</code> and it renders after the
        built-in icons. Great for a model picker, persona switcher, or
        feature flag toggle.
      </>
    ),
    tryIt: ["Use the model picker in the toolbar."],
    features: offAll,
    placeholder: "Notice the model picker in the toolbar…",
    toolbarExtras: (
      <div className="ml-1 flex items-center gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Model
        </span>
        <select
          defaultValue="GPT-4o"
          className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
        >
          <option>GPT-4o</option>
          <option>Claude Opus</option>
          <option>Llama 3</option>
        </select>
      </div>
    ),
    code: `import { useState } from "react";
import { Composer } from "composeai";
import "composeai/composer.css";

export function ModelPickerComposer() {
  const [model, setModel] = useState("GPT-4o");

  return (
    <Composer
      placeholder="Notice the model picker in the toolbar…"
      onSend={(payload) => {
        console.log({ model, text: payload.text });
      }}
      toolbarExtras={
        <div className="ml-1 flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Model
          </span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-7 rounded-md border bg-background px-1.5 text-xs"
          >
            <option>GPT-4o</option>
            <option>Claude Opus</option>
            <option>Llama 3</option>
          </select>
        </div>
      }
      hint="Slot custom controls into the toolbar"
    />
  );
}
`,
  },

  {
    id: "imperative",
    title: "Imperative ref",
    group: "Control",
    icon: <Layers className="h-4 w-4" />,
    tagline: ".focus / .clear / .insert / .submit",
    description: (
      <>
        Hold a <code>ComposerHandle</code> ref and drive the editor from
        outside. Useful for suggestion buttons, voice triggers, or remote
        bot replies that need to fill the input.
      </>
    ),
    tryIt: [
      "Click ‘Insert text’ to push a snippet into the editor.",
      "Click ‘Clear’ to wipe, then ‘Focus’ to land the cursor.",
      "Click ‘Submit’ to send whatever's typed.",
    ],
    features: offAll,
    placeholder: "Controlled by the buttons above…",
    extraAboveComposer: ({ ref }) => (
      <div className="mb-2 flex flex-wrap gap-2">
        <ToolbarButton onClick={() => ref.current?.focus()}>
          Focus
        </ToolbarButton>
        <ToolbarButton
          onClick={() => ref.current?.insert("Hello from outside! ")}
        >
          Insert text
        </ToolbarButton>
        <ToolbarButton onClick={() => ref.current?.clear()}>
          Clear
        </ToolbarButton>
        <ToolbarButton primary onClick={() => ref.current?.submit()}>
          Submit
        </ToolbarButton>
      </div>
    ),
    code: `import { useRef } from "react";
import { Composer, type ComposerHandle } from "composeai";
import "composeai/composer.css";

export function ImperativeComposer() {
  const ref = useRef<ComposerHandle>(null);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button onClick={() => ref.current?.focus()}>Focus</button>
        <button onClick={() => ref.current?.insert("Hello from outside! ")}>
          Insert text
        </button>
        <button onClick={() => ref.current?.clear()}>Clear</button>
        <button onClick={() => ref.current?.submit()}>Submit</button>
      </div>

      <Composer
        ref={ref}
        placeholder="Controlled by the buttons above…"
        onSend={(payload) => console.log(payload)}
        hint=".focus / .clear / .insert / .submit"
      />
    </div>
  );
}
`,
  },

  // — Submit behavior
  {
    id: "smart-newline",
    title: "List continuation",
    group: "Submit behavior",
    icon: <CornerDownLeft className="h-4 w-4" />,
    tagline: "Enter sends; lists & code keep their structural Enter",
    description: (
      <>
        <kbd>Enter</kbd> sends — always, whether the draft is one line or
        twenty. <kbd>Shift + Enter</kbd> is the newline gesture for prose.
        The only places plain <kbd>Enter</kbd> inserts a line instead of
        sending are the structural ones:
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-foreground/80">
          <li>
            <b>Inside a markdown list</b> (<code>- </code>, <code>* </code>,{" "}
            <code>+ </code>, or <code>1. </code>) — with{" "}
            <code>smartNewline</code> on (the default), <kbd>Enter</kbd>{" "}
            continues the list with the next marker (numbers auto-increment),
            and <kbd>Enter</kbd> on an empty item exits the list. The next
            <kbd>Enter</kbd> on that plain line sends.
          </li>
          <li>
            <b>Inside a code fence</b> (<code>```</code>) — <kbd>Enter</kbd>{" "}
            adds another code line.
          </li>
        </ul>
      </>
    ),
    tryIt: [
      "Type a few lines with Shift+Enter, then press Enter — it sends (no more getting stuck on Cmd+Enter).",
      'Start a line with "- " and a few words, press Enter — a new bullet appears. Press Enter on the empty bullet — the list ends.',
      'Start a line with "1. " and a few items, press Enter — the next number auto-increments.',
      "Open a ``` fence and press Enter — you get a new code line, not a send.",
    ],
    features: offAll,
    placeholder: 'Enter sends · Shift+Enter for a newline · try "- " or "1. "…',
    smartNewline: true,
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

// Enter always sends; Shift+Enter adds a newline. smartNewline (default true)
// only affects markdown lists: Enter continues the list, and Enter on an
// empty item exits it. Code fences keep their own "Enter = new code line".
export function ListContinuationComposer() {
  return (
    <Composer
      placeholder='Enter sends · Shift+Enter for newline · try "- " or "1. "…'
      onSend={(payload) => console.log(payload.text)}
      multiline
      submitOnEnter
      smartNewline
      hint="Enter sends; lists & code keep their structural Enter"
    />
  );
}
`,
  },

  {
    id: "single-line",
    title: "Single line only",
    group: "Submit behavior",
    icon: <Minus className="h-4 w-4" />,
    tagline: "multiline={false} — strictly one line of input",
    description: (
      <>
        Pass <code>multiline={`{false}`}</code> to lock the editor to a single
        line. The card automatically collapses into a compact horizontal bar:
        toolbar on the left, editor in the middle, send button on the right,
        and a fully-pill corner radius.{" "}
        <kbd>Enter</kbd> always submits, <kbd>Shift + Enter</kbd> is
        suppressed, multi-line paste is flattened to a single line, and{" "}
        <code>smartNewline</code> becomes a no-op. Perfect for command bars,
        inline search, or compact reply boxes.
      </>
    ),
    tryIt: [
      "Press Enter — the message sends immediately.",
      "Press Shift+Enter — nothing happens; the input stays on one line.",
      "Paste a multi-line snippet — line breaks are flattened to spaces.",
      "Type a long string — the editor scrolls horizontally instead of wrapping.",
    ],
    features: {
      attachments: true,
      voice: false,
      web: false,
      mermaid: false,
    },
    placeholder: "Type a command and press Enter…",
    multiline: false,
    hint: false,
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function SingleLineComposer() {
  return (
    <Composer
      placeholder="Type a command and press Enter…"
      onSend={(payload) => console.log(payload.text)}
      multiline={false}
      hint={false}
      features={{ attachments: true, voice: false, web: false, mermaid: false }}
    />
  );
}
`,
  },

  {
    id: "mod-enter-only",
    title: "Mod+Enter to send",
    group: "Submit behavior",
    icon: <CornerDownLeft className="h-4 w-4" />,
    tagline: "submitOnEnter={false} — Enter always inserts a newline",
    description: (
      <>
        Set <code>submitOnEnter={`{false}`}</code> to take Enter out of the
        submit path entirely. Plain <kbd>Enter</kbd> always inserts a newline;
        the only ways to send are <kbd>⌘/Ctrl + Enter</kbd>, the Send button,
        or an imperative <code>ref.submit()</code>. Great for editor-style
        surfaces where Enter should feel like a text-area key.
      </>
    ),
    tryIt: [
      "Press Enter — a newline is inserted, the draft stays put.",
      "Press ⌘/Ctrl + Enter to send.",
    ],
    features: offAll,
    placeholder: "Enter for newline · ⌘/Ctrl+Enter to send…",
    submitOnEnter: false,
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function ModEnterComposer() {
  return (
    <Composer
      placeholder="Enter for newline · ⌘/Ctrl+Enter to send…"
      onSend={(payload) => console.log(payload.text)}
      submitOnEnter={false}
      hint="submitOnEnter={false} — Enter always inserts a newline"
    />
  );
}
`,
  },

  // — Focus
  {
    id: "autofocus-on-mount",
    title: "Autofocus on mount",
    group: "Focus",
    icon: <Focus className="h-4 w-4" />,
    tagline: "autoFocus={true} grabs the caret as the page renders",
    description: (
      <>
        Pass <code>autoFocus</code> to drop the caret inside the editor the
        moment the composer mounts. Ideal for surfaces where typing IS the
        primary action — the new-message page of a chat app, a dedicated
        compose modal, a command palette. Defaults to <code>false</code> so
        the composer never steals focus from the host application by
        accident.
      </>
    ),
    tryIt: [
      "Switch to this demo — the placeholder is already gone and you can type immediately.",
      "Refresh the page on this demo — focus lands in the editor without a click.",
    ],
    features: offAll,
    placeholder: "I'm already focused — start typing…",
    autoFocus: true,
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function AutoFocusComposer() {
  return (
    <Composer
      placeholder="I'm already focused — start typing…"
      onSend={(payload) => console.log(payload.text)}
      // Pull focus on mount. Pair with /compose-style routes.
      autoFocus
      hint="autoFocus={true} grabs the caret as the page renders"
    />
  );
}
`,
  },

  {
    id: "refocus-on-submit",
    title: "Refocus after send",
    group: "Focus",
    icon: <MousePointerClick className="h-4 w-4" />,
    tagline: "refocusOnSubmit keeps the caret inside on Send-button clicks",
    description: (
      <>
        With <code>refocusOnSubmit</code> on (the default), focus is
        returned to the editor after every successful send. Keyboard sends
        (<kbd>Enter</kbd>, <kbd>⌘/Ctrl + Enter</kbd>) always kept focus
        naturally, but a <i>click</i> on the Send button, a{" "}
        <code>sendValue</code> quick-prompt, or an imperative{" "}
        <code>ref.submit()</code> would otherwise leave the caret on the
        button — so the user has to click back into the editor before
        typing the next message. Flip to <code>false</code> when your UX
        moves focus elsewhere on send (e.g. a confirmation toast that owns
        the keyboard).
      </>
    ),
    tryIt: [
      "Type a message, then CLICK the send button — caret stays in the editor.",
      "Press Enter — same result (this part always worked).",
      "Re-type and send again — no extra clicks needed.",
    ],
    features: offAll,
    placeholder: "Click the send button, then keep typing…",
    // Disable App.tsx's mount-time convenience focus so the demo cleanly
    // attributes the post-send focus you see to `refocusOnSubmit` alone.
    autoFocus: false,
    refocusOnSubmit: true,
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function RefocusOnSubmitComposer() {
  return (
    <Composer
      placeholder="Click the send button, then keep typing…"
      onSend={(payload) => console.log(payload.text)}
      // Default true. Set false if a post-send toast / modal owns focus.
      refocusOnSubmit
      hint="refocusOnSubmit keeps the caret inside on Send-button clicks"
    />
  );
}
`,
  },

  {
    id: "focus-shortcut-default",
    title: "Focus shortcut: ⌘/Ctrl + /",
    group: "Focus",
    icon: <Keyboard className="h-4 w-4" />,
    tagline: 'focusShortcut="mod+/" — global hotkey to jump back to the composer',
    description: (
      <>
        <code>focusShortcut</code> registers a window-level keyboard combo
        that focuses the composer from anywhere on the page. Defaults to{" "}
        <code>"mod+/"</code>, where <code>mod</code> is <kbd>⌘</kbd> on
        macOS and <kbd>Ctrl</kbd> on Windows/Linux. The listener is strict
        about modifiers (a <kbd>Cmd+Shift+/</kbd> press will <i>not</i>{" "}
        trigger a <code>mod+/</code> shortcut), respects{" "}
        <code>event.defaultPrevented</code> so popovers / menus win the
        same combo, and is opt-out via <code>focusShortcut={`{false}`}</code>.
      </>
    ),
    tryIt: [
      "Click anywhere outside the composer (the sidebar, a description card).",
      "Press ⌘/Ctrl + / — the editor pulls focus.",
      "Type a few characters to confirm.",
    ],
    features: offAll,
    placeholder: "Press ⌘/Ctrl + / from anywhere to focus me…",
    // Opt out of the demo app's default mount-focus so the shortcut is
    // the only way into the editor — that's the whole point of the demo.
    autoFocus: false,
    focusShortcut: "mod+/",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function FocusShortcutComposer() {
  return (
    <Composer
      placeholder="Press ⌘/Ctrl + / from anywhere to focus me…"
      onSend={(payload) => console.log(payload.text)}
      // Default value shown. "mod" = ⌘ on macOS, Ctrl elsewhere.
      focusShortcut="mod+/"
      hint='focusShortcut="mod+/" — global hotkey to jump back to the composer'
    />
  );
}
`,
  },

  {
    id: "focus-shortcut-custom",
    title: "Custom shortcut: ⌘/Ctrl + G",
    group: "Focus",
    icon: <Crosshair className="h-4 w-4" />,
    tagline: 'focusShortcut="mod+g" — any combo you want',
    description: (
      <>
        Any combination of <code>mod / cmd / meta / ctrl / alt / option /
        shift</code> plus a key works. Common picks:
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-foreground/80">
          <li>
            <code>"mod+g"</code> — a quiet combo with no major browser /
            OS conflict (this demo).
          </li>
          <li>
            <code>"shift+mod+/"</code> — paired with the default to switch
            between a help overlay and the composer.
          </li>
          <li>
            <code>"alt+l"</code> — modifier-only shortcuts that don't clash
            with browser defaults.
          </li>
        </ul>
        <code>mod</code> always resolves to the platform-correct modifier,
        so you only need to think about the key. (Avoid <code>"mod+k"</code>
        in this demo — the sidebar itself uses it for search, which would
        win the key event.)
      </>
    ),
    tryIt: [
      "Click outside the composer, then press ⌘/Ctrl + G — the editor focuses.",
      "Try ⌘/Ctrl + Shift + G — it does NOT fire (strict modifier matching).",
    ],
    features: offAll,
    placeholder: "Press ⌘/Ctrl + G from anywhere to focus me…",
    autoFocus: false,
    focusShortcut: "mod+g",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function CustomShortcutComposer() {
  return (
    <Composer
      placeholder="Press ⌘/Ctrl + G from anywhere to focus me…"
      onSend={(payload) => console.log(payload.text)}
      focusShortcut="mod+g"
      hint='focusShortcut="mod+g" — any combo you want'
    />
  );
}
`,
  },

  {
    id: "focus-manual",
    title: "Manual focus only",
    group: "Focus",
    icon: <Hash className="h-4 w-4" />,
    tagline: "Opt out of every focus automation",
    description: (
      <>
        For surfaces where the composer should never steal focus — embedded
        widgets, comment threads on a long document, secondary inputs on a
        dashboard — turn all three focus props off:
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-foreground/80">
          <li>
            <code>autoFocus={`{false}`}</code> (default) — no mount-time
            focus.
          </li>
          <li>
            <code>refocusOnSubmit={`{false}`}</code> — Send-button clicks
            leave focus on the button, matching plain HTML form behavior.
          </li>
          <li>
            <code>focusShortcut={`{false}`}</code> — no global keyboard
            shortcut is registered on <code>window</code>.
          </li>
        </ul>
        The editor is still fully usable; the user just has to click into
        it on their own. Use <code>ref.focus()</code> if you need to focus
        it programmatically.
      </>
    ),
    tryIt: [
      "Click the demo card — focus does NOT auto-land in the editor.",
      "Press ⌘/Ctrl + / — nothing happens.",
      "Type a message and click Send — focus moves to the Send button (then back to body).",
    ],
    features: offAll,
    placeholder: "Click here to focus me…",
    autoFocus: false,
    refocusOnSubmit: false,
    focusShortcut: false,
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function ManualFocusComposer() {
  return (
    <Composer
      placeholder="Click here to focus me…"
      onSend={(payload) => console.log(payload.text)}
      // All three default *enabled* (autoFocus is false but the other two
      // are true). Set them all off to fully opt out of focus automation.
      autoFocus={false}
      refocusOnSubmit={false}
      focusShortcut={false}
      hint="Opt out of every focus automation"
    />
  );
}
`,
  },

  // — Custom design
  {
    id: "theme-tokens",
    title: "Themed (tokens)",
    group: "Custom design",
    icon: <Palette className="h-4 w-4" />,
    tagline: "Recolour every surface with one prop",
    description: (
      <>
        Pass <code>tokens</code> to override the CSS custom properties the
        composer reads — <code>--primary</code>, <code>--card</code>,{" "}
        <code>--border</code>, <code>--radius</code>, and friends. The tokens
        are inlined on the composer root, so they affect this composer only;
        your app's global theme is untouched. Color values are HSL components
        (<code>"258 90% 62%"</code>) so they compose with opacities the same
        way the built-in theme does.
      </>
    ),
    tryIt: [
      "Notice the focus glow, send button, and Web pill all picked up the violet palette.",
      "Open the slash menu (/) — even the popover background and selected row follow the tokens.",
      "Hover the toolbar buttons — the accent token drives the hover bg.",
    ],
    features: {
      attachments: true,
      voice: false,
      web: true,
      mermaid: false,
      mentions: { items: MEMBERS },
      slashCommands: { items: SLASH },
    },
    placeholder: "Themed via tokens — try /, @, or just type…",
    tokens: {
      primary: "270 91% 65%",
      primaryForeground: "270 25% 98%",
      accent: "270 60% 96%",
      accentForeground: "270 80% 35%",
      card: "270 50% 99%",
      border: "270 30% 90%",
      muted: "270 30% 96%",
      mutedForeground: "270 15% 45%",
      ring: "270 91% 65%",
      radius: 20,
    },
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function ThemedComposer() {
  return (
    <Composer
      placeholder="Themed via tokens…"
      onSend={(payload) => console.log(payload.text)}
      tokens={{
        primary: "270 91% 65%",
        primaryForeground: "270 25% 98%",
        accent: "270 60% 96%",
        accentForeground: "270 80% 35%",
        card: "270 50% 99%",
        border: "270 30% 90%",
        muted: "270 30% 96%",
        mutedForeground: "270 15% 45%",
        ring: "270 91% 65%",
        radius: 20,
      }}
      hint="Recolour every surface with one prop"
    />
  );
}
`,
  },

  {
    id: "compact-pill",
    title: "Compact pill",
    group: "Custom design",
    icon: <Pill className="h-4 w-4" />,
    tagline: "Narrow, tight, single-line — sized via sx + tokens",
    description: (
      <>
        A command-bar style composer: narrow root width via{" "}
        <code>sx.root</code>, tight editor padding via <code>sx.editor</code>,
        and a fully-pill corner via <code>tokens.radius</code>. Any sizing
        key in <code>sx</code> accepts a number (treated as px) or a CSS
        length string (<code>"420px"</code>, <code>"clamp(...)"</code>).
        Pairs perfectly with <code>multiline={`{false}`}</code>.
      </>
    ),
    tryIt: [
      "Type and press Enter — the pill ships your message immediately.",
      "Notice the pill is exactly 480px wide regardless of viewport.",
      "Try Shift+Enter — suppressed because multiline is off.",
    ],
    features: {
      attachments: false,
      voice: false,
      web: false,
      mermaid: false,
    },
    placeholder: "Type a command…",
    multiline: false,
    hint: false,
    tokens: { radius: 9999 },
    sx: {
      root: { width: 480, maxWidth: "100%", margin: "0 auto" },
      editor: { minHeight: 32, paddingTop: 6, paddingBottom: 6 },
      sendButton: { height: 32, width: 32 },
    },
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function PillComposer() {
  return (
    <Composer
      placeholder="Type a command…"
      onSend={(payload) => console.log(payload.text)}
      multiline={false}
      hint={false}
      tokens={{ radius: 9999 }}
      sx={{
        root: { width: 480, maxWidth: "100%", margin: "0 auto" },
        editor: { minHeight: 32, paddingTop: 6, paddingBottom: 6 },
        sendButton: { height: 32, width: 32 },
      }}
    />
  );
}
`,
  },

  {
    id: "slot-classnames",
    title: "Slot classNames",
    group: "Custom design",
    icon: <Brush className="h-4 w-4" />,
    tagline: "Per-slot Tailwind overrides, no sx",
    description: (
      <>
        Reskin individual slots with raw Tailwind classes via{" "}
        <code>classNames</code>. Each slot's classes are merged{" "}
        <em>after</em> the built-in ones (last-wins), so you can layer hover
        states, focus rings, gradients, or any utility on top of the
        defaults without forking the component. Reach for this when you need
        pseudo selectors or media queries that the lightweight{" "}
        <code>sx</code> engine deliberately skips.
      </>
    ),
    tryIt: [
      "Focus the editor — the card picks up the gradient ring you specified.",
      "Hover the send button — the gradient brightens via Tailwind hover utilities.",
      "Attach a file — the chip pulls its classes from the slot map too.",
    ],
    features: {
      attachments: true,
      voice: false,
      web: false,
      mermaid: false,
    },
    placeholder: "Tailwind-skinned composer…",
    classNames: {
      card: "!bg-gradient-to-br from-fuchsia-500/10 via-card to-sky-500/10 ring-1 ring-fuchsia-400/30 focus-within:ring-2 focus-within:ring-fuchsia-400/60",
      editor: "selection:bg-fuchsia-500/20",
      sendButton:
        "!bg-gradient-to-br from-fuchsia-500 to-sky-500 !text-white shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/60",
      toolbarButton: "hover:!bg-fuchsia-500/10 hover:!text-fuchsia-600",
      attachmentChip:
        "!border-fuchsia-400/40 !bg-fuchsia-500/5",
      hint: "!text-fuchsia-600/70",
    },
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function GradientComposer() {
  return (
    <Composer
      placeholder="Tailwind-skinned composer…"
      onSend={(payload) => console.log(payload.text)}
      classNames={{
        card: "!bg-gradient-to-br from-fuchsia-500/10 via-card to-sky-500/10 ring-1 ring-fuchsia-400/30 focus-within:ring-2 focus-within:ring-fuchsia-400/60",
        editor: "selection:bg-fuchsia-500/20",
        sendButton:
          "!bg-gradient-to-br from-fuchsia-500 to-sky-500 !text-white shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/60",
        toolbarButton: "hover:!bg-fuchsia-500/10 hover:!text-fuchsia-600",
        attachmentChip: "!border-fuchsia-400/40 !bg-fuchsia-500/5",
        hint: "!text-fuchsia-600/70",
      }}
      hint="Per-slot Tailwind overrides, no sx"
    />
  );
}
`,
  },

  {
    id: "sx-freestyle",
    title: "SX freestyle",
    group: "Custom design",
    icon: <Square className="h-4 w-4" />,
    tagline: "Neo-brutalist look from per-slot sx alone",
    description: (
      <>
        The lightweight <code>sx</code> engine is a plain object that
        becomes inline <code>style</code>. Token shortcuts —
        <code>color: "primary"</code>, <code>bg: "card"</code>,{" "}
        <code>borderColor: "foreground"</code> — expand to{" "}
        <code>hsl(var(--…))</code>, while everything else (numbers, CSS
        strings) passes through. No CSS-in-JS runtime, no pseudo selectors,
        no media queries — bring <code>classNames</code> for those.
      </>
    ),
    tryIt: [
      "Notice the chunky 3px border and hard offset shadow on the card.",
      "Send button is a square block in foreground; stop button (try while streaming) takes destructive.",
      "Editor uses a monospace stack via sx.editor.fontFamily.",
    ],
    features: {
      attachments: true,
      voice: false,
      web: false,
      mermaid: false,
    },
    placeholder: "Brutalist composer — type something…",
    tokens: { radius: 6 },
    sx: {
      card: {
        bg: "card",
        borderColor: "foreground",
        borderWidth: 3,
        borderStyle: "solid",
        boxShadow: "6px 6px 0 0 hsl(var(--foreground))",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      },
      editor: {
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: 14,
        minHeight: 64,
      },
      toolbar: { paddingLeft: 8, paddingRight: 8 },
      toolbarButton: {
        borderRadius: 4,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "foreground",
      },
      sendButton: {
        bg: "foreground",
        color: "background",
        borderRadius: 4,
        height: 36,
        width: 36,
        boxShadow: "3px 3px 0 0 hsl(var(--foreground) / 0.4)",
      },
      attachmentChip: {
        borderRadius: 4,
        borderWidth: 2,
        borderColor: "foreground",
      },
      hint: { fontFamily: "ui-monospace, monospace", letterSpacing: "0.04em" },
    },
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

export function BrutalistComposer() {
  return (
    <Composer
      placeholder="Brutalist composer…"
      onSend={(payload) => console.log(payload.text)}
      tokens={{ radius: 6 }}
      sx={{
        card: {
          bg: "card",
          borderColor: "foreground",
          borderWidth: 3,
          borderStyle: "solid",
          boxShadow: "6px 6px 0 0 hsl(var(--foreground))",
        },
        editor: {
          fontFamily: "ui-monospace, monospace",
          fontSize: 14,
          minHeight: 64,
        },
        toolbarButton: {
          borderRadius: 4,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: "foreground",
        },
        sendButton: {
          bg: "foreground",
          color: "background",
          borderRadius: 4,
          height: 36,
          width: 36,
        },
      }}
      hint="Neo-brutalist look from per-slot sx alone"
    />
  );
}
`,
  },

  {
    id: "brand-color",
    title: "Brand color",
    group: "Custom design",
    icon: <Palette className="h-4 w-4" />,
    tagline: "One prop re-tints every interactive surface",
    description: (
      <>
        Pass a single <code>color</code> (hex, <code>rgb(…)</code>,{" "}
        <code>hsl(…)</code>, or HSL components) and the composer derives{" "}
        <code>--primary</code>, <code>--accent</code>,{" "}
        <code>--accent-foreground</code>, and <code>--ring</code> for you. The
        neutral chrome stays put — only the "hot" surfaces light up.
      </>
    ),
    tryIt: [
      "Click a swatch above the composer to flip the brand color live.",
      "Type @ — the menu's selected row, the avatar, and the inserted chip all follow.",
      "Type / — the highlighted command takes the same accent.",
      "Toggle the Web pill — its tint matches too.",
      "Hover a toolbar button — soft accent background.",
    ],
    features: {
      attachments: true,
      mentions: { items: MEMBERS },
      slashCommands: { items: SLASH },
      web: true,
      voice: false,
      mermaid: false,
    },
    placeholder: "Pick a brand color above, then try @, /, or the Web pill…",
    renderComposer: ({ ref, onSend, placeholder }) => (
      <BrandColorDemo
        composerRef={ref}
        onSend={onSend}
        placeholder={placeholder}
      />
    ),
    code: `import { useState } from "react";
import { Composer } from "composeai";
import "composeai/composer.css";

const SWATCHES = [
  { id: "violet", label: "Violet", value: "#7c3aed" },
  { id: "emerald", label: "Emerald", value: "#10b981" },
  { id: "rose", label: "Rose", value: "#f43f5e" },
  { id: "amber", label: "Amber", value: "#f59e0b" },
  { id: "sky", label: "Sky", value: "#0ea5e9" },
  { id: "slate", label: "Slate", value: "#475569" },
];

export function BrandColorComposer() {
  const [color, setColor] = useState(SWATCHES[0].value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Brand color:</span>
        {SWATCHES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setColor(s.value)}
            aria-label={s.label}
            className="h-7 w-7 rounded-full border border-border ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2"
            style={{ backgroundColor: s.value }}
          />
        ))}
      </div>

      <Composer
        color={color}
        placeholder="Pick a brand color, then try @, /, or the Web pill…"
        onSend={(payload) => console.log(payload.text)}
        features={{
          attachments: true,
          mentions: { items: MEMBERS },
          slashCommands: { items: SLASH },
          web: true,
        }}
        hint="One prop re-tints every interactive surface"
      />
    </div>
  );
}
`,
  },

  {
    id: "slots-send-button",
    title: "Custom send button (slots)",
    group: "Custom design",
    icon: <Send className="h-4 w-4" />,
    tagline: "Replace chrome wholesale via slots={{ sendButton }}",
    description: (
      <>
        When the icon + class + sx layers aren't enough — you need different
        DOM, a label, a tooltip wrapper, a split "Send / Schedule" dropdown —
        reach for <code>slots</code>. Each slot receives the same runtime
        data the default would have used: <code>canSend</code> /{" "}
        <code>onSend</code> for the send button, <code>onStop</code> for the
        stop button, plus the already-resolved <code>className</code> /{" "}
        <code>style</code> from <code>classNames</code> and <code>sx</code>{" "}
        so you can opt in to the theme tokens if you want. Slots compose
        with everything else — this demo also restyles via{" "}
        <code>classNames.sendButton</code> just to show they layer cleanly.
      </>
    ),
    tryIt: [
      "Type something — notice the button shows a label and the ⏎ shortcut, not just an icon.",
      "Clear the editor — the button stays mounted but shifts to its disabled style.",
      "Inspect the DOM — it's the consumer's <button>, not the library's default.",
    ],
    features: {
      attachments: true,
      voice: false,
      web: false,
      mermaid: false,
    },
    placeholder: "Type and notice the send button on the right…",
    classNames: {
      // Resolved class is forwarded to the slot via `className` — the slot
      // chooses whether to spread it. This one ignores it to do its own
      // pill styling; remove the `slots` entry to see this className alone.
      sendButton: "",
    },
    slots: {
      sendButton: ({ canSend, onSend }) => (
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className={[
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
            canSend
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:shadow-md hover:-translate-y-px"
              : "bg-muted text-muted-foreground/60",
          ].join(" ")}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
          <kbd
            className={[
              "rounded border px-1 text-[10px]",
              canSend
                ? "border-white/30 text-white/80"
                : "border-border text-muted-foreground/60",
            ].join(" ")}
          >
            ⏎
          </kbd>
        </button>
      ),
    },
    code: `import { Composer, type SendButtonRenderProps } from "composeai";
import { Send } from "lucide-react";

function FancySendButton({ canSend, onSend }: SendButtonRenderProps) {
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={!canSend}
      aria-label="Send message"
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
        canSend
          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:shadow-md hover:-translate-y-px"
          : "bg-muted text-muted-foreground/60",
      ].join(" ")}
    >
      <Send className="h-3.5 w-3.5" />
      <span>Send</span>
      <kbd className="rounded border px-1 text-[10px] border-white/30 text-white/80">
        ⏎
      </kbd>
    </button>
  );
}

export function SlotsComposer() {
  return (
    <Composer
      placeholder="Type and notice the send button on the right…"
      onSend={(payload) => console.log(payload.text)}
      slots={{ sendButton: FancySendButton }}
      hint="Replace chrome wholesale via slots={{ sendButton }}"
    />
  );
}
`,
  },

  // — Direction (RTL)
  {
    id: "rtl-hebrew",
    title: "Hebrew (RTL)",
    group: "Direction",
    icon: <Languages className="h-4 w-4" />,
    tagline: 'dir="rtl" — full chrome flips to right-to-left',
    description: (
      <>
        Pass <code>dir="rtl"</code> and the entire composer flips: the text
        caret moves right-to-left, the placeholder right-aligns, the
        attachment tray and toolbar grow from the right edge, and the slash /
        mention popovers anchor to the right of the caret. Every spacing
        token uses CSS logical properties (<code>padding-inline-start</code>,{" "}
        <code>border-inline-start</code>, …) so a single attribute is
        enough — no parallel stylesheet.
      </>
    ),
    tryIt: [
      "Type in Hebrew — the caret and selection follow right-to-left.",
      "Attach a file — the chip and its × button mirror correctly.",
      "Type @ to summon mentions — the popover opens toward the right.",
      "Type / to open the slash menu — group headers and shortcuts mirror.",
      "Open the ```mermaid fence — the preview tile sits on the right.",
    ],
    features: {
      markdown: true,
      attachments: true,
      mentions: { items: MEMBERS_HE },
      slashCommands: { items: SLASH_HE },
      mermaid: true,
      voice: false,
      web: true,
    },
    placeholder: "כתוב הודעה…",
    dir: "rtl",
    code: `import {
  Composer,
  type MentionItem,
  type SlashCommand,
} from "composeai";
import "composeai/composer.css";

const MEMBERS: MentionItem[] = [
  { id: "u1", label: "נועה כהן", description: "ראשת עיצוב" },
  { id: "u2", label: "אבי לוי", description: "מהנדס פרונט" },
  { id: "u3", label: "תמר ברק", description: "מנהלת מוצר" },
];

const SLASH: SlashCommand[] = [
  {
    id: "summarize",
    label: "סיכום",
    onSelect: ({ insertText }) => insertText("אנא סכם את ההודעות שלמעלה."),
  },
];

export function HebrewComposer() {
  return (
    <Composer
      dir="rtl"
      placeholder="כתוב הודעה…"
      onSend={(payload) => console.log(payload.text)}
      features={{
        markdown: true,
        attachments: true,
        mentions: { items: MEMBERS },
        slashCommands: { items: SLASH },
        mermaid: true,
        web: true,
      }}
      hint='dir="rtl" — full chrome flips to right-to-left'
    />
  );
}
`,
  },

  {
    id: "rtl-hebrew-channels",
    title: "Hebrew channels",
    group: "Direction",
    icon: <Hash className="h-4 w-4" />,
    tagline: 'dir="rtl" + custom # trigger',
    description: (
      <>
        Same RTL chrome, but configured with a <code>#</code> trigger to
        surface a channel list rather than people. The popover opens toward
        the right edge of the caret — natural reading flow for Hebrew.
      </>
    ),
    tryIt: [
      "Type # ואז 'הנ' — תופיע הקבוצה #הנדסה.",
      "בחר ערוץ ולחץ על Backspace פעם אחת — כל הצ'יפ נמחק.",
    ],
    features: {
      ...offAll,
      mentions: { trigger: "#", items: CHANNELS_HE },
    },
    placeholder: "השתמש ב# כדי לתייג ערוץ…",
    dir: "rtl",
    code: `import { Composer, type MentionItem } from "composeai";
import "composeai/composer.css";

const CHANNELS: MentionItem[] = [
  { id: "c1", label: "כללי",  description: "ערוץ הצוות הראשי" },
  { id: "c2", label: "הנדסה", description: "בילדים, פריסות, אירועים" },
  { id: "c3", label: "עיצוב", description: "ביקורות עיצוב שבועיות" },
];

export function HebrewChannels() {
  return (
    <Composer
      dir="rtl"
      placeholder="השתמש ב# כדי לתייג ערוץ…"
      onSend={(payload) => console.log(payload.mentions)}
      features={{
        mentions: { trigger: "#", items: CHANNELS },
      }}
      hint='dir="rtl" + custom # trigger'
    />
  );
}
`,
  },

  {
    id: "rtl-arabic",
    title: "Arabic (RTL)",
    group: "Direction",
    icon: <Languages className="h-4 w-4" />,
    tagline: 'dir="rtl" — Arabic placeholder, mentions, and slash menu',
    description: (
      <>
        The same RTL flip with an Arabic data set. Placeholder, mention
        items, slash labels, and the seeded mermaid diagram are all in
        Arabic. Notice that Latin URLs and code blocks inside the editor
        retain their natural left-to-right shaping while the surrounding
        message stays right-aligned — that's bidi text doing its job.
      </>
    ),
    tryIt: [
      "اكتب @ ثم 'فا' — تظهر فاطمة الزهراء.",
      "اكتب / لفتح قائمة الأوامر، جرّب '/تل'.",
      'اكتب "# عنوان" ولاحظ أن النص يظل على اليمين بينما يبقى المحرف "#" مرئياً.',
      'افتح كتلة ```mermaid وعدّل المخطط ثم شاهد المعاينة.',
    ],
    features: {
      markdown: true,
      attachments: true,
      mentions: { items: MEMBERS_AR },
      slashCommands: { items: SLASH_AR },
      mermaid: true,
      voice: false,
      web: true,
    },
    placeholder: "اكتب رسالة…",
    dir: "rtl",
    code: `import { Composer, type MentionItem, type SlashCommand } from "composeai";
import "composeai/composer.css";

const MEMBERS: MentionItem[] = [
  { id: "u1", label: "علي حسن",         description: "قائد التصميم" },
  { id: "u2", label: "فاطمة الزهراء",    description: "مهندسة واجهات" },
  { id: "u3", label: "محمد ياسين",       description: "مدير المنتج" },
];

const SLASH: SlashCommand[] = [
  {
    id: "summarize",
    label: "تلخيص",
    onSelect: ({ insertText }) => insertText("لخّص ما سبق من فضلك."),
  },
];

export function ArabicComposer() {
  return (
    <Composer
      dir="rtl"
      placeholder="اكتب رسالة…"
      onSend={(payload) => console.log(payload.text)}
      features={{
        markdown: true,
        attachments: true,
        mentions: { items: MEMBERS },
        slashCommands: { items: SLASH },
        mermaid: true,
        web: true,
      }}
      hint='dir="rtl" — Arabic placeholder, mentions, and slash menu'
    />
  );
}
`,
  },

  {
    id: "rtl-auto",
    title: "Auto direction",
    group: "Direction",
    icon: <Globe2 className="h-4 w-4" />,
    tagline: 'dir="auto" — flips per paragraph from the first strong char',
    description: (
      <>
        With <code>dir="auto"</code> the browser picks each paragraph's
        direction from the first strong character it sees. A line that
        starts with Hebrew goes right-aligned, a line that starts with
        English stays left-aligned, and the popovers re-anchor so the
        slash / mention menu always opens toward the start of the current
        line. Perfect for chat surfaces that mix scripts in a single
        conversation.
      </>
    ),
    tryIt: [
      'Start a line with English — it stays left-aligned.',
      "התחל שורה חדשה במילה עברית — הצד מתהפך אוטומטית.",
      "Type @ on each line — the popover follows the line's resolved direction.",
    ],
    features: {
      markdown: true,
      attachments: true,
      mentions: { items: [...MEMBERS_HE, ...MEMBERS] },
      slashCommands: { items: [...SLASH_HE, ...SLASH] },
      mermaid: false,
      voice: false,
      web: true,
    },
    placeholder: "Type in any language — direction follows the first strong char…",
    dir: "auto",
    code: `import { Composer } from "composeai";
import "composeai/composer.css";

// dir="auto" lets the browser flip each paragraph independently based on
// its first strong character — perfect for chat surfaces that mix scripts.
export function AutoDirection() {
  return (
    <Composer
      dir="auto"
      placeholder="Type in any language…"
      onSend={(payload) => console.log(payload.text)}
      features={{
        markdown: true,
        attachments: true,
        web: true,
      }}
      hint='dir="auto" — flips per paragraph from the first strong char'
    />
  );
}
`,
  },

  // — Combined
  {
    id: "kitchen-sink",
    title: "Kitchen sink",
    group: "Combined",
    icon: <Wand2 className="h-4 w-4" />,
    tagline: "Every feature, simultaneously",
    description: (
      <>
        Markdown, attachments, mentions, slash commands, mermaid, voice, and
        web — all enabled. The most realistic configuration; drop this into
        a production chat as a starting point.
      </>
    ),
    prerequisites: [
      <>
        Diagrams need the optional <code>mermaid</code> peer:{" "}
        <code className="rounded bg-amber-500/15 px-1 font-mono">
          npm install mermaid
        </code>{" "}
        (or pass <code>renderDiagram</code> to use your own).
      </>,
      <>
        Voice input uses the browser's native Web Speech / MediaRecorder
        APIs — works in Chromium and Safari, requires microphone permission
        on first use. No package install needed.
      </>,
    ],
    tryIt: [
      "Type @, /, **bold**, paste an image, open a ```mermaid fence.",
      "Press the mic and speak.",
      "Toggle the Web pill to flag a web-grounded answer.",
    ],
    features: {
      markdown: true,
      attachments: true,
      mentions: { items: MEMBERS },
      slashCommands: { items: SLASH },
      mermaid: true,
      voice: true,
      web: true,
    },
    placeholder:
      "Try @, /, **bold**, paste an image, or open a ```mermaid fence…",
    code: `import {
  Composer,
  type MentionItem,
  type SlashCommand,
} from "composeai";
import { Sparkles, Wand2 } from "lucide-react";
import "composeai/composer.css";

const MEMBERS: MentionItem[] = [
  { id: "u1", label: "Alex Carter" },
  { id: "u2", label: "Beatrice Wong" },
  { id: "u3", label: "Carlos Diaz" },
];

const SLASH: SlashCommand[] = [
  {
    id: "summarize",
    label: "Summarize",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Summarize the above."),
  },
  {
    id: "improve",
    label: "Improve writing",
    icon: <Wand2 className="h-3.5 w-3.5" />,
    onSelect: ({ insertText }) => insertText("Improve this: "),
  },
];

export function KitchenSinkComposer() {
  return (
    <Composer
      placeholder="Try @, /, **bold**, paste an image, or open a \\\`\\\`\\\`mermaid fence…"
      onSend={(payload) => console.log(payload)}
      features={{
        markdown: true,
        attachments: true,
        mentions: { items: MEMBERS },
        slashCommands: { items: SLASH },
        mermaid: true,
        voice: true,
        web: true,
      }}
      hint="Every feature, simultaneously"
    />
  );
}
`,
  },
];

export const DEMO_BY_ID: Record<string, DemoSpec> = Object.fromEntries(
  DEMOS.map((d) => [d.id, d]),
);

// ─────────────────────────────────────────────────────────────────────
// Home / overview entry
// ─────────────────────────────────────────────────────────────────────

/**
 * Pinned at the very top of the sidebar — landing page that explains the
 * component, shows a self-running mini-demo, lists every prop, and links to
 * the individual demos. Lives outside `DEMOS` because the chat surface is
 * swapped out entirely when this entry is active.
 */
export const HOME_ID = "home" as const;

export interface HomeEntry {
  id: typeof HOME_ID;
  title: string;
  group: string;
  tagline: string;
  icon: ReactNode;
}

export const HOME: HomeEntry = {
  id: HOME_ID,
  title: "Overview",
  group: "Welcome",
  tagline: "What this component does",
  icon: <HomeIcon className="h-4 w-4" />,
};

// ─────────────────────────────────────────────────────────────────────
// Local helper button (kept here so demos.tsx is self-contained)
// ─────────────────────────────────────────────────────────────────────

function ToolbarButton({
  primary,
  onClick,
  children,
}: {
  primary?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-md px-3 py-1 text-xs font-medium transition-colors " +
        (primary
          ? "bg-foreground text-background hover:opacity-90"
          : "border border-border bg-card text-foreground hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Brand-color demo — interactive, drives the Composer's `color` prop
// ─────────────────────────────────────────────────────────────────────

const BRAND_SWATCHES: ReadonlyArray<{
  id: string;
  label: string;
  value: string;
}> = [
  { id: "violet", label: "Violet", value: "#7c3aed" },
  { id: "emerald", label: "Emerald", value: "#10b981" },
  { id: "rose", label: "Rose", value: "#f43f5e" },
  { id: "amber", label: "Amber", value: "#f59e0b" },
  { id: "sky", label: "Sky", value: "#0ea5e9" },
  { id: "slate", label: "Slate", value: "#475569" },
];

function BrandColorDemo({
  composerRef,
  onSend,
  placeholder,
}: {
  composerRef: Ref<ComposerHandle>;
  onSend: (payload: ComposerSubmitPayload) => void;
  placeholder: string;
}) {
  const [color, setColor] = useState<string>(BRAND_SWATCHES[0].value);
  const active = BRAND_SWATCHES.find((s) => s.value === color);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">
          Brand color
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {BRAND_SWATCHES.map((s) => {
            const isActive = s.value === color;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setColor(s.value)}
                aria-label={s.label}
                aria-pressed={isActive}
                title={s.label}
                className={
                  "relative h-7 w-7 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
                  (isActive
                    ? "border-foreground/40 ring-2 ring-foreground/30 ring-offset-2"
                    : "border-border/80 hover:scale-110")
                }
                style={{ backgroundColor: s.value }}
              />
            );
          })}
        </div>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          color="{active?.value ?? color}"
        </span>
      </div>

      <Composer
        ref={composerRef}
        color={color}
        placeholder={placeholder}
        autoFocus
        onSend={onSend}
        hint="One prop re-tints every interactive surface"
        features={{
          attachments: true,
          mentions: { items: MEMBERS },
          slashCommands: { items: SLASH },
          web: true,
          voice: false,
          mermaid: false,
        }}
      />
    </div>
  );
}