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
  notNow?: boolean;
  lightRevisit?: boolean;
  deeperLayer?: { surface: string; deeper: string; landing: string } | null;
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
      chips: ["I'm afraid I'll choose wrong", "I can't stop comparing", "I'm worried I'll regret it", "I'm panicking and I haven't even decided yet", "I'm so hungry I feel less in control", "Let me type it out"],
    },
    after: {
      question: "Which of these feels closest right now?",
      chips: ["I feel like I ate too much", "How did I end up choosing this again", "I ate, but it still didn't feel satisfying", "I know I fixed some of it, but it still doesn't count", "I feel like I used up room on the wrong thing", "I can't explain it — I'm just still stuck", "Let me type it out"],
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
      chips: ["我怕選錯", "我停不下來比較", "我怕自己會後悔", "我還沒決定，已經開始慌了", "我太餓了，覺得自己快要失控", "讓我自己打"],
    },
    after: {
      question: "現在最卡你的，比較像哪一句？",
      chips: ["我覺得我吃太多了", "我怎麼又選成這樣", "吃了也沒有真的被滿足", "我知道有補回一些，但心裡還是不算數", "我怕剛才那個佔掉了後面真正想吃的空間", "我也說不上來，就是還卡著", "讓我自己打"],
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
    quickTitle: "Quick untangle",
    quickPlaceholder: "What thought is looping...",
    quickLooking: "Looking...",
    quickBtn: "Untangle →",
    quickKeep: "Keep this",
    quickClose: "← Close",
    layer2TypePlaceholder: "Write it here...",
    chatPlaceholder: "Write or hold mic to speak...",
    untangleMoment: "Untangle moment",
    saveThis: "Save this moment",
    saved: "Saved",
    keepThis: "Come back to this when the loop returns.",
    whenReturns: "Return here when the loop comes back.",
    closeLoop: "Stop here for now",
    stillThinking: "Go deeper",
    whatsLooping: "What's looping",
    whatYouNeed: "What you actually need",
    stoppingLine: "Your stopping line",
    deeperLayerLabel: "One layer deeper",
    surface: "Surface",
    underneath: "Underneath",
    softerHold: "Softer hold",
    satietyQuestion: "Right now — which one feels true?",
    satietyChose: "You chose: ",
    goDeeperMessage: "Can you go one layer deeper, or try a different angle?",
    modeChips: { before: "Before", after: "After", other: "Bigger", loop: "Looping" } as Record<string, string>,
    fallback: "What's the part that keeps pulling you back?",
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
    quickTitle: "快速解開",
    quickPlaceholder: "什麼念頭在轉...",
    quickLooking: "思考中...",
    quickBtn: "解開 →",
    quickKeep: "記住這句",
    quickClose: "← 關閉",
    layer2TypePlaceholder: "在這裡打...",
    chatPlaceholder: "直接打出來，或按麥克風說",
    untangleMoment: "Untangle 時刻",
    saveThis: "存下這句",
    saved: "已儲存",
    keepThis: "下次又開始轉時，先回到這句",
    whenReturns: "這是你這次的止住句。",
    closeLoop: "先停在這裡",
    stillThinking: "再看深一點",
    whatsLooping: "什麼在迴圈",
    whatYouNeed: "你真正需要的",
    stoppingLine: "你的停止句",
    deeperLayerLabel: "再往下看一層",
    surface: "表層",
    underneath: "更底下",
    softerHold: "接住句",
    satietyQuestion: "現在更像哪個？",
    satietyChose: "你選的是：",
    goDeeperMessage: "可以再往下一層，或者換個角度看嗎？",
    modeChips: { before: "飯前", after: "飯後", other: "更深", loop: "停不下來" } as Record<string, string>,
    fallback: "什麼一直把你拉回來？",
  },
} as const;

