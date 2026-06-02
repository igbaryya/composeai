/**
 * AttachmentTypePicker — the paperclip-as-popover variant of the toolbar's
 * attachment button. Used when the consumer supplies a non-empty
 * `attachments.types` list; otherwise the toolbar renders the plain
 * single-click paperclip instead.
 *
 * Interaction model:
 *   - Click paperclip → opens a small dropdown menu listing the types.
 *   - Click a type   → closes the menu and opens the OS file picker
 *                       scoped to that type's `accept` value.
 *   - Outside click / Escape / second paperclip click → closes the menu.
 *   - Arrow keys + Enter / Space navigate and pick (a11y friendly).
 *
 * Positioning: the popover is `position: absolute` anchored to the
 * paperclip's wrapper. The toolbar lives at the bottom of the composer
 * card, so we open *upward* (`bottom-full`). Logical alignment (`start-0`)
 * keeps it on the toolbar side in both LTR and RTL.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "../internal/cn";
import { useComposerContext } from "../core/ComposerProvider";
import type { IconComponent } from "../internal/icons";
import type { AttachmentTypeOption } from "../types";

interface Props {
  types: AttachmentTypeOption[];
  /** Forwarded to the hidden `<input type=file>`. */
  addFiles: (files: File[]) => void;
  /** Resolved className for the trigger button, from the slot system. */
  triggerClassName: string;
  /** Resolved inline style for the trigger button, from the slot system. */
  triggerStyle?: React.CSSProperties;
  /** Icon component the toolbar uses for the paperclip. */
  TriggerIcon: IconComponent;
}

export function AttachmentTypePicker({
  types,
  addFiles,
  triggerClassName,
  triggerStyle,
  TriggerIcon,
}: Props) {
  const { closeMenusOnOutsideClick } = useComposerContext();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  const triggerPicker = useCallback(
    (type: AttachmentTypeOption) => {
      const input = fileInputRef.current;
      if (!input) return;
      // Imperatively set accept so we don't have to round-trip through a
      // React re-render before clicking — keeps the dialog snappy.
      input.accept = type.accept;
      input.click();
    },
    [],
  );

  const pick = useCallback(
    (index: number) => {
      const type = types[index];
      if (!type) return;
      close();
      triggerRef.current?.focus();
      triggerPicker(type);
    },
    [types, close, triggerPicker],
  );

  // Outside click — honours the same global pref as the typeahead menus.
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

  // Escape closes; arrow keys move the active row. We rebind on every open
  // so the listener captures the up-to-date `activeIndex` via the state
  // setter (not via a stale closure).
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
        setActiveIndex((i) => (i + 1) % types.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + types.length) % types.length);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(types.length - 1);
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        // Only intercept if focus is inside the popover — otherwise the
        // user is typing in the editor and Enter must keep its normal
        // submit semantics.
        if (popoverRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          pick(activeIndex);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, types.length, activeIndex, pick, close]);

  // Move keyboard focus onto the active row when the menu opens or the
  // active row changes via arrows. Mouse hover updates activeIndex without
  // stealing focus (we only call focus() when open transitions or on a key
  // event, not on hover).
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  // When opening, reset to the first row. When closing, drop any picked
  // file off the input so the same file can be selected twice in a row.
  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open]);

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) addFiles(Array.from(files));
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />
      <button
        ref={triggerRef}
        type="button"
        aria-label="Attach file"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
        style={triggerStyle}
      >
        <TriggerIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={menuId}
          role="menu"
          aria-label="Attachment types"
          data-composer-popover="open"
          className={cn(
            "composer-popover-in absolute bottom-full start-0 z-30 mb-2 min-w-[200px] overflow-hidden",
            "rounded-xl border border-border bg-popover p-1 text-popover-foreground",
            "shadow-soft",
          )}
        >
          {types.map((type, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={type.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="menuitem"
                type="button"
                tabIndex={active ? 0 : -1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(index)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-accent/60",
                )}
              >
                {type.icon ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
                    {type.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate font-medium">
                  {type.label}
                </span>
                {type.description ? (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {type.description}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}