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
      "group/chip relative h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted",
      classNames,
      sx,
    );
    return (
      <div {...chip} title={titleText}>
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="h-full w-full object-cover"
        />
        {/* Uploading overlay — sits above the image, eats hover events
            below so the user doesn't accidentally trigger zoom mid-upload. */}
        {isUploading && (
          <div
            aria-label="Uploading"
            className="absolute inset-0 grid place-items-center bg-foreground/50"
          >
            <SpinnerIcon className="h-5 w-5 animate-spin text-background" />
          </div>
        )}
        {/* Failed overlay — destructive tint + warning glyph + persistent
            (no hover gating) so the failure stays obvious. */}
        {isFailed && (
          <div
            aria-label="Upload failed"
            className="absolute inset-0 grid place-items-center bg-destructive/55"
          >
            <WarningIcon className="h-5 w-5 text-destructive-foreground" />
          </div>
        )}
        {!isUploading && !isFailed && (
          <button
            type="button"
            onClick={onZoom}
            aria-label={`Zoom ${attachment.name}`}
            className="absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition-opacity group-hover/chip:opacity-100"
          >
            <ZoomIcon className="h-4 w-4 text-background" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${attachment.name}`}
          // Remove stays available during upload/failure too — clicking it
          // is the user's "cancel" / "retry from scratch" gesture.
          className={
            "absolute end-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background transition-opacity " +
            (isUploading || isFailed
              ? "opacity-100"
              : "opacity-0 group-hover/chip:opacity-100")
          }
        >
          <CloseIcon className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  const KindIcon = attachment.kind === "audio" ? AudioIcon : FileIcon;
  const chip = slotProps(
    "attachmentChip",
    "group/chip flex items-center gap-2 rounded-xl border bg-card ps-2 pe-1 py-1.5 " +
      (isFailed ? "border-destructive/60" : "border-border"),
    classNames,
    sx,
  );

  return (
    <div {...chip} title={titleText}>
      <span
        className={
          "flex h-8 w-8 items-center justify-center rounded-md " +
          (isFailed
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground")
        }
      >
        {isUploading ? (
          <SpinnerIcon className="h-4 w-4 animate-spin" />
        ) : isFailed ? (
          <WarningIcon className="h-4 w-4" />
        ) : (
          <KindIcon className="h-4 w-4" />
        )}
      </span>
      <span className="flex flex-col">
        <span className="max-w-[160px] truncate text-xs font-medium leading-tight">
          {attachment.name}
        </span>
        <span
          className={
            "text-[10px] " +
            (isFailed ? "text-destructive" : "text-muted-foreground")
          }
        >
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
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}