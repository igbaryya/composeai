import {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "./cn";

type Side = "top" | "right" | "bottom" | "left";

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: Side;
  delay?: number;
  className?: string;
}

// `left`/`right` are interpreted as inline-start / inline-end so the tooltip
// flips automatically under `dir="rtl"`. The horizontal centring offsets stay
// physical (`left-1/2 -translate-x-1/2`) — the result is direction-agnostic
// because the centre line is the same in either writing mode.
const sideClasses: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "end-full top-1/2 me-2 -translate-y-1/2",
  right: "start-full top-1/2 ms-2 -translate-y-1/2",
};

/** Minimal tooltip inlined into the composer package. */
export function Tooltip({
  children,
  content,
  side = "top",
  delay = 150,
  className,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), delay);
  };
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  const trigger = isValidElement(children) ? (
    cloneElement(children as ReactElement<Record<string, unknown>>, {
      "aria-describedby": id,
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide,
    })
  ) : (
    <span
      tabIndex={0}
      aria-describedby={id}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
    </span>
  );

  return (
    <span className="relative inline-flex">
      {trigger}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md",
            sideClasses[side],
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}