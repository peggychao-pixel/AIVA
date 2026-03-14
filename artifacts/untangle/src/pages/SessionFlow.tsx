import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  useUntangleChat,
  useCreateSession,
  useSaveMoment,
  useListMoments,
  useQuickUntangle,
} from "@workspace/api-client-react";
import { VoiceButton } from "../components/VoiceButton";

type Mode = "before" | "after" | "loop" | "pressure" | "other";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isInsight?: boolean;
  suggestions?: string[];
  loopType?: string | null;
  loopIntensity?: number | null;
  coreNeed?: string | null;
  sessionTrigger?: string | null;
  anchorPhrase?: string | null;
}

const MODE_OPTIONS: { id: Mode; label: string; description: string }[] = [
  { id: "before",   label: "Before eating",        description: "Planning, overthinking the choice." },
  { id: "after",    label: "After eating",          description: "Replaying, evaluating, judging." },
  { id: "loop",     label: "My mind keeps looping", description: "Stuck on something, can't stop returning." },
  { id: "pressure", label: "I feel pressure",       description: "To get it right, to control the outcome." },
  { id: "other",    label: "Something else",        description: "Type it out below." },
];

const OPENING_QUESTIONS: Record<Mode, string> = {
  before:   "What's the thought you're trying to solve right now?",
  after:    "What part of the meal is still running?",
  loop:     "What's the thought that keeps coming back?",
  pressure: "What does the pressure feel like you need to control or get exactly right?",
  other:    "What's tangled?",
};

const OPENING_SUGGESTIONS: Record<Mode, string[]> = {
  before:   ["Trying to pick the right option", "Worried I'll regret it", "Can't stop comparing"],
  after:    ["Replaying what I ate", "Judging if it was right", "Still want to eat more"],
  loop:     ["Same thought keeps returning", "Something I can't resolve", "I don't know what triggered it"],
  pressure: ["Making the right food choice", "Controlling what I eat", "Getting it exactly right"],
  other:    ["Something about food", "A feeling I can't name", "Let me type it out"],
};

const LOOP_SHORT_LABELS: Record<string, string> = {
  "regret anticipation": "regret",
  "uncertainty loop": "uncertainty",
  "control loop": "control",
  "over-analysis loop": "analysis",
  "self-judgment loop": "self-judgment",
  "perfectionism loop": "perfectionism",
  "scarcity loop": "scarcity",
  "reassurance loop": "reassurance",
};

const WHY_INSIGHTS: Record<string, string> = {
  "regret anticipation": "Choices feel irreversible before they are made.",
  "uncertainty loop":    "The outcome cannot be fully predicted from here.",
  "control loop":        "The mind is trying to manage what isn't in its hands.",
  "over-analysis loop":  "More information is being searched for than exists.",
  "self-judgment loop":  "The mind is treating a moment as evidence about character.",
  "perfectionism loop":  "The standard being applied may be impossible to meet.",
  "scarcity loop":       "A real constraint is present — and the mind is looping around it.",
  "reassurance loop":    "The decision is waiting for approval that may not come.",
};

function intensityDots(n: number | null | undefined): string {
  if (!n) return "";
  return "●".repeat(n) + "○".repeat(5 - n);
}

