import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useUntangleChat, useCreateSession, useSaveMoment } from "@workspace/api-client-react";
import { VoiceButton } from "../components/VoiceButton";

type Mode = "before" | "after" | "loop" | "pressure" | "other";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isInsight?: boolean;
  suggestions?: string[];
  loopType?: string | null;
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

function PatternMap({ loopTypes }: { loopTypes: string[] }) {
  if (loopTypes.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border/60 rounded p-3 space-y-2"
    >
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
        PATTERN MAP — THIS SESSION
      </p>
      <div className="flex flex-wrap gap-2">
        {loopTypes.map((lt) => (
          <span
            key={lt}
            className="font-mono text-[10px] text-primary border border-primary/30 bg-primary/5 px-2 py-1 rounded uppercase tracking-widest"
          >
            {lt}
          </span>
        ))}
      </div>
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
  const [savedMomentIds, setSavedMomentIds] = useState<Set<string>>(new Set());

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef<Mode>("after");

  const { mutateAsync: sendChat } = useUntangleChat();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: saveMoment } = useSaveMoment();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const addPattern = (loopType: string | null | undefined) => {
    if (!loopType) return;
    setDetectedPatterns((prev) =>
      prev.includes(loopType) ? prev : [...prev, loopType],
    );
  };

  const doSendMessage = async (
    text: string,
    currentMode: Mode,
    currentMessages: ChatMessage[],
  ) => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;
    setIsThinking(true);

    try {
      const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChat({
        data: { message: text.trim(), mode: currentMode, history },
      });

      addPattern(res.loopType);

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.response,
        isInsight: res.isInsight,
        suggestions: res.suggestions,
        loopType: res.loopType,
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
    setSavedMomentIds(new Set());
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
    setSavedMomentIds(new Set());
  };

  const handleFreeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeInput.trim()) return;
    const text = freeInput.trim();
    setFreeInput("");
    startConversation("other", text);
  };

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
              className="flex-1 overflow-y-auto px-6 py-10 space-y-10"
            >
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
                        className={`max-w-[85%] px-4 py-3 rounded font-mono text-sm leading-relaxed ${
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

                {/* Pattern Map */}
                {detectedPatterns.length > 0 && (
                  <div className="pt-2">
                    <PatternMap loopTypes={detectedPatterns} />
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
