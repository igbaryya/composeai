/**
 * MermaidPlugin — detects ```mermaid code blocks inside the editor and shows
 * an inline preview row below the contenteditable surface.
 *
 * Rendering strategy (in priority order):
 *   1. If the consumer supplied a `renderDiagram` prop on <Composer />, every
 *      detected diagram is delegated to that callback. The `mermaid` package
 *      is never loaded, so consumers who already own a diagram pipeline can
 *      omit `mermaid` from their install entirely.
 *   2. Otherwise, the optional `mermaid` peer package is dynamic-imported on
 *      first sighting. If the import fails (package not installed), we log
 *      one friendly warning and render a small "install mermaid or pass
 *      renderDiagram" hint in place of the diagram.
 *
 * When `features.mermaid.keepSource === false`, the raw ```mermaid code
 * blocks are visually hidden from the editor (still present in the editor
 * state, so they survive serialization) — only the rendered diagram tiles
 * are shown. Default is `true` so the user keeps seeing the code they
 * authored alongside the live preview.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $isParagraphNode } from "lexical";
import { ImageLightbox } from "../ui/ImageLightbox";
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import type { DiagramRenderer } from "../types";

interface DetectedDiagram {
  /** Stable id — paragraph key of the opening ```mermaid fence. */
  id: string;
  code: string;
  /** Keys of every paragraph that participates in this diagram (open fence,
   *  code lines, optional close fence) so we can hide them in `!keepSource`. */
  paragraphKeys: string[];
}

const FENCE_OPEN_MERMAID = /^```mermaid(?:\s.*)?$/;
const FENCE_CLOSE = /^```\s*$/;

