/**
 * ModelPicker — the `model` prop's trigger pill and menu.
 *
 * The trigger names the current model, so which model the next turn goes to
 * is always on screen. Clicking it opens an upward menu of `model.items` with
 * the current one checked; picking a different row calls `model.onChange` and
 * hands focus back to the editor so the user can keep typing. The value is
 * controlled — nothing here stores the choice, the pill changes when the host
 * passes a new `value`.
 *
 * Placement follows the voice button: inside the toolbar in the `full`
 * variant (see `<Toolbar />`), beside Send in the `compact` one (see
 * `Composer.tsx`) — the compact toolbar collapses into the "+" menu, which
 * would hide the current model.
 *
 * Keyboard and dismissal behaviour is shared with the attachment-type picker
 * via {@link useMenuButton}.
 */
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { focusEditor } from "../internal/focusEditor";
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import { useMenuButton } from "../hooks/useMenuButton";

const DEFAULT_LABEL = "Model";

export function ModelPicker() {
  const [editor] = useLexicalComposerContext();
  const { model, icons, classNames, sx } = useComposerContext();
  const { chevron: ChevronIcon, check: CheckIcon } = icons;

  const items = model?.config.items ?? [];
  const current = model?.current;
  // -1 when `value` isn't in `items` — the menu then opens on the first row.
  const currentIndex = current ? items.indexOf(current) : -1;

  const menu = useMenuButton({
    count: items.length,
    initialIndex: Math.max(0, currentIndex),
    onPick: (index) => {
      if (model && index !== currentIndex) model.config.onChange(items[index]);
      focusEditor(editor);
    },
  });

  if (!model || !current) return null;

  const label = model.config.label ?? DEFAULT_LABEL;
  const button = slotProps("modelButton", "composer-model-btn", classNames, sx);
  const menuSlot = slotProps(
    "modelMenu",
    "composer-popover-in composer-attach-menu composer-model-menu",
    classNames,
    sx,
  );
  const itemSlot = slotProps(
    "modelItem",
    "composer-attach-item composer-model-item",
    classNames,
    sx,
  );

  return (
    <div className="composer-model-picker">
      <button
        ref={menu.triggerRef}
        type="button"
        aria-label={`${label}: ${current.label}`}
        // The label truncates on a narrow card; the tooltip keeps it readable.
        title={current.label}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.open ? menu.menuId : undefined}
        data-active={menu.open ? "" : undefined}
        onClick={menu.toggle}
        {...button}
      >
        {current.icon ? (
          <span className="composer-model-btn-icon">{current.icon}</span>
        ) : null}
        {/* `dir="auto"`: a Latin model name inside an RTL composer must still
            truncate at its own end, not show its tail. */}
        <span className="composer-model-btn-label" dir="auto">
          {current.label}
        </span>
        <ChevronIcon className="composer-model-btn-caret" />
      </button>

      {menu.open && (
        <div
          ref={menu.popoverRef}
          id={menu.menuId}
          role="menu"
          aria-label={label}
          data-composer-popover="open"
          {...menuSlot}
        >
          {items.map((item, index) => {
            const active = index === menu.activeIndex;
            const selected = index === currentIndex;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  menu.itemRefs.current[index] = el;
                }}
                role="menuitemradio"
                aria-checked={selected}
                type="button"
                tabIndex={active ? 0 : -1}
                data-active={active ? "" : undefined}
                onMouseEnter={() => menu.setActiveIndex(index)}
                onClick={() => menu.pick(index)}
                {...itemSlot}
              >
                {item.icon ? (
                  <span className="composer-attach-item-icon">{item.icon}</span>
                ) : null}
                <span className="composer-model-item-text">
                  <span className="composer-attach-item-label" dir="auto">
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="composer-model-item-desc">
                      {item.description}
                    </span>
                  ) : null}
                </span>
                <span className="composer-model-item-check">
                  {selected ? <CheckIcon /> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
