import { useEffect, useState } from "react";

export interface PopoverPosition {
  top: number;
  left: number;
  flippedAbove: boolean;
}

interface Options {
  /** Element/DOMRect to anchor against. */
  anchor: DOMRect | null;
  /** Estimated popover height (used for viewport flip calc). */
  estimatedHeight?: number;
  /** Estimated popover width. */
  estimatedWidth?: number;
  /** Gap from caret. */
  gap?: number;
}

export function usePopoverPosition({
  anchor,
  estimatedHeight = 240,
  estimatedWidth = 280,
  gap = 6,
}: Options): PopoverPosition | null {
  const [pos, setPos] = useState<PopoverPosition | null>(null);

  useEffect(() => {
    if (!anchor) {
      setPos(null);
      return;
    }
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const spaceBelow = viewportH - anchor.bottom;
    const flipAbove = spaceBelow < estimatedHeight && anchor.top > estimatedHeight;
    const top = flipAbove ? anchor.top - estimatedHeight - gap : anchor.bottom + gap;
    let left = anchor.left;
    if (left + estimatedWidth > viewportW - 8) {
      left = Math.max(8, viewportW - estimatedWidth - 8);
    }
    setPos({ top, left, flippedAbove: flipAbove });
  }, [anchor, estimatedHeight, estimatedWidth, gap]);

  return pos;
}

/** Returns the DOMRect of the current text caret, or null if none. */
export function getCaretRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0).cloneRange();
  range.collapse(true);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    const parent = range.startContainer.parentElement;
    if (parent) return parent.getBoundingClientRect();
  }
  return rect;
}