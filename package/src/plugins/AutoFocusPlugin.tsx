import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { focusEditor } from "../internal/focusEditor";

interface Props {
  enabled?: boolean;
}

/**
 * Lexical doesn't ship a plain `autoFocus` boolean, so we wrap
 * `editor.focus()` ourselves. See `internal/focusEditor.ts` for the full
 * story on why a bare `editor.focus()` isn't enough.
 *
 * Previously this plugin wrapped `editor.focus()` in a single
 * `requestAnimationFrame`, which raced with React's commit phase and
 * occasionally let the click-target keep focus instead.
 */
export function AutoFocusPlugin({ enabled }: Props) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!enabled) return;
    focusEditor(editor);
  }, [editor, enabled]);
  return null;
}