import { useRef, type ReactNode } from "react";
import { cn } from "../internal/cn";
import { slotProps } from "../internal/sx";
import { Tooltip } from "../internal/Tooltip";
import { useComposerContext } from "../core/ComposerProvider";
import { VoiceButton } from "../plugins/VoicePlugin";
import { AttachmentTypePicker } from "./AttachmentTypePicker";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { CustomActionButtons } from "./CustomActions";
import { MermaidQuickAction } from "../plugins/MermaidPlugin";

interface Props {
  extras?: ReactNode;
  variant?: "compact" | "full";
  /** Real submit pipeline — handed to custom actions via their context. */
  submit?: () => void;
}

const TOOLBAR_BTN_BASE = "composer-toolbar-btn";

export function Toolbar({ extras, variant = "full", submit }: Props) {
  // Compact variant: the quick actions collapse into the "+" popover and the
  // voice button floats beside Send (rendered by Composer), so the toolbar
  // slot is just the "+" trigger — plus, beside it, a diagram-preview trigger
  // that appears only once a ```mermaid fence is detected.
  if (variant === "compact") {
    return (
      <>
        <QuickActionsMenu extras={extras} submit={submit} />
        <MermaidQuickAction />
      </>
    );
  }
  return <FullToolbar extras={extras} submit={submit} />;
}

function FullToolbar({ extras, submit }: Props) {
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

  const toolbar = slotProps("toolbar", "composer-toolbar", classNames, sx);
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
              <AttachIcon />
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
              <ImageIcon />
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
          className={cn("composer-web-btn", classNames?.toolbarButton)}
        >
          <WebIcon />
          Web
        </button>
      )}
      <CustomActionButtons submit={submit ?? (() => {})} />
      {extras}
    </div>
  );
}