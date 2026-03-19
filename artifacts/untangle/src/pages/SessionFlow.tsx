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
  before:   "What part feels wrong before you even start?",
  after:    "What part feels like a mistake?",
  loop:     "What thought keeps returning?",
  pressure: "What part feels heavy?",
  other:    "What thought keeps returning?",
};

const OPENING_SUGGESTIONS: Record<Mode, string[]> = {
  before:   ["Trying to pick the right option", "Worried I'll regret it", "Can't stop comparing"],
  after:    ["Replaying what I ate", "Judging if it was right", "Still want to eat more"],
  loop:     ["Same thought keeps returning", "Something I can't resolve", "I don't know what triggered it"],
  pressure: ["Making the right food choice", "Controlling what I eat", "Getting it exactly right"],
  other:    ["Something about food", "A feeling I can't name", "Let me type it out"],
};

function intensityDots(n: number | null | undefined): string {
  if (!n) return "";
  return "●".repeat(n) + "○".repeat(5 - n);
}

function InsightCard({
  content,
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
      transition={{ duration: 0.4 }}
      className="w-full rounded-xl bg-primary/8 border border-primary/20 p-6 space-y-4"
    >
      <p className="text-xs text-primary/70 font-medium tracking-wide">Untangle moment</p>
      <p className="text-base text-foreground leading-relaxed">{content}</p>
      <button
        onClick={onSave}
        disabled={saved}
        className={`text-xs px-4 py-2 rounded-full border transition-all ${
          saved
            ? "border-primary/30 text-primary/60 cursor-default"
            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
        }`}
      >
        {saved ? "Saved" : "Save this moment"}
      </button>
    </motion.div>
  );
}

type SatietyKey = "full+satisfied" | "full+unsatisfied" | "notfull+satisfied" | "notfull+unsatisfied";

const SATIETY_OPTIONS: { key: SatietyKey; en: string; tc: string }[] = [
  { key: "full+satisfied",    en: "I'm full and satisfied",       tc: "我很飽也很滿足" },
  { key: "full+unsatisfied",  en: "I'm full but not satisfied",   tc: "我很飽但不滿足" },
  { key: "notfull+satisfied", en: "I'm not full but satisfied",   tc: "我不飽但滿足" },
  { key: "notfull+unsatisfied", en: "I'm not full and not satisfied", tc: "我不飽也不滿足" },
];

const SATIETY_RESPONSES: Record<SatietyKey, { en: string; tc: string }> = {
  "full+satisfied":    { en: "Nothing more is needed.",                                                   tc: "不需要再做什麼了。" },
  "full+unsatisfied":  { en: "Your body is done.\nSomething else is still missing.",                      tc: "身體已經夠了。\n但有別的東西還沒被滿足。" },
  "notfull+satisfied": { en: "Your body may still need food.\nThe experience itself feels complete.",     tc: "身體可能還需要食物。\n但這次體驗本身是完整的。" },
  "notfull+unsatisfied": { en: "Neither your body nor the experience is complete.",                       tc: "身體和體驗都還沒完成。" },
};

function SatietyCheck({ isTc, answer, onAnswer }: { isTc: boolean; answer: SatietyKey | null; onAnswer: (k: SatietyKey) => void }) {
  const response = answer ? SATIETY_RESPONSES[answer] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="w-full rounded-xl border border-border/50 bg-card/40 p-5 space-y-4"
    >
      <p className="text-xs text-muted-foreground font-medium">
        {isTc ? "現在比較接近哪個？" : "Right now — which one feels true?"}
      </p>
      {!answer && (
        <div className="flex flex-col gap-2">
          {SATIETY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onAnswer(opt.key)}
              className="w-full text-left px-4 py-3 text-sm text-muted-foreground border border-border/50 rounded-lg hover:border-border hover:text-foreground transition-all bg-transparent"
            >
              {isTc ? opt.tc : opt.en}
            </button>
          ))}
        </div>
      )}
      {answer && response && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
        >
          {isTc ? response.tc : response.en}
        </motion.p>
      )}
    </motion.div>
  );
}

