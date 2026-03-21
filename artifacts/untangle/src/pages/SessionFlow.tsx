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

type Mode = "before" | "after" | "loop" | "other";
type UiLang = "auto" | "tc" | "en";

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

const MODE_OPTIONS_DATA: Record<"en" | "tc", { id: Mode; label: string; description: string }[]> = {
  en: [
    { id: "before", label: "Before eating",           description: "Choosing, comparing, trying to get it right." },
    { id: "after",  label: "After eating",            description: "Replaying, judging, checking if it was the right choice." },
    { id: "other",  label: "It's bigger than the food", description: "The food is part of it, but something deeper is pulling at me." },
    { id: "loop",   label: "My mind won't let it go", description: "The thought keeps reopening, even when I want to move on." },
  ],
  tc: [
    { id: "before", label: "飯前",              description: "在選擇、比較、想做對。" },
    { id: "after",  label: "飯後",              description: "在重播、評斷、確認選對了沒。" },
    { id: "other",  label: "這不只是吃的問題",   description: "食物是一部分，但有更深的東西在拉著我。" },
    { id: "loop",   label: "腦子一直轉不停",     description: "那個念頭一直重新打開，就算我想停也停不了。" },
  ],
};

const LAYER2_DATA: Record<"en" | "tc", Record<Mode, { question: string; chips: string[] }>> = {
  en: {
    before: {
      question: "What feels wrong before you even start?",
      chips: ["I'm afraid I'll choose wrong", "I can't stop comparing", "I'm worried I'll regret it", "Let me type it out"],
    },
    after: {
      question: "Which of these feels closest right now?",
      chips: ["How did I end up choosing this again", "I ate, but I still don't feel satisfied", "I know I could let this go, but it feels too costly", "I can't explain it — it just keeps sitting heavily in my mind", "Let me type it out"],
    },
    other: {
      question: "What makes this feel bigger than just food?",
      chips: ["It feels expensive", "I feel guilty", "It feels tied to something deeper", "Let me type it out"],
    },
    loop: {
      question: "What thought keeps returning?",
      chips: ["Something about food", "A feeling I can't name", "It still feels unfinished", "Let me type it out"],
    },
  },
  tc: {
    before: {
      question: "開始之前，什麼感覺不對？",
      chips: ["我怕選錯", "我停不下來比較", "我怕自己會後悔", "讓我自己打"],
    },
    after: {
      question: "現在最卡你的，比較像哪一句？",
      chips: ["我怎麼又選成這樣", "吃了也沒有真的被滿足", "我知道可以放過自己，但那個代價感太重", "我也說不上來，就是這件事一直壓在腦子裡", "讓我自己打"],
    },
    other: {
      question: "什麼讓這個感覺不只是食物那麼簡單？",
      chips: ["感覺太貴了", "我有罪惡感", "感覺跟某件更深的事有關", "讓我自己打"],
    },
    loop: {
      question: "什麼念頭一直回來？",
      chips: ["跟食物有關", "一種說不出來的感覺", "感覺還沒結束", "讓我自己打"],
    },
  },
};

const UI_TEXT = {
  en: {
    brand: "Untangle",
    back: "← Back",
    moments: (n: number) => n > 0 ? `${n} saved` : "Moments",
    history: "History",
    headline: "What feels tangled\nright now?",
    subtext: "Start where the loop is happening.",
    inputPlaceholder: "Or type what's tangled.",
    quickLabel: "Quick untangle",
    quickSub: "Skip the conversation. Get one sharp insight.",
    layer2TypePlaceholder: "Write it here...",
    chatPlaceholder: "Write or hold mic to speak...",
    untangleMoment: "Untangle moment",
    saveThis: "Save this moment",
    saved: "Saved",
    keepThis: "Keep this",
    whenReturns: "When this thought returns, come back to this line.",
    closeLoop: "Close this loop",
    stillThinking: "I'm still thinking about it",
    showPattern: "Show me the pattern",
    whatsLooping: "What's looping",
    whatYouNeed: "What you actually need",
    stoppingLine: "Your stopping line",
  },
  tc: {
    brand: "Untangle",
    back: "← 返回",
    moments: (n: number) => n > 0 ? `${n} 已儲存` : "紀錄",
    history: "歷史",
    headline: "現在卡住你的\n是什麼？",
    subtext: "從最卡的地方開始。",
    inputPlaceholder: "或者直接打出來。",
    quickLabel: "快速解開",
    quickSub: "跳過對話，直接得到一個精準洞察。",
    layer2TypePlaceholder: "在這裡打...",
    chatPlaceholder: "直接打出來，或按麥克風說",
    untangleMoment: "Untangle 時刻",
    saveThis: "存下這句",
    saved: "已儲存",
    keepThis: "記住這句話",
    whenReturns: "下次這個念頭回來，回到這句。",
    closeLoop: "先停在這裡",
    stillThinking: "我還卡著",
    showPattern: "讓我看看這個模式",
    whatsLooping: "什麼在迴圈",
    whatYouNeed: "你真正需要的",
    stoppingLine: "你的停止句",
  },
} as const;

