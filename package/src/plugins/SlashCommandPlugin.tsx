/**
 * SlashCommandPlugin — typeahead menu that opens when the user types `/` at
 * the start of a line (or after whitespace). Consumers feed commands via
 * `features.slashCommands`.
 *
 * Built on Lexical's `LexicalTypeaheadMenuPlugin` so we get IME-safe match
 * detection, keyboard navigation, and caret-anchored positioning for free.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { createPortal } from "react-dom";
import { $getSelection, $isRangeSelection, type TextNode } from "lexical";
import type {
  SlashCommand,
  SlashCommandContext,
  SlashConfig,
} from "../types";
import { SlashMenu } from "../ui/SlashMenu";
import { SmartPopover } from "../ui/SmartPopover";
import { useOutsideClickDismiss } from "../hooks/useOutsideClickDismiss";
import { useComposerContext } from "../core/ComposerProvider";

class SlashOption extends MenuOption {
  command: SlashCommand;
  constructor(command: SlashCommand) {
    super(command.id);
    this.command = command;
  }
}

interface Props {
  config: SlashConfig;
  onSubmit: () => void;
}

function isSyncItems(
  items: SlashConfig["items"],
): items is SlashCommand[] {
  return Array.isArray(items);
}

export function SlashCommandPlugin({ config, onSubmit }: Props) {
  const [editor] = useLexicalComposerContext();
  const { closeMenusOnOutsideClick } = useComposerContext();
  const [query, setQuery] = useState<string>("");
  const [asyncItems, setAsyncItems] = useState<SlashCommand[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    !isSyncItems(config.items),
  );

  useOutsideClickDismiss(editor, closeMenusOnOutsideClick);

  const triggerFn = useBasicTypeaheadTriggerMatch(
    config.trigger ?? "/",
    { minLength: 0, maxLength: 32, allowWhitespace: false },
  );

  // Resolve async items when query changes.
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

  const allItems = useMemo<SlashCommand[]>(() => {
    return isSyncItems(config.items) ? config.items : asyncItems ?? [];
  }, [config.items, asyncItems]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const max = config.maxItems ?? 8;
    const filtered = q
      ? allItems.filter((it) => {
          const hay = `${it.label} ${it.description ?? ""} ${it.group ?? ""}`.toLowerCase();
          return hay.includes(q);
        })
      : allItems;
    return filtered.slice(0, max).map((c) => new SlashOption(c));
  }, [allItems, query, config.maxItems]);

  const onSelectOption = useCallback(
    (
      selectedOption: SlashOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
      matchingString: string,
    ) => {
      editor.update(() => {
        if (nodeToReplace) nodeToReplace.remove();
      });
      const ctx: SlashCommandContext = {
        insertText: (text) => {
          editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) sel.insertText(text);
          });
        },
        insertMarkdown: (md) => {
          editor.update(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) sel.insertText(md);
          });
        },
        cancel: () => closeMenu(),
        submit: () => onSubmit(),
      };
      selectedOption.command.onSelect?.(ctx);
      closeMenu();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      void matchingString;
    },
    [editor, onSubmit],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      onQueryChange={(s) => setQuery(s ?? "")}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current) return null;
        // Keep the menu open while an async fetch is in flight even without
        // any items so the consumer's SlashMenu can render its skeleton.
        if (options.length === 0 && !isLoading) return null;
        return createPortal(
          <SmartPopover>
            <SlashMenu
              options={options.map((o) => o.command)}
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