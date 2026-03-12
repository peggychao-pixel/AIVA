import { useState, useRef, useCallback } from "react";
import { useUntangleTranscribe } from "@workspace/api-client-react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { mutateAsync: transcribe } = useUntangleTranscribe();

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setProcessing(true);

        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.split(",")[1];
            const result = await transcribe({
              data: { audio: base64, mimeType: mimeType.split(";")[0] },
            });
            if (result.text.trim()) {
              onTranscript(result.text.trim());
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          setError("Could not transcribe. Try again.");
        } finally {
          setProcessing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  }, [transcribe, onTranscript]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const handleMouseDown = () => {
    if (!disabled && !processing) startRecording();
  };

  const handleMouseUp = () => {
    if (recording) stopRecording();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!disabled && !processing) startRecording();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (recording) stopRecording();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        disabled={disabled || processing}
        aria-label={recording ? "Release to send" : "Hold to speak"}
        className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all select-none ${
          recording
            ? "bg-primary border-primary scale-110"
            : processing
              ? "border-border opacity-50 cursor-wait"
              : "border-border hover:border-primary/60 active:scale-95"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      >
        {processing ? (
          <svg className="w-4 h-4 text-muted-foreground animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            className={`w-4 h-4 ${recording ? "text-primary-foreground" : "text-muted-foreground"}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-7 9a7 7 0 0 0 14 0h2a9 9 0 0 1-8 8.94V21h3v2H8v-2h3v-2.06A9 9 0 0 1 3 10h2z" />
          </svg>
        )}
      </button>

      {recording && (
        <span className="font-mono text-[9px] text-primary uppercase tracking-widest">
          RECORDING
        </span>
      )}
      {error && (
        <span className="font-mono text-[9px] text-destructive uppercase tracking-widest">
          {error}
        </span>
      )}
    </div>
  );
}
