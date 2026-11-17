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
 */
import { useEffect, useState } from "react";

/**
 * Movement, in px, that must build up in one direction before it counts.
 * Absorbs trackpad jitter and sub-pixel scroll noise so the hint doesn't
 * flicker; slow scrolls still accumulate past it.
 */
const TOLERANCE = 8;

export function useHideOnScrollUp(enabled: boolean): boolean {
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
      const top = readScrollTop(target);
      const anchor = anchors.get(target);
      if (anchor === undefined) {
        anchors.set(target, top);
        return;
      }
      const delta = top - anchor;
      if (Math.abs(delta) < TOLERANCE) return;
      anchors.set(target, top);
      setHidden(delta < 0);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      setHidden(false);
    };
  }, [enabled]);

  return enabled && hidden;
}

/**
 * Scroll offset of the element that fired the event (`document` for the
 * window), clamped to its real range — iOS rubber-banding past either end
 * otherwise reports a bounce back as a scroll in the opposite direction.
 */
function readScrollTop(target: EventTarget): number {
  const el =
    target instanceof Element ? target : document.scrollingElement;
  if (!el) return 0;
  const max = el.scrollHeight - el.clientHeight;
  return Math.min(Math.max(el.scrollTop, 0), Math.max(max, 0));
}