function AnchorCard({ phrase }: { phrase: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-xl border border-border bg-card p-6 space-y-2"
    >
      <p className="text-xs text-muted-foreground font-medium">Keep this</p>
      <p className="text-lg text-foreground font-medium leading-snug">"{phrase}"</p>
      <p className="text-xs text-muted-foreground/60">
        When this thought returns, come back to this line.
      </p>
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
      className="border border-border bg-card rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground font-medium">Quick untangle</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder="What thought is looping..."
            rows={2}
            disabled={isPending}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={!thought.trim() || isPending}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? "Looking..." : "Untangle →"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.insight}</p>
          {result.anchorPhrase && (
            <div className="border-t border-border/50 pt-3 space-y-1">
              <p className="text-xs text-muted-foreground">Keep this</p>
              <p className="text-sm text-primary">"{result.anchorPhrase}"</p>
            </div>
          )}
          {result.suggestion && (
            <p className="text-xs text-foreground/60 bg-muted/50 rounded-lg px-4 py-3 leading-relaxed">
              {result.suggestion}
            </p>
          )}
          <button
            onClick={() => { setThought(""); onClose(); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Close
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
  const [savedMomentIds, setSavedMomentIds] = useState<Set<string>>(new Set());
  const [showQuick, setShowQuick] = useState(false);

  const [originalThought, setOriginalThought] = useState<string | null>(null);
  const [surfaceBelief, setSurfaceBelief] = useState<string | null>(null);
  const [hiddenFear, setHiddenFear] = useState<string | null>(null);
  const [anchorPhrase, setAnchorPhrase] = useState<string | null>(null);
  const [coreNeeds, setCoreNeeds] = useState<string[]>([]);
  const [showPattern, setShowPattern] = useState(false);
  const [loopDismissed, setLoopDismissed] = useState(false);
  const [satietyAnswer, setSatietyAnswer] = useState<SatietyKey | null>(null);

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

  const recentMomentCount = useMemo(() => savedMoments?.length ?? 0, [savedMoments]);

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

    if (aiResponseCount === 0) setOriginalThought(text.trim());
    if (aiResponseCount === 1) setHiddenFear(text.trim());

    try {
      const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChat({
        data: { message: text.trim(), mode: currentMode, history },
      });

      if (res.coreNeed) setCoreNeeds((p) => (p.includes(res.coreNeed!) ? p : [...p, res.coreNeed!]));
      if (res.anchorPhrase) setAnchorPhrase(res.anchorPhrase);

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
    setSavedMomentIds(new Set());
    setOriginalThought(null);
    setSurfaceBelief(null);
    setHiddenFear(null);
    setAnchorPhrase(null);
    setCoreNeeds([]);
    setShowPattern(false);
    setLoopDismissed(false);
    setSatietyAnswer(null);
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
    setSavedMomentIds(new Set());
    setOriginalThought(null);
    setSurfaceBelief(null);
    setHiddenFear(null);
    setAnchorPhrase(null);
    setCoreNeeds([]);
    setShowPattern(false);
    setLoopDismissed(false);
    setSatietyAnswer(null);
  };

  const handleFreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeInput.trim()) return;
    const text = freeInput.trim();
    setFreeInput("");
    startConversation("other", text);
  };

  const exitMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].anchorPhrase) return messages[i];
    }
    return null;
  }, [messages]);

  const isTc = useMemo(() => {
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content).join("");
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(userTexts);
  }, [messages]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-lg flex flex-col h-screen">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 flex-shrink-0 border-b border-border/50">
          {step === "chat" ? (
            <button
              onClick={reset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span className="text-sm font-medium text-foreground/70 tracking-wide">Untangle</span>
          )}

          {step === "chat" && (
            <span className="text-xs text-muted-foreground border border-border/60 px-3 py-1 rounded-full">
              {MODE_OPTIONS.find((m) => m.id === mode)?.label ?? mode}
            </span>
          )}

          <div className="flex items-center gap-5">
            <Link
              href="/moments"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {recentMomentCount > 0 ? `${recentMomentCount} saved` : "Moments"}
            </Link>
            <Link
              href="/history"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              History
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
              className="flex-1 overflow-y-auto px-6 py-10 space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-3xl text-foreground font-medium leading-snug">
                  What feels tangled<br />right now?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Select a moment, or write it out.
                </p>
              </div>

              <div className="space-y-2">
                {MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => startConversation(opt.id)}
                    className="w-full text-left px-5 py-4 border border-border/60 bg-card/50 hover:border-primary/30 hover:bg-primary/5 rounded-xl transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {opt.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                      <span className="text-muted-foreground/50 group-hover:text-primary transition-colors text-base">
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
                    placeholder="Or write it here..."
                    className="flex-1 bg-card/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!freeInput.trim()}
                    className="px-5 py-3 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </div>
              </form>

              {/* Quick Untangle */}
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
                      className="w-full text-left px-5 py-4 border border-border/40 border-dashed rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            Quick untangle
                          </p>
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            Instant — no conversation needed.
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground/50 group-hover:text-primary transition-colors">
                          →
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
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-2.5`}
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
                        className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === "user"
                            ? "bg-primary/12 text-foreground rounded-br-sm"
                            : "bg-card border border-border/50 text-foreground rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}

                    {msg.role === "assistant" &&
                      msg.id === "opener" &&
                      msg.suggestions &&
                      msg.suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 max-w-full">
                          {msg.suggestions.map((s, si) => (
                            <button
                              key={si}
                              onClick={() => handleSuggestion(s)}
                              disabled={isThinking}
                              className="text-xs px-3.5 py-2 border border-border/60 rounded-full bg-card/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                    <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center h-4">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 soft-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Anchor phrase */}
                {anchorPhrase && exitMessage && (
                  <AnchorCard phrase={anchorPhrase} />
                )}

                {/* Satiety check module — appears after insight */}
                {exitMessage && !loopDismissed && (
                  <SatietyCheck
                    isTc={isTc}
                    answer={satietyAnswer}
                    onAnswer={setSatietyAnswer}
                  />
                )}

                {/* Post-insight closure actions */}
                {exitMessage && !loopDismissed && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={reset}
                        className="w-full px-5 py-3.5 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity"
                      >
                        Close this loop
                      </button>
                      <button
                        onClick={() => setLoopDismissed(true)}
                        className="w-full px-5 py-3.5 border border-border/60 bg-card/60 text-sm text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-all"
                      >
                        I'm still thinking about it
                      </button>
                      {!showPattern && (
                        <button
                          onClick={() => setShowPattern(true)}
                          className="w-full px-5 py-3.5 border border-border/40 bg-transparent text-sm text-muted-foreground/70 hover:text-muted-foreground hover:border-border/60 rounded-xl transition-all"
                        >
                          Show me the pattern
                        </button>
                      )}
                    </div>

                    {showPattern && exitMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-xl border border-border/50 bg-card/60 p-5 space-y-3"
                      >
                        {exitMessage.loopType && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">What's looping</p>
                            <p className="text-sm text-foreground capitalize">{exitMessage.loopType.replace(/_/g, " ")}</p>
                          </div>
                        )}
                        {exitMessage.coreNeed && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">What you actually need</p>
                            <p className="text-sm text-foreground">{exitMessage.coreNeed}</p>
                          </div>
                        )}
                        {anchorPhrase && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">Your stopping line</p>
                            <p className="text-sm text-foreground">"{anchorPhrase}"</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
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
                    placeholder="Write or hold mic to speak..."
                    disabled={isThinking}
                    className="flex-1 bg-card/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-colors resize-none overflow-hidden disabled:opacity-60"
                    style={{ minHeight: "44px", maxHeight: "120px" }}
                  />

                  <VoiceButton onTranscript={handleTranscript} disabled={isThinking} />

                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isThinking}
                    className="w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
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
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
