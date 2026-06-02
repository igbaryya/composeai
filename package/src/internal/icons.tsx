/**
 * Built-in icon set for the composer.
 *
 * Why inline instead of `lucide-react`?
 *   - Removes the runtime dependency entirely.
 *   - Lets consumers override any icon with their own component via the
 *     `icons` prop on `<Composer />` — useful for matching a brand kit
 *     (Heroicons, Phosphor, Material, etc).
 *
 * The defaults below are 24x24 stroke SVGs drawn in the same visual idiom as
 * lucide so the out-of-the-box composer looks the same as before. Each icon
 * forwards arbitrary SVGProps so callers can pass `className`, `style`,
 * `aria-*`, etc.
 */
import type { ComponentType, ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;
export type IconComponent = ComponentType<IconProps>;

function makeIcon(displayName: string, paths: ReactNode): IconComponent {
  const Icon: IconComponent = (props) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const IconSend = makeIcon(
  "IconSend",
  <>
    <path d="M12 5v14" />
    <path d="m19 12-7-7-7 7" />
  </>,
);

export const IconStop = makeIcon(
  "IconStop",
  <rect width="14" height="14" x="5" y="5" rx="2" />,
);

export const IconAttach = makeIcon(
  "IconAttach",
  <>
    <path d="M13.234 20.252 21 12.3" />
    <path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486" />
  </>,
);

export const IconImage = makeIcon(
  "IconImage",
  <>
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </>,
);

export const IconVoice = makeIcon(
  "IconVoice",
  <>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </>,
);

export const IconVoiceRecording = makeIcon(
  "IconVoiceRecording",
  <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
);

export const IconWeb = makeIcon(
  "IconWeb",
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </>,
);

export const IconClose = makeIcon(
  "IconClose",
  <>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </>,
);

export const IconZoom = makeIcon(
  "IconZoom",
  <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" x2="16.65" y1="21" y2="16.65" />
    <line x1="11" x2="11" y1="8" y2="14" />
    <line x1="8" x2="14" y1="11" y2="11" />
  </>,
);

export const IconFile = makeIcon(
  "IconFile",
  <>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </>,
);

export const IconAudio = makeIcon(
  "IconAudio",
  <>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </>,
);

export const IconSparkle = makeIcon(
  "IconSparkle",
  <>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </>,
);

export const IconSpinner = makeIcon(
  "IconSpinner",
  <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
);

export const IconWarning = makeIcon(
  "IconWarning",
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>,
);

/**
 * Public icon slot map. Consumers can override any of these via the
 * `icons` prop on `<Composer />`. Anything left unspecified falls back to
 * the built-in lucide-style default above.
 */
export interface ComposerIcons {
  /** Submit / send the message. */
  send: IconComponent;
  /** Stop an in-flight streaming response. */
  stop: IconComponent;
  /** Toolbar: attach any file. */
  attach: IconComponent;
  /** Toolbar: pick an image. */
  image: IconComponent;
  /** Voice plugin: start recording. */
  voice: IconComponent;
  /** Voice plugin: transcription in progress. */
  voiceRecording: IconComponent;
  /** Toolbar: enable web search. */
  web: IconComponent;
  /** Close / dismiss (e.g. lightbox, chip remove). */
  close: IconComponent;
  /** Zoom into an attachment / diagram. */
  zoom: IconComponent;
  /** Generic file (PDF, doc, etc) attachment. */
  file: IconComponent;
  /** Audio attachment. */
  audio: IconComponent;
  /** Decorative sparkle (suggestions, diagram preview header). */
  sparkle: IconComponent;
  /** Generic loading spinner (used on attachment chips during upload). */
  spinner: IconComponent;
  /** Generic warning / failure badge (used on failed-upload chips). */
  warning: IconComponent;
}

export const DEFAULT_ICONS: ComposerIcons = {
  send: IconSend,
  stop: IconStop,
  attach: IconAttach,
  image: IconImage,
  voice: IconVoice,
  voiceRecording: IconVoiceRecording,
  web: IconWeb,
  close: IconClose,
  zoom: IconZoom,
  file: IconFile,
  audio: IconAudio,
  sparkle: IconSparkle,
  spinner: IconSpinner,
  warning: IconWarning,
};

/** Merge consumer-provided overrides with the built-in defaults. */
export function resolveIcons(
  overrides?: Partial<ComposerIcons>,
): ComposerIcons {
  if (!overrides) return DEFAULT_ICONS;
  return { ...DEFAULT_ICONS, ...overrides };
}