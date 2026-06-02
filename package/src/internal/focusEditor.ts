import type { LexicalEditor } from "lexical";

/**
 * Robustly focus a Lexical editor — used by `AutoFocusPlugin`, the
 * `focusShortcut` window handler, and the `refocusOnSubmit` branch.
 *
 * Why this isn't just `editor.focus()`:
 *   A bare `editor.focus()` restores the Lexical *selection* and dispatches
 *   the FOCUS_COMMAND, which is enough when the contenteditable already has
 *   DOM focus (e.g. the user just pressed Enter to send — the editor was
 *   the active element, so refocusing is a no-op-ish). It is NOT enough
 *   when DOM focus lives elsewhere — body, a sidebar button, an
 *   EmptyState description, etc. In that case the Lexical selection moves
 *   but the browser never actually focuses the contenteditable, so the
 *   visible caret never appears and keystrokes still hit whatever element
 *   originally held focus.
 *
 *   The fix mirrors `@lexical/react/LexicalAutoFocusPlugin`: pass a
 *   callback into `editor.focus(cb, opts)` that, AFTER Lexical's own
 *   focus attempt, manually `rootElement.focus({preventScroll: true})`
 *   when the contenteditable still isn't part of `document.activeElement`.
 *   `preventScroll` keeps the page from jumping when the composer sits
 *   below the fold.
 *
 * `defaultSelection: "rootEnd"` lands the caret at the end of any seeded
 * `initialValue`, which is the natural "ready to keep typing" position
 * for a chat composer.
 */
export function focusEditor(editor: LexicalEditor): void {
  editor.focus(
    () => {
      const active = document.activeElement;
      const root = editor.getRootElement();
      if (root !== null && (active === null || !root.contains(active))) {
        root.focus({ preventScroll: true });
      }
    },
    { defaultSelection: "rootEnd" },
  );
}