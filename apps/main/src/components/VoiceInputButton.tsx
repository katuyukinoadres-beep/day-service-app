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
  onaudiostart?: (() => void) | null;
  onaudioend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onnomatch?: (() => void) | null;
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

// Expose diagnostic log to the UI so users without DevTools can share it
interface DiagEntry {
  t: number;
  ev: string;
  detail?: string;
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
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLog, setDiagLog] = useState<DiagEntry[]>([]);
  const attemptRef = useRef(0);
  const startedAtRef = useRef<number>(0);

  const onAppendRef = useRef(onAppend);
  useEffect(() => {
    onAppendRef.current = onAppend;
  }, [onAppend]);

  const supported = useSyncExternalStore(
    () => () => {},
    () => getSpeechRecognition() !== null,
    () => false
  );

  const log = (ev: string, detail?: string) => {
    const entry = { t: Date.now(), ev, detail };
    // Keep last 40 entries
    setDiagLog((prev) => [...prev.slice(-39), entry]);
    // Also emit to console for DevTools users
    if (typeof console !== "undefined") {
      console.info(`[VoiceInput] ${ev}`, detail ?? "");
    }
  };

  // Strategy: create a fresh SpeechRecognition instance PER start call.
  // Both "new-per-start" and "single-persistent" approaches have been
  // reported to fail silently on Chrome for 2nd+ uses, so we add:
  //  - Explicit abort of any previous instance before creating new
  //  - Microphone permission probe BEFORE start
  //  - Full event logging (audiostart/speechstart/audioend/end/error/nomatch)
  //  - A watchdog that fires after 3s with no audiostart — surfaces silent failures
  const currentRecRef = useRef<SpeechRecognitionLike | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const start = async () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("このブラウザは音声入力に対応していません");
      return;
    }
    setError(null);
    attemptRef.current += 1;
    const attempt = attemptRef.current;
    log("start-invoked", `attempt=${attempt}`);

    // Probe mic permission (informational, does not block)
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      try {
        const p = await (
          navigator.permissions as unknown as {
            query: (arg: { name: string }) => Promise<{ state: string }>;
          }
        ).query({ name: "microphone" });
        log("perm-state", p.state);
      } catch (e) {
        log("perm-probe-failed", String(e));
      }
    }

    // Abort any previous instance before creating new
    if (currentRecRef.current) {
      log("aborting-previous", "releasing old instance");
      try {
        currentRecRef.current.abort();
      } catch (e) {
        log("abort-threw", String(e));
      }
      currentRecRef.current = null;
    }

    const rec = new Ctor();
    rec.lang = "ja-JP";
    rec.continuous = false;
    rec.interimResults = false;
    currentRecRef.current = rec;
    startedAtRef.current = Date.now();

    rec.onstart = () => {
      log("onstart", `attempt=${attempt}`);
      setListening(true);
    };
    rec.onaudiostart = () => log("onaudiostart");
    rec.onspeechstart = () => log("onspeechstart");
    rec.onspeechend = () => log("onspeechend");
    rec.onaudioend = () => log("onaudioend");
    rec.onnomatch = () => log("onnomatch");
    rec.onend = () => {
      log("onend", `elapsed=${Date.now() - startedAtRef.current}ms`);
      setListening(false);
      clearWatchdog();
      if (currentRecRef.current === rec) currentRecRef.current = null;
    };
    rec.onerror = (ev) => {
      log("onerror", `${ev.error}${ev.message ? " / " + ev.message : ""}`);
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
      clearWatchdog();
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
      log("onresult", `transcript="${transcript.slice(0, 40)}"`);
      if (transcript) onAppendRef.current(transcript);
    };

    try {
      rec.start();
      log("rec.start-returned", "no throw");
    } catch (err) {
      log("rec.start-threw", err instanceof Error ? err.message : String(err));
      setError(
        `音声入力を開始できませんでした: ${err instanceof Error ? err.message : "unknown"}`
      );
      setListening(false);
      return;
    }

    // Watchdog: if onaudiostart never fires within 3s, surface silent failure
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      log("watchdog-timeout", "no audiostart within 3s → likely silent failure");
      setError(
        "音声入力が始まりません。ブラウザのマイク権限を確認するか、診断ログを開いて状況を共有してください。"
      );
      try {
        rec.abort();
      } catch {
        // ignore
      }
      setListening(false);
    }, 3000);
  };

  const stop = () => {
    log("stop-invoked");
    currentRecRef.current?.stop();
  };

  useEffect(() => {
    return () => {
      clearWatchdog();
      currentRecRef.current?.abort();
      currentRecRef.current = null;
    };
  }, []);

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
      <button
        type="button"
        onClick={() => setDiagOpen((v) => !v)}
        className="ml-1 text-[10px] text-gray-400 underline"
        aria-label="音声入力 診断ログを開閉"
      >
        {diagOpen ? "診断を閉じる" : "診断"}
      </button>
      {diagOpen && (
        <div className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px] font-mono text-gray-700 max-h-40 overflow-auto">
          {diagLog.length === 0 ? (
            <p className="text-gray-400">(まだログなし — マイクボタンを押してみてください)</p>
          ) : (
            diagLog.map((e, i) => (
              <p key={i}>
                +{e.t - (diagLog[0]?.t ?? e.t)}ms {e.ev}
                {e.detail ? `: ${e.detail}` : ""}
              </p>
            ))
          )}
        </div>
      )}
    </>
  );
}