const BROAD_CHIP_ROUTING: Record<string, { response: string; suggestions: string[] }> = {
  "I can't explain it — I'm just still stuck": {
    response: "What does 'still stuck' feel closest to?",
    suggestions: [
      "Maybe I still don't feel satisfied",
      "Maybe I feel like I chose wrong or I regret it",
      "Maybe something didn't land — body or mind",
      "Maybe there's something I haven't named yet",
      "Let me type it",
    ],
  },
  "It feels tied to something deeper": {
    response: "What does 'something deeper' feel like?",
    suggestions: [
      "A stuck feeling I can't shake",
      "It's tied to a person or relationship",
      "Related to money or pressure, but it's more than that",
      "About how I see myself or whether I'm enough",
      "Let me type it",
    ],
  },
  "Something about food": {
    response: "What part about food keeps coming back?",
    suggestions: [
      "I keep thinking about what I just ate",
      "I keep thinking about what to eat next",
      "I ate, but I still haven't settled",
      "It's not just this meal — it's a bigger pattern",
      "Let me type it",
    ],
  },
  "A feeling I can't name": {
    response: "Even if you can't name it — which of these feels closest?",
    suggestions: [
      "Something like anxiety or unease",
      "Something like sadness or disappointment",
      "I'm just exhausted and nothing feels like enough",
      "An empty, floating, unsettled feeling",
      "Let me type it",
    ],
  },
  "It still feels unfinished": {
    response: "What kind of 'unfinished' does this feel like?",
    suggestions: [
      "Something is still hanging, not landed",
      "This moment still needs one thing to make it count",
      "I know it's over, but my mind won't let it close",
      "I'm dreading the time ahead — I don't know how to get through it",
      "Let me type it",
    ],
  },
  "我也說不上來，就是還卡著": {
    response: "這個卡，比較像是哪一塊？",
    suggestions: [
      "可能是還沒被真的滿足到",
      "可能是覺得選錯了或後悔",
      "可能是吃完身體和心裡都還沒到位",
      "可能是有什麼還沒說出來的",
      "讓我自己打",
    ],
  },
  "感覺跟某件更深的事有關": {
    response: "這個「更深」，比較像是哪一種？",
    suggestions: [
      "比較像一種被困住、走不出去的感覺",
      "可能跟某個人或某段關係有關",
      "跟錢或壓力有關，但不只是錢",
      "跟我怎麼看自己、或者我夠不夠好有關",
      "讓我自己打",
    ],
  },
  "跟食物有關": {
    response: "跟食物有關的部分，比較像哪個？",
    suggestions: [
      "我還在想剛剛吃的那餐",
      "我一直在想等等要吃什麼",
      "吃了，但還是沒有真的安靜下來",
      "不只是這一餐——是一個更大的迴圈",
      "讓我自己打",
    ],
  },
  "一種說不出來的感覺": {
    response: "說不出來，但比較像哪一邊？",
    suggestions: [
      "比較像焦慮或不安",
      "比較像委屈或失落",
      "比較像累了什麼都提不起勁",
      "比較像空掉、懸著、無法落地",
      "讓我自己打",
    ],
  },
  "感覺還沒結束": {
    response: "「還沒結束」，比較像是哪種沒結束？",
    suggestions: [
      "像是有什麼還在懸著，落不下去",
      "像是這一段還差一個讓它成立的東西",
      "像是我知道結束了，但腦子不肯放",
      "像是我在怕接下來的時間，不知道怎麼過",
      "讓我自己打",
    ],
  },
};

function intensityDots(n: number | null | undefined): string {
  if (!n) return "";
  return "●".repeat(n) + "○".repeat(5 - n);
}