function InsightCard({
  content,
  loopType,
  onSave,
  saved,
}: {
  content: string;
  loopType?: string | null;
  onSave: () => void;
  saved: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full border border-primary/40 bg-primary/5 rounded p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] text-primary uppercase tracking-[0.2em]">
          ✦ UNTANGLE MOMENT
        </span>
        {loopType && (
          <span className="font-mono text-[9px] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0">
            {loopType}
          </span>
        )}
      </div>
      <p className="font-mono text-sm text-foreground leading-relaxed">{content}</p>
      <button
        onClick={onSave}
        disabled={saved}
        className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border transition-all ${
          saved
            ? "border-primary/40 text-primary cursor-default"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
        }`}
      >
        {saved ? "✓ SAVED" : "SAVE MOMENT"}
      </button>
    </motion.div>
  );
}

function AnchorCard({ phrase }: { phrase: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full border border-border/60 rounded p-4 space-y-2 bg-card"
    >
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
        ANCHOR PHRASE
      </p>
      <p className="font-mono text-base text-foreground font-medium">"{phrase}"</p>
      <p className="font-mono text-[10px] text-muted-foreground/60">
        If this thought returns, try recalling this phrase.
      </p>
    </motion.div>
  );
}

function PatternMap({
  loopTypes,
  coreNeeds,
  sessionTriggers,
}: {
  loopTypes: string[];
  coreNeeds: string[];
  sessionTriggers: string[];
}) {
  if (loopTypes.length === 0 && coreNeeds.length === 0) return null;

  const counts = loopTypes.reduce<Record<string, number>>((acc, lt) => {
    acc[lt] = (acc[lt] ?? 0) + 1;
    return acc;
  }, {});

  const unique = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const freqLabel = (count: number) =>
    count >= 3 ? "FREQUENT" : count >= 2 ? "MODERATE" : "OCCASIONAL";

  const freqColor = (count: number) =>
    count >= 3 ? "text-red-400" : count >= 2 ? "text-yellow-400" : "text-primary/70";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/60 rounded p-3 space-y-3"
    >
      {unique.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            MENTAL PATTERN SUMMARY
          </p>
          {unique.map(([lt, count]) => (
            <div key={lt} className="flex items-center justify-between gap-4">
              <span className="font-mono text-[10px] text-foreground/80 uppercase tracking-widest">
                {lt}
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${freqColor(count)}`}>
                {freqLabel(count)}
              </span>
            </div>
          ))}
        </div>
      )}

      {coreNeeds.length > 0 && (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            CORE NEEDS SURFACED
          </p>
          <div className="flex flex-wrap gap-1.5">
            {coreNeeds.map((n) => (
              <span key={n} className="font-mono text-[10px] text-primary/80 border border-primary/20 bg-primary/5 px-2 py-0.5 rounded uppercase tracking-widest">
                {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {sessionTriggers.length > 0 && (
        <div className="space-y-1.5 border-t border-border/40 pt-2">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            YOU TEND TO LOOP WHEN
          </p>
          <div className="space-y-1">
            {sessionTriggers.map((t) => (
              <p key={t} className="font-mono text-[10px] text-foreground/60">
                • {t}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function QuickUntangleCard({
  onClose,
}: {
  onClose: () => void;
}) {
  const [thought, setThought] = useState("");
  const { mutateAsync: runQuick, isPending, data: result } = useQuickUntangle();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thought.trim()) return;
    await runQuick({ data: { thought: thought.trim() } }).catch(() => {});
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="border border-border bg-card rounded p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-primary uppercase tracking-[0.2em]">⚡ ONE TAP UNTANGLE</p>
        <button onClick={onClose} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">✕</button>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="Type the thought that's looping..."
            rows={2}
            disabled={isPending}
            className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={!thought.trim() || isPending}
            className="w-full py-2 bg-primary text-primary-foreground font-mono text-xs rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "ANALYZING..." : "UNTANGLE NOW →"}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded uppercase tracking-widest">
              {result.loopType}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {intensityDots(result.loopIntensity)}
            </span>
          </div>
          <p className="font-mono text-sm text-foreground leading-relaxed">{result.insight}</p>
          <div className="border-t border-border/40 pt-3 space-y-1">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">ANCHOR PHRASE</p>
            <p className="font-mono text-sm text-primary">"{result.anchorPhrase}"</p>
          </div>
          <p className="font-mono text-[10px] text-foreground/60 border border-border/40 rounded px-3 py-2">
            {result.suggestion}
          </p>
          <button
            onClick={() => { setThought(""); onClose(); }}
            className="font-mono text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest"
          >
            ← CLOSE
          </button>
        </div>
      )}
    </motion.div>
  );
}

export function SessionFlow() {
  const [step, setStep] = useState<"home" | "chat">("home");
  const [mode, setMode] = useState<Mode>("after");
  const [freeInput, setFreeInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [detectedPatterns, setDetectedPatterns] = useState<string[]>([]);
  const [coreNeeds, setCoreNeeds] = useState<string[]>([]);
  const [sessionTriggers, setSessionTriggers] = useState<string[]>([]);
  const [savedMomentIds, setSavedMomentIds] = useState<Set<string>>(new Set());
  const [showQuick, setShowQuick] = useState(false);

  // Session structured data for saving
  const [originalThought, setOriginalThought] = useState<string | null>(null);
  const [surfaceBelief, setSurfaceBelief] = useState<string | null>(null);
  const [hiddenFear, setHiddenFear] = useState<string | null>(null);
  const [anchorPhrase, setAnchorPhrase] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef<Mode>("after");

  const { mutateAsync: sendChat } = useUntangleChat();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: saveMoment } = useSaveMoment();
  const { data: savedMoments } = useListMoments();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Rumination Radar — derive top patterns from saved moments
  const radarTopics = useMemo(() => {
    if (!savedMoments || savedMoments.length === 0) return [];
    const counts = savedMoments.reduce<Record<string, number>>((acc, m) => {
      if (m.loopType) acc[m.loopType] = (acc[m.loopType] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lt]) => LOOP_SHORT_LABELS[lt] ?? lt.replace(" loop", "").replace(" anticipation", ""));
  }, [savedMoments]);

  // Why Your Brain Is Looping Today — top 3 loop types from saved moments
  const whyInsights = useMemo(() => {
    if (!savedMoments || savedMoments.length < 2) return [];
    const counts = savedMoments.reduce<Record<string, number>>((acc, m) => {
      if (m.loopType) acc[m.loopType] = (acc[m.loopType] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([lt]) => WHY_INSIGHTS[lt])
      .filter(Boolean) as string[];
  }, [savedMoments]);

  const addPattern = (loopType: string | null | undefined) => {
    if (!loopType) return;
    setDetectedPatterns((prev) => [...prev, loopType]);
  };

  const doSendMessage = async (
    text: string,
    currentMode: Mode,
    currentMessages: ChatMessage[],
  ) => {
    const aiResponseCount = currentMessages.filter((m) => m.role === "assistant" && m.id !== "opener").length;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;
    setIsThinking(true);

    // Capture structured session data
    if (aiResponseCount === 0) setOriginalThought(text.trim());
    if (aiResponseCount === 1) setHiddenFear(text.trim());

    try {
      const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChat({
        data: { message: text.trim(), mode: currentMode, history },
      });

      addPattern(res.loopType);
      if (res.coreNeed) setCoreNeeds((p) => (p.includes(res.coreNeed!) ? p : [...p, res.coreNeed!]));
      if (res.sessionTrigger) setSessionTriggers((p) => (p.includes(res.sessionTrigger!) ? p : [...p, res.sessionTrigger!]));
      if (res.anchorPhrase) setAnchorPhrase(res.anchorPhrase);

      // Extract surface belief from Turn 1 response text
      if (aiResponseCount === 0) {
        const match = res.response.match(/Surface belief:\s*"([^"]+)"/);
        if (match) setSurfaceBelief(match[1]);
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.response,
        isInsight: res.isInsight,
        suggestions: res.suggestions,
        loopType: res.loopType,
        loopIntensity: res.loopIntensity,
        coreNeed: res.coreNeed,
        sessionTrigger: res.sessionTrigger,
        anchorPhrase: res.anchorPhrase,
      };
      const withAi = [...updatedMessages, aiMsg];
      setMessages(withAi);
      messagesRef.current = withAi;
    } catch {
      const fallback: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "What's the part that keeps pulling you back?",
        isInsight: false,
        suggestions: ["The outcome", "The choice", "I'm not sure"],
        loopType: null,
      };
      const withFallback = [...updatedMessages, fallback];
      setMessages(withFallback);
      messagesRef.current = withFallback;
    } finally {
      setIsThinking(false);
    }
  };

  const startConversation = async (selectedMode: Mode, initialText?: string) => {
    setMode(selectedMode);
    modeRef.current = selectedMode;
    setDetectedPatterns([]);
    setCoreNeeds([]);
    setSessionTriggers([]);
    setSavedMomentIds(new Set());
    setOriginalThought(null);
    setSurfaceBelief(null);
    setHiddenFear(null);
    setAnchorPhrase(null);
    setStep("chat");

    const opener: ChatMessage = {
      id: "opener",
      role: "assistant",
      content: OPENING_QUESTIONS[selectedMode],
      isInsight: false,
      suggestions: OPENING_SUGGESTIONS[selectedMode],
      loopType: null,
    };
    setMessages([opener]);
    messagesRef.current = [opener];

    createSession({
      data: {
        ruminationThought: MODE_OPTIONS.find((m) => m.id === selectedMode)?.label ?? selectedMode,
      },
    }).catch(() => {});

    if (initialText?.trim()) {
      setTimeout(() => doSendMessage(initialText.trim(), selectedMode, [opener]), 200);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isThinking) return;
    const text = input;
    setInput("");
    doSendMessage(text, modeRef.current, messagesRef.current);
  };

  const handleSuggestion = (text: string) => {
    if (isThinking) return;
    doSendMessage(text, modeRef.current, messagesRef.current);
  };

  const handleSaveMoment = async (msg: ChatMessage) => {
    if (savedMomentIds.has(msg.id)) return;
    setSavedMomentIds((prev) => new Set(prev).add(msg.id));
    try {
      await saveMoment({
        data: {
          content: msg.content,
          loopType: msg.loopType ?? undefined,
          anchorPhrase: anchorPhrase ?? undefined,
          surfaceBelief: surfaceBelief ?? undefined,
          hiddenFear: hiddenFear ?? undefined,
          coreNeed: msg.coreNeed ?? coreNeeds[0] ?? undefined,
          originalThought: originalThought ?? undefined,
        },
      });
    } catch {
      setSavedMomentIds((prev) => {
        const next = new Set(prev);
        next.delete(msg.id);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTranscript = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    inputRef.current?.focus();
  };

  const reset = () => {
    setStep("home");
    setFreeInput("");
    setMessages([]);
    messagesRef.current = [];
    setInput("");
    setIsThinking(false);
    setDetectedPatterns([]);
    setCoreNeeds([]);
    setSessionTriggers([]);
    setSavedMomentIds(new Set());
    setOriginalThought(null);
    setSurfaceBelief(null);
    setHiddenFear(null);
    setAnchorPhrase(null);
  };

  const handleFreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeInput.trim()) return;
    const text = freeInput.trim();
    setFreeInput("");
    startConversation("other", text);
  };

  // Find the last AI message that has an anchor phrase (exit message)
  const exitMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].anchorPhrase) return messages[i];
    }
    return null;
  }, [messages]);

  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-xl flex flex-col h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b border-border/40">
          {step === "chat" ? (
            <button
              onClick={reset}
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              ← RESET
            </button>
          ) : (
            <span className="font-mono text-xs text-primary uppercase tracking-[0.2em]">UNTANGLE</span>
          )}

          {step === "chat" && (
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest border border-border px-2 py-0.5 rounded">
              {MODE_OPTIONS.find((m) => m.id === mode)?.label ?? mode}
            </span>
          )}

          <div className="flex items-center gap-4">
            <Link
              href="/moments"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              ✦
            </Link>
            <Link
              href="/history"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            >
              LOG
            </Link>
          </div>
        </header>

        <AnimatePresence mode="wait">

          {/* HOME */}
          {step === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto px-6 py-8 space-y-8"
            >
              {/* Rumination Radar — only if saved moments exist */}
              {radarTopics.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-border/60 rounded p-4 space-y-2"
                >
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    RUMINATION RADAR
                  </p>
                  <p className="font-mono text-xs text-foreground/80">
                    Today your mind may be looping around:{" "}
                    <span className="text-primary">
                      {radarTopics.join(", ")}
                    </span>
                  </p>

                  {/* Why Your Brain Is Looping Today */}
                  {whyInsights.length > 0 && (
                    <div className="pt-2 space-y-1 border-t border-border/30 mt-3">
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                        WHY YOUR BRAIN MAY BE LOOPING TODAY
                      </p>
                      {whyInsights.map((insight, i) => (
                        <p key={i} className="font-mono text-[10px] text-foreground/60">
                          • {insight}
                        </p>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="space-y-2">
                <h1 className="font-mono text-4xl md:text-5xl text-foreground font-bold leading-tight">
                  What feels tangled<br />right now?
                </h1>
                <p className="font-mono text-sm text-muted-foreground">
                  Select a context or type it out.
                </p>
              </div>

              <div className="space-y-2">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => startConversation(opt.id)}
                    className="w-full text-left px-4 py-4 border border-border bg-card/60 hover:border-primary/40 hover:bg-primary/5 rounded transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-mono text-sm font-medium text-foreground">
                          {opt.label}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                      <span className="font-mono text-muted-foreground group-hover:text-primary transition-colors text-xs">
                        →
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleFreeSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={freeInput}
                    onChange={(e) => setFreeInput(e.target.value)}
                    placeholder="Or type it here..."
                    className="flex-1 bg-card border border-border rounded px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!freeInput.trim()}
                    className="px-5 py-3 bg-primary text-primary-foreground font-mono text-xs rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  Or hold mic to speak
                </p>
              </form>

              {/* One Tap Untangle */}
              <div className="space-y-2">
                <AnimatePresence>
                  {showQuick ? (
                    <QuickUntangleCard onClose={() => setShowQuick(false)} />
                  ) : (
                    <motion.button
                      key="quick-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowQuick(true)}
                      className="w-full text-left px-4 py-3 border border-border/50 border-dashed rounded hover:border-primary/40 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                            ⚡ One Tap Untangle
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground/50 mt-0.5">
                            Instant loop detection — no conversation.
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                          TAP →
                        </span>
                      </div>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* CHAT */}
          {step === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-2`}
                  >
                    {msg.role === "assistant" && msg.isInsight ? (
                      <InsightCard
                        content={msg.content}
                        loopType={msg.loopType}
                        onSave={() => handleSaveMoment(msg)}
                        saved={savedMomentIds.has(msg.id)}
                      />
                    ) : (
                      <div
                        className={`max-w-[85%] px-4 py-3 rounded font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary/10 border border-primary/30 text-foreground"
                            : "bg-card border border-border text-foreground"
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}

                    {msg.role === "assistant" &&
                      msg.suggestions &&
                      msg.suggestions.length > 0 &&
                      i === lastAssistantIndex && (
                        <div className="flex flex-wrap gap-2 max-w-full">
                          {msg.suggestions.map((s, si) => (
                            <button
                              key={si}
                              onClick={() => handleSuggestion(s)}
                              disabled={isThinking}
                              className="font-mono text-xs px-3 py-1.5 border border-border rounded hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                  </motion.div>
                ))}

                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-start"
                  >
                    <div className="bg-card border border-border rounded px-4 py-3">
                      <div className="flex gap-1.5 items-center h-4">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1 h-1 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Anchor phrase — shown when exit message arrives */}
                {anchorPhrase && exitMessage && (
                  <AnchorCard phrase={anchorPhrase} />
                )}

                {/* Pattern Map */}
                {detectedPatterns.length > 0 && (
                  <div className="pt-2">
                    <PatternMap loopTypes={detectedPatterns} coreNeeds={coreNeeds} sessionTriggers={sessionTriggers} />
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-border/40 px-6 py-4 bg-background">
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                    }}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Type or hold mic to speak..."
                    disabled={isThinking}
                    className="flex-1 bg-card border border-border rounded px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none overflow-hidden disabled:opacity-60"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />

                  <VoiceButton onTranscript={handleTranscript} disabled={isThinking} />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isThinking}
                    className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <p className="font-mono text-[10px] text-muted-foreground/40 mt-2 text-center uppercase tracking-widest">
                  Enter to send · Hold mic to speak
                </p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