// Type-only — the actual module is loaded lazily and is optional.
type MermaidModule = {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

let mermaidPromise: Promise<MermaidModule | null> | null = null;
let mermaidInitialized = false;
let mermaidMissingWarned = false;

async function loadMermaid(): Promise<MermaidModule | null> {
  if (!mermaidPromise) {
    // Static string + plain dynamic import so bundlers (Vite, Webpack,
    // Rollup, ...) can statically analyze the dependency and produce a
    // properly resolved code-split chunk. We still catch runtime errors so
    // a transient network failure (chunk 404, CDN hiccup) degrades to the
    // friendly fallback tile instead of throwing into React.
    //
    // If `mermaid` is genuinely not in the consumer's `node_modules`, the
    // *build* fails with a clear "Could not resolve 'mermaid'" error and
    // the consumer either `npm install mermaid` or supplies a
    // `renderDiagram` prop (which short-circuits this entire code path).
    mermaidPromise = import("mermaid")
      .then((m) => m.default as MermaidModule)
      .catch((err) => {
        if (!mermaidMissingWarned) {
          mermaidMissingWarned = true;
          // eslint-disable-next-line no-console
          console.warn(
            "[composeai] Failed to load the `mermaid` package. " +
              "Either `npm install mermaid` or pass a `renderDiagram` prop " +
              "to <Composer /> to render diagrams yourself.",
            err,
          );
        }
        return null;
      });
  }
  const mermaid = await mermaidPromise;
  if (mermaid && !mermaidInitialized) {
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

export function MermaidPlugin() {
  const [editor] = useLexicalComposerContext();
  const { features, icons, renderDiagram, classNames, sx } = useComposerContext();
  const { sparkle: SparkleIcon } = icons;
  const [diagrams, setDiagrams] = useState<DetectedDiagram[]>([]);

  // Default `keepSource` to true (visible) — opt-in to hide.
  const keepSource =
    typeof features.mermaid === "object"
      ? features.mermaid.keepSource !== false
      : true;

  useEffect(() => {
    const sync = () => {
      editor.getEditorState().read(() => {
        const found: DetectedDiagram[] = [];
        const root = $getRoot();
        const children = root.getChildren();

        let i = 0;
        while (i < children.length) {
          const opener = children[i];
          if (!$isParagraphNode(opener) || !FENCE_OPEN_MERMAID.test(opener.getTextContent())) {
            i++;
            continue;
          }
          // Collect every following paragraph until a closing ``` fence or
          // a non-paragraph sibling.
          const paragraphKeys: string[] = [opener.getKey()];
          const codeLines: string[] = [];
          let j = i + 1;
          while (j < children.length) {
            const next = children[j];
            if (!$isParagraphNode(next)) break;
            const text = next.getTextContent();
            paragraphKeys.push(next.getKey());
            if (FENCE_CLOSE.test(text)) {
              j++;
              break;
            }
            codeLines.push(text);
            j++;
          }
          found.push({
            id: opener.getKey(),
            code: codeLines.join("\n").trim(),
            paragraphKeys,
          });
          i = j;
        }

        setDiagrams((prev) => {
          if (
            prev.length === found.length &&
            prev.every(
              (d, idx) =>
                d.id === found[idx].id &&
                d.code === found[idx].code &&
                d.paragraphKeys.length === found[idx].paragraphKeys.length &&
                d.paragraphKeys.every((k, kk) => k === found[idx].paragraphKeys[kk]),
            )
          ) {
            return prev;
          }
          return found;
        });
      });
    };
    sync();
    return editor.registerUpdateListener(sync);
  }, [editor]);

  // Hide / re-show the mermaid fence paragraphs based on `keepSource`. We
  // imperatively toggle `display` on the rendered DOM elements — Lexical
  // recreates them on each update so we re-apply after diagrams change.
  // The previously-hidden keys are tracked so we can clean up if a fence
  // is removed or shrunk.
  const hiddenKeysRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const currentKeys = new Set<string>();
    for (const d of diagrams) for (const k of d.paragraphKeys) currentKeys.add(k);

    if (keepSource) {
      for (const key of hiddenKeysRef.current) {
        const el = editor.getElementByKey(key);
        if (el) el.style.removeProperty("display");
      }
      hiddenKeysRef.current.clear();
      return;
    }

    for (const key of hiddenKeysRef.current) {
      if (!currentKeys.has(key)) {
        const el = editor.getElementByKey(key);
        if (el) el.style.removeProperty("display");
      }
    }
    for (const key of currentKeys) {
      const el = editor.getElementByKey(key);
      if (el) el.style.display = "none";
    }
    hiddenKeysRef.current = currentKeys;
  }, [diagrams, keepSource, editor]);

  // On unmount, restore any blocks we hid so a future remount sees the
  // editor's natural rendering.
  useEffect(() => {
    return () => {
      for (const key of hiddenKeysRef.current) {
        const el = editor.getElementByKey(key);
        if (el) el.style.removeProperty("display");
      }
      hiddenKeysRef.current.clear();
    };
  }, [editor]);

  if (diagrams.length === 0) return null;

  const preview = slotProps(
    "mermaidPreview",
    "composer-mermaid",
    classNames,
    sx,
  );

  return (
    <div {...preview}>
      <div className="composer-mermaid-head">
        <SparkleIcon />
        Diagram preview
      </div>
      <div className="composer-mermaid-row">
        {diagrams.map((d) => (
          <DiagramTile
            key={d.id}
            diagram={d}
            renderDiagram={renderDiagram}
          />
        ))}
      </div>
    </div>
  );
}

interface TileProps {
  diagram: DetectedDiagram;
  renderDiagram?: DiagramRenderer;
}

function DiagramTile({ diagram, renderDiagram }: TileProps) {
  if (renderDiagram) {
    return <ConsumerTile diagram={diagram} renderDiagram={renderDiagram} />;
  }
  return <MermaidTile diagram={diagram} />;
}

function ConsumerTile({
  diagram,
  renderDiagram,
}: {
  diagram: DetectedDiagram;
  renderDiagram: DiagramRenderer;
}) {
  let content: ReactNode = null;
  try {
    content = renderDiagram({ code: diagram.code, language: "mermaid" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[composeai] renderDiagram threw", err);
    content = (
      <div className="composer-mermaid-msg composer-mermaid-msg--error">
        {err instanceof Error ? err.message.slice(0, 80) : "Render failed"}
      </div>
    );
  }
  return <div className="composer-mermaid-tile">{content}</div>;
}

function MermaidTile({ diagram }: { diagram: DetectedDiagram }) {
  const { icons } = useComposerContext();
  const { zoom: ZoomIcon } = icons;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(false);
  const [mermaidMissing, setMermaidMissing] = useState(false);
  const renderId = useMemo(
    () => `mermaid-${diagram.id}-${Math.random().toString(36).slice(2, 8)}`,
    [diagram.id],
  );

  useEffect(() => {
    let cancelled = false;
    if (!diagram.code) {
      setSvg(null);
      return;
    }
    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return null;
        if (!mermaid) {
          setMermaidMissing(true);
          return null;
        }
        return mermaid.render(renderId, diagram.code);
      })
      .then((result) => {
        if (cancelled || !result) return;
        setSvg(result.svg);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Render failed";
        setError(msg);
        setSvg(null);
      });
    return () => {
      cancelled = true;
    };
  }, [diagram.code, renderId]);

  return (
    <>
      <button
        type="button"
        onClick={() => svg && setZoom(true)}
        aria-label="Zoom diagram"
        className="composer-mermaid-tile"
      >
        {svg ? (
          <>
            <div
              className="composer-mermaid-svg"
              // SVG is generated by mermaid (securityLevel: strict).
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <span className="composer-mermaid-zoom">
              <ZoomIcon />
            </span>
          </>
        ) : mermaidMissing ? (
          <div className="composer-mermaid-msg">
            <span>
              Install <code className="composer-mermaid-code">mermaid</code> or
              pass <code className="composer-mermaid-code">renderDiagram</code>
            </span>
          </div>
        ) : error ? (
          <div className="composer-mermaid-msg composer-mermaid-msg--error">
            <span>{error.slice(0, 80)}</span>
          </div>
        ) : (
          <div className="composer-mermaid-msg">
            <span>Rendering…</span>
          </div>
        )}
      </button>
      {zoom && svg && (
        <ImageLightbox
          src={svgToDataUri(svg)}
          alt="Mermaid diagram"
          onClose={() => setZoom(false)}
        />
      )}
    </>
  );
}