function InsightCard({
  content,
  anchorPhrase,
  onSave,
  saved,
  isTc,
}: {
  content: string;
  loopType?: string | null;
  anchorPhrase?: string | null;
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

function DeeperLayerCard({
  surface,
  deeper,
  landing,
  onSave,
  saved,
  isTc,
}: {
  surface: string;
  deeper: string;
  landing: string;
  onSave: () => void;
  saved: boolean;
  isTc: boolean;
}) {
  const t = isTc ? UI_TEXT.tc : UI_TEXT.en;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full rounded-xl border border-border/60 bg-card p-5 space-y-4"
    >
      <p className="text-xs text-muted-foreground font-medium tracking-wide">
        {t.deeperLayerLabel}
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
            {t.surface}
          </p>
          <p className="text-sm text-foreground/70 leading-relaxed">{surface}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
            {t.underneath}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{deeper}</p>
        </div>
      </div>

      <div className="border-t border-border/40 pt-3 space-y-1">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-medium">
          {t.softerHold}
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed italic">
          {isTc ? `「${landing}」` : `"${landing}"`}
        </p>
      </div>

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

type SatietyKey = "full+satisfied" | "full+unsatisfied" | "notfull+satisfied" | "notfull+unsatisfied" | "notfull+bloated";

const SATIETY_OPTIONS: { key: SatietyKey; en: string; tc: string }[] = [
  { key: "full+satisfied",      en: "I'm full and satisfied",                              tc: "我很飽，也有被滿足到" },
  { key: "full+unsatisfied",    en: "I'm full but mentally not satisfied",                 tc: "我很飽，但心裡還是不滿足" },
  { key: "notfull+satisfied",   en: "I'm not full but the experience felt settled",        tc: "我還沒飽，但心裡有比較安定" },
  { key: "notfull+unsatisfied", en: "I'm not full and not satisfied",                      tc: "我不飽，也沒有被滿足到" },
  { key: "notfull+bloated",     en: "I'm not full, not satisfied — just bloated",          tc: "我沒有飽，也沒有被滿足到，只是覺得脹" },
];

const SATIETY_RESPONSES: Record<SatietyKey, { en: string; tc: string }> = {
  "full+satisfied":      {
    en: "This meal landed.\nThere's nothing more to figure out right now.",
    tc: "這餐有到位。\n現在比較不需要再往下追了。",
  },
  "full+unsatisfied":    {
    en: "Your body is done, but something inside still hasn't settled.\nSo you'll keep thinking — because what's stuck isn't the portion, it's something else entirely.",
    tc: "身體夠了，但心裡還沒被安頓。\n所以你還會繼續想，因為卡住的不是份量，是心裡還沒有真的安定。",
  },
  "notfull+satisfied":   {
    en: "Your body may still need a little more.\nBut this meal at least brought you to a more complete place than you were before.",
    tc: "身體可能還需要一點，\n但這餐至少有把你帶到比較完整的地方。",
  },
  "notfull+unsatisfied": {
    en: "This means neither side actually finished — not the body, not the experience.\nSo your mind is still looking for a reason it can use to close the loop.",
    tc: "這代表這餐兩邊都沒有真正完成。\n所以你的腦子還在找一個可以結束的理由。",
  },
  "notfull+bloated":     {
    en: "This isn't completion — it's your body carrying something without the meal actually landing.\nThat's why you feel more stuck, not more settled.",
    tc: "這不是完成感，是身體有負擔，但這餐沒有真的把你帶到位。\n所以你才會更卡，而不是更安心。",
  },
};

function SatietyCheck({ isTc, answer, onAnswer }: { isTc: boolean; answer: SatietyKey | null; onAnswer: (k: SatietyKey) => void }) {
  const t = isTc ? UI_TEXT.tc : UI_TEXT.en;
  const selected = answer ? SATIETY_OPTIONS.find((o) => o.key === answer) : null;
  const response = answer ? SATIETY_RESPONSES[answer] : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="w-full rounded-xl border border-border/50 bg-card/40 p-5 space-y-4"
    >
      <p className="text-xs text-muted-foreground font-medium">
        {t.satietyQuestion}
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
      {answer && selected && response && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <p className="text-xs text-muted-foreground/70">
            {t.satietyChose}
            <span className="text-foreground/80">{isTc ? selected.tc : selected.en}</span>
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {isTc ? response.tc : response.en}
          </p>
        </motion.div>
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

function QuickUntangleCard({ onClose, isTc }: { onClose: () => void; isTc: boolean }) {
  const t = isTc ? UI_TEXT.tc : UI_TEXT.en;
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
        <p className="text-sm text-foreground font-medium">{t.quickTitle}</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            placeholder={t.quickPlaceholder}
            rows={2}
            disabled={isPending}
            className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
          <button
            type="submit"
            disabled={!thought.trim() || isPending}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? t.quickLooking : t.quickBtn}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.insight}</p>
          {result.anchorPhrase && (
            <div className="border-t border-border/50 pt-3 space-y-1">
              <p className="text-xs text-muted-foreground">{t.quickKeep}</p>
              <p className="text-sm text-primary">{isTc ? `「${result.anchorPhrase}」` : `"${result.anchorPhrase}"`}</p>
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
            {t.quickClose}
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
  const [loopDismissed, setLoopDismissed] = useState(false);
  const [notNowMode, setNotNowMode] = useState(false);
  const [lightRevisitMode, setLightRevisitMode] = useState(false);
  const [satietyAnswer, setSatietyAnswer] = useState<SatietyKey | null>(null);
  const [overateEntry, setOverateEntry] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef<Mode>("after");

  const { mutateAsync: sendChat } = useUntangleChat();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: saveMoment } = useSaveMoment();
  const { data: savedMoments, refetch: refetchMoments } = useListMoments();

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

    // Client-side interception: Level-1 broad chip entries get pre-defined chip sets
    // without an API call, for 100% reliable routing.
    if (aiResponseCount === 0) {
      const broadRoute = BROAD_CHIP_ROUTING[text.trim()];
      if (broadRoute) {
        const syntheticMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: broadRoute.response,
          isInsight: false,
          suggestions: broadRoute.suggestions,
          loopType: null,
        };
        const withSynthetic = [...updatedMessages, syntheticMsg];
        setMessages(withSynthetic);
        messagesRef.current = withSynthetic;
        setIsThinking(false);
        return;
      }
    }

    try {
      const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));
      const textHasTc = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text.trim());
      const effectiveLang: "tc" | "en" =
        uiLang === "tc" ? "tc"
        : uiLang === "en" ? "en"
        : (isTc || textHasTc ? "tc" : "en");

      const res = await sendChat({
        data: {
          message: text.trim(),
          mode: currentMode,
          history,
          language: effectiveLang,
        },
      });

      if (res.coreNeed) setCoreNeeds((p) => (p.includes(res.coreNeed!) ? p : [...p, res.coreNeed!]));
      if (res.anchorPhrase) setAnchorPhrase(res.anchorPhrase);
      if (res.notNow) setNotNowMode(true);
      if (res.lightRevisit) setLightRevisitMode(true);

      if (aiResponseCount === 0) {
        const match = res.response.match(/Surface belief:\s*"([^"]+)"/);
        if (match) setSurfaceBelief(match[1]);
      }

      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.response,
        isInsight: res.isInsight,
        notNow: res.notNow,
        lightRevisit: res.lightRevisit,
        deeperLayer: res.deeperLayer,
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
        content: t.fallback,
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
    setLoopDismissed(false);
    setNotNowMode(false);
    setLightRevisitMode(false);
    setSatietyAnswer(null);
    setMessages([]);
    messagesRef.current = [];
    setStep("chat");
    // overateEntry is set by handleLayer2Chip before calling goToChat — do not reset here

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

  const OVERATE_CHIPS = [
    "I think I ate too much, and now I feel guilty",
    "我覺得我吃太多了，現在很罪惡",
  ];

  const handleLayer2Chip = (chip: string) => {
    const l2 = LAYER2_DATA[langKey][mode];
    const typeChip = l2.chips[l2.chips.length - 1]; // "Let me type it out" / "讓我自己打"
    if (chip === typeChip) {
      setShowLayer2Type(true);
    } else {
      if (OVERATE_CHIPS.includes(chip)) setOverateEntry(true);
      else setOverateEntry(false);
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
    const saveContent = msg.deeperLayer
      ? `${msg.deeperLayer.deeper}\n${msg.deeperLayer.landing}`
      : msg.content;
    const saveAnchor = msg.deeperLayer ? msg.deeperLayer.landing : (anchorPhrase ?? undefined);
    try {
      await saveMoment({
        data: {
          content: saveContent,
          loopType: msg.loopType ?? undefined,
          anchorPhrase: saveAnchor,
          surfaceBelief: surfaceBelief ?? undefined,
          hiddenFear: hiddenFear ?? undefined,
          coreNeed: msg.coreNeed ?? coreNeeds[0] ?? undefined,
          originalThought: originalThought ?? undefined,
        },
      });
      refetchMoments();
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
    setLoopDismissed(false);
    setNotNowMode(false);
    setLightRevisitMode(false);
    setSatietyAnswer(null);
    setOverateEntry(false);
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

  const handleGoDeeper = () => {
    setLoopDismissed(true);
    doSendMessage(t.goDeeperMessage, mode, messagesRef.current);
  };

  const exitMessage = useMemo(() => {
    // Show closure UI when the last insight/anchor message has no user replies after it
    // Triggers on anchorPhrase OR isInsight so every insight card gets closure buttons
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && (msg.anchorPhrase || msg.isInsight)) {
        const hasUserAfter = messages.slice(i + 1).some((m) => m.role === "user");
        return hasUserAfter ? null : msg;
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
                {t.modeChips[mode] ?? mode}
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
                    <QuickUntangleCard onClose={() => setShowQuick(false)} isTc={isTc} />
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
              <div className="space-y-5">
                {/* Thread accent */}
                <svg width="44" height="20" viewBox="0 0 44 20" fill="none" className="opacity-25 text-foreground" aria-hidden="true">
                  <path d="M2 16 C7 4, 16 18, 24 8 C30 1, 36 13, 42 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M4 11 C10 19, 20 3, 28 14 C34 20, 38 7, 42 13" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeDasharray="2 3"/>
                </svg>
                <p className="text-2xl text-foreground font-medium leading-snug">
                  {l2.question}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {l2.chips.slice(0, -1).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleLayer2Chip(chip)}
                    className="text-left px-4 py-3 border border-border/60 bg-card/50 hover:border-primary/40 hover:bg-primary/5 rounded-2xl transition-all duration-150 text-sm text-foreground leading-snug"
                  >
                    {chip}
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
                    {msg.role === "assistant" && msg.deeperLayer ? (
                      <DeeperLayerCard
                        surface={msg.deeperLayer.surface}
                        deeper={msg.deeperLayer.deeper}
                        landing={msg.deeperLayer.landing}
                        onSave={() => handleSaveMoment(msg)}
                        saved={savedMomentIds.has(msg.id)}
                        isTc={isTc}
                      />
                    ) : msg.role === "assistant" && msg.isInsight ? (
                      <InsightCard
                        content={msg.content}
                        loopType={msg.loopType}
                        anchorPhrase={msg.anchorPhrase}
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
                      msg.suggestions &&
                      msg.suggestions.length > 0 &&
                      !messages.slice(messages.findIndex(m => m.id === msg.id) + 1).some(m => m.role === "user") && (
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

                {/* Satiety check module — after eating only, skip for overeating entry */}
                {exitMessage && !loopDismissed && mode === "after" && !overateEntry && (
                  <SatietyCheck
                    isTc={isTc}
                    answer={satietyAnswer}
                    onAnswer={setSatietyAnswer}
                  />
                )}

                {/* Post-insight closure actions — always show after any insight; only "Go deeper" is gated on loopDismissed */}
                {exitMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.2 }}
                    className="flex flex-col gap-2"
                  >
                    <button
                      onClick={reset}
                      className="w-full px-5 py-3.5 bg-primary text-primary-foreground text-sm rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {t.closeLoop}
                    </button>
                    {!notNowMode && !lightRevisitMode && !loopDismissed && (
                      <button
                        onClick={handleGoDeeper}
                        className="w-full px-5 py-3.5 border border-border/60 bg-card/60 text-sm text-muted-foreground hover:text-foreground hover:border-border rounded-xl transition-all"
                      >
                        {t.stillThinking}
                      </button>
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
