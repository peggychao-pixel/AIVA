import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useCreateSession, useGetAiResponse, useUpdateSession } from "@workspace/api-client-react";

import { Timer } from "../components/Timer";
import { RedirectModule } from "../components/RedirectModule";
import { AntiLoopMessages } from "../components/AntiLoopMessages";
import { ReactionGame } from "../components/ReactionGame";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

type FlowStep = "home" | "thought" | "mode" | "loading" | "active" | "complete";
type Mode = "quick" | "mission" | "hold";

const THOUGHT_OPTIONS = [
  { id: "wrong-food",    label: "Wrong food choice",       description: "I shouldn't have ordered that." },
  { id: "too-much",      label: "Ate too much",            description: "The portion was excessive." },
  { id: "keep-eating",   label: "Urge to keep eating",     description: "I'm not done but I should be." },
  { id: "bored",         label: "Just bored",              description: "Nothing to do — so thinking about food." },
  { id: "other",         label: "Other loop",              description: "Something else is circling." },
];

const STATUS_LABELS: Record<string, string> = {
  "wrong-food":   "DECISION REVIEW DETECTED",
  "too-much":     "PORTION ANALYSIS LOOP",
  "keep-eating":  "CRAVING SPIKE DETECTED",
  "bored":        "BOREDOM TRIGGER ACTIVE",
  "other":        "LOOP ACTIVE",
};

const MODES = [
  {
    id: "quick" as Mode,
    tag: "MODE 01",
    title: "QUICK INTERRUPT",
    description: "AI message + redirect options. In and out.",
  },
  {
    id: "mission" as Mode,
    tag: "MODE 02",
    title: "MISSION MODE",
    description: "Launch a cognitive task directly. High-engagement redirect.",
  },
  {
    id: "hold" as Mode,
    tag: "MODE 03",
    title: "HOLD TIMER",
    description: "Countdown only. Rotating system messages. No tasks.",
  },
];

