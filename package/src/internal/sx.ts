/**
 * Lightweight `sx` engine for `<Composer />`.
 *
 * Goals:
 *   - Zero dependencies. No emotion, no runtime CSS-in-JS.
 *   - Predictable: an `sx` object is just a `React.CSSProperties` with a
 *     handful of token-aware shortcuts. Anything we don't recognise is
 *     passed through verbatim.
 *
 * We deliberately do NOT support:
 *   - Pseudo selectors (`&:hover`, `&:focus-within`).
 *   - Media queries.
 *   - Responsive arrays (`[1, 2, 3]`).
 *
 * Consumers reach for {@link ComposerSlotClassNames} when those are
 * needed — that keeps the package's bundle small and the inline-style
 * surface area small enough to reason about.
 */
import type { CSSProperties } from "react";
import { cn, type ClassValue } from "./cn";
import type {
  ComposerSlot,
  ComposerSlotClassNames,
  ComposerSxMap,
  ComposerSxValue,
  ComposerTokens,
} from "../types";

/**
 * Token names recognised by the sx engine for color-bearing keys. They
 * mirror the CSS variables defined by the consumer's theme (and shipped in
 * `package/src/composer.css`).
 */
const COLOR_TOKENS: Readonly<Record<string, string>> = {
  primary: "var(--primary)",
  "primary-foreground": "var(--primary-foreground)",
  primaryForeground: "var(--primary-foreground)",
  accent: "var(--accent)",
  "accent-foreground": "var(--accent-foreground)",
  accentForeground: "var(--accent-foreground)",
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  "card-foreground": "var(--card-foreground)",
  cardForeground: "var(--card-foreground)",
  popover: "var(--popover)",
  "popover-foreground": "var(--popover-foreground)",
  popoverForeground: "var(--popover-foreground)",
  muted: "var(--muted)",
  "muted-foreground": "var(--muted-foreground)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  ring: "var(--ring)",
  input: "var(--input)",
  destructive: "var(--destructive)",
  "destructive-foreground": "var(--destructive-foreground)",
  destructiveForeground: "var(--destructive-foreground)",
  success: "var(--success)",
  "success-foreground": "var(--success-foreground)",
  successForeground: "var(--success-foreground)",
  warning: "var(--warning)",
  "warning-foreground": "var(--warning-foreground)",
  warningForeground: "var(--warning-foreground)",
};

/** CSS keys we treat as color-bearing — token names expand to `hsl(var(--x))`. */
const COLOR_KEYS = new Set<string>([
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
  "caretColor",
  "textDecorationColor",
]);

function expandColor(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  // Anything that already looks like a CSS color (`#`, `rgb`, `hsl`,
  // `var(`, `transparent`, `currentColor`, etc.) passes straight through.
  const tokenVar = COLOR_TOKENS[trimmed];
  if (!tokenVar) return value;
  return `hsl(${tokenVar})`;
}

/**
 * Convert an {@link ComposerSxValue} to a plain {@link CSSProperties}
 * object. Returns `undefined` when the input is empty so callers can
 * cheaply skip merging.
 */
export function resolveSx(value?: ComposerSxValue): CSSProperties | undefined {
  if (!value) return undefined;
  const out: Record<string, unknown> = {};
  for (const key in value) {
    const raw = (value as Record<string, unknown>)[key];
    if (raw === undefined) continue;

    // `bg` shorthand → backgroundColor.
    if (key === "bg") {
      out.backgroundColor = expandColor(raw);
      continue;
    }

    if (COLOR_KEYS.has(key)) {
      out[key] = expandColor(raw);
      continue;
    }

    out[key] = raw;
  }
  return out as CSSProperties;
}

interface SlotProps {
  className: string;
  style?: CSSProperties;
}

/**
 * Build the `{ className, style }` overlay for a given slot, given the
 * consumer-supplied per-slot maps. The `base` argument is whatever the
 * package itself wants to apply (utility classes, internal styles); both
 * the consumer's class and resolved sx are layered on top.
 */
export function slotProps(
  slot: ComposerSlot,
  base: ClassValue,
  classNames?: ComposerSlotClassNames,
  sx?: ComposerSxMap,
  baseStyle?: CSSProperties,
): SlotProps {
  const className = cn(base, classNames?.[slot]);
  const resolved = resolveSx(sx?.[slot]);
  if (!resolved && !baseStyle) {
    return { className };
  }
  return {
    className,
    style: { ...baseStyle, ...resolved },
  };
}

const COLOR_TOKEN_KEYS: ReadonlyArray<keyof ComposerTokens> = [
  "primary",
  "primaryForeground",
  "accent",
  "accentForeground",
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "muted",
  "mutedForeground",
  "border",
  "ring",
  "input",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
];

const COLOR_TOKEN_VAR: Record<string, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  border: "--border",
  ring: "--ring",
  input: "--input",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  success: "--success",
  successForeground: "--success-foreground",
  warning: "--warning",
  warningForeground: "--warning-foreground",
};

function asLength(value: number | string): string {
  return typeof value === "number" ? `${value}px` : value;
}

/**
 * Convert a {@link ComposerTokens} map into a `style` object of CSS
 * custom properties suitable for inlining on the composer root. Every
 * `--*` here is read either by the package's CSS or by Tailwind utilities
 * the package uses (`bg-primary`, `text-muted-foreground`, etc.).
 */
export function tokensToStyle(tokens?: ComposerTokens): CSSProperties | undefined {
  if (!tokens) return undefined;
  const out: Record<string, string> = {};
  for (const key of COLOR_TOKEN_KEYS) {
    const v = tokens[key];
    if (typeof v === "string" && v.length > 0) {
      out[COLOR_TOKEN_VAR[key]] = v;
    }
  }
  if (tokens.radius !== undefined) out["--composer-radius"] = asLength(tokens.radius);
  if (tokens.fontSize !== undefined) out["--composer-font-size"] = asLength(tokens.fontSize);
  if (tokens.fontFamily !== undefined) out["--composer-font-family"] = tokens.fontFamily;
  return Object.keys(out).length ? (out as CSSProperties) : undefined;
}