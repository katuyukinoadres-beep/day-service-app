"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

interface SpeechRecognitionResultAlt {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionResultAlt;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike> & {
    [key: number]: SpeechRecognitionResultLike;
  };
}
interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

interface VoiceInputButtonProps {
  onAppend: (text: string) => void;
  label?: string;
}

export function VoiceInputButton({
  onAppend,
  label = "音声入力",
}: VoiceInputButtonProps) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Keep latest onAppend so the single persistent recognition instance always
  // calls the current prop, not the one captured at mount time.
  const onAppendRef = useRef(onAppend);
  useEffect(() => {
    onAppendRef.current = onAppend;
  }, [onAppend]);

  const supported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognition() !== null,
    () => false
  );

  // Create ONE SpeechRecognition instance and reuse it. Chrome's Web Speech
  // API fails silently on subsequent uses when a fresh instance is created
  // per start; reusing a single instance is the reliable pattern.
  useEffect(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (ev) => {
      const msg =
        ev.error === "not-allowed" || ev.error === "service-not-allowed"
          ? "マイクの使用が許可されていません（ブラウザ設定を確認）"
          : ev.error === "no-speech"
            ? "音声が検出されませんでした"
            : ev.error === "aborted"
              ? null
              : `音声入力エラー: ${ev.error}`;
      if (msg) setError(msg);
      setListening(false);
    };
    rec.onresult = (ev) => {
      let transcript = "";
      for (
        let i = ev.resultIndex;
        i < (ev.results as unknown as SpeechRecognitionResultLike[]).length;
        i++
      ) {
        const r = (ev.results as unknown as SpeechRecognitionResultLike[])[i];
        if (r.isFinal && r[0]?.transcript) {
          transcript += r[0].transcript;
        }
      }
      if (transcript) onAppendRef.current(transcript);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, []);

  const start = () => {
    const rec = recognitionRef.current;
    if (!rec) {
      setError("このブラウザは音声入力に対応していません");
      return;
    }
    setError(null);
    try {
      rec.start();
    } catch (err) {
      // InvalidStateError fires when start() is called on an already-running
      // recognition. Abort and retry once on next tick.
      try {
        rec.abort();
        setTimeout(() => {
          try {
            rec.start();
          } catch (err2) {
            setError(
              `音声入力を開始できませんでした: ${err2 instanceof Error ? err2.message : "unknown"}`
            );
          }
        }, 50);
      } catch {
        setError(
          `音声入力を開始できませんでした: ${err instanceof Error ? err.message : "unknown"}`
        );
      }
    }
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  if (!supported) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-label={listening ? "音声入力を停止" : label}
        className={`tap-target inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
          listening
            ? "bg-red-500 text-white animate-pulse"
            : "bg-white text-foreground border border-border active:bg-gray-50"
        }`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
          />
        </svg>
        {listening ? "録音中…タップで停止" : label}
      </button>
      {error && (
        <span className="ml-2 text-[11px] text-red-600">{error}</span>
      )}
    </>
  );
}
