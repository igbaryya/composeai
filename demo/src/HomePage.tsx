/**
 * Landing/overview page for the demo gallery.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │  Hero (logo + name from package.json + tagline)             │
 *   │  Self-running mini-demo (auto-typed, non-interactive)       │
 *   │  Quick install + minimal example                            │
 *   │  Complete `<Composer />` props table                        │
 *   │  ComposerHandle imperative API                              │
 *   │  Gallery of every demo, grouped, clickable                  │
 *   └──────────────────────────────────────────────────────────────┘
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  AtSign,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Lightbulb,
  Pause,
  Play,
  Sparkles,
  Type as TypeIcon,
  Wand2,
  Workflow,
} from "lucide-react";
import {
  Composer,
  type ComposerHandle,
  type ComposerProps,
  type MentionItem,
  type SlashCommand,
} from "composeai";
import { Highlight, themes, type Language } from "prism-react-renderer";
import { DEMOS, type DemoSpec } from "./demos";
import pkg from "../../package/package.json";

/** Convert "@scope/foo-bar" → "Scope Foo Bar". Mirrors EmptyState. */
function packageDisplayName(name: string): string {
  return name
    .replace(/^@/, "")
    .split(/[/_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const PRODUCT_NAME = packageDisplayName(pkg.name);

interface Props {
  onPickDemo: (id: string) => void;
}

export function HomePage({ onPickDemo }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-12 py-8">
      <Hero />
      <LiveDemoSection />
      <QuickStartSection />
      <PropsSection />
      <HandleSection />
      <GallerySection onPick={onPickDemo} />
      <FooterNote />
    </div>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <header className="text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-soft">
        <Sparkles className="h-6 w-6" />
      </span>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {PRODUCT_NAME}
      </h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {pkg.description ??
          "A Lexical-powered, plugin-driven chat composer for React."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium">
        <Pill>Lexical</Pill>
        <Pill>Plugin-driven</Pill>
        <Pill>Stateful</Pill>
        <Pill>Hybrid + Live markdown</Pill>
        <Pill>Slots API</Pill>
        <Pill>Themeable</Pill>
        <Pill>RTL-ready</Pill>
        <Pill>BYO icons</Pill>
        <Pill>Tree-shakeable</Pill>
        <Pill>v{pkg.version}</Pill>
      </div>
    </header>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-muted-foreground">
      {children}
    </span>
  );
}

// ─── Live mini-demo (5-slide carousel) ───────────────────────────────────

/**
 * One typing/wait step in a slide's script.
 *   - `text` strings are typed character-by-character.
 *   - `wait` numbers pause for that many ms (useful to let async menus or
 *     mermaid renders settle before moving on).
 *   - `speed` overrides the per-char delay so we can stream fast (mermaid
 *     fences) or slow (single trigger characters like `/` or `@`).
 */
type SlideStep =
  | { text: string; speed?: "slow" | "normal" | "fast" }
  | { wait: number };

interface SlideSpec {
  id: string;
  title: string;
  tagline: string;
  icon: ReactNode;
  /** Anything the slide needs to configure on `<Composer />`. */
  composer: Pick<
    ComposerProps,
    "features" | "placeholder" | "prompts" | "hint"
  >;
  script: SlideStep[];
  /** Extra hold after the script finishes, before auto-advance (ms). */
  holdMs?: number;
}

// Async resolver used by the @mentions slide. Mimics a 1.6s network hop so
// the skeleton + result animation is actually visible during the demo.
async function carouselMembers(query: string): Promise<MentionItem[]> {
  await new Promise((r) => setTimeout(r, 1600));
  const all: MentionItem[] = [
    { id: "u1", label: "Alex Carter", description: "Design Lead" },
    { id: "u2", label: "Beatrice Wong", description: "Frontend Engineer" },
    { id: "u3", label: "Carlos Diaz", description: "Product Manager" },
    { id: "u4", label: "Dana Park", description: "Backend Engineer" },
  ];
  const q = query.toLowerCase();
  return all.filter((m) => m.label.toLowerCase().includes(q));
}

const CAROUSEL_SLASH: SlashCommand[] = [
  {
    id: "summarize",
    label: "Summarize",
    description: "Summarize the conversation so far",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: "improve",
    label: "Improve writing",
    description: "Polish tone and clarity",
    icon: <Wand2 className="h-3.5 w-3.5" />,
  },
  {
    id: "diagram",
    label: "Insert diagram",
    description: "Drop in a starter flowchart",
    icon: <Workflow className="h-3.5 w-3.5" />,
  },
  {
    id: "doc",
    label: "Reference doc",
    description: "Insert a markdown file template",
    icon: <FileText className="h-3.5 w-3.5" />,
  },
];

const CAROUSEL_PROMPTS = [
  "Draft a release email",
  "Summarize today's stand-up",
  "Plan next sprint",
  "Brainstorm 5 ideas",
  "Find bugs in this code",
];

const SLIDES: SlideSpec[] = [
  {
    id: "markdown",
    title: "Live markdown",
    tagline: "Slack-style inline styling — markers stay visible while the text picks up the format.",
    icon: <TypeIcon className="h-4 w-4" />,
    composer: {
      placeholder: "Try **bold**, `code`, or # heading…",
      features: {
        markdown: true,
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
      },
    },
    script: [
      { wait: 400 },
      { text: "Shipping **v0.2** today! " },
      { text: "Run `npm test` first, then ~~no rollback~~ *deploy*." },
    ],
    holdMs: 2200,
  },
  {
    id: "mermaid",
    title: "Mermaid diagrams",
    tagline: "Lazy-loaded SVG preview — the mermaid package only loads on first sighting.",
    icon: <Workflow className="h-4 w-4" />,
    composer: {
      placeholder: "Open a ```mermaid fence…",
      features: {
        markdown: true,
        mermaid: true,
        attachments: false,
        voice: false,
        web: false,
      },
    },
    script: [
      { wait: 400 },
      { text: "Here's our request flow:\n" },
      {
        text: "```mermaid\nflowchart LR\n  User --> API\n  API --> Cache\n  API --> DB\n```",
        speed: "fast",
      },
    ],
    holdMs: 3200,
  },
  {
    id: "mentions",
    title: "@mentions",
    tagline: "Async resolver with a skeleton state. Chips are editable and preserve their id on send.",
    icon: <AtSign className="h-4 w-4" />,
    composer: {
      placeholder: "Type @ to mention someone…",
      features: {
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
        mentions: { items: carouselMembers },
      },
    },
    script: [
      { wait: 400 },
      { text: "Hey " },
      { text: "@al", speed: "slow" },
      { wait: 2800 },
    ],
    holdMs: 1200,
  },
  {
    id: "slash",
    title: "Slash commands",
    tagline: "Caret-anchored typeahead. Type / for actions, ? for help, # for channels — any trigger.",
    icon: <Lightbulb className="h-4 w-4" />,
    composer: {
      placeholder: "Type / to open the menu…",
      features: {
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
        slashCommands: { items: CAROUSEL_SLASH },
      },
    },
    script: [
      { wait: 400 },
      { text: "/sum", speed: "slow" },
      { wait: 2500 },
    ],
    holdMs: 1000,
  },
  {
    id: "prompts",
    title: "Quick prompts",
    tagline: "Starter chips above the composer. Click to fill (or fill + send) — perfect for empty-state UX.",
    icon: <Sparkles className="h-4 w-4" />,
    composer: {
      placeholder: "Or type your own…",
      features: {
        markdown: true,
        attachments: false,
        voice: false,
        web: false,
        mermaid: false,
      },
      prompts: {
        items: CAROUSEL_PROMPTS,
        maxToShow: 3,
        randomize: false,
        behavior: "initValue",
      },
    },
    script: [
      { wait: 1600 },
      { text: "Click any chip above — or type your own." },
    ],
    holdMs: 2000,
  },
];

// Fallback height used before the first ResizeObserver callback fires (or in
// browsers without RO support). Each slide measures its own natural height
// post-mount and the stage transitions smoothly to fit — no clipping of the
// send button when mermaid previews or prompt chips push the composer down.
const CAROUSEL_FALLBACK_HEIGHT_PX = 420;

function LiveDemoSection() {
  return (
    <section>
      <SectionHeading
        eyebrow="Live preview"
        title="A guided tour, on autopilot"
        body="Five focused mini-demos auto-typing in rotation. Hover the carousel to pause, click a dot to jump, or use the arrows to step through."
      />
      <CarouselDemo />
    </section>
  );
}

function CarouselDemo() {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [stageHeight, setStageHeight] = useState<number>(
    CAROUSEL_FALLBACK_HEIGHT_PX,
  );
  const slideRef = useRef<HTMLDivElement | null>(null);
  const paused = userPaused || hovered;

  const slide = SLIDES[index];

  const next = useCallback(
    () => setIndex((i) => (i + 1) % SLIDES.length),
    [],
  );
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length),
    [],
  );

  // Track the active slide's own height so the stage can expand to fit it
  // (mermaid preview, attachment tray, prompt chip row, …). `key={slide.id}`
  // on the slide means the ref re-attaches on every change; ResizeObserver
  // also fires an initial callback on `observe()`, so the stage settles to
  // the right size on mount and continues to follow live layout shifts.
  useEffect(() => {
    const el = slideRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      const h = el.scrollHeight;
      if (h > 0) setStageHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [slide.id]);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/30 p-3 shadow-soft sm:p-4"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top strip: live badge + slide title + manual play/pause */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground shadow-soft">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
            Live · slide {index + 1} / {SLIDES.length}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {slide.icon}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold tracking-tight">
                {slide.title}
              </h3>
              <p className="truncate text-[12px] leading-snug text-muted-foreground">
                {slide.tagline}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? "Resume auto-play" : "Pause auto-play"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          {userPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Slide stage — inert, auto-sizing clip box. The slide inside is
          fully remounted on every index change (different `key`) so each
          composer gets a clean Lexical instance, fresh mermaid loader, etc.
          Height is driven by a ResizeObserver on the active slide so the
          stage grows to fit whatever the composer renders (mermaid preview,
          attachments, prompts row) — the send button never sits behind the
          wrapper. `overflow-anchor: none` prevents the browser from
          anchoring its scroll position to the mounting contenteditable. */}
      <div
        aria-hidden
        // @ts-expect-error — `inert` is a valid HTML attribute; React types
        // already include it in @types/react ≥18.3 but not all TS versions.
        inert=""
        tabIndex={-1}
        className="relative pointer-events-none select-none [&_*]:!outline-none [&_button]:cursor-default"
        style={{
          height: stageHeight,
          overflowAnchor: "none",
          transition: "height 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <CarouselSlide
          ref={slideRef}
          key={slide.id}
          slide={slide}
          paused={paused}
          onComplete={next}
        />
      </div>

      {/* Bottom nav bar — prev/next arrows flank the dot pagination so
          they never sit on top of the composer (previous design put them
          mid-card on hover, where they overlapped the editor surface and
          fought the mermaid preview / send button for click area). */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <div className="flex items-center gap-1.5 px-1">
          {SLIDES.map((s, i) => {
            const active = i === index;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Jump to slide ${i + 1}: ${s.title}`}
                aria-current={active ? "true" : undefined}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (active
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60")
                }
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Runs one slide's typing script against a freshly-mounted Composer. When
 * the script finishes (plus the slide's `holdMs`), calls `onComplete` so
 * the parent can advance. Honours `paused` between every step — pausing
 * mid-stream is safe and resumes from where it left off.
 *
 * Forwards a ref to the absolutely-positioned wrapper so the parent stage
 * can observe its natural height and animate to fit.
 */
interface CarouselSlideProps {
  slide: SlideSpec;
  paused: boolean;
  onComplete: () => void;
}

const CarouselSlide = forwardRef<HTMLDivElement, CarouselSlideProps>(
  function CarouselSlide({ slide, paused, onComplete }, forwardedRef) {
  const ref = useRef<ComposerHandle | null>(null);
  // Refs so the long-running tick closure always reads the *latest* values
  // without restarting the whole script when they change.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const baseDelayFor = (speed: "slow" | "normal" | "fast" | undefined) => {
      switch (speed) {
        case "fast":
          return 12;
        case "slow":
          return 95;
        case "normal":
        default:
          return 24;
      }
    };

    const run = () => {
      if (cancelled || !ref.current) return;

      let stepIdx = 0;
      let charIdx = 0;

      const tick = () => {
        if (cancelled) return;
        if (pausedRef.current) {
          timer = window.setTimeout(tick, 220);
          return;
        }

        // Past the end → hold, then advance.
        if (stepIdx >= slide.script.length) {
          timer = window.setTimeout(() => {
            if (cancelled) return;
            if (pausedRef.current) {
              // While paused, just keep peeking until the user resumes.
              timer = window.setTimeout(tick, 220);
              return;
            }
            completeRef.current();
          }, slide.holdMs ?? 2000);
          return;
        }

        const step = slide.script[stepIdx];

        // Pure wait step.
        if ("wait" in step) {
          timer = window.setTimeout(() => {
            stepIdx += 1;
            tick();
          }, step.wait);
          return;
        }

        // Typing step — emit one character per tick.
        if (charIdx >= step.text.length) {
          stepIdx += 1;
          charIdx = 0;
          timer = window.setTimeout(tick, 140);
          return;
        }
        const ch = step.text[charIdx];
        ref.current?.insert(ch);
        charIdx += 1;
        const base = baseDelayFor(step.speed);
        const jitter = step.speed === "fast" ? 4 : 18;
        const delay =
          ch === "\n" ? 90 : ch === " " ? Math.max(20, base) : base + Math.random() * jitter;
        timer = window.setTimeout(tick, delay);
      };

      // Initial breath so the user perceives the slide-in before typing.
      timer = window.setTimeout(tick, 500);
    };

    // Wait one frame so the Composer's imperative handle is registered.
    timer = window.setTimeout(run, 0);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [slide]);

  return (
    // The fade-in pulse makes the remount feel intentional rather than
    // jarring. Pure CSS — no animation library needed. Absolute positioning
    // with `inset-x-0 top-0` (not `inset-0`) keeps the slide pinned to the
    // top of the stage while letting it own its natural height, which is
    // what the parent's ResizeObserver measures.
    <div
      ref={forwardedRef}
      key={slide.id}
      className="absolute inset-x-0 top-0 animate-[carouselFade_360ms_ease-out]"
    >
      <Composer
        ref={ref}
        autoFocus={false}
        placeholder={slide.composer.placeholder ?? "Watch the demo type…"}
        features={slide.composer.features}
        prompts={slide.composer.prompts}
        hint={
          slide.composer.hint ?? (
            <span className="text-[11px] text-muted-foreground">
              Read-only auto-demo — explore the sidebar to drive a real one.
            </span>
          )
        }
      />
    </div>
  );
});

// ─── Quick start ─────────────────────────────────────────────────────────

const QUICK_START_CODE = `import { Composer, type ComposerSubmitPayload } from "composeai";
import "composeai/composer.css";

export function Chat() {
  const handleSend = (payload: ComposerSubmitPayload) => {
    // payload.text     → plain text
    // payload.markdown → markdown source (chips collapsed to @label)
    // payload.attachments / payload.mentions
    console.log(payload);
  };

  return (
    <Composer
      placeholder="Send a message…"
      onSend={handleSend}
      features={{
        markdown: true,
        attachments: true,
        mentions: { items: [{ id: "u1", label: "Alex" }] },
      }}
    />
  );
}
`;

function QuickStartSection() {
  return (
    <section>
      <SectionHeading
        eyebrow="Quick start"
        title="Drop it into your app"
        body={
          <>
            Install with{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">
              npm i {pkg.name}
            </code>{" "}
            and import the CSS once at your app entry. Every plugin is opt-in
            via the <code className="font-mono">features</code> prop.
          </>
        }
      />
      <CodeBlock language="tsx" code={QUICK_START_CODE} />
    </section>
  );
}

// ─── Props table ─────────────────────────────────────────────────────────

interface PropRow {
  name: string;
  type: string;
  optional: boolean;
  defaultValue: string;
  description: string;
}

const COMPOSER_PROPS: PropRow[] = [
  // ── Events ────────────────────────────────────────────────────────────
  {
    name: "onSend",
    type: "(payload: ComposerSubmitPayload) => void",
    optional: true,
    defaultValue: "—",
    description:
      "Called when the user submits. Payload includes text, markdown, attachments, and mentions (each with stable id).",
  },
  {
    name: "onStop",
    type: "() => void",
    optional: true,
    defaultValue: "—",
    description:
      "Called when the user clicks the Stop button while `isStreaming` is true.",
  },
  {
    name: "isStreaming",
    type: "boolean",
    optional: true,
    defaultValue: "false",
    description:
      "Renders the Send button as a Stop button and blocks new submissions.",
  },

  // ── Content seeding & affordances ────────────────────────────────────
  {
    name: "initialValue",
    type: "string",
    optional: true,
    defaultValue: "—",
    description:
      "Markdown to seed the editor on mount. Multi-line input is split into paragraphs so block markdown (```code```, ```mermaid```) renders immediately.",
  },
  {
    name: "placeholder",
    type: "string",
    optional: true,
    defaultValue: '"Send a message…"',
    description: "Placeholder text shown when the editor is empty.",
  },
  {
    name: "autoFocus",
    type: "boolean",
    optional: true,
    defaultValue: "false",
    description: "Focus the editor automatically once mounted.",
  },
  {
    name: "refocusOnSubmit",
    type: "boolean",
    optional: true,
    defaultValue: "true",
    description:
      "Return focus to the editor after a Send-button / programmatic / quick-prompt submit. Keyboard sends already keep focus naturally.",
  },
  {
    name: "focusShortcut",
    type: 'string | false | null',
    optional: true,
    defaultValue: '"mod+/"',
    description:
      'Global keyboard combo that focuses the composer from anywhere on the page. `mod` resolves to ⌘ on macOS, Ctrl elsewhere. Pass `false` to disable.',
  },
  {
    name: "hint",
    type: "boolean | ReactNode",
    optional: true,
    defaultValue: "true",
    description:
      "Helper line under the composer. `false` hides it; pass any node to replace the default.",
  },
  {
    name: "prompts",
    type: "ComposerPromptsConfig",
    optional: true,
    defaultValue: "—",
    description:
      'Starter-prompt chips rendered above the composer. `behavior: "sendValue"` (default) clicks → fill + submit; `"initValue"` just fills. Honors `maxToShow` (≤ 5) and `randomize` (default true).',
  },
  {
    name: "attachmentOptions",
    type: "AttachmentOptions",
    optional: true,
    defaultValue: "—",
    description:
      "Lifecycle + submit rules for attachments. `uploadFirst` + async `onUpload(file) => boolean` upload in the background with spinner / warning chip states; `canSendOnlyAttachment` (default true) allows attachment-only messages.",
  },

  // ── Editor behavior ──────────────────────────────────────────────────
  {
    name: "mode",
    type: '"markdown" | "text"',
    optional: true,
    defaultValue: '"markdown"',
    description:
      'Editor flavor. `"text"` disables markdown styling, block shortcuts, and mermaid; pasted content is reduced to plain text.',
  },
  {
    name: "features",
    type: "ComposerFeatures",
    optional: true,
    defaultValue: "{}",
    description:
      "Plugin switchboard — markdown, attachments, mentions, slashCommands, voice, mermaid, web. See below.",
  },
  {
    name: "toolbarExtras",
    type: "ReactNode",
    optional: true,
    defaultValue: "—",
    description:
      "Custom controls rendered after the built-in toolbar buttons (e.g. a model picker).",
  },
  {
    name: "multiline",
    type: "boolean",
    optional: true,
    defaultValue: "true",
    description:
      "When `false`, the composer behaves like a single-line input — Enter and Shift+Enter never insert newlines.",
  },
  {
    name: "submitOnEnter",
    type: "boolean",
    optional: true,
    defaultValue: "true",
    description:
      "Whether plain Enter submits. When `false`, Enter inserts a newline and only Cmd/Ctrl+Enter submits.",
  },
  {
    name: "smartNewline",
    type: "boolean",
    optional: true,
    defaultValue: "true",
    description:
      "Once the draft has more than one line, Enter inserts a newline instead of submitting. Prevents accidental sends.",
  },
  {
    name: "closeMenusOnOutsideClick",
    type: "boolean",
    optional: true,
    defaultValue: "true",
    description:
      "Close any open typeahead (slash, mentions) when the user clicks/taps outside the composer.",
  },
  {
    name: "dir",
    type: '"ltr" | "rtl" | "auto"',
    optional: true,
    defaultValue: '"ltr"',
    description:
      "Writing direction. Applied to the root and the contenteditable so caret motion, alignment, and chrome (toolbar, hint, popovers) all flip correctly. `\"auto\"` picks per paragraph from the first strong character.",
  },

  // ── Customization ────────────────────────────────────────────────────
  {
    name: "icons",
    type: "Partial<ComposerIcons>",
    optional: true,
    defaultValue: "—",
    description:
      "Swap any built-in SVG (send, stop, attach, voice, …) for your own component. Anything omitted keeps the default. Zero icon dependencies — the library ships inlined SVGs.",
  },
  {
    name: "slots",
    type: "ComposerSlots",
    optional: true,
    defaultValue: "—",
    description:
      "Replace whole chrome pieces wholesale via render-prop slots. Currently `sendButton` and `stopButton` — receive `{ canSend, onSend / onStop, className, style }`. Composes with `icons` / `classNames` / `sx`; use slots only when you need different DOM, behaviour, or accessibility wrapping.",
  },
  {
    name: "renderDiagram",
    type: "(p: { code; language }) => ReactNode",
    optional: true,
    defaultValue: "—",
    description:
      "Render fenced diagram blocks (currently ```mermaid```) yourself. When provided, the composer skips the lazy `import('mermaid')` entirely — you can drop the optional peer dependency.",
  },
  {
    name: "color",
    type: "string",
    optional: true,
    defaultValue: "—",
    description:
      'Single brand-color shorthand (HSL components, hex, rgb, hsl). Re-tints every "hot" surface (focus ring, mention chips, Web pill, hover bg) in one prop. Layered under `tokens` so explicit tokens always win.',
  },
  {
    name: "tokens",
    type: "ComposerTokens",
    optional: true,
    defaultValue: "—",
    description:
      "Design tokens applied as inline CSS variables on the root so they cascade into every slot (including the package's built-in CSS) without leaking globally. Includes color, radius, fontSize, fontFamily.",
  },
  {
    name: "classNames",
    type: "ComposerSlotClassNames",
    optional: true,
    defaultValue: "—",
    description:
      "Per-slot className overrides (root, card, editor, toolbar, sendButton, mention, slashMenu, …). Merged after the defaults so you can layer Tailwind utilities or your own classes on top.",
  },
  {
    name: "sx",
    type: "ComposerSxMap",
    optional: true,
    defaultValue: "—",
    description:
      "Per-slot inline-style overrides with token-aware shortcuts (`bg`, `color`, …) that expand to `hsl(var(--<token>))`. Reach for `classNames` when you need pseudo-selectors or media queries.",
  },
  {
    name: "style",
    type: "CSSProperties",
    optional: true,
    defaultValue: "—",
    description:
      "Standard React `style` applied to the outer root, after any `sx.root` values. Use for positioning / sizing of the composer as a whole.",
  },
  {
    name: "className",
    type: "string",
    optional: true,
    defaultValue: "—",
    description:
      "Shorthand for `classNames.root`. Kept for back-compat; when both are set, `className` is applied first, then `classNames.root`.",
  },
  {
    name: "ref",
    type: "Ref<ComposerHandle>",
    optional: true,
    defaultValue: "—",
    description:
      "Imperative handle exposing focus / clear / insert / submit / addAttachments. See below.",
  },
];

const FEATURE_PROPS: PropRow[] = [
  {
    name: "markdown",
    type: "boolean | MarkdownConfig",
    optional: true,
    defaultValue: "true",
    description:
      'Inline (**bold**, *italic*, `code`, ~~strike~~, [label](url)) and block (`# `, `- `, `> `, ```) styling. Pass `{ mode: "live" }` for Notion-style — markers vanish once matched and headings / fences / links collapse to their rendered form (the source is reconstructed at submit).',
  },
  {
    name: "attachments",
    type: "boolean | AttachmentsConfig",
    optional: true,
    defaultValue: "false",
    description:
      'Paste / drop / paperclip uploads. Pass `{ file, image, accept, types, maxSize, maxCount }` to constrain. `types: AttachmentTypeOption[]` turns the paperclip into a popover with scoped `accept` per entry (e.g. PDF / Word / Image). `image: true` adds a dedicated image-only button.',
  },
  {
    name: "mentions",
    type: "false | MentionConfig",
    optional: true,
    defaultValue: "false",
    description:
      "Editable inline chips that preserve their `id` across label edits and only collapse when fully backspaced. `items` may be an array or async resolver (async shows a skeleton); `trigger` overrides the default `@`.",
  },
  {
    name: "slashCommands",
    type: "false | SlashConfig",
    optional: true,
    defaultValue: "false",
    description:
      "Caret-anchored typeahead. Override `trigger` (default `/`) and provide `items`.",
  },
  {
    name: "voice",
    type: "boolean",
    optional: true,
    defaultValue: "false",
    description:
      "Mic button. Web Speech transcription with MediaRecorder fallback. Requires HTTPS or localhost.",
  },
  {
    name: "mermaid",
    type: "boolean | MermaidConfig",
    optional: true,
    defaultValue: "false",
    description:
      "Live SVG preview of ```mermaid fences. `mermaid` is an optional peer dep — lazy-imported on first sighting, or supply `renderDiagram` on <Composer/> to skip the install entirely. `{ keepSource: false }` hides the source once parsed.",
  },
  {
    name: "web",
    type: "boolean",
    optional: true,
    defaultValue: "false",
    description:
      "Show the Web pill in the toolbar — flag a turn as web-grounded for downstream routing.",
  },
];

function PropsSection() {
  return (
    <section>
      <SectionHeading
        eyebrow="API reference"
        title="<Composer /> props"
        body="Every prop is optional. Defaults are designed to give you a polished, modern chat composer with zero configuration."
      />
      <PropsTable rows={COMPOSER_PROPS} />

      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          <code className="font-mono">features</code> sub-props
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          Each plugin is independent and tree-shakeable. Heavy code paths
          (mermaid, voice) only load when their feature is enabled, and
          <code className="font-mono"> mermaid</code> is an{" "}
          <em>optional peer dependency</em> — install it (or supply{" "}
          <code className="font-mono">renderDiagram</code>) only when you
          actually use diagrams.
        </p>
        <PropsTable rows={FEATURE_PROPS} />
      </div>
    </section>
  );
}

function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-soft">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="bg-muted/60 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Optional</Th>
              <Th>Default</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.name}
                className={
                  "border-t border-border align-top " +
                  (i % 2 === 1 ? "bg-muted/20" : "")
                }
              >
                <Td>
                  <code className="font-mono text-[12.5px] font-semibold text-foreground">
                    {row.name}
                  </code>
                </Td>
                <Td>
                  <code className="break-all font-mono text-[12px] text-primary">
                    {row.type}
                  </code>
                </Td>
                <Td>
                  <span
                    className={
                      "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-medium " +
                      (row.optional
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive")
                    }
                  >
                    {row.optional ? "yes" : "no"}
                  </span>
                </Td>
                <Td>
                  <code className="font-mono text-[12px] text-muted-foreground">
                    {row.defaultValue}
                  </code>
                </Td>
                <Td className="text-muted-foreground">{row.description}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2 font-semibold">{children}</th>;
}

function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={"px-3 py-2.5 " + (className ?? "")}>{children}</td>;
}

// ─── ComposerHandle ──────────────────────────────────────────────────────

const HANDLE_ROWS: PropRow[] = [
  {
    name: "focus",
    type: "() => void",
    optional: false,
    defaultValue: "—",
    description: "Move focus to the editor surface.",
  },
  {
    name: "clear",
    type: "() => void",
    optional: false,
    defaultValue: "—",
    description: "Wipe the editor (text and attachments).",
  },
  {
    name: "insert",
    type: "(text: string) => void",
    optional: false,
    defaultValue: "—",
    description:
      "Insert raw text at the current selection. Useful for suggestion buttons or remote bot fills.",
  },
  {
    name: "submit",
    type: "() => void",
    optional: false,
    defaultValue: "—",
    description:
      "Submit the current draft (calls `onSend` and clears the editor).",
  },
  {
    name: "addAttachments",
    type: "(files: File[]) => void",
    optional: false,
    defaultValue: "—",
    description:
      "Programmatically append files. They flow through the same validation as paste/drop.",
  },
];

function HandleSection() {
  return (
    <section>
      <SectionHeading
        eyebrow="Imperative API"
        title="ComposerHandle (via ref)"
        body={
          <>
            Hold a <code className="font-mono">Ref&lt;ComposerHandle&gt;</code>{" "}
            to drive the editor from outside (toolbar buttons, voice triggers,
            scripted demos like the one above).
          </>
        }
      />
      <PropsTable rows={HANDLE_ROWS} />
    </section>
  );
}

// ─── Demo gallery ────────────────────────────────────────────────────────

function GallerySection({ onPick }: { onPick: (id: string) => void }) {
  const grouped = useMemo(() => {
    const by: Record<string, DemoSpec[]> = {};
    for (const d of DEMOS) (by[d.group] ||= []).push(d);
    return by;
  }, []);
  const order = useMemo(
    () => Array.from(new Set(DEMOS.map((d) => d.group))),
    [],
  );

  return (
    <section>
      <SectionHeading
        eyebrow="Demos"
        title="Browse every scenario"
        body="Each card opens a focused, isolated demo with copy-pasteable code."
      />
      <div className="space-y-6">
        {order.map((group) => (
          <div key={group}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grouped[group].map((demo) => (
                <DemoCard key={demo.id} demo={demo} onPick={onPick} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DemoCard({
  demo,
  onPick,
}: {
  demo: DemoSpec;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(demo.id)}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-soft"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {demo.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {demo.title}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
          {demo.tagline}
        </p>
      </div>
    </button>
  );
}

function FooterNote() {
  return (
    <footer className="border-t border-border pt-6 text-center">
      <p className="text-xs text-muted-foreground">
        Built with Lexical · React 18 · Tailwind ·{" "}
        <code className="font-mono">{pkg.name}</code> v{pkg.version}
      </p>
    </footer>
  );
}

// ─── Shared section heading ──────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
        {eyebrow}
      </div>
      <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
        {title}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

// ─── Code block (Prism-highlighted, copy button) ────────────────────────

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/\n+$/, "");

  const handleCopy = async () => {
    try {
      const fenced = `\`\`\`${language}\n${trimmed}\n\`\`\`\n`;
      await navigator.clipboard.writeText(fenced);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    // selection:* keeps highlighted code legible on the dark surface in
    // both themes (the global ::selection uses near-black text-foreground).
    <div className="not-prose overflow-hidden rounded-xl border border-border text-[13px] shadow-soft selection:bg-sky-400/40 selection:text-white">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0b0b0f] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <Highlight
        theme={themes.vsDark}
        code={trimmed}
        language={language as Language}
      >
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="scrollbar-thin m-0 overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed"
            style={{ ...style, background: "#0b0b0f" }}
          >
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}