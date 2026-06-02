/**
 * SmartPopover — positions a typeahead menu relative to the trigger
 * character (`@`/`/`/`#`/…) that opened it.
 *
 * Two RTL/bidi pitfalls we have to navigate:
 *
 * 1. Chromium resolves `Range#getBoundingClientRect()` for ranges that
 *    span more than one bidi run (the caret at a run boundary, or
 *    Lexical's `[trigger, caret]` range) against the paragraph's
 *    *logical* origin — which can be on the visually opposite side of
 *    the line from where the trigger glyph is actually painted. Anchor
 *    a menu to that rect and it lands on the far side of the screen.
 *
 *    Workaround: walk back from the caret inside its host TextNode,
 *    find the single trigger character, build a `Range` over *just
 *    that one character*, and use that range's bbox. Single-character
 *    ranges always sit wholly inside one bidi run, so their box is
 *    the real painted glyph position in every mixed-bidi permutation.
 *
 * 2. Lexical's bidi handling lives at the *paragraph* level (it sets
 *    `dir` on the paragraph element based on the first strong char
 *    typed). So a `dir="rtl"` composer can perfectly happily contain
 *    an `dir="ltr"` paragraph (`test @|`) — the trigger glyph is then
 *    laid out left-aligned at the visual *left* of the editor card,
 *    even though the surrounding chrome is RTL. If we keyed alignment
 *    off the outer composer's `dir` we'd open the menu leftward of an
 *    `@` that's already on the left — straight off-screen.
 *
 *    Workaround: ask for the resolved CSS `direction` of the trigger
 *    character's parent paragraph (the actual element it lives in),
 *    not the editor wrapper. The menu opens into the reading flow of
 *    the text the user is actually typing, regardless of the outer
 *    `dir` setting. The `dir` prop is only used as an explicit
 *    override hint for `dir="ltr"` and `dir="rtl"` when we can't
 *    locate a paragraph (defensive fallback).
 *
 * Other notes:
 *   - We render with `position: fixed` and viewport coordinates.
 *     Lexical mounts its typeahead anchor under `<body>` and re-
 *     positions it for its own overflow heuristic, so offset-parent-
 *     relative positioning is unreliable.
 *   - Vertical flip: when there isn't enough room below the trigger we
 *     pin the menu's bottom edge just above the entire composer card.
 *   - Recomputed on scroll, resize, selection change, anchor resize and
 *     self-resize (the menu height changes as the filter narrows).
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useComposerContext } from "../core/ComposerProvider";

interface Props {
  children: ReactNode;
  /** Gap between the menu and its anchor (caret or composer edge). */
  gap?: number;
}

interface Placement {
  /** Final viewport-x for the menu's left edge. */
  left: number;
  /** Final viewport-y. Either `top` or `bottom` is set, never both. */
  top?: number;
  bottom?: number;
  /**
   * Resolved direction at the trigger character — used to set `dir`
   * on the popover wrapper so the menu's content (avatars, shortcuts,
   * descriptions) flips with the reading flow of the text the user
   * is actually typing.
   */
  rtl: boolean;
}

const MARGIN = 8;

function findComposerRoot(anchor: HTMLElement | null): HTMLElement | null {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    const root = active.closest<HTMLElement>("[data-composer-root]");
    if (root) return root;
  }
  if (anchor) {
    const anchorRect = anchor.getBoundingClientRect();
    const x = anchorRect.left + 1;
    const y = anchorRect.top + 1;
    const el = document.elementFromPoint(x, y);
    if (el instanceof HTMLElement) {
      const root = el.closest<HTMLElement>("[data-composer-root]");
      if (root) return root;
    }
  }
  return document.querySelector<HTMLElement>("[data-composer-root]");
}

interface CaretRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface TriggerInfo {
  rect: CaretRect;
  /**
   * Resolved CSS direction of the *paragraph element* that visually
   * contains the trigger character. This is what we key the menu's
   * inline-start alignment off — it reflects the actual reading
   * direction of the text the user is typing, even when it differs
   * from the outer composer `dir`.
   */
  rtl: boolean;
}

