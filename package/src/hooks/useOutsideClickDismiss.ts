/**
 * useOutsideClickDismiss — closes the active typeahead menu of `editor` when
 * the user clicks (or touches) outside the composer root and outside any
 * open popover. Disabled when `enabled` is false; safe to call
 * unconditionally because the listeners are only attached while enabled.
 *
 * "Outside" means: the event target is not a descendant of
 * `[data-composer-root]` and not a descendant of an element rendered by
 * `<SmartPopover />` (which carries `data-composer-popover-placement`).
 *
 * Closing is performed by dispatching `KEY_ESCAPE_COMMAND` on the editor —
 * the same path used by Lexical's typeahead plugin when the user presses
 * Escape, so dismissal feels native and triggers `onClose` callbacks.
 */
import { useEffect } from "react";
import { KEY_ESCAPE_COMMAND, type LexicalEditor } from "lexical";

export function useOutsideClickDismiss(
  editor: LexicalEditor,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    const dismiss = () => {
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      editor.dispatchCommand(KEY_ESCAPE_COMMAND, event);
    };

    const isOutside = (target: EventTarget | null): boolean => {
      if (!(target instanceof Node)) return false;
      const popover = document.querySelector(
        "[data-composer-popover-placement]",
      );
      if (!popover) return false; // No menu open — nothing to dismiss
      if (popover.contains(target)) return false;

      const el =
        target instanceof Element
          ? target
          : (target.parentElement as Element | null);
      if (!el) return true;
      if (el.closest("[data-composer-root]")) return false;
      return true;
    };

    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target =
        e instanceof TouchEvent ? e.touches[0]?.target ?? null : e.target;
      if (isOutside(target)) dismiss();
    };

    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("touchstart", onPointer, true);
    return () => {
      document.removeEventListener("mousedown", onPointer, true);
      document.removeEventListener("touchstart", onPointer, true);
    };
  }, [editor, enabled]);
}