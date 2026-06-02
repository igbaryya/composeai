/**
 * MentionPlugin — typeahead that triggers on `@` and replaces the trigger
 * text with a `MentionNode` chip on select. The chip is atomic (single
 * backspace removes it) and rendered in the theme primary color.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { createPortal } from "react-dom";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  type TextNode,
} from "lexical";
import type { MentionConfig, MentionItem } from "../types";
import { $createMentionNode } from "../core/nodes/MentionNode";
import { MentionMenu } from "../ui/MentionMenu";
import { SmartPopover } from "../ui/SmartPopover";
import { useOutsideClickDismiss } from "../hooks/useOutsideClickDismiss";
import { useComposerContext } from "../core/ComposerProvider";

class MentionOption extends MenuOption {
  item: MentionItem;
  constructor(item: MentionItem) {
    super(item.id);
    this.item = item;
  }
}

interface Props {
  config: MentionConfig;
}

function isSyncItems(
  items: MentionConfig["items"],
): items is MentionItem[] {
  return Array.isArray(items);
}

export function MentionPlugin({ config }: Props) {
  const [editor] = useLexicalComposerContext();
  const { closeMenusOnOutsideClick } = useComposerContext();
  const [query, setQuery] = useState<string>("");
  const [asyncItems, setAsyncItems] = useState<MentionItem[] | null>(null);
  // Initial state: async lists are "loading" until the first resolution.
  // Sync arrays are never loading.
  const [isLoading, setIsLoading] = useState<boolean>(
    !isSyncItems(config.items),
  );

  useOutsideClickDismiss(editor, closeMenusOnOutsideClick);

  const trigger = config.trigger ?? "@";

  const triggerFn = useBasicTypeaheadTriggerMatch(trigger, {
    minLength: 0,
    maxLength: 32,
    allowWhitespace: false,
  });

  useEffect(() => {
    if (isSyncItems(config.items)) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    Promise.resolve(config.items(query)).then((res) => {
      if (cancelled) return;
      setAsyncItems(res);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query, config.items]);

  const allItems = useMemo<MentionItem[]>(() => {
    return isSyncItems(config.items) ? config.items : asyncItems ?? [];
  }, [config.items, asyncItems]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const max = config.maxItems ?? 8;
    const filtered = q
      ? allItems.filter((it) =>
          `${it.label} ${it.description ?? ""}`.toLowerCase().includes(q),
        )
      : allItems;
    return filtered.slice(0, max).map((c) => new MentionOption(c));
  }, [allItems, query, config.maxItems]);

  const onSelectOption = useCallback(
    (
      selectedOption: MentionOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        // The chip is an inline ElementNode that contains a TextNode for
        // the label. Storing the label as a real child means the user can
        // backspace through it character-by-character — the ID on the
        // wrapping element stays attached to whatever text remains.
        const chip = $createMentionNode(selectedOption.item.id, trigger);
        chip.append($createTextNode(selectedOption.item.label));
        if (nodeToReplace) {
          nodeToReplace.replace(chip);
        } else {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) sel.insertNodes([chip]);
        }
        // Add a trailing space so the user can keep typing immediately
        // after the chip without their next char being captured inside.
        const space = $createTextNode(" ");
        chip.insertAfter(space);
        space.select();
      });
      closeMenu();
    },
    [editor, trigger],
  );

  return (
    <LexicalTypeaheadMenuPlugin<MentionOption>
      onQueryChange={(s) => setQuery(s ?? "")}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current) return null;
        // Keep the menu visible while an async fetch is in flight even if
        // we currently have no items — the MentionMenu renders a skeleton
        // in that case so the user gets immediate feedback.
        if (options.length === 0 && !isLoading) return null;
        return createPortal(
          <SmartPopover>
            <MentionMenu
              options={options.map((o) => o.item)}
              selectedIndex={selectedIndex ?? 0}
              isLoading={isLoading}
              onSelect={(index) => selectOptionAndCleanUp(options[index])}
              onHover={(index) => setHighlightedIndex(index)}
            />
          </SmartPopover>,
          anchorElementRef.current,
        );
      }}
    />
  );
}