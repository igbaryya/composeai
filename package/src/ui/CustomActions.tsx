/**
 * Custom (consumer-defined) toolbar actions — `features.custom`.
 *
 * Each {@link CustomAction} renders as a `.composer-toolbar-btn` in the full
 * variant's toolbar (via {@link CustomActionButtons}) and as a popover row in
 * the compact variant's "+" menu (the QuickActionsMenu maps over the same list
 * directly). Both share {@link useCustomActionContext}, which builds the
 * editor helpers handed to each action's `onClick`.
 */
import { useMemo } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import { $insertTextWithParagraphBreaks } from "../internal/insertText";
import { focusEditor } from "../internal/focusEditor";
import { slotProps } from "../internal/sx";
import { Tooltip } from "../internal/Tooltip";
import { useComposerContext } from "../core/ComposerProvider";
import type { CustomActionContext } from "../types";

/**
 * Builds the {@link CustomActionContext} handed to every custom action.
 * `submit` is threaded in (rather than read from context) because the real
 * submit pipeline lives in `ComposerInner` and is passed down as a prop.
 */
export function useCustomActionContext(submit: () => void): CustomActionContext {
  const [editor] = useLexicalComposerContext();
  return useMemo<CustomActionContext>(
    () => ({
      insertText: (text) => {
        editor.update(() => {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) sel.insertText(text);
        });
        focusEditor(editor);
      },
      insertMarkdown: (md) => {
        editor.update(() => {
          $insertTextWithParagraphBreaks(md);
        });
        focusEditor(editor);
      },
      submit,
    }),
    [editor, submit],
  );
}

interface ButtonsProps {
  submit: () => void;
}

/** Renders the custom actions as toolbar buttons (full variant). */
export function CustomActionButtons({ submit }: ButtonsProps) {
  const { features, classNames, sx } = useComposerContext();
  const ctx = useCustomActionContext(submit);
  const actions = features.custom;
  const toolbarBtn = slotProps(
    "toolbarButton",
    "composer-toolbar-btn",
    classNames,
    sx,
  );

  if (actions.length === 0) return null;

  return (
    <>
      {actions.map((action, i) => (
        <Tooltip key={action.id ?? i} content={action.title} side="top">
          <button
            type="button"
            aria-label={action.title}
            aria-pressed={action.active}
            data-active={action.active ? "" : undefined}
            disabled={action.disabled}
            onClick={() => action.onClick(ctx)}
            {...toolbarBtn}
          >
            {action.icon}
          </button>
        </Tooltip>
      ))}
    </>
  );
}
