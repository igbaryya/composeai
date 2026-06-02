import { useState } from "react";

interface Props {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
}

/** Small circular avatar used inside MentionMenu. Falls back to initials. */
export function Avatar({ src, alt, size = 28, className }: Props) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  const initial = (alt || "?").slice(0, 1).toUpperCase();
  return (
    <span
      className={
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary" +
        (className ? ` ${className}` : "")
      }
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}