/**
 * Renders chat-message text as full Markdown (GFM) with always-on mermaid
 * support and Prism-highlighted code blocks.
 *
 * - ```mermaid fences are rendered as live SVG diagrams (lazy-imported).
 * - Other fenced blocks are syntax-highlighted via prism-react-renderer.
 * - Inline code, lists, headings, blockquotes, links, tables, strikethrough
 *   and emphasis all render natively. Styles adapt to the bubble's tone so
 *   markdown stays legible inside the purple primary bubble too.
 */
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ZoomIn } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes, type Language } from "prism-react-renderer";

type Tone = "primary" | "muted";

interface Props {
  text: string;
  /** Visual variant — primary = user bubble (purple bg), muted = neutral. */
  tone?: Tone;
}

export function MessageContent({ text, tone = "muted" }: Props) {
  return (
    <div className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Strip the default <pre> wrapper — fenced blocks render their own
          // chrome below, and we don't want a double <pre>.
          pre: ({ children }) => <>{children}</>,

          code: ({ className, children, ...rest }) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match?.[1];
            const raw = String(children ?? "");
            // A node is a fenced block if it has a language hint OR the text
            // spans multiple lines. Single-line `inline` code falls through.
            const isBlock = !!lang || raw.includes("\n");

            if (isBlock) {
              const body = raw.replace(/\n$/, "");
              if (lang === "mermaid") {
                return <MermaidView code={body} tone={tone} />;
              }
              return (
                <FencedCode language={lang ?? "text"} code={body} tone={tone} />
              );
            }
            return (
              <code {...rest} className={inlineCodeCls(tone)}>
                {children}
              </code>
            );
          },

          p: ({ children }) => (
            <p className="whitespace-pre-wrap [&:not(:first-child)]:mt-2">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 ml-4 list-disc space-y-0.5 marker:opacity-70">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 ml-4 list-decimal space-y-0.5 marker:opacity-70">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-1 mt-2 text-base font-semibold tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-2 text-[15px] font-semibold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 text-sm font-semibold tracking-tight">
              {children}
            </h3>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={
                tone === "primary"
                  ? "underline decoration-white/40 underline-offset-2 hover:decoration-white"
                  : "text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              }
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={
                "my-1.5 border-l-2 pl-2.5 " +
                (tone === "primary"
                  ? "border-white/40 text-white/90"
                  : "border-border text-muted-foreground")
              }
            >
              {children}
            </blockquote>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          del: ({ children }) => (
            <del className="line-through opacity-70">{children}</del>
          ),
          hr: () => (
            <hr
              className={
                "my-3 " +
                (tone === "primary" ? "border-white/20" : "border-border")
              }
            />
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th
              className={
                "border-b px-2 py-1 text-left font-semibold " +
                (tone === "primary" ? "border-white/30" : "border-border")
              }
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className={
                "border-b px-2 py-1 align-top " +
                (tone === "primary" ? "border-white/15" : "border-border/60")
              }
            >
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function inlineCodeCls(tone: Tone): string {
  return tone === "primary"
    ? "rounded bg-white/15 px-1 py-0.5 font-mono text-[12px]"
    : "rounded bg-muted-foreground/15 px-1 py-0.5 font-mono text-[12px] text-foreground";
}

// ─── Fenced code block ───────────────────────────────────────────────────

function FencedCode({
  language,
  code,
  tone,
}: {
  language: string;
  code: string;
  tone: Tone;
}) {
  // Prism doesn't have a "text" grammar; fall back to a permissive language
  // that produces unstyled tokens (so the theme still owns colors).
  const prismLang = (language === "text" ? "markup" : language) as Language;

  return (
    // `selection:*` overrides the app-wide ::selection rule (text-foreground
    // is near-black in light mode and would disappear on the dark code bg).
    <div
      className={
        "my-2 overflow-hidden rounded-lg text-[12.5px] selection:bg-sky-400/40 selection:text-white " +
        (tone === "primary"
          ? "bg-black/35 ring-1 ring-white/10"
          : "bg-[#0b0b0f] ring-1 ring-border")
      }
    >
      <div
        className={
          "flex items-center justify-between border-b px-2.5 py-1 " +
          (tone === "primary" ? "border-white/10" : "border-white/10")
        }
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
          {language}
        </span>
      </div>
      <Highlight theme={themes.vsDark} code={code} language={prismLang}>
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="scrollbar-thin m-0 overflow-x-auto px-3 py-2 font-mono text-[12px] leading-relaxed"
            style={{ ...style, background: "transparent" }}
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

// ─── Mermaid renderer ────────────────────────────────────────────────────

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let mermaidInitialized = false;

async function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  const mermaid = await mermaidPromise;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "strict",
      fontFamily: "inherit",
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function MermaidView({ code, tone }: { code: string; tone: Tone }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const id = useMemo(
    () => `msg-mermaid-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  useEffect(() => {
    if (!code) {
      setSvg(null);
      setError(null);
      return;
    }
    let cancelled = false;
    loadMermaid()
      .then((m) => m.render(id, code))
      .then((res) => {
        if (cancelled) return;
        setSvg(res.svg);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setSvg(null);
        setError(e instanceof Error ? e.message : "Render failed");
      });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  const tile =
    tone === "primary"
      ? "my-2 overflow-hidden rounded-lg bg-white/15 p-2"
      : "my-2 overflow-hidden rounded-lg border border-border bg-card p-2";

  if (error) {
    return (
      <div
        className={
          "my-2 rounded-lg border border-destructive/40 px-2.5 py-1.5 text-[11px] " +
          (tone === "primary"
            ? "bg-white/10 text-white"
            : "bg-destructive/10 text-destructive")
        }
      >
        Mermaid error: {error}
      </div>
    );
  }

  if (!svg) {
    return (
      <PendingTile tone={tone}>Rendering diagram…</PendingTile>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        aria-label="Zoom diagram"
        className={
          "group/dia relative block w-full transition-colors " + tile
        }
      >
        <div
          className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 transition-opacity group-hover/dia:opacity-100">
          <ZoomIn className="h-3 w-3" />
        </span>
      </button>
      {zoom && (
        <Lightbox src={svgToDataUri(svg)} onClose={() => setZoom(false)} />
      )}
    </>
  );
}

function PendingTile({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div
      className={
        "my-2 rounded-lg px-2.5 py-1.5 text-[11px] " +
        (tone === "primary"
          ? "bg-white/10 text-white/70"
          : "bg-muted text-muted-foreground")
      }
    >
      {children}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close diagram"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
    >
      <img
        src={src}
        alt="Mermaid diagram"
        className="max-h-full max-w-full rounded-lg bg-white p-4 shadow-2xl"
      />
    </button>
  );
}