function rectFromDom(rect: DOMRect): CaretRect {
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

// Word-class characters across the scripts the composer is most likely
// to encounter. We treat anything in this set as "not a trigger". Latin
// letters and digits, Hebrew, Arabic, Persian/Urdu, CJK, plus the
// underscore and any whitespace.
const WORD_OR_SPACE = /[A-Za-z0-9_\s\u0590-\u05FF\u0600-\u06FF\u4E00-\u9FFF]/;

/**
 * Walk up to the closest block-level ancestor that has a `dir`/CSS
 * `direction` we can read. This is typically the Lexical paragraph
 * the trigger character lives in — Lexical sets `dir` on the
 * paragraph element based on the first strong character typed, which
 * is exactly what we want to follow.
 */
function isBlockRtl(node: Node): boolean | null {
  let el: Element | null =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  while (el) {
    // Read the *resolved* direction. Lexical applies `dir` as an
    // attribute on its paragraph element which CSS resolves into
    // `direction`. We don't need to crawl `dir` attributes by hand.
    const display = getComputedStyle(el).display;
    if (display && display !== "inline" && display !== "contents") {
      return getComputedStyle(el).direction === "rtl";
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Walk back from the live caret inside its host text node, find the
 * single trigger character (`@`/`/`/`#`/`?`/etc.), and return the
 * bounding rect of *just that character* together with the resolved
 * direction of its containing paragraph.
 *
 * The single-character `Range` trick is what makes this bidi-safe:
 * spanning multiple offsets across a bidi-run boundary (which is what
 * Lexical's anchor range does) gives a bbox the bidi engine resolves
 * against the line's logical origin — often on the opposite visual
 * side from the painted glyph. A range over one character sits wholly
 * inside one bidi run and always reports the real painted position.
 */
function readTriggerInfo(): TriggerInfo | null {
  if (typeof window === "undefined") return null;
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = (node as Text).data;
  const cursorOffset = range.startOffset;

  // Look back at most ~64 chars — the default typeahead match window
  // is 32, so this is more than enough headroom while still bounding
  // the search.
  let triggerOffset = -1;
  const lookbackStart = Math.max(0, cursorOffset - 64);
  for (let i = cursorOffset - 1; i >= lookbackStart; i--) {
    const c = text[i];
    if (WORD_OR_SPACE.test(c)) continue;
    triggerOffset = i;
    break;
  }
  if (triggerOffset < 0) return null;

  const triggerRange = document.createRange();
  try {
    triggerRange.setStart(node, triggerOffset);
    triggerRange.setEnd(node, triggerOffset + 1);
  } catch {
    return null;
  }
  const rect = triggerRange.getBoundingClientRect();
  if (rect.height === 0 && rect.width === 0) return null;

  return {
    rect: rectFromDom(rect),
    rtl: isBlockRtl(node) ?? false,
  };
}

/**
 * Last-resort positioning info when we can't pinpoint the trigger
 * character. Falls back to the live caret rect, then to the Lexical
 * anchor element's rect, and infers direction from the editor wrapper.
 */
function readFallbackInfo(
  fallback: HTMLElement,
  dirHint: "ltr" | "rtl" | "auto" | undefined,
): TriggerInfo {
  const sel = typeof window !== "undefined" ? window.getSelection?.() : null;
  let rect: CaretRect;
  if (sel && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0).getBoundingClientRect();
    rect =
      r.height > 0 || r.width > 0
        ? rectFromDom(r)
        : rectFromDom(fallback.getBoundingClientRect());
    const blockRtl =
      sel.rangeCount > 0
        ? isBlockRtl(sel.getRangeAt(0).startContainer)
        : null;
    if (blockRtl !== null) return { rect, rtl: blockRtl };
  } else {
    rect = rectFromDom(fallback.getBoundingClientRect());
  }
  if (dirHint === "rtl") return { rect, rtl: true };
  if (dirHint === "ltr") return { rect, rtl: false };
  // Last fallback: the editor wrapper's resolved direction.
  const root =
    fallback.closest<HTMLElement>("[data-composer-root]") ??
    document.querySelector<HTMLElement>("[data-composer-root]");
  const editor = root?.querySelector<HTMLElement>(".composer-editor");
  const probe = editor ?? root ?? fallback;
  return { rect, rtl: getComputedStyle(probe).direction === "rtl" };
}

export function SmartPopover({ children, gap = 6 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  // Lexical mounts the typeahead anchor under <body>, escaping the inline
  // CSS variables we set on `[data-composer-root]`. Re-apply them here so
  // the brand-colour tokens reach the menu's children (selected row bg,
  // mention avatar, etc.).
  const { tokenStyle, dir } = useComposerContext();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anchor = el.parentElement;
    if (!anchor) return;

    const update = () => {
      // Find the trigger character's actual painted rect (single-char
      // range — bidi-safe) and the resolved direction of its host
      // paragraph. Fall back to the caret / Lexical anchor rect if we
      // can't locate the trigger (unusual editor state).
      const info = readTriggerInfo() ?? readFallbackInfo(anchor, dir);
      const triggerRect = info.rect;

      const menuHeight = el.offsetHeight;
      const menuWidth = el.offsetWidth;
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;

      // Inline-start alignment, keyed off the *paragraph's* direction
      // (not the outer composer's). In LTR the menu's left edge meets
      // the trigger's left edge; in RTL its right edge meets the
      // trigger's right edge. The popup therefore opens into the line's
      // actual reading flow even when an LTR run lives inside an RTL
      // composer or vice versa.
      const baseLeft = info.rtl
        ? triggerRect.right - menuWidth
        : triggerRect.left;

      // Clamp to the viewport so the menu never escapes either edge.
      let left = baseLeft;
      if (left + menuWidth + MARGIN > viewportW) {
        left = viewportW - menuWidth - MARGIN;
      }
      if (left < MARGIN) left = MARGIN;

      // Vertical: prefer below, flip above (anchored to the composer's
      // top edge) when the menu would clip the viewport bottom.
      const spaceBelow = viewportH - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const wantsAbove =
        spaceBelow < menuHeight + MARGIN && spaceAbove > spaceBelow;

      let next: Placement;
      if (wantsAbove) {
        const composerRoot = findComposerRoot(anchor);
        const topEdge = composerRoot
          ? composerRoot.getBoundingClientRect().top
          : triggerRect.top;
        next = {
          left,
          bottom: Math.max(MARGIN, viewportH - topEdge + gap),
          rtl: info.rtl,
        };
      } else {
        next = { left, top: triggerRect.bottom + gap, rtl: info.rtl };
      }

      setPlacement((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.rtl === next.rtl
          ? prev
          : next,
      );
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Lexical re-positions its anchor element as the caret moves. We
    // don't read the anchor's rect anymore, but observing its size still
    // gives us a free reposition signal whenever the typeahead match
    // grows or shrinks — handy because `selectionchange` doesn't fire
    // for typing-only changes inside an already-collapsed selection.
    ro.observe(anchor);
    // Caret-driven repositioning. The selection's range moves under our
    // feet as the user types, arrows around, or clicks elsewhere; this
    // keeps the menu glued to that movement without leaning on Lexical's
    // own (sometimes-misplaced) anchor.
    document.addEventListener("selectionchange", update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [children, gap, dir]);

  const style: React.CSSProperties =
    placement === null
      ? {
          position: "fixed",
          left: 0,
          top: 0,
          visibility: "hidden",
          zIndex: 60,
        }
      : {
          position: "fixed",
          left: placement.left,
          top: placement.top,
          bottom: placement.bottom,
          zIndex: 60,
        };

  // Merge the consumer's token CSS vars first so positioning props (which
  // can be `undefined`) don't blow them away.
  const mergedStyle: React.CSSProperties = tokenStyle
    ? { ...tokenStyle, ...style }
    : style;

  return (
    <div
      ref={ref}
      data-composer-popover-placement={
        placement?.bottom !== undefined ? "above-composer" : "below"
      }
      // Match the popover's inline direction to the resolved direction
      // at the trigger character. Children (mention rows, slash items,
      // shortcuts) use logical flexbox + `ms-*`/`me-*` utilities so
      // setting `dir` here is enough to flip avatars to the start side,
      // shortcuts to the end side, and text alignment to follow the
      // language being typed.
      dir={placement?.rtl ? "rtl" : "ltr"}
      style={mergedStyle}
    >
      {children}
    </div>
  );
}