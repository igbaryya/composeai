/**
 * MermaidPlugin — detects ```mermaid code blocks inside the editor and renders
 * a live preview of every diagram.
 *
 * The detection logic lives in {@link MermaidProvider}; two presentation
 * surfaces consume the detected diagrams from context:
 *
 *   - {@link MermaidPreview} — the inline "Diagram preview" footer used by the
 *     `full` variant. It sits below the toolbar row, always visible while a
 *     fence exists.
 *   - {@link MermaidQuickAction} — the `compact` variant's collapsed trigger.
 *     The slim chat-bar has no room for an always-on preview row, so the
 *     diagrams collapse behind a small sparkle button rendered *beside the "+"*.
 *     Pressing it pops the same tiles open on demand.
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
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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

interface MermaidContextValue {
  diagrams: DetectedDiagram[];
  renderDiagram?: DiagramRenderer;
}

const MermaidContext = createContext<MermaidContextValue | null>(null);

/** Read the diagrams detected by the nearest {@link MermaidProvider}. Returns
 *  `null` when no provider is mounted (mermaid disabled), so consumers can
 *  short-circuit to `null`. */
function useMermaidContext(): MermaidContextValue | null {
  return useContext(MermaidContext);
}

/**
 * Scans the editor for ```mermaid fences and publishes the detected diagrams
 * on context. Also owns the `keepSource: false` source-hiding behaviour. Mount
 * this once, wrapping whatever surfaces want to read the diagrams (the footer
 * preview and/or the compact "+" quick action).
 */
export function MermaidProvider({ children }: { children: ReactNode }) {
  const [editor] = useLexicalComposerContext();
  const { features, renderDiagram } = useComposerContext();
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

  const value = useMemo<MermaidContextValue>(
    () => ({ diagrams, renderDiagram }),
    [diagrams, renderDiagram],
  );

  return (
    <MermaidContext.Provider value={value}>
      {children}
      <MermaidBackground />
    </MermaidContext.Provider>
  );
}

/**
 * Renders each detected diagram as a faint watermark *behind* its ```mermaid
 * code box in the editor. The code box is a stack of separate line-paragraphs
 * with no single wrapper, so we measure the union rect of the fence paragraphs
 * and portal an absolutely-positioned backdrop into the editor block, sitting
 * beneath the (now translucent) code fill. Backdrops only apply to the
 * built-in mermaid SVG — a consumer `renderDiagram` returns arbitrary React,
 * not an image, so it keeps the popover preview instead.
 */
function MermaidBackground() {
  const ctx = useMermaidContext();
  if (!ctx || ctx.renderDiagram) return null;
  return (
    <>
      {ctx.diagrams.map((d) => (
        <DiagramBackdrop key={d.id} diagram={d} />
      ))}
    </>
  );
}

interface BackdropRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function DiagramBackdrop({ diagram }: { diagram: DetectedDiagram }) {
  const [editor] = useLexicalComposerContext();
  const { svg } = useDiagramSvg(diagram);
  const [rect, setRect] = useState<BackdropRect | null>(null);
  const dataUri = useMemo(() => (svg ? svgToDataUri(svg) : null), [svg]);

  useEffect(() => {
    if (!svg) {
      setRect(null);
      return;
    }
    const root = editor.getRootElement();
    const block = root?.parentElement;
    if (!root || !block) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const blockRect = block.getBoundingClientRect();
      let top = Infinity;
      let left = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      let any = false;
      for (const key of diagram.paragraphKeys) {
        const el = editor.getElementByKey(key);
        if (!el) continue;
        any = true;
        const r = el.getBoundingClientRect();
        top = Math.min(top, r.top);
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
        bottom = Math.max(bottom, r.bottom);
      }
      if (!any) {
        setRect(null);
        return;
      }
      // Position relative to the editor block, clamped to its visible box so a
      // partially-scrolled fence never paints over the toolbar/header (the
      // block isn't `overflow: hidden`, to avoid clipping the typeahead menus).
      const relTop = top - blockRect.top;
      const visTop = Math.max(0, relTop);
      const visBottom = Math.min(blockRect.height, relTop + (bottom - top));
      if (visBottom <= visTop) {
        setRect(null);
        return;
      }
      setRect({
        top: visTop,
        left: left - blockRect.left,
        width: right - left,
        height: visBottom - visTop,
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    schedule();
    const unregister = editor.registerUpdateListener(schedule);
    root.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      unregister();
      root.removeEventListener("scroll", schedule);
      ro.disconnect();
    };
  }, [editor, svg, diagram.paragraphKeys]);

  const block = editor.getRootElement()?.parentElement;
  if (!dataUri || !rect || !block) return null;

  return createPortal(
    <div
      aria-hidden
      className="composer-mermaid-backdrop"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        backgroundImage: `url("${dataUri}")`,
      }}
    />,
    block,
  );
}