function intensityDots(n: number | null | undefined): string {
  if (!n) return "";
  return "●".repeat(n) + "○".repeat(5 - n);
}

function InsightCard({
  content,
  onSave,
  saved,
  isTc,
}: {
  content: string;
  loopType?: string | null;
  onSave: () => void;
  saved: boolean;
  isTc: boolean;
}) {
  const t = isTc ? UI_TEXT.tc : UI_TEXT.en;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-xl bg-primary/8 border border-primary/20 p-6 space-y-4"
    >
      <p className="text-xs text-primary/70 font-medium tracking-wide">{t.untangleMoment}</p>
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
        {saved ? t.saved : t.saveThis}
      </button>
    </motion.div>
  );
}

type SatietyKey = "full+satisfied" | "full+unsatisfied" | "notfull+satisfied" | "notfull+unsatisfied";

const SATIETY_OPTIONS: { key: SatietyKey; en: string; tc: string }[] = [
  { key: "full+satisfied",      en: "I'm full and satisfied",            tc: "我很飽，也有被滿足到" },
  { key: "full+unsatisfied",    en: "I'm full but not satisfied",        tc: "我很飽，但心裡還是不滿足" },
  { key: "notfull+satisfied",   en: "I'm not full but satisfied",        tc: "我還沒飽，但心裡有比較安定" },
  { key: "notfull+unsatisfied", en: "I'm not full and not satisfied",    tc: "我不飽，也沒有被滿足到" },
];

const SATIETY_RESPONSES: Record<SatietyKey, { en: string; tc: string }> = {
  "full+satisfied":      { en: "Nothing more is needed.",                                               tc: "不需要再做什麼了。" },
  "full+unsatisfied":    { en: "Your body is done.\nSomething else is still missing.",                   tc: "身體已經夠了。\n還卡著的，是別的東西。" },
  "notfull+satisfied":   { en: "Your body may still need food.\nThe experience itself feels complete.",  tc: "身體可能還需要食物。\n但這次的感覺本身，是完整的。" },
  "notfull+unsatisfied": { en: "Neither your body nor the experience is complete.",                      tc: "身體和心裡，都還沒到位。" },
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
        {isTc ? "現在更像哪個？" : "Right now — which one feels true?"}
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

function AnchorCard({ phrase, isTc }: { phrase: string; isTc: boolean }) {
  const t = isTc ? UI_TEXT.tc : UI_TEXT.en;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-xl border border-border bg-card p-6 space-y-2"
    >
      <p className="text-xs text-muted-foreground font-medium">{t.keepThis}</p>
      <p className="text-lg text-foreground font-medium leading-snug">"{phrase}"</p>
      <p className="text-xs text-muted-foreground/60">{t.whenReturns}</p>
    </motion.div>
  );
}

