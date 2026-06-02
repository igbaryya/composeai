/**
 * Tiny keyboard-shortcut parser used by `<Composer focusShortcut>` (and a
 * good fit for any future global shortcut the library wants to expose).
 *
 * Why bespoke instead of pulling in a library:
 *   - We need ONE thing: parse a string like `"mod+/"` once, then test
 *     `KeyboardEvent`s against it on every `keydown`. ~30 lines.
 *   - Zero deps + zero bundle cost > matching the exact ergonomics of
 *     `mousetrap` / `hotkeys-js`.
 *
 * Grammar (case-insensitive):
 *   shortcut := segment ("+" segment)*
 *   segment  := modifier | key
 *   modifier := "mod" | "cmd" | "meta" | "ctrl" | "control"
 *             | "alt" | "option" | "shift"
 *   key      := any non-modifier token (single char, "Enter", "Escape",
 *               "ArrowUp", "/", "?", …)
 *
 * `mod` resolves to ⌘ on macOS and Ctrl elsewhere — the "do what the
 * platform expects" modifier. `cmd` / `meta` / `ctrl` are explicit and
 * never aliased.
 *
 * Modifier matching is strict: a parsed `"mod+/"` only fires when the
 * platform mod IS down AND every other modifier (Shift, Alt, the
 * non-platform one) is NOT — so `Cmd+Shift+/` won't accidentally trigger
 * a `Cmd+/` shortcut.
 */

const MODIFIERS = new Set([
  "mod",
  "cmd",
  "command",
  "meta",
  "win",
  "super",
  "ctrl",
  "control",
  "alt",
  "option",
  "shift",
]);

export interface ParsedShortcut {
  /** Required modifier flags after platform resolution. */
  mod: boolean; // mod === Cmd on mac, Ctrl elsewhere
  altMod: boolean; // the other one — Ctrl on mac, Cmd on Windows/Linux (only if explicitly named)
  shift: boolean;
  alt: boolean;
  /** Lower-cased key to match. Special keys keep their `KeyboardEvent.key` casing-folded. */
  key: string;
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  // `userAgentData.platform` is the modern path; userAgent is the fallback.
  // We accept either "macOS" / "Mac" / "iPhone" / "iPad" so the shortcut
  // works on iPadOS too (where Cmd is still the natural mod).
  const platform =
    (navigator as Navigator & {
      userAgentData?: { platform?: string };
    }).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Parse a shortcut string into a `ParsedShortcut`, or `null` if the input
 * is empty / invalid (so the caller can simply skip registering it).
 */
export function parseShortcut(spec: string): ParsedShortcut | null {
  const segments = spec
    .split("+")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (segments.length === 0) return null;

  const mac = isMac();
  let mod = false;
  let altMod = false;
  let shift = false;
  let alt = false;
  let key: string | null = null;

  for (const seg of segments) {
    if (MODIFIERS.has(seg)) {
      switch (seg) {
        case "mod":
          mod = true;
          break;
        case "cmd":
        case "command":
        case "meta":
        case "win":
        case "super":
          if (mac) mod = true;
          else altMod = true;
          break;
        case "ctrl":
        case "control":
          if (mac) altMod = true;
          else mod = true;
          break;
        case "alt":
        case "option":
          alt = true;
          break;
        case "shift":
          shift = true;
          break;
      }
    } else {
      // Last non-modifier wins — keeps `"mod+/"` and `"/+mod"` equivalent
      // even though only the former is the documented form.
      key = seg;
    }
  }

  if (!key) return null;
  return { mod, altMod, shift, alt, key };
}

/** Test a parsed shortcut against a `KeyboardEvent`. */
export function matchesShortcut(
  parsed: ParsedShortcut,
  event: KeyboardEvent,
): boolean {
  const mac = isMac();
  const platformMod = mac ? event.metaKey : event.ctrlKey;
  const otherMod = mac ? event.ctrlKey : event.metaKey;

  if (parsed.mod !== platformMod) return false;
  if (parsed.altMod !== otherMod) return false;
  if (parsed.shift !== event.shiftKey) return false;
  if (parsed.alt !== event.altKey) return false;

  // Normalize the event key. Single-char keys are compared case-insensitively
  // (so `"mod+K"` and `"mod+k"` both match Shift-less ⌘K). Named keys
  // (Enter, Escape, ArrowUp, …) use their canonical lower-cased name.
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
  return eventKey === parsed.key;
}