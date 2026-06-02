/**
 * Empty-state shown at the top of an empty chat. Renders the active demo's
 * details as a fresh assistant turn: avatar + name header followed by a
 * markdown-styled body with prose, a "Try it" list, and a copyable TSX
 * snippet that wires the demo into a real app.
 *
 * The assistant's display name is derived from the library's `package.json`
 * (`name` field) so the persona stays in sync with whatever the package is
 * called — no hardcoded brand strings.
 */
import { useState } from "react";
import { Check, Copy, Info, Sparkles } from "lucide-react";
import { Highlight, themes, type Language } from "prism-react-renderer";
import pkg from "../../package/package.json";
import type { DemoSpec } from "./demos";

/**
 * Convert an npm package name into a friendly display name.
 *
 *   "composeai"  → "ComposeAI"
 *   "@scope/foo-bar"     → "Scope Foo Bar"
 *   "single-package"     → "Single Package"
 */
function packageDisplayName(name: string): string {
  return name
    .replace(/^@/, "")
    .split(/[/_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const ASSISTANT_NAME = packageDisplayName(pkg.name);

interface Props {
  demo: DemoSpec;
}

export function EmptyState({ demo }: Props) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <article className="flex w-full gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
        >
          <Sparkles className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <header className="mb-2 flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">
              {ASSISTANT_NAME}
            </span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {demo.group}
            </span>
          </header>

          <div className="prose-chat space-y-4 text-sm leading-relaxed text-foreground">
            <h2 className="text-base font-semibold tracking-tight">
              {demo.title}
            </h2>

            {/* `div`, not `p` — demo descriptions are arbitrary React nodes
                and several of them contain block-level elements (`<ul>`,
                `<aside>`, etc.) that React's DOM-nesting validator will
                rightly reject inside a paragraph. */}
            <div className="text-foreground/90">{demo.description}</div>

            {demo.prerequisites && demo.prerequisites.length > 0 && (
              <aside
                className="not-prose flex gap-2.5 rounded-xl border border-amber-400/30 bg-amber-50/60 px-3.5 py-2.5 text-[13px] leading-snug text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
                role="note"
                aria-label="Prerequisites for this demo"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 font-semibold tracking-tight">
                    Prerequisites
                  </div>
                  <ul className="ml-1 list-disc space-y-1 pl-4 marker:text-amber-600/70 dark:marker:text-amber-400/70">
                    {demo.prerequisites.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </aside>
            )}

            {demo.tryIt.length > 0 && (
              <>
                <p className="font-semibold text-foreground">Try it</p>
                <ul className="ml-1 list-disc space-y-1 pl-4 marker:text-muted-foreground">
                  {demo.tryIt.map((item) => (
                    <li key={item} className="leading-snug">
                      {item}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="text-foreground/90">
              Drop this snippet into your app to reproduce the configuration:
            </p>

            <CodeBlock language="tsx" code={demo.code} />
          </div>
        </div>
      </article>
    </div>
  );
}

/**
 * Markdown-style fenced code block with syntax highlighting (Prism) and a
 * Copy button. The header shows the language label on the left and the
 * copy affordance on the right.
 */
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/\n+$/, "");

  const handleCopy = async () => {
    try {
      // Copy the raw markdown fence so users can paste it directly into a
      // markdown doc, README, or another chat.
      const fenced = `\`\`\`${language}\n${trimmed}\n\`\`\`\n`;
      await navigator.clipboard.writeText(fenced);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  };

  return (
    // The `selection:*` utilities override the app-wide ::selection rule
    // (which uses `text-foreground` / near-black) so highlighted code stays
    // legible on the dark code surface in both light and dark themes.
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
            // Override the theme's bg with a slightly deeper black so the
            // header strip and body share the same canvas.
            style={{ ...style, background: "#0b0b0f" }}
          >
            <code>
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps}>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}