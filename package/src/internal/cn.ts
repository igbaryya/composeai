/**
 * Tiny class-name combiner used internally by the composer.
 *
 * Replacement for `clsx` + `tailwind-merge`. We don't need full Tailwind
 * conflict-resolution because the composer ships plain CSS — utility-class
 * collisions are vanishingly rare inside the library. Last-wins via natural
 * CSS cascade order is sufficient.
 *
 * Accepts the same loose shapes `clsx` did:
 *   - string                       → included if truthy
 *   - number                       → converted to string
 *   - false / null / undefined / 0 → dropped
 *   - array                        → flattened recursively
 *   - object                       → keys whose values are truthy are included
 */
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: unknown };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  walk(inputs, out);
  return out.join(" ");
}

function walk(value: ClassValue, out: string[]): void {
  if (!value) return;
  if (typeof value === "string") {
    if (value.length > 0) out.push(value);
    return;
  }
  if (typeof value === "number") {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) walk(v, out);
    return;
  }
  if (typeof value === "object") {
    for (const key in value) {
      if (value[key]) out.push(key);
    }
  }
}