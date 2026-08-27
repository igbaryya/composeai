/**
 * composeai — public entry point.
 *
 * Everything not re-exported here is internal. Consumers import like:
 *
 *   import { Composer, type ComposerSubmitPayload } from "composeai";
 *   import "composeai/composer.css";
 */

export { Composer } from "./Composer";

export { SuggestionRow } from "./ui/SuggestionRow";
export type { SuggestionRowProps } from "./ui/SuggestionRow";

export type {
  AnimatedPlaceholderConfig,
  Attachment,
  AttachmentKind,
  AttachmentOptions,
  AttachmentsConfig,
  AttachmentStatus,
  AttachmentTypeOption,
  ComposerFeatures,
  ComposerHandle,
  ComposerIcons,
  ComposerPromptBehavior,
  ComposerPromptsConfig,
  ComposerProps,
  ComposerSlot,
  ComposerSlotClassNames,
  ComposerSlots,
  ComposerSubmitPayload,
  ComposerSxMap,
  ComposerSxValue,
  ComposerTokens,
  ContextItem,
  CustomAction,
  CustomActionContext,
  DiagramRenderer,
  GhostedAutoCompleteConfig,
  IconComponent,
  IconProps,
  InContextConfig,
  MarkdownConfig,
  MarkdownMode,
  MentionConfig,
  MentionItem,
  MentionRef,
  MermaidConfig,
  SendButtonRenderProps,
  SlashCommand,
  SlashCommandContext,
  SlashConfig,
  StopButtonRenderProps,
} from "./types";