function QuickUntangleCard({ onClose }: { onClose: () => void }) {
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
  const [step, setStep] = useState<"home" | "layer2" | "chat">("home");
  const [mode, setMode] = useState<Mode>("after");
  const [uiLang, setUiLang] = useState<UiLang>("auto");
  const [freeInput, setFreeInput] = useState("");
  const [layer2TypeInput, setLayer2TypeInput] = useState("");
  const [showLayer2Type, setShowLayer2Type] = useState(false);
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

  // Compute isTc: respect manual lang choice, fallback to auto-detect
  const isTc = useMemo(() => {
    if (uiLang === "tc") return true;
    if (uiLang === "en") return false;
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content).join("");
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(userTexts);
  }, [uiLang, messages]);

  const t = isTc ? UI_TEXT.tc : UI_TEXT.en;
  const langKey = isTc ? "tc" : "en";
  const modeOptions = MODE_OPTIONS_DATA[langKey];
  const getModeLabel = (m: Mode) => modeOptions.find((o) => o.id === m)?.label ?? m;

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
        data: {
          message: text.trim(),
          mode: currentMode,
          history,
          language: uiLang !== "auto" ? uiLang : undefined,
        },
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
        content: isTc ? "什麼一直把你拉回來？" : "What's the part that keeps pulling you back?",
        isInsight: false,
        suggestions: [],
        loopType: null,
      };
      const withFallback = [...updatedMessages, fallback];
      setMessages(withFallback);
      messagesRef.current = withFallback;
    } finally {
      setIsThinking(false);
    }
  };

  const goToChat = (selectedMode: Mode, initialText: string) => {
    setSavedMomentIds(new Set());
    setOriginalThought(null);
    setSurfaceBelief(null);
    setHiddenFear(null);
    setAnchorPhrase(null);
    setCoreNeeds([]);
    setShowPattern(false);
    setLoopDismissed(false);
    setSatietyAnswer(null);
    setMessages([]);
    messagesRef.current = [];
    setStep("chat");

    createSession({
      data: { ruminationThought: getModeLabel(selectedMode) },
    }).catch(() => {});

    setTimeout(() => doSendMessage(initialText, selectedMode, []), 200);
  };

  const handleModeCard = (selectedMode: Mode) => {
    setMode(selectedMode);
    modeRef.current = selectedMode;
    setShowLayer2Type(false);
    setLayer2TypeInput("");
    setStep("layer2");
  };

  const handleLayer2Chip = (chip: string) => {
    const l2 = LAYER2_DATA[langKey][mode];
    const typeChip = l2.chips[l2.chips.length - 1]; // "Let me type it out" / "讓我自己打"
    if (chip === typeChip) {
      setShowLayer2Type(true);
    } else {
      goToChat(mode, chip);
    }
  };

  const handleLayer2TypeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!layer2TypeInput.trim()) return;
    const text = layer2TypeInput.trim();
    setLayer2TypeInput("");
    goToChat(mode, text);
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
    setLayer2TypeInput("");
    setShowLayer2Type(false);
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
    setMode("other");
    modeRef.current = "other";
    goToChat("other", text);
  };

  const exitMessage = useMemo(() => {
    // Only show closure UI when the last anchorPhrase message has no user replies after it
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].anchorPhrase) {
        const hasUserAfter = messages.slice(i + 1).some((m) => m.role === "user");
        return hasUserAfter ? null : messages[i];
      }
    }
    return null;
  }, [messages]);

  const l2 = step === "layer2" ? LAYER2_DATA[langKey][mode] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-lg flex flex-col h-screen">

        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-3 flex-shrink-0 border-b border-border/50 min-w-0">
          {/* Left: back or brand */}
          <div className="flex-shrink-0">
            {step === "chat" || step === "layer2" ? (
              <button
                onClick={reset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {t.back}
              </button>
            ) : (
              <span className="text-sm font-medium text-foreground/70 tracking-wide whitespace-nowrap">{t.brand}</span>
            )}
          </div>

          {/* Center: mode chip (chat only) — short label, never wraps */}
          {step === "chat" && (
            <span className="flex-1 min-w-0 flex justify-center">
              <span className="text-xs text-muted-foreground border border-border/60 px-2.5 py-1 rounded-full whitespace-nowrap">
                {(isTc
                  ? { before: "飯前", after: "飯後", other: "更深", loop: "停不下來" }
                  : { before: "Before", after: "After", other: "Bigger", loop: "Looping" }
                )[mode]}
              </span>
            </span>
          )}

          {/* Spacer when no mode chip */}
          {step !== "chat" && <div className="flex-1" />}

          {/* Right: lang toggle + nav */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Language toggle — fixed height, full fill */}
            <div className="flex h-7 border border-border/60 rounded-full overflow-hidden text-xs">
              <button
                onClick={() => setUiLang(uiLang === "tc" ? "auto" : "tc")}
                className={`px-2.5 h-full flex items-center transition-all ${
                  isTc ? "bg-primary/15 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                繁中
              </button>
              <div className="w-px bg-border/60" />
              <button
                onClick={() => setUiLang(uiLang === "en" ? "auto" : "en")}
                className={`px-2.5 h-full flex items-center transition-all ${
                  !isTc ? "bg-primary/15 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EN
              </button>
            </div>

            <Link
              href="/moments"
              className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              {t.moments(recentMomentCount)}
            </Link>
            <Link
              href="/history"
              className="text-sm text-muted-foreground hover:text-primary transition-colors whitespace-nowrap"
            >
              {t.history}
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
                <h1 className="text-3xl text-foreground font-medium leading-snug whitespace-pre-line">
                  {t.headline}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t.subtext}
                </p>
              </div>

              <div className="space-y-2">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleModeCard(opt.id)}
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
                    placeholder={t.inputPlaceholder}
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
                            {t.quickLabel}
                          </p>
                          <p className="text-xs text-muted-foreground/50 mt-0.5">
                            {t.quickSub}
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

          {/* LAYER 2 */}
          {step === "layer2" && l2 && (
            <motion.div
              key="layer2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto px-6 py-10 space-y-8"
            >
              <div>
                <p className="text-2xl text-foreground font-medium leading-snug">
                  {l2.question}
                </p>
              </div>

              <div className="space-y-2">
                {l2.chips.slice(0, -1).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleLayer2Chip(chip)}
                    className="w-full text-left px-5 py-4 border border-border/60 bg-card/50 hover:border-primary/30 hover:bg-primary/5 rounded-xl transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-foreground">{chip}</p>
                      <span className="text-muted-foreground/50 group-hover:text-primary transition-colors text-base">→</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Type it out option */}
              {!showLayer2Type ? (
                <button
                  onClick={() => setShowLayer2Type(true)}
                  className="w-full text-left px-5 py-4 border border-border/40 border-dashed rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {l2.chips[l2.chips.length - 1]}
                    </p>
                    <span className="text-xs text-muted-foreground/50 group-hover:text-primary transition-colors">→</span>
                  </div>
                </button>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleLayer2TypeSubmit}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={layer2TypeInput}
                    onChange={(e) => setLayer2TypeInput(e.target.value)}
                    placeholder={t.layer2TypePlaceholder}
                    autoFocus
                    className="flex-1 bg-card/60 border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!layer2TypeInput.trim()}
                    className="px-5 py-3 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    →
                  </button>
                </motion.form>
              )}
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
                {messages.map((msg) => (
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
                        isTc={isTc}
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
                  <AnchorCard phrase={anchorPhrase} isTc={isTc} />
                )}

                {/* Satiety check module — after eating only */}
                {exitMessage && !loopDismissed && mode === "after" && (
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
                        {t.closeLoop}
                      </button>
                      <button
                        onClick={() => setLoopDismissed(true)}
                        className="w-full px-5 py-3.5 border border-border/60 bg-card/60 text-sm text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-all"
                      >
                        {t.stillThinking}
                      </button>
                      {!showPattern && (
                        <button
                          onClick={() => setShowPattern(true)}
                          className="w-full px-5 py-3.5 border border-border/40 bg-transparent text-sm text-muted-foreground/70 hover:text-muted-foreground hover:border-border/60 rounded-xl transition-all"
                        >
                          {t.showPattern}
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
                            <p className="text-xs text-muted-foreground">{t.whatsLooping}</p>
                            <p className="text-sm text-foreground capitalize">{exitMessage.loopType.replace(/_/g, " ")}</p>
                          </div>
                        )}
                        {exitMessage.coreNeed && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">{t.whatYouNeed}</p>
                            <p className="text-sm text-foreground">{exitMessage.coreNeed}</p>
                          </div>
                        )}
                        {anchorPhrase && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground">{t.stoppingLine}</p>
                            <p className="text-sm text-foreground">"{anchorPhrase}"</p>
                          </div>
                        )}
                        {exitMessage.loopIntensity && (
                          <div className="space-y-0.5">
                            <p className="text-xs text-muted-foreground/60 font-mono">{intensityDots(exitMessage.loopIntensity)}</p>
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
                    placeholder={t.chatPlaceholder}
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
