/**
 * useMenuButton — open/close and keyboard behaviour for a toolbar button that
 * opens a small popover menu (the attachment-type picker, the model picker).
 *
 *   - Click the trigger to toggle. The menu opens on `initialIndex`.
 *   - Outside click (honouring `closeMenusOnOutsideClick`) or Escape closes
 *     it; Escape also hands focus back to the trigger.
 *   - Arrow keys / Home / End move the active row; Enter / Space pick it.
 *   - Hover moves the active row too, and keyboard focus follows the active
 *     row either way, so Enter always picks the highlighted row.
 *
 * The caller renders the trigger and rows itself and wires them to the
 * returned refs and handlers; this hook owns no markup.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useComposerContext } from "../core/ComposerProvider";

interface Options {
  /** Number of rows in the menu. */
  count: number;
  /** Row that is active when the menu opens. Defaults to `0`. */
  initialIndex?: number;
  /** Called with the picked row's index, after the menu has closed. */
  onPick: (index: number) => void;
}

export function useMenuButton({ count, initialIndex = 0, onPick }: Options) {
  const { closeMenusOnOutsideClick } = useComposerContext();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  // Read through a ref so a caller's inline `onPick` doesn't rebind the
  // document listeners on every render.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    setActiveIndex(initialIndex);
    setOpen(true);
  }, [open, initialIndex]);

  const pick = useCallback(
    (index: number) => {
      if (index < 0 || index >= count) return;
      close();
      onPickRef.current(index);
    },
    [count, close],
  );

  useEffect(() => {
    if (!open || !closeMenusOnOutsideClick) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, closeMenusOnOutsideClick, close]);

  // Rebound whenever the active row changes so Enter reads the current
  // `activeIndex` rather than a stale closure.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % count);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + count) % count);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(count - 1);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        // Only intercept while focus is inside the menu — otherwise the user
        // is typing in the editor and Enter must keep its submit semantics.
        if (popoverRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          pick(activeIndex);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, count, activeIndex, pick, close]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  return {
    open,
    toggle,
    pick,
    activeIndex,
    setActiveIndex,
    triggerRef,
    popoverRef,
    itemRefs,
    menuId,
  };
}
