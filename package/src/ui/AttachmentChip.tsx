import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import type { Attachment } from "../types";

interface Props {
  attachment: Attachment;
  onRemove: () => void;
  onZoom?: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentChip({ attachment, onRemove, onZoom }: Props) {
  const { icons, classNames, sx } = useComposerContext();
  const {
    file: FileIcon,
    audio: AudioIcon,
    close: CloseIcon,
    zoom: ZoomIcon,
    spinner: SpinnerIcon,
    warning: WarningIcon,
  } = icons;
  const isImage = attachment.kind === "image" && !!attachment.previewUrl;
  const isUploading = attachment.status === "uploading";
  const isFailed = attachment.status === "failed";
  // Surface the upload error on hover. Falls back to the file name when
  // nothing's wrong, so the chip is still scannable.
  const titleText = isFailed && attachment.error
    ? `${attachment.name} — ${attachment.error}`
    : attachment.name;

  if (isImage) {
    const chip = slotProps(
      "attachmentChip",
      "composer-chip composer-chip--image",
      classNames,
      sx,
    );
    return (
      <div {...chip} title={titleText}>
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="composer-chip-img"
        />
        {/* Uploading overlay — sits above the image, eats hover events
            below so the user doesn't accidentally trigger zoom mid-upload. */}
        {isUploading && (
          <div
            aria-label="Uploading"
            className="composer-chip-overlay composer-chip-overlay--uploading"
          >
            <SpinnerIcon className="composer-spin" />
          </div>
        )}
        {/* Failed overlay — destructive tint + warning glyph + persistent
            (no hover gating) so the failure stays obvious. */}
        {isFailed && (
          <div
            aria-label="Upload failed"
            className="composer-chip-overlay composer-chip-overlay--failed"
          >
            <WarningIcon />
          </div>
        )}
        {!isUploading && !isFailed && (
          <button
            type="button"
            onClick={onZoom}
            aria-label={`Zoom ${attachment.name}`}
            className="composer-chip-zoom"
          >
            <ZoomIcon />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${attachment.name}`}
          // Remove stays available during upload/failure too — clicking it
          // is the user's "cancel" / "retry from scratch" gesture.
          className="composer-chip-remove"
          data-visible={isUploading || isFailed ? "" : undefined}
        >
          <CloseIcon strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  const KindIcon = attachment.kind === "audio" ? AudioIcon : FileIcon;
  const chip = slotProps(
    "attachmentChip",
    "composer-chip composer-chip--file",
    classNames,
    sx,
  );

  return (
    <div {...chip} data-failed={isFailed ? "" : undefined} title={titleText}>
      <span className="composer-chip-icon" data-failed={isFailed ? "" : undefined}>
        {isUploading ? (
          <SpinnerIcon className="composer-spin" />
        ) : isFailed ? (
          <WarningIcon />
        ) : (
          <KindIcon />
        )}
      </span>
      <span className="composer-chip-text">
        <span className="composer-chip-name">{attachment.name}</span>
        <span className="composer-chip-meta" data-failed={isFailed ? "" : undefined}>
          {isUploading
            ? "Uploading…"
            : isFailed
              ? attachment.error || "Upload failed"
              : formatBytes(attachment.size)}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        className="composer-chip-remove-inline"
      >
        <CloseIcon />
      </button>
    </div>
  );
}