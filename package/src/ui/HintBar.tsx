import { useMemo } from "react";
import type { ReactNode } from "react";
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";

interface Props {
  hint: boolean | ReactNode;
}

function Key({ children }: { children: ReactNode }) {
  return <kbd className="composer-kbd">{children}</kbd>;
}

/** Render a shortcut spec like `"mod+/"` as a `<kbd>` chip the user can
 *  recognise: `⌘/Ctrl + /`. Returns `null` if the spec doesn't have a
 *  printable key, so the caller can skip the chip entirely. */
function formatShortcut(spec: string): ReactNode {
  const parts = spec
    .split("+")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const labels: string[] = [];
  for (const p of parts) {
    switch (p) {
      case "mod":
        labels.push("⌘/Ctrl");
        break;
      case "cmd":
      case "command":
      case "meta":
      case "win":
      case "super":
        labels.push("⌘");
        break;
      case "ctrl":
      case "control":
        labels.push("Ctrl");
        break;
      case "alt":
      case "option":
        labels.push("Alt");
        break;
      case "shift":
        labels.push("Shift");
        break;
      default:
        labels.push(p.length === 1 ? p.toUpperCase() : p);
    }
  }
  return labels.join(" + ");
}

export function HintBar({ hint }: Props) {
  const {
    multiline,
    submitOnEnter,
    focusShortcut,
    classNames,
    sx,
  } = useComposerContext();

  // The default hint reflects whichever Enter behavior the composer is
  // actually wired up for, so a smart-newline composer doesn't lie to
  // the user about how to send. Consumers can still pass a custom node
  // via the `hint` prop to override entirely.
  const defaultShortcuts = useMemo(() => {
    if (!multiline) {
      if (!submitOnEnter) return null;
      return (
        <>
          Press <Key>Enter</Key> to send.
        </>
      );
    }
    if (!submitOnEnter) {
      return (
        <>
          Press <Key>⌘/Ctrl + Enter</Key> to send, <Key>Enter</Key> for newline.
        </>
      );
    }
    return (
      <>
        Press <Key>Enter</Key> to send, <Key>Shift + Enter</Key> for newline.
      </>
    );
  }, [multiline, submitOnEnter]);

  const focusHint = useMemo(() => {
    if (!focusShortcut) return null;
    const label = formatShortcut(focusShortcut);
    if (!label) return null;
    return (
      <>
        {" "}
        <Key>{label}</Key> to jump back here.
      </>
    );
  }, [focusShortcut]);

  if (!hint) return null;
  const hintProps = slotProps("hint", "composer-hint", classNames, sx);
  return (
    <p {...hintProps}>
      {hint === true ? (
        <>
          AI can make mistakes — verify important info.
          {defaultShortcuts ? (
            <span className="composer-hint-sm"> {defaultShortcuts}</span>
          ) : null}
          {focusHint ? (
            <span className="composer-hint-md">{focusHint}</span>
          ) : null}
        </>
      ) : (
        hint
      )}
    </p>
  );
}