export function SessionFlow() {
  const [step, setStep] = useState<FlowStep>("home");
  const [selectedThought, setSelectedThought] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [aiMessage, setAiMessage] = useState<string>("");

  const { mutateAsync: fetchAiResponse } = useGetAiResponse();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: updateSession } = useUpdateSession();

  const thoughtObj = THOUGHT_OPTIONS.find((t) => t.id === selectedThought);

  const handleThoughtContinue = () => {
    if (!selectedThought) return;
    setStep("mode");
  };

  const handleModeSelect = async (mode: Mode) => {
    setSelectedMode(mode);
    setStep("loading");

    try {
      const label = thoughtObj?.label ?? selectedThought;
      const aiRes = await fetchAiResponse({ data: { thought: label } });
      const sessionRes = await createSession({
        data: { ruminationThought: label, aiResponse: aiRes.message },
      });
      setSessionId(sessionRes.id);
      setAiMessage(aiRes.message);
      setStep("active");
    } catch {
      setAiMessage("Loop detected. No further analysis required. The event is closed.");
      setStep("active");
    }
  };

  const handleTimerComplete = async () => {
    setStep("complete");
    if (sessionId) {
      try {
        await updateSession({ id: sessionId, data: { timerCompleted: true } });
      } catch { /* non-critical */ }
    }
  };

  const reset = () => {
    setStep("home");
    setSelectedThought("");
    setSelectedMode(null);
    setSessionId(null);
    setAiMessage("");
  };

  const statusLabel = selectedThought ? STATUS_LABELS[selectedThought] ?? "LOOP ACTIVE" : "";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-xl px-6 py-10 flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex items-center justify-between mb-12 flex-shrink-0">
          {step !== "home" && step !== "loading" ? (
            <button
              onClick={reset}
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              ← ABORT SESSION
            </button>
          ) : (
            <div />
          )}
          <Link
            href="/history"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            LOG
          </Link>
        </header>

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">

            {/* HOME */}
            {step === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-16"
              >
                <div className="space-y-3">
                  <p className="font-mono text-xs text-primary uppercase tracking-[0.25em]">
                    UNTANGLE / v2
                  </p>
                  <h1 className="font-mono text-5xl md:text-6xl text-foreground font-bold tracking-tight leading-none">
                    Post-meal<br />loop detected.
                  </h1>
                  <p className="font-mono text-sm text-muted-foreground">
                    Cognitive interrupt system. Activate when the meal is done and the loop begins.
                  </p>
                </div>

                <button
                  onClick={() => setStep("thought")}
                  className="group flex items-center gap-3 px-6 py-4 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-[0.15em] rounded transition-all hover:opacity-90 active:scale-95 glow-primary"
                >
                  <span className="w-2 h-2 rounded-full bg-primary-foreground status-pulse" />
                  MEAL COMPLETE — ACTIVATE
                </button>
              </motion.div>
            )}

            {/* THOUGHT SELECT */}
            {step === "thought" && (
              <motion.div
                key="thought"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <p className="font-mono text-xs text-primary uppercase tracking-[0.25em]">STEP 01 / IDENTIFY LOOP</p>
                  <h2 className="font-mono text-2xl text-foreground font-bold">What's running?</h2>
                  <p className="font-mono text-xs text-muted-foreground">Select the closest match.</p>
                </div>

                <div className="space-y-2">
                  {THOUGHT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedThought(opt.id)}
                      className={`w-full text-left px-4 py-4 border rounded transition-all duration-150 ${
                        selectedThought === opt.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card/60 hover:border-border/80 text-foreground/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm font-medium">{opt.label}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                        </div>
                        {selectedThought === opt.id && (
                          <span className="font-mono text-[10px] text-primary border border-primary/40 px-1.5 py-0.5 rounded tracking-widest flex-shrink-0">
                            SELECTED
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {selectedThought && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={handleThoughtContinue}
                      className="w-full py-4 bg-foreground text-background font-mono text-sm uppercase tracking-[0.15em] rounded hover:opacity-90 transition-opacity active:scale-95"
                    >
                      CONFIRM →
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* MODE SELECT */}
            {step === "mode" && (
              <motion.div
                key="mode"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <p className="font-mono text-xs text-primary uppercase tracking-[0.25em]">STEP 02 / SELECT MODE</p>
                  <h2 className="font-mono text-2xl text-foreground font-bold">How do you want<br />to interrupt this?</h2>
                </div>

                {/* Status banner */}
                <div className="flex items-center gap-2 px-3 py-2 border border-primary/30 rounded bg-primary/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary status-pulse flex-shrink-0" />
                  <span className="font-mono text-xs text-primary uppercase tracking-widest">{statusLabel}</span>
                </div>

                <div className="space-y-2">
                  {MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => handleModeSelect(mode.id)}
                      className="w-full text-left px-4 py-4 border border-border bg-card/60 hover:border-primary/40 hover:bg-primary/5 rounded transition-all duration-150 group"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded tracking-widest group-hover:border-primary/30 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5">
                          {mode.tag}
                        </span>
                        <div>
                          <p className="font-mono text-sm font-bold text-foreground">{mode.title}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* LOADING */}
            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <LoadingSpinner message="INITIALIZING INTERRUPT..." />
              </motion.div>
            )}

            {/* ACTIVE */}
            {step === "active" && (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8 pb-16"
              >
                {/* Status bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
                    <span className="font-mono text-xs text-primary uppercase tracking-widest">
                      REDIRECT IN PROGRESS
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest border border-border px-2 py-0.5 rounded">
                    {selectedMode === "quick" ? "QUICK INTERRUPT" : selectedMode === "mission" ? "MISSION MODE" : "HOLD TIMER"}
                  </span>
                </div>

                {/* AI Message */}
                {aiMessage && (
                  <div className="border-l-2 border-primary pl-4 py-1">
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">SYSTEM MESSAGE</p>
                    <p className="font-mono text-sm text-foreground leading-relaxed">{aiMessage}</p>
                  </div>
                )}

                {/* Timer */}
                <Timer initialSeconds={1800} onComplete={handleTimerComplete} />

                {/* Mode-specific content */}
                {selectedMode === "quick" && (
                  <RedirectModule />
                )}

                {selectedMode === "mission" && (
                  <div className="space-y-4">
                    <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest px-1">
                      — ACTIVE MISSION —
                    </p>
                    <ReactionGame />
                  </div>
                )}

                {selectedMode === "hold" && (
                  <AntiLoopMessages />
                )}
              </motion.div>
            )}

            {/* COMPLETE */}
            {step === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10"
              >
                <div className="space-y-4">
                  <p className="font-mono text-xs text-primary uppercase tracking-[0.25em]">SESSION CLOSED</p>
                  <h2 className="font-mono text-4xl md:text-5xl text-foreground font-bold leading-tight">
                    Window closed.<br />Loop dissolved.
                  </h2>
                  <p className="font-mono text-sm text-muted-foreground">
                    30 minutes elapsed. The urge has decayed. This is how the biology works.
                  </p>
                </div>

                <div className="border border-border rounded p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="font-mono text-xs text-primary uppercase tracking-widest">STATUS REPORT</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/40 rounded p-3">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Loop type</p>
                      <p className="font-mono text-xs text-foreground mt-1">{thoughtObj?.label ?? "—"}</p>
                    </div>
                    <div className="bg-secondary/40 rounded p-3">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Mode used</p>
                      <p className="font-mono text-xs text-foreground mt-1">
                        {selectedMode === "quick" ? "Quick Interrupt" : selectedMode === "mission" ? "Mission Mode" : "Hold Timer"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={reset}
                  className="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground border border-border hover:border-foreground/40 px-5 py-3 rounded transition-colors"
                >
                  RETURN TO STANDBY
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
