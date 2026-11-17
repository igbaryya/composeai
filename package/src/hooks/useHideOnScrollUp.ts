/**
 * useHideOnScrollUp — `true` while the page is being scrolled up, `false`
 * again as soon as it scrolls down. Drives `hideHintOnScrollUp`: a composer
 * pinned to the bottom of a chat sheds its hint while the user reads back
 * through the history, and gets it back when they return toward the latest
 * message.
 *
 * Which element scrolls is not ours to know — the window, or (far more often
 * in a chat layout) an inner message list. So one capture-phase listener on
 * `document` hears every scroll on the page, and each scroller's position is
 * tracked separately so switching between them never reads as a jump.
 *
 * Scrolls inside a composer (the editor's own overflow, its menus, the quick
 * prompt row) are ignored: they aren't the page moving.
 *
 * Near the end of a scroller the hint stays put. When the composer sits in
 * the same flex column as the message list (the usual chat layout, as opposed
 * to `position: fixed`), collapsing the hint makes the list taller by exactly
 * the space the hint held, which pulls the list's end toward the reader. Hide
 * any closer to the end than that and the browser clamps the scroll position
 * onto the new end — leaving no room to scroll down, so the hint could never
 * come back. Hiding only with more than that space (plus the tolerance) still
 * below guarantees the reader can always scroll down far enough to restore it.
 */
import { useEffect, useState, type RefObject } from "react";

/**
 * Movement, in px, that must build up in one direction before it counts.
 * Absorbs trackpad jitter and sub-pixel scroll noise so the hint doesn't
 * flicker; slow scrolls still accumulate past it.
 */
const TOLERANCE = 8;

export function useHideOnScrollUp(
  enabled: boolean,
  hintRef: RefObject<HTMLElement | null>,
): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Last position that counted, per scroller.
    const anchors = new WeakMap<EventTarget, number>();
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!target) return;
      if (target instanceof Element && target.closest("[data-composer-scope]")) {
        return;
      }
      const scroller =
        target instanceof Element ? target : document.scrollingElement;
      if (!scroller) return;
      const { top, max } = readScroll(scroller);
      const anchor = anchors.get(target);
      if (anchor === undefined) {
        anchors.set(target, top);
        return;
      }
      if (Math.abs(top - anchor) < TOLERANCE) return;
      anchors.set(target, top);
      if (top > anchor) {
        setHidden(false);
        return;
      }
      const hint = hintRef.current;
      if (hint && max - top > heldSpace(hint) + TOLERANCE) setHidden(true);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      setHidden(false);
    };
  }, [enabled, hintRef]);

  return enabled && hidden;
}

/**
 * Scroll offset and its maximum. The offset is clamped to the real range —
 * iOS rubber-banding past either end otherwise reports the bounce back as a
 * scroll in the opposite direction.
 */
function readScroll(scroller: Element): { top: number; max: number } {
  const max = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
  return { top: Math.min(Math.max(scroller.scrollTop, 0), max), max };
}

/**
 * Space the hint adds to the composer: from the bottom of whatever sits
 * above it (the card) to the bottom of the composer root — the root gap, the
 * hint itself, and any margins a host without a CSS reset leaves on the
 * `<p>`. That is how far a scroller's end can move when the hint collapses.
 */
function heldSpace(hint: HTMLElement): number {
  const root = hint.parentElement;
  const above = hint.previousElementSibling;
  if (!root || !above) return hint.offsetHeight;
  return (
    root.getBoundingClientRect().bottom - above.getBoundingClientRect().bottom
  );
}
