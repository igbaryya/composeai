/**
 * Tiny color parser used by the `<Composer color="…" />` shorthand.
 *
 * The composer's CSS variables store HSL components without the `hsl(...)`
 * wrapper — e.g. `--primary: 258 90% 62%` — so opacity composition like
 * `hsl(var(--primary) / 0.1)` keeps working. This helper accepts whatever
 * the consumer hands us (hex, rgb, hsl, or already-formatted components)
 * and normalises it to that shape.
 *
 * Returns `null` for inputs we can't parse — the caller silently falls
 * back to the default theme rather than throwing on a typo.
 */
export interface HslTriple {
  h: number;
  s: number;
  l: number;
}

const COMPONENT_RE =
  /^\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/;
const HSL_FN_RE =
  /^\s*hsla?\(\s*(\d+(?:\.\d+)?)(?:deg)?\s*[,\s]\s*(\d+(?:\.\d+)?)%\s*[,\s]\s*(\d+(?:\.\d+)?)%/i;
const HEX_RE = /^\s*#([0-9a-f]{3}|[0-9a-f]{6})\s*$/i;
const RGB_FN_RE =
  /^\s*rgba?\(\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)\s*[,\s]\s*(\d+(?:\.\d+)?)/i;

export function parseToHsl(value: string): HslTriple | null {
  if (typeof value !== "string") return null;

  const components = value.match(COMPONENT_RE);
  if (components) {
    return {
      h: parseFloat(components[1]),
      s: parseFloat(components[2]),
      l: parseFloat(components[3]),
    };
  }

  const hslFn = value.match(HSL_FN_RE);
  if (hslFn) {
    return {
      h: parseFloat(hslFn[1]),
      s: parseFloat(hslFn[2]),
      l: parseFloat(hslFn[3]),
    };
  }

  const hex = value.match(HEX_RE);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) {
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    return rgbToHsl(r, g, b);
  }

  const rgbFn = value.match(RGB_FN_RE);
  if (rgbFn) {
    return rgbToHsl(
      clamp01(parseFloat(rgbFn[1]) / 255),
      clamp01(parseFloat(rgbFn[2]) / 255),
      clamp01(parseFloat(rgbFn[3]) / 255),
    );
  }

  return null;
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function rgbToHsl(r: number, g: number, b: number): HslTriple {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Format an HslTriple as the components-only string the composer's CSS expects. */
export function formatHslComponents(triple: HslTriple): string {
  return `${triple.h} ${triple.s}% ${triple.l}%`;
}

/**
 * Derive the full set of brand-coloured tokens from a single base color.
 *
 * Mapping rules — chosen so the brand color tints every "live" surface
 * without making text unreadable:
 *
 *   --primary             = base                       (web pill, mention chip, focus ring, mention avatar text)
 *   --primary-foreground  = base with very high/low L  (text painted on top of --primary fills)
 *   --accent              = base hue, soft saturation, very light L  (hover bg, selected menu row bg)
 *   --accent-foreground   = base hue, normal saturation, dark L      (text on --accent surfaces)
 *   --ring                = base
 *
 * Other tokens (`--card`, `--background`, `--border`, …) are deliberately
 * left alone so the composer keeps its neutral chrome and only the hot
 * colour-bearing surfaces light up.
 */
export interface DerivedColorTokens {
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
}

export function deriveColorTokens(value: string): DerivedColorTokens | null {
  const base = parseToHsl(value);
  if (!base) return null;

  const isLightBase = base.l >= 50;

  const primary = formatHslComponents(base);

  // Foreground sitting on top of `--primary`: pick the opposite end of the
  // lightness scale so contrast stays high regardless of where the brand
  // sits on the spectrum.
  const primaryForeground = formatHslComponents({
    h: base.h,
    s: Math.min(base.s, 30),
    l: isLightBase ? 10 : 98,
  });

  // Hover/selected backgrounds want a soft tint of the brand colour. Drop
  // saturation a touch so it doesn't fight the editor text.
  const accent = formatHslComponents({
    h: base.h,
    s: clampPct(Math.min(base.s, 70)),
    l: 95,
  });

  // Text on `--accent`: same hue, full saturation, sit it deep enough that
  // it reads cleanly on the soft tinted bg above.
  const accentForeground = formatHslComponents({
    h: base.h,
    s: clampPct(Math.max(base.s, 40)),
    l: 30,
  });

  return {
    primary,
    primaryForeground,
    accent,
    accentForeground,
    ring: primary,
  };
}