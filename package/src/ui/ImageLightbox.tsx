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
        data-composer-scope=""
        className="composer-lightbox"
        style={tokenStyle}
      >
        <div
          aria-hidden
          className="composer-lightbox-backdrop"
          onClick={onClose}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="composer-lightbox-close"
        >
          <CloseIcon />
        </button>
        <img src={src} alt={alt} className="composer-lightbox-img" />
      </div>
    </Portal>
  );
}