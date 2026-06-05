/**
 * VoicePlugin — toolbar mic button that captures voice input. Prefers the
 * Web Speech API for live transcription (Chromium, Safari); falls back to
 * MediaRecorder which posts the recorded clip as an audio attachment.
 *
 *  - All capture APIs are accessed lazily — no permissions are requested
 *    until the user actually presses the button.
 *  - While recording: button shows a pulsing red dot and live elapsed time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../internal/cn";
import { Tooltip } from "../internal/Tooltip";
import { useComposerContext } from "../core/ComposerProvider";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
} from "lexical";

type RecState = "idle" | "starting" | "recording" | "transcribing";

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<
    ArrayLike<{ transcript: string }> & { isFinal: boolean }
  >;
  resultIndex: number;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function formatSeconds(s: number): string {
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

export function VoiceButton() {
  const [editor] = useLexicalComposerContext();
  const { addFiles, icons, classNames } = useComposerContext();
  const { voice: VoiceIcon, voiceRecording: VoiceRecordingIcon } = icons;
  const [state, setState] = useState<RecState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      try {
        mediaRef.current?.stop();
      } catch {
        // ignore
      }
      if (tickerRef.current) window.clearInterval(tickerRef.current);
    };
  }, []);

  const startTicker = () => {
    startedAtRef.current = Date.now();
    setElapsed(0);
    if (tickerRef.current) window.clearInterval(tickerRef.current);
    tickerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
  };

  const stopTicker = () => {
    if (tickerRef.current) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  };

  const insertText = useCallback(
    (text: string) => {
      editor.update(() => {
        const sel = $getSelection();
        if ($isRangeSelection(sel)) {
          sel.insertText(text);
        }
      });
    },
    [editor],
  );

  const startSpeech = (Recognition: new () => SpeechRecognitionLike) => {
    const rec = new Recognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";

    let finalBuffer = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if ((result as unknown as { isFinal: boolean }).isFinal) {
          finalBuffer += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalBuffer.trim().length > 0) {
        insertText(finalBuffer + (interim ? "" : " "));
        finalBuffer = "";
      }
    };
    rec.onerror = () => {
      stopTicker();
      setState("idle");
    };
    rec.onend = () => {
      stopTicker();
      setState("idle");
    };
    recognitionRef.current = rec;
    setState("recording");
    startTicker();
    rec.start();
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        addFiles([file]);
        stream.getTracks().forEach((t) => t.stop());
        stopTicker();
        setState("idle");
      };
      mediaRef.current = rec;
      rec.start();
      setState("recording");
      startTicker();
    } catch {
      stopTicker();
      setState("idle");
    }
  };

  const start = async () => {
    setState("starting");
    const Recognition = getSpeechRecognition();
    if (Recognition) {
      try {
        startSpeech(Recognition);
        return;
      } catch {
        // fall through to MediaRecorder fallback
      }
    }
    await startMediaRecorder();
  };

  const stop = () => {
    setState("transcribing");
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    try {
      mediaRef.current?.stop();
    } catch {
      // ignore
    }
  };

  const isRecording = state === "recording" || state === "starting";

  return (
    <div className="composer-voice">
      <Tooltip
        content={isRecording ? "Stop recording" : "Voice input"}
        side="top"
      >
        <button
          type="button"
          aria-label={isRecording ? "Stop voice recording" : "Start voice input"}
          aria-pressed={isRecording}
          onClick={() => (isRecording ? stop() : void start())}
          className={cn(
            "composer-toolbar-btn composer-voice-btn",
            classNames?.toolbarButton,
          )}
        >
          {state === "transcribing" ? (
            <VoiceRecordingIcon className="composer-spin" />
          ) : (
            <VoiceIcon className={cn(isRecording && "composer-pulse")} />
          )}
        </button>
      </Tooltip>
      {isRecording && (
        <span className="composer-voice-timer">
          <span className="composer-voice-dot composer-pulse" />
          {formatSeconds(elapsed)}
        </span>
      )}
    </div>
  );
}