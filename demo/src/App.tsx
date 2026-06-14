/**
 * Demo gallery for `composeai`.
 *
 * The sidebar lists every scenario; the main pane re-mounts the composer
 * (and resets the chat) when you switch. Each demo configures the composer
 * differently and supplies its own empty-state copy.
 *
 * The empty-state intro stays anchored at the top of the conversation —
 * sending a message simply appends a bubble underneath. There is no
 * synthetic AI reply, but every user message is rendered through
 * `<MessageContent />` so any embedded ```mermaid fence is drawn live.
 */
import { useEffect, useRef, useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import {
  Composer,
  type ComposerHandle,
  type ComposerSubmitPayload,
} from "composeai";
import { DEMO_BY_ID, DEMOS, HOME, HOME_ID, resolveDemoHint } from "./demos";
import { Sidebar } from "./Sidebar";
import { EmptyState } from "./EmptyState";
import { HomePage } from "./HomePage";
import { MessageContent } from "./MessageContent";

interface ChatTurn {
  id: string;
  text: string;
  attachments: { name: string; kind: string }[];
  mentions: { id: string; label: string }[];
}

/**
 * Deep-link helpers — the active demo is mirrored into the URL hash
 * (e.g. `#mentions`) so any scenario can be shared, bookmarked, or
 * reached via the browser's back/forward buttons. Hash routing is used
 * because it requires no server-side rewrites and works on any static
 * host (including the published demo).
 */
function readDemoIdFromHash(): string {
  if (typeof window === "undefined") return HOME_ID;
  const raw = window.location.hash.replace(/^#\/?/, "").trim();
  if (!raw || raw === HOME_ID) return HOME_ID;
  return DEMO_BY_ID[raw] ? raw : HOME_ID;
}

export function App() {
  const [demoId, setDemoId] = useState<string>(() => readDemoIdFromHash());
  const [turnsByDemo, setTurnsByDemo] = useState<Record<string, ChatTurn[]>>(
    {},
  );
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<ComposerHandle | null>(null);
  // When `true`, the next `demoId` change came from a hashchange event
  // (browser back/forward) and the URL is already correct — skip pushing
  // a duplicate history entry.
  const skipUrlSyncRef = useRef(false);

  const isHome = demoId === HOME_ID;
  const demo = DEMO_BY_ID[demoId] ?? DEMOS[0];
  const turns = turnsByDemo[demoId] ?? [];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns]);

  // Mirror `demoId` into `location.hash` so each demo is deep-linkable.
  // Home uses an empty hash so the canonical landing URL stays clean.
  // Uses pushState for user navigation (so the browser back button walks
  // through visited demos) and skips when the change came from the
  // hashchange listener — the URL is already correct in that case.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }
    const target = demoId === HOME_ID ? "" : `#${demoId}`;
    const current = window.location.hash;
    if (current === target) return;
    const url =
      window.location.pathname +
      window.location.search +
      (target || "");
    window.history.pushState(null, "", url || window.location.pathname);
  }, [demoId]);

  // Honour browser back/forward and any external hash changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHashChange = () => {
      skipUrlSyncRef.current = true;
      setDemoId(readDemoIdFromHash());
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const onSend = (payload: ComposerSubmitPayload) => {
    const turn: ChatTurn = {
      id: `u-${Date.now()}`,
      text: payload.markdown || payload.text,
      attachments: payload.attachments.map((a) => ({
        name: a.name,
        kind: a.kind,
      })),
      mentions: payload.mentions,
    };
    setTurnsByDemo((m) => ({
      ...m,
      [demoId]: [...(m[demoId] ?? []), turn],
    }));
  };

  const isMobile =
    typeof window !== "undefined" &&
    !window.matchMedia("(min-width: 768px)").matches;

  const handlePickDemo = (id: string) => {
    setDemoId(id);
    if (isMobile) setSidebarOpen(false);
  };

  /*
   * Two layout modes:
   *
   *   Home  → outer is `min-h-screen` so the document itself scrolls. The
   *           native browser scrollbar runs the full viewport height; the
   *           sidebar is sticky-pinned. No inner scroll container.
   *   Demos → outer is `h-screen overflow-hidden`. The page does NOT scroll;
   *           the messages list scrolls inside its own container, with the
   *           composer pinned to the bottom of the viewport.
   */
  const header = (
    <header
      className={
        "flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 " +
        (isHome ? "sticky top-0 z-20" : "")
      }
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Open sidebar"}
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium text-muted-foreground">
            {isHome ? HOME.group : demo.group}
          </span>
          <span className="text-muted-foreground/40">/</span>
        </div>
        <span className="truncate text-sm font-semibold tracking-tight">
          {isHome ? HOME.title : demo.title}
        </span>
      </div>
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={() => setDark((d) => !d)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );

  return (
    <div
      className={
        "flex bg-background text-foreground " +
        (isHome ? "min-h-screen items-start" : "h-screen overflow-hidden")
      }
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={demoId}
        onPick={handlePickDemo}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {header}

        {isHome ? (
          <main className="mx-auto w-full max-w-4xl px-4 sm:px-6">
            <HomePage onPickDemo={handlePickDemo} />
          </main>
        ) : (
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 sm:px-6">
            <div
              ref={scrollerRef}
              className="scrollbar-thin flex-1 overflow-y-auto py-6"
            >
              <EmptyState demo={demo} />

              {turns.length > 0 && (
                <ul className="mt-6 space-y-3">
                  {turns.map((turn) => (
                    <Bubble key={turn.id} turn={turn} />
                  ))}
                </ul>
              )}
            </div>

            <div className="pb-6 pt-2">
              {demo.extraAboveComposer?.({ ref: composerRef })}
              {demo.renderComposer ? (
                <div key={demoId}>
                  {demo.renderComposer({
                    ref: composerRef,
                    onSend,
                    placeholder: demo.placeholder ?? "Ask anything…",
                  })}
                </div>
              ) : (
                <Composer
                  key={demoId}
                  ref={composerRef}
                  onSend={onSend}
                  placeholder={demo.placeholder ?? "Ask anything…"}
                  autoFocus={demo.autoFocus ?? true}
                  initialValue={demo.initialValue}
                  features={demo.features}
                  hint={resolveDemoHint(demo)}
                  toolbarExtras={demo.toolbarExtras}
                  mode={demo.mode}
                  variant={demo.variant}
                  multiline={demo.multiline}
                  submitOnEnter={demo.submitOnEnter}
                  smartNewline={demo.smartNewline}
                  refocusOnSubmit={demo.refocusOnSubmit}
                  focusShortcut={demo.focusShortcut}
                  classNames={demo.classNames}
                  sx={demo.sx}
                  slots={demo.slots}
                  style={demo.style}
                  tokens={demo.tokens}
                  color={demo.color}
                  dir={demo.dir}
                  prompts={demo.prompts}
                  attachmentOptions={demo.attachmentOptions}
                />
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function Bubble({ turn }: { turn: ChatTurn }) {
  return (
    <li className="flex w-full justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
        <MessageContent text={turn.text} tone="primary" />
        {turn.attachments.length > 0 && (
          <div className="mt-1 text-[11px] opacity-70">
            📎 {turn.attachments.map((a) => a.name).join(", ")}
          </div>
        )}
      </div>
    </li>
  );
}