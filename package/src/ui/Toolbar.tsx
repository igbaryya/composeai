import { useRef, type ReactNode } from "react";
import { cn } from "../internal/cn";
import { slotProps } from "../internal/sx";
import { Tooltip } from "../internal/Tooltip";
import { useComposerContext } from "../core/ComposerProvider";
import { VoiceButton } from "../plugins/VoicePlugin";
import { AttachmentTypePicker } from "./AttachmentTypePicker";

interface Props {
  extras?: ReactNode;
}

const TOOLBAR_BTN_BASE =
  "flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

export function Toolbar({ extras }: Props) {
  const {
    features,
    attachmentsConfig,
    addFiles,
    webEnabled,
    toggleWeb,
    icons,
    classNames,
    sx,
  } = useComposerContext();
  const { attach: AttachIcon, image: ImageIcon, web: WebIcon } = icons;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const attachmentsEnabled = !!features.attachments;
  // Per-picker toggles. `file` defaults to true (one-click paperclip);
  // `image` defaults to false (opt-in mobile camera-roll shortcut). Pass
  // `{ file: false }` to hide the paperclip, `{ image: true }` to add the
  // dedicated image picker.
  const showFileBtn = attachmentsEnabled && attachmentsConfig.file !== false;
  const showImageBtn = attachmentsEnabled && attachmentsConfig.image !== false;
  // When `types` is supplied, the paperclip flips into a popover trigger
  // that lets the user pre-pick the format before the OS dialog opens.
  const hasTypePicker =
    showFileBtn &&
    Array.isArray(attachmentsConfig.types) &&
    attachmentsConfig.types.length > 0;

  const toolbar = slotProps("toolbar", "flex items-center gap-1", classNames, sx);
  const toolbarBtn = slotProps("toolbarButton", TOOLBAR_BTN_BASE, classNames, sx);

  return (
    <div {...toolbar}>
      {showFileBtn && !hasTypePicker && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={attachmentsConfig.accept}
            hidden
            onChange={(e) => {
              const files = e.target.files;
              if (files) addFiles(Array.from(files));
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <Tooltip content="Attach file" side="top">
            <button
              type="button"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              {...toolbarBtn}
            >
              <AttachIcon className="h-4 w-4" />
            </button>
          </Tooltip>
        </>
      )}
      {hasTypePicker && attachmentsConfig.types && (
        <AttachmentTypePicker
          types={attachmentsConfig.types}
          addFiles={addFiles}
          triggerClassName={toolbarBtn.className ?? ""}
          triggerStyle={toolbarBtn.style}
          TriggerIcon={AttachIcon}
        />
      )}
      {showImageBtn && (
        <>
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            hidden
            onChange={(e) => {
              const files = e.target.files;
              if (files) addFiles(Array.from(files));
              if (imageInputRef.current) imageInputRef.current.value = "";
            }}
          />
          <Tooltip content="Add image" side="top">
            <button
              type="button"
              aria-label="Add image"
              onClick={() => imageInputRef.current?.click()}
              {...toolbarBtn}
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </Tooltip>
        </>
      )}
      {features.voice && <VoiceButton />}
      {features.web && (
        <button
          type="button"
          onClick={toggleWeb}
          aria-pressed={webEnabled}
          className={cn(
            "ms-0.5 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
            webEnabled
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
            classNames?.toolbarButton,
          )}
        >
          <WebIcon className="h-3.5 w-3.5" />
          Web
        </button>
      )}
      {extras}
    </div>
  );
}