/**
 * QuickActionsMenu — the compact variant's "+" button.
 *
 * In the compact layout the toolbar's quick actions don't sit inline; they
 * collapse behind a single "+" trigger that opens an upward popover. The menu
 * lists whatever the consumer enabled — attach file (or one row per
 * `attachments.types` entry), add image, the web toggle — followed by any
 * `toolbarExtras` the consumer passed. The voice button is intentionally NOT
 * here: in the compact variant it floats beside Send (see `Composer.tsx`).
 *
 * Interaction model mirrors {@link AttachmentTypePicker}: click "+" to toggle,
 * outside-click / Escape to close, picking a file action opens the OS dialog
 * scoped to that action's `accept`. Reuses the `.composer-attach-menu` /
 * `.composer-attach-item` visuals so the popover matches the rest of the
 * composer's menus.
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "../internal/cn";
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import { useCustomActionContext } from "./CustomActions";

interface Props {
  extras?: ReactNode;
  /** Real submit pipeline — handed to custom actions via their context. */
  submit?: () => void;
}

export function QuickActionsMenu({ extras, submit }: Props) {
  const {
    features,
    attachmentsConfig,
    addFiles,
    webEnabled,
    toggleWeb,
    icons,
    classNames,
    sx,
    closeMenusOnOutsideClick,
  } = useComposerContext();
  const {
    plus: PlusIcon,
    attach: AttachIcon,
    image: ImageIcon,
    web: WebIcon,
  } = icons;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const menuId = useId();

  const attachmentsEnabled = !!features.attachments;
  const showFileBtn = attachmentsEnabled && attachmentsConfig.file !== false;
  const showImageBtn = attachmentsEnabled && attachmentsConfig.image !== false;
  const types =
    showFileBtn && Array.isArray(attachmentsConfig.types)
      ? attachmentsConfig.types
      : [];
  const hasTypePicker = types.length > 0;
  const customActions = features.custom;
  const actionCtx = useCustomActionContext(submit ?? (() => {}));

  // Nothing to collapse → render nothing, so the compact row simply has no
  // "+" button (the caller leaves that grid cell empty).
  const hasAnyAction =
    showFileBtn ||
    showImageBtn ||
    features.web ||
    customActions.length > 0 ||
    !!extras;

  const close = useCallback(() => setOpen(false), []);

  // Imperatively set `accept` then click so we don't round-trip a React
  // render before opening the dialog — keeps the picker snappy.
  const openFilePicker = useCallback((accept?: string) => {
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept ?? attachmentsConfig.accept ?? "";
    input.click();
  }, [attachmentsConfig.accept]);

  // Outside click + Escape close the menu, honouring the same global pref as
  // the typeahead menus.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!closeMenusOnOutsideClick) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeMenusOnOutsideClick, close]);

  if (!hasAnyAction) return null;

  const triggerBtn = slotProps(
    "toolbarButton",
    "composer-toolbar-btn",
    classNames,
    sx,
  );

  return (
    <div className="composer-quick-actions">
      {/* Shared hidden inputs — `accept` is set imperatively per action. */}
      {showFileBtn && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={attachmentsConfig.accept}
          hidden
          onChange={(e) => {
            const files = e.target.files;
            if (files) addFiles(Array.from(files));
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      )}
      {showImageBtn && (
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          hidden
          onChange={(e) => {
            const files = e.target.files;
            if (files) addFiles(Array.from(files));
            if (imageInputRef.current) imageInputRef.current.value = "";
          }}
        />
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-label="Quick actions"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-active={open ? "" : undefined}
        onClick={() => setOpen((o) => !o)}
        {...triggerBtn}
      >
        <PlusIcon />
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={menuId}
          role="menu"
          aria-label="Quick actions"
          data-composer-popover="open"
          className="composer-popover-in composer-attach-menu composer-quick-menu"
        >
          {showFileBtn && !hasTypePicker && (
            <ActionItem
              icon={<AttachIcon />}
              label="Attach file"
              onClick={() => {
                close();
                openFilePicker();
              }}
            />
          )}
          {hasTypePicker &&
            types.map((type) => (
              <ActionItem
                key={type.id}
                icon={type.icon ?? <AttachIcon />}
                label={type.label}
                description={type.description}
                onClick={() => {
                  close();
                  openFilePicker(type.accept);
                }}
              />
            ))}
          {showImageBtn && (
            <ActionItem
              icon={<ImageIcon />}
              label="Add image"
              onClick={() => {
                close();
                imageInputRef.current?.click();
              }}
            />
          )}
          {features.web && (
            <ActionItem
              icon={<WebIcon />}
              label="Search the web"
              active={webEnabled}
              onClick={() => {
                toggleWeb();
                close();
              }}
            />
          )}
          {customActions.map((action, i) => (
            <ActionItem
              key={action.id ?? i}
              icon={action.icon}
              label={action.title}
              active={action.active}
              disabled={action.disabled}
              onClick={() => {
                action.onClick(actionCtx);
                close();
              }}
            />
          ))}
          {extras && <div className="composer-quick-extras">{extras}</div>}
        </div>
      )}
    </div>
  );
}

interface ActionItemProps {
  icon: ReactNode;
  label: string;
  description?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ActionItem({
  icon,
  label,
  description,
  active,
  disabled,
  onClick,
}: ActionItemProps) {
  return (
    <button
      role="menuitem"
      type="button"
      aria-pressed={active}
      data-active={active ? "" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn("composer-attach-item")}
    >
      <span className="composer-attach-item-icon">{icon}</span>
      <span className="composer-attach-item-label">{label}</span>
      {description ? (
        <span className="composer-attach-item-desc">{description}</span>
      ) : null}
    </button>
  );
}
