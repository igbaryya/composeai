/**
 * AttachmentTypePicker — the paperclip-as-popover variant of the toolbar's
 * attachment button. Used when the consumer supplies a non-empty
 * `attachments.types` list; otherwise the toolbar renders the plain
 * single-click paperclip instead.
 *
 * Interaction model (see {@link useMenuButton}):
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
import { useRef } from "react";
import { useMenuButton } from "../hooks/useMenuButton";
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const menu = useMenuButton({
    count: types.length,
    onPick: (index) => {
      const input = fileInputRef.current;
      if (!input) return;
      menu.triggerRef.current?.focus();
      // Imperatively set accept so we don't have to round-trip through a
      // React re-render before clicking — keeps the dialog snappy.
      input.accept = types[index].accept;
      input.click();
    },
  });

  return (
    <div className="composer-attach-picker">
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
        ref={menu.triggerRef}
        type="button"
        aria-label="Attach file"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.open ? menu.menuId : undefined}
        onClick={menu.toggle}
        className={triggerClassName}
        style={triggerStyle}
      >
        <TriggerIcon />
      </button>

      {menu.open && (
        <div
          ref={menu.popoverRef}
          id={menu.menuId}
          role="menu"
          aria-label="Attachment types"
          data-composer-popover="open"
          className="composer-popover-in composer-attach-menu"
        >
          {types.map((type, index) => {
            const active = index === menu.activeIndex;
            return (
              <button
                key={type.id}
                ref={(el) => {
                  menu.itemRefs.current[index] = el;
                }}
                role="menuitem"
                type="button"
                tabIndex={active ? 0 : -1}
                data-active={active ? "" : undefined}
                onMouseEnter={() => menu.setActiveIndex(index)}
                onClick={() => menu.pick(index)}
                className="composer-attach-item"
              >
                {type.icon ? (
                  <span className="composer-attach-item-icon">{type.icon}</span>
                ) : null}
                <span className="composer-attach-item-label">{type.label}</span>
                {type.description ? (
                  <span className="composer-attach-item-desc">
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