/**
 * Inline "Diagram preview" footer — the `full` variant's always-on preview
 * row. Renders nothing until a fence is detected.
 */
export function MermaidPreview() {
  const ctx = useMermaidContext();
  const { icons, classNames, sx } = useComposerContext();
  const { sparkle: SparkleIcon } = icons;

  if (!ctx || ctx.diagrams.length === 0) return null;

  const preview = slotProps("mermaidPreview", "composer-mermaid", classNames, sx);

  return (
    <div {...preview}>
      <div className="composer-mermaid-head">
        <SparkleIcon />
        Diagram preview
      </div>
      <div className="composer-mermaid-row">
        {ctx.diagrams.map((d) => (
          <DiagramTile key={d.id} diagram={d} renderDiagram={ctx.renderDiagram} />
        ))}
      </div>
    </div>
  );
}

/**
 * Compact-variant trigger — a small sparkle button that sits beside the "+"
 * quick-actions button. Hidden until a fence is detected; once diagrams exist
 * it shows a count badge and pops the preview tiles open on click (upward,
 * matching the "+" popover). Keeps the slim chat-bar uncluttered while still
 * surfacing the rendered diagram on demand.
 */
export function MermaidQuickAction() {
  const ctx = useMermaidContext();
  const { icons, closeMenusOnOutsideClick } = useComposerContext();
  const { sparkle: SparkleIcon } = icons;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  // Outside-click + Escape close the popover, honouring the same global pref
  // as the other composer menus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!closeMenusOnOutsideClick) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenusOnOutsideClick]);

  if (!ctx || ctx.diagrams.length === 0) return null;
  const count = ctx.diagrams.length;

  return (
    <div className="composer-quick-actions">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Diagram preview (${count})`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-active={open ? "" : undefined}
        onClick={() => setOpen((o) => !o)}
        className="composer-mermaid-trigger"
      >
        <DiagramThumb diagram={ctx.diagrams[0]} renderDiagram={ctx.renderDiagram} />
        {count > 1 && <span className="composer-mermaid-count">{count}</span>}
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={menuId}
          role="dialog"
          aria-label="Diagram preview"
          data-composer-popover="open"
          className="composer-popover-in composer-mermaid-pop"
        >
          <div className="composer-mermaid-head">
            <SparkleIcon />
            Diagram preview
          </div>
          <div className="composer-mermaid-row">
            {ctx.diagrams.map((d) => (
              <DiagramTile key={d.id} diagram={d} renderDiagram={ctx.renderDiagram} />
            ))}
          </div>
        </div>
      )}
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

interface DiagramSvgState {
  svg: string | null;
  error: string | null;
  mermaidMissing: boolean;
}

/** Render a diagram's code to an SVG string via the lazily-loaded `mermaid`
 *  package. Shared by the full preview tile and the compact thumbnail trigger
 *  so the loading / error handling lives in one place. */
function useDiagramSvg(diagram: DetectedDiagram): DiagramSvgState {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  return { svg, error, mermaidMissing };
}

function MermaidTile({ diagram }: { diagram: DetectedDiagram }) {
  const { icons } = useComposerContext();
  const { zoom: ZoomIcon } = icons;
  const [zoom, setZoom] = useState(false);
  const { svg, error, mermaidMissing } = useDiagramSvg(diagram);

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

/**
 * Small live thumbnail of a diagram — the visual the compact trigger shows
 * beside the "+". Delegates to the consumer's `renderDiagram` when supplied,
 * otherwise renders the lazily-loaded mermaid SVG scaled down to fit the
 * control band. While the SVG is still loading it shows nothing (the parent
 * button keeps a placeholder background), so the trigger never flashes an
 * error glyph for a diagram that's about to render fine.
 */
function DiagramThumb({ diagram, renderDiagram }: TileProps) {
  if (renderDiagram) {
    return <ConsumerThumb diagram={diagram} renderDiagram={renderDiagram} />;
  }
  return <MermaidThumb diagram={diagram} />;
}

function ConsumerThumb({
  diagram,
  renderDiagram,
}: {
  diagram: DetectedDiagram;
  renderDiagram: DiagramRenderer;
}) {
  let content: ReactNode = null;
  try {
    content = renderDiagram({ code: diagram.code, language: "mermaid" });
  } catch {
    content = null;
  }
  return <span className="composer-mermaid-thumb">{content}</span>;
}

function MermaidThumb({ diagram }: { diagram: DetectedDiagram }) {
  const { svg } = useDiagramSvg(diagram);
  if (!svg) return <span className="composer-mermaid-thumb" />;
  return (
    <span
      className="composer-mermaid-thumb"
      // SVG is generated by mermaid (securityLevel: strict).
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
