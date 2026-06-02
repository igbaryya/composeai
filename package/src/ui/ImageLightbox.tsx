import { useEffect } from "react";
import { Portal } from "../internal/Portal";
import { useComposerContext } from "../core/ComposerProvider";

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: Props) {
  const { icons, tokenStyle } = useComposerContext();
  const { close: CloseIcon } = icons;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={tokenStyle}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-foreground/70 backdrop-blur-sm"
          onClick={onClose}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute end-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-soft transition-colors hover:bg-accent"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
        <img
          src={src}
          alt={alt}
          className="relative max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-xl"
        />
      </div>
    </Portal>
  );
}