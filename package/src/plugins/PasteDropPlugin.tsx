/**
 * PasteDropPlugin — intercepts clipboard paste and drag/drop on the editor.
 *
 *  - Pasted images / files become attachment chips in the tray (Phase 2).
 *  - Pasted plain text is split on `\n` into one paragraph per line so the
 *    markdown / mermaid block detectors can actually see fence boundaries
 *    (the per-paragraph detectors can't recognise a ```mermaid block that
 *    landed inside a single paragraph as line breaks).
 *  - Drag-over shows a soft overlay so users know the target accepts files.
 *
 * Paste handling lives on `PASTE_COMMAND` (Lexical) rather than a native DOM
 * listener so we don't fight RichTextPlugin's own paste handler for
 * ordering. Drag/drop stays on native DOM events because they aren't
 * surfaced as Lexical commands.
 */
import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, PASTE_COMMAND } from "lexical";
import { useComposerContext } from "../core/ComposerProvider";
import { $insertTextWithParagraphBreaks } from "../internal/insertText";

export function PasteDropPlugin() {
  const [editor] = useLexicalComposerContext();
  const { addFiles, features, multiline, setIsDraggingFiles } =
    useComposerContext();

  // ── Paste: files → attachments, text → paragraph-aware insertion ────
  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (!(event instanceof ClipboardEvent)) return false;
        const clipboard = event.clipboardData;
        if (!clipboard) return false;

        // 1. Files (only when attachments are enabled).
        if (features.attachments) {
          const files: File[] = [];
          for (const item of clipboard.items) {
            if (item.kind === "file") {
              const file = item.getAsFile();
              if (file) files.push(file);
            }
          }
          if (files.length > 0) {
            event.preventDefault();
            addFiles(files);
            return true;
          }
        }

        const text = clipboard.getData("text/plain");
        if (!text) return false;

        // 2a. Inline / single-line mode — paragraph breaks are meaningless
        //     here (the user can't even hit Enter), so flatten newlines to
        //     spaces and let Lexical's default handler do the insert. If
        //     the paste is already single-line we don't preventDefault and
        //     just let the default path run.
        if (!multiline) {
          if (!text.includes("\n") && !text.includes("\r")) return false;
          event.preventDefault();
          const flat = text.replace(/\r\n?|\n/g, " ").replace(/\s+/g, " ");
          editor.update(() => {
            $insertTextWithParagraphBreaks(flat);
          });
          return true;
        }

        // 2b. Multi-line text — split on `\n` so each line becomes its own
        //     paragraph (required for fence / heading / list detection).
        //     Single-line text falls through to Lexical's default handler
        //     which already does the right thing.
        if (!text.includes("\n")) return false;
        event.preventDefault();
        editor.update(() => {
          $insertTextWithParagraphBreaks(text);
        });
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, features.attachments, multiline, addFiles]);

  // ── Drag / drop: native DOM events (no Lexical equivalent) ──────────
  useEffect(() => {
    if (!features.attachments) return;
    const root = editor.getRootElement();
    if (!root) return;

    let dragDepth = 0;
    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      dragDepth += 1;
      setIsDraggingFiles(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      }
    };
    const onDragLeave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDraggingFiles(false);
    };
    const onDrop = (event: DragEvent) => {
      dragDepth = 0;
      setIsDraggingFiles(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        event.preventDefault();
        addFiles(Array.from(files));
      }
    };

    root.addEventListener("dragenter", onDragEnter);
    root.addEventListener("dragover", onDragOver);
    root.addEventListener("dragleave", onDragLeave);
    root.addEventListener("drop", onDrop);
    return () => {
      root.removeEventListener("dragenter", onDragEnter);
      root.removeEventListener("dragover", onDragOver);
      root.removeEventListener("dragleave", onDragLeave);
      root.removeEventListener("drop", onDrop);
    };
  }, [editor, addFiles, features.attachments, setIsDraggingFiles]);

  return null;
}