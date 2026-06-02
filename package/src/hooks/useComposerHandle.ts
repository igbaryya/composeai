import { useEffect, type Ref } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createParagraphNode, $getRoot } from "lexical";
import type { ComposerHandle } from "../types";
import { useComposerContext } from "../core/ComposerProvider";
import {
  $insertTextWithParagraphBreaks,
  $seedInitialValue,
} from "../internal/insertText";

export function useComposerHandle(
  ref: Ref<ComposerHandle> | undefined,
  onSubmit: () => void,
) {
  const [editor] = useLexicalComposerContext();
  const { addFiles } = useComposerContext();

  useEffect(() => {
    if (!ref) return;
    const handle: ComposerHandle = {
      focus: () => editor.focus(),
      clear: () => {
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
      },
      insert: (text) => {
        editor.update(() => {
          // Empty editor → seed from scratch so every line becomes its own
          // paragraph. Non-empty editor → insert at the current selection
          // (or end, if selection is detached) with `\n` → paragraph
          // breaks, so multi-line blobs like a ```mermaid fence keep their
          // structure and the markdown detectors can see them.
          const root = $getRoot();
          const isEmpty =
            root.getChildrenSize() === 0 ||
            (root.getChildrenSize() === 1 &&
              root.getFirstChild()?.getTextContent() === "");
          if (isEmpty) {
            $seedInitialValue(text);
          } else {
            $insertTextWithParagraphBreaks(text);
          }
        });
      },
      submit: () => onSubmit(),
      addAttachments: (files) => addFiles(files),
    };
    if (typeof ref === "function") {
      ref(handle);
      return () => ref(null);
    }
    (ref as { current: ComposerHandle | null }).current = handle;
    return () => {
      (ref as { current: ComposerHandle | null }).current = null;
    };
  }, [editor, ref, onSubmit, addFiles]);
}