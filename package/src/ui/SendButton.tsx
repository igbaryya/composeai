/**
 * SendButton — the affordance for "submit" and "stop streaming".
 *
 * Customization model (loosest → tightest control):
 *
 *   1. `icons.send` / `icons.stop`        → swap just the SVG inside the
 *                                            default chrome.
 *   2. `classNames.sendButton` /          → append classes to the default
 *      `classNames.stopButton`              <button> element.
 *   3. `sx.sendButton` / `sx.stopButton`  → token-driven inline styles on
 *                                            the default <button>.
 *   4. `slots.sendButton` /               → replace the entire element with
 *      `slots.stopButton`                   the consumer's own component.
 *                                            See `ComposerSlots` in types.ts.
 *
 * When a slot is provided, the resolved `className` / `style` from layers
 * 2 and 3 are still passed in — consumers can spread them for "your DOM,
 * our theme" or ignore them for a from-scratch design.
 */
import { slotProps } from "../internal/sx";
import { useComposerContext } from "../core/ComposerProvider";

interface Props {
  canSend: boolean;
  isStreaming: boolean;
  onSend: () => void;
  onStop?: () => void;
}

export function SendButton({ canSend, isStreaming, onSend, onStop }: Props) {
  const { icons, classNames, sx, slots } = useComposerContext();
  const { send: SendIcon, stop: StopIcon } = icons;

  if (isStreaming) {
    const stop = slotProps(
      "stopButton",
      "composer-send-btn composer-send-btn--stop",
      classNames,
      sx,
    );
    // Custom stop slot — bypass our default chrome entirely. We still
    // forward `onStop` (no-op safe via `?? noop` so the slot signature
    // never has to deal with `undefined`) and the resolved class/style so
    // the consumer can opt in to our theme tokens if they want.
    if (slots.stopButton) {
      const Slot = slots.stopButton;
      return (
        <Slot
          onStop={onStop ?? noop}
          className={stop.className}
          style={stop.style}
        />
      );
    }
    return (
      <button type="button" onClick={onStop} aria-label="Stop generating" {...stop}>
        <StopIcon />
      </button>
    );
  }
  const send = slotProps("sendButton", "composer-send-btn", classNames, sx);
  // Custom send slot — same contract as the stop slot above. We pass
  // `canSend` rather than `disabled` so the consumer can use it for both
  // the DOM `disabled` attribute AND any other UI affordance (label
  // change, opacity, tooltip, etc.).
  if (slots.sendButton) {
    const Slot = slots.sendButton;
    return (
      <Slot
        canSend={canSend}
        onSend={onSend}
        className={send.className}
        style={send.style}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={onSend}
      disabled={!canSend}
      aria-label="Send message"
      {...send}
    >
      <SendIcon strokeWidth={2.5} />
    </button>
  );
}

// Safe fallback so the slot signature doesn't have to make `onStop`
// optional. `onStop` on `<Composer />` is optional — if the consumer
// doesn't pass one, a click is a no-op (same as the default button).
function noop() {}