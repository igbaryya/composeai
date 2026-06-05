import { useState } from "react";
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";
import { AttachmentChip } from "../ui/AttachmentChip";
import { ImageLightbox } from "../ui/ImageLightbox";
import type { Attachment } from "../types";

/** Renders attachment chips above the editor input. */
export function AttachmentTray() {
  const { attachments, removeAttachment, classNames, sx } = useComposerContext();
  const [zoom, setZoom] = useState<Attachment | null>(null);

  if (attachments.length === 0) return null;

  const tray = slotProps(
    "attachmentTray",
    "composer-attachment-tray",
    classNames,
    sx,
  );

  return (
    <>
      <div {...tray}>
        {attachments.map((att) => (
          <AttachmentChip
            key={att.id}
            attachment={att}
            onRemove={() => removeAttachment(att.id)}
            onZoom={att.kind === "image" ? () => setZoom(att) : undefined}
          />
        ))}
      </div>
      {zoom && zoom.previewUrl && (
        <ImageLightbox
          src={zoom.previewUrl}
          alt={zoom.name}
          onClose={() => setZoom(null)}
        />
      )}
    </>
  );
}