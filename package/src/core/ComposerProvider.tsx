import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  Attachment,
  AttachmentOptions,
  AttachmentsConfig,
  ComposerFeatures,
  ComposerPromptBehavior,
  ComposerProps,
  ComposerSlotClassNames,
  ComposerSlots,
  ComposerSxMap,
  DiagramRenderer,
  MarkdownMode,
} from "../types";
import { resolveIcons, type ComposerIcons } from "../internal/icons";

type ComposerMode = NonNullable<ComposerProps["mode"]>;

type SubmitCallback = () => void;
type AddFilesCallback = (files: File[]) => void;
type RunPromptCallback = (
  prompt: string,
  behavior: ComposerPromptBehavior,
) => void;

interface ComposerContextValue {
  features: Required<ComposerFeatures>;
  attachmentsConfig: AttachmentsConfig;
  attachments: Attachment[];
  addFiles: AddFilesCallback;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  registerAddFiles: (cb: AddFilesCallback) => () => void;
  /** Stream of submit requests; plugins can subscribe (e.g. SlashMenu intercepts Enter). */
  registerSubmit: (cb: SubmitCallback) => () => void;
  triggerSubmit: () => void;
  /**
   * Quick-prompts channel. The chip-row UI calls `runPrompt(text, behavior)`;
   * the inner editor (which owns the editor state and the submit function)
   * subscribes via `registerRunPrompt` and performs the actual insert /
   * insert-and-submit.
   */
  registerRunPrompt: (cb: RunPromptCallback) => () => void;
  runPrompt: RunPromptCallback;
  webEnabled: boolean;
  toggleWeb: () => void;
  isStreaming: boolean;
  isDraggingFiles: boolean;
  setIsDraggingFiles: (v: boolean) => void;
  closeMenusOnOutsideClick: boolean;
  /** See {@link AttachmentOptions}. Normalized so all sub-flags have defaults. */
  attachmentOptions: AttachmentOptions;
  /**
   * Resolved markdown rendering mode. Derived from `features.markdown`:
   *   - `markdown: true` / `markdown: undefined` → `"hybrid"`
   *   - `markdown: false`                         → `"hybrid"` (unused — plugin off)
   *   - `markdown: { mode }`                      → that mode
   *
   * Read by MarkdownPlugin to decide whether to emit visible token spans
   * (`hybrid`) or to consume markers in place once they match (`live`).
   * Read by the serializer to know whether the document text IS the
   * markdown source (`hybrid`) or needs reconstructing from format flags
   * (`live`).
   */
  markdownMode: MarkdownMode;
  mode: ComposerMode;
  /** See `ComposerProps.variant`. Defaults to `"compact"`. */
  variant: "compact" | "full";
  /** See `ComposerProps.multiline`. */
  multiline: boolean;
  /** See `ComposerProps.submitOnEnter`. */
  submitOnEnter: boolean;
  /** See `ComposerProps.smartNewline`. Only meaningful when `multiline` is true. */
  smartNewline: boolean;
  /** See `ComposerProps.focusShortcut`. `null` when the consumer disabled it
   *  so HintBar / docs can skip rendering the shortcut. */
  focusShortcut: string | null;
  /** Resolved icon set (consumer overrides merged with the built-in defaults). */
  icons: ComposerIcons;
  /** Component-level slot overrides (currently sendButton / stopButton).
   *  Internal components check this before rendering their default chrome. */
  slots: ComposerSlots;
  /** Consumer-supplied diagram renderer for ```mermaid (or any other) fences. */
  renderDiagram?: DiagramRenderer;
  /**
   * Writing direction explicitly set by the consumer (see
   * `ComposerProps.dir`). Plugins / popovers that escape the composer's
   * subtree (e.g. portaled menus) read this so they can mirror their layout
   * even when their portal target has a different direction than the
   * composer root.
   */
  dir?: "ltr" | "rtl" | "auto";
  /** Per-slot className overrides forwarded to every internal component. */
  classNames?: ComposerSlotClassNames;
  /** Per-slot `sx` overrides forwarded to every internal component. */
  sx?: ComposerSxMap;
  /**
   * Resolved token CSS custom properties (e.g. `{ "--primary": "270 91% 65%" }`)
   * that we re-apply on every portaled popover / overlay so the brand colour
   * cascades into UI that escapes `[data-composer-root]`. Computed once in
   * `<Composer />` and forwarded here so popups don't need to re-resolve it.
   */
  tokenStyle?: CSSProperties;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

const DEFAULT_FEATURES: Required<ComposerFeatures> = {
  markdown: true,
  attachments: true,
  mentions: false,
  slashCommands: false,
  voice: true,
  mermaid: true,
  web: true,
  // No consumer-defined actions by default.
  custom: [],
  // Off by default — ghost autocomplete is an opt-in input affordance that
  // only makes sense when the consumer has a curated list of completions.
  ghostedAutoComplete: false,
};

const DEFAULT_ATTACHMENTS: Required<AttachmentsConfig> = {
  // Show only the generic paperclip by default — its `accept` string already
  // includes images, so users can still attach photos via the OS dialog.
  // The dedicated image button is opt-in (`attachments: { image: true }`),
  // primarily for chat-heavy apps where jumping straight to the mobile
  // camera-roll picker is a UX win worth the second button.
  file: true,
  image: false,
  accept: "image/*,application/pdf,text/*,audio/*,video/*",
  // No type-picker popover by default — the paperclip opens the OS file
  // picker directly. When the consumer supplies a non-empty `types` list,
  // the paperclip flips into a small dropdown that lets the user pick a
  // category first, scoping the OS dialog to that type's `accept`.
  types: [],
  maxSize: 25 * 1024 * 1024,
  maxCount: 10,
};

function normalizeFeatures(features?: ComposerFeatures): Required<ComposerFeatures> {
  if (!features) return DEFAULT_FEATURES;
  return {
    markdown: features.markdown ?? DEFAULT_FEATURES.markdown,
    attachments: features.attachments ?? DEFAULT_FEATURES.attachments,
    mentions: features.mentions ?? DEFAULT_FEATURES.mentions,
    slashCommands: features.slashCommands ?? DEFAULT_FEATURES.slashCommands,
    voice: features.voice ?? DEFAULT_FEATURES.voice,
    mermaid: features.mermaid ?? DEFAULT_FEATURES.mermaid,
    web: features.web ?? DEFAULT_FEATURES.web,
    custom: features.custom ?? DEFAULT_FEATURES.custom,
    ghostedAutoComplete:
      features.ghostedAutoComplete ?? DEFAULT_FEATURES.ghostedAutoComplete,
  };
}

function detectKind(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

// Stable reference for the default (empty) slots object — using a fresh `{}`
// on every render would invalidate the context memo and force every consumer
// to re-render even when no slots are configured.
const EMPTY_SLOTS: ComposerSlots = Object.freeze({});

interface ProviderProps {
  features?: ComposerFeatures;
  isStreaming?: boolean;
  closeMenusOnOutsideClick?: boolean;
  attachmentOptions?: AttachmentOptions;
  mode?: ComposerMode;
  variant?: "compact" | "full";
  multiline?: boolean;
  submitOnEnter?: boolean;
  smartNewline?: boolean;
  focusShortcut?: string | false | null;
  icons?: Partial<ComposerIcons>;
  slots?: ComposerSlots;
  renderDiagram?: DiagramRenderer;
  dir?: "ltr" | "rtl" | "auto";
  classNames?: ComposerSlotClassNames;
  sx?: ComposerSxMap;
  tokenStyle?: CSSProperties;
  children: ReactNode;
}

export function ComposerProvider({
  features,
  isStreaming,
  closeMenusOnOutsideClick = true,
  attachmentOptions,
  mode = "markdown",
  variant = "compact",
  multiline = true,
  submitOnEnter = true,
  smartNewline = true,
  focusShortcut = "mod+/",
  icons,
  slots,
  renderDiagram,
  dir,
  classNames,
  sx,
  tokenStyle,
  children,
}: ProviderProps) {
  const resolvedIcons = useMemo(() => resolveIcons(icons), [icons]);
  const normalizedFeatures = useMemo(() => normalizeFeatures(features), [features]);
  // Resolve markdown sub-config exactly once. We pre-collapse all the
  // shorthand cases (`true`, `false`, `{ mode }`) here so every consumer
  // (plugin, serializer, downstream UI) can just read `markdownMode`
  // without re-doing the boolean/object dance.
  const markdownMode = useMemo<MarkdownMode>(() => {
    const md = normalizedFeatures.markdown;
    if (typeof md === "object" && md.mode) return md.mode;
    return "hybrid";
  }, [normalizedFeatures.markdown]);
  const attachmentsConfig: AttachmentsConfig = useMemo(() => {
    if (typeof normalizedFeatures.attachments === "object") {
      return { ...DEFAULT_ATTACHMENTS, ...normalizedFeatures.attachments };
    }
    return DEFAULT_ATTACHMENTS;
  }, [normalizedFeatures.attachments]);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [webEnabled, setWebEnabled] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  const submitSubsRef = useRef(new Set<SubmitCallback>());
  const addFilesSubsRef = useRef(new Set<AddFilesCallback>());
  const runPromptSubsRef = useRef(new Set<RunPromptCallback>());

  // Normalize attachment-options with defaults. We expose this through the
  // context value, but the actual `addFiles` reads the upload handler via a
  // ref so we don't have to rebuild it (and tear down every paste/drop
  // subscriber) every time the consumer's callback identity changes.
  const normalizedAttachmentOptions = useMemo<AttachmentOptions>(
    () => ({
      uploadFirst: !!attachmentOptions?.uploadFirst,
      onUpload: attachmentOptions?.onUpload,
      canSendOnlyAttachment: attachmentOptions?.canSendOnlyAttachment ?? true,
    }),
    [
      attachmentOptions?.uploadFirst,
      attachmentOptions?.onUpload,
      attachmentOptions?.canSendOnlyAttachment,
    ],
  );
  const uploadHandlerRef = useRef<AttachmentOptions["onUpload"]>(
    attachmentOptions?.onUpload,
  );
  uploadHandlerRef.current = attachmentOptions?.onUpload;
  const uploadFirstRef = useRef<boolean>(
    !!attachmentOptions?.uploadFirst,
  );
  uploadFirstRef.current = !!attachmentOptions?.uploadFirst;

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const next = prev.filter((a) => a.id !== id);
      const removed = prev.find((a) => a.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl));
      return [];
    });
  }, []);

  // We read the latest `attachments.length` via a ref so this callback can
  // enforce `maxCount` correctly without re-creating itself on every list
  // change (which would invalidate every paste/drop subscriber that captured
  // it). The functional setAttachments below is the source of truth — the
  // ref-based count is just used to short-circuit before building objects.
  const attachmentsCountRef = useRef(0);
  attachmentsCountRef.current = attachments.length;

  const addFiles = useCallback<AddFilesCallback>(
    (files) => {
      if (files.length === 0) return;
      const enabled = !!normalizedFeatures.attachments;
      if (!enabled) return;

      // Build the accepted list out here so we know exactly which
      // attachments to start uploads for (we can't easily recover that
      // from inside the functional setter).
      const accepted: Attachment[] = [];
      let remaining =
        (attachmentsConfig.maxCount ?? Infinity) - attachmentsCountRef.current;
      const shouldUpload = uploadFirstRef.current && !!uploadHandlerRef.current;
      for (const file of files) {
        if (remaining <= 0) break;
        if (file.size > (attachmentsConfig.maxSize ?? Infinity)) continue;
        const kind = detectKind(file);
        accepted.push({
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind,
          name: file.name || `attachment.${kind}`,
          mimeType: file.type,
          size: file.size,
          file,
          previewUrl:
            kind === "image" || kind === "audio"
              ? URL.createObjectURL(file)
              : undefined,
          status: shouldUpload ? "uploading" : undefined,
        });
        remaining -= 1;
      }
      if (accepted.length === 0) return;

      setAttachments((prev) => [...prev, ...accepted]);
      addFilesSubsRef.current.forEach((cb) => cb(files));

      // Kick off uploads in parallel. Results land via setAttachments
      // updaters keyed on the attachment id, so a chip the user has already
      // removed simply gets skipped (the .map produces an unchanged array).
      if (shouldUpload) {
        const handler = uploadHandlerRef.current!;
        for (const att of accepted) {
          Promise.resolve()
            .then(() => handler(att.file))
            .then((ok) => {
              setAttachments((prev) =>
                prev.map((a) =>
                  a.id === att.id
                    ? {
                        ...a,
                        status: ok ? "uploaded" : "failed",
                        error: ok ? undefined : "Upload failed",
                      }
                    : a,
                ),
              );
            })
            .catch((err: unknown) => {
              const message =
                err instanceof Error ? err.message : String(err ?? "Upload failed");
              setAttachments((prev) =>
                prev.map((a) =>
                  a.id === att.id
                    ? { ...a, status: "failed", error: message }
                    : a,
                ),
              );
            });
        }
      }
    },
    [
      attachmentsConfig.maxCount,
      attachmentsConfig.maxSize,
      normalizedFeatures.attachments,
    ],
  );

  const registerAddFiles = useCallback<ComposerContextValue["registerAddFiles"]>(
    (cb) => {
      addFilesSubsRef.current.add(cb);
      return () => {
        addFilesSubsRef.current.delete(cb);
      };
    },
    [],
  );

  const registerSubmit = useCallback<ComposerContextValue["registerSubmit"]>(
    (cb) => {
      submitSubsRef.current.add(cb);
      return () => {
        submitSubsRef.current.delete(cb);
      };
    },
    [],
  );

  const triggerSubmit = useCallback(() => {
    submitSubsRef.current.forEach((cb) => cb());
  }, []);

  const registerRunPrompt = useCallback<
    ComposerContextValue["registerRunPrompt"]
  >((cb) => {
    runPromptSubsRef.current.add(cb);
    return () => {
      runPromptSubsRef.current.delete(cb);
    };
  }, []);

  const runPrompt = useCallback<RunPromptCallback>((prompt, behavior) => {
    runPromptSubsRef.current.forEach((cb) => cb(prompt, behavior));
  }, []);

  const toggleWeb = useCallback(() => setWebEnabled((w) => !w), []);

  const value = useMemo<ComposerContextValue>(
    () => ({
      features: normalizedFeatures,
      attachmentsConfig,
      attachments,
      addFiles,
      removeAttachment,
      clearAttachments,
      registerAddFiles,
      registerSubmit,
      triggerSubmit,
      registerRunPrompt,
      runPrompt,
      webEnabled,
      toggleWeb,
      isStreaming: !!isStreaming,
      isDraggingFiles,
      setIsDraggingFiles,
      closeMenusOnOutsideClick,
      attachmentOptions: normalizedAttachmentOptions,
      markdownMode,
      mode,
      variant,
      multiline,
      submitOnEnter,
      smartNewline,
      focusShortcut: focusShortcut || null,
      icons: resolvedIcons,
      slots: slots ?? EMPTY_SLOTS,
      renderDiagram,
      dir,
      classNames,
      sx,
      tokenStyle,
    }),
    [
      normalizedFeatures,
      attachmentsConfig,
      attachments,
      addFiles,
      removeAttachment,
      clearAttachments,
      registerAddFiles,
      registerSubmit,
      triggerSubmit,
      registerRunPrompt,
      runPrompt,
      webEnabled,
      toggleWeb,
      isStreaming,
      isDraggingFiles,
      closeMenusOnOutsideClick,
      normalizedAttachmentOptions,
      markdownMode,
      mode,
      variant,
      multiline,
      submitOnEnter,
      smartNewline,
      focusShortcut,
      resolvedIcons,
      slots,
      renderDiagram,
      dir,
      classNames,
      sx,
      tokenStyle,
    ],
  );

  return <ComposerContext.Provider value={value}>{children}</ComposerContext.Provider>;
}

export function useComposerContext(): ComposerContextValue {
  const ctx = useContext(ComposerContext);
  if (!ctx) {
    throw new Error("useComposerContext must be used inside <ComposerProvider>");
  }
  return ctx;
}