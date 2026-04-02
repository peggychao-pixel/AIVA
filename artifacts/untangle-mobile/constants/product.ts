export type Mode = "before" | "after" | "loop" | "other";
export type UiLang = "tc" | "en";

export const MODE_OPTIONS_DATA: Record<UiLang, { id: Mode; label: string; description: string }[]> = {
  en: [
    { id: "before", label: "Before eating",             description: "Choosing, comparing, trying to get it right." },
    { id: "after",  label: "After eating",              description: "Replaying, judging, checking if it was right." },
    { id: "other",  label: "It's bigger than the food", description: "The food is part of it, but something deeper is pulling." },
    { id: "loop",   label: "My mind won't let it go",   description: "The thought keeps reopening, even when I want to move on." },
  ],
  tc: [
    { id: "before", label: "飯前",              description: "在選擇、比較、想做對。" },
    { id: "after",  label: "飯後",              description: "在重播、評斷、確認選對了沒。" },
    { id: "other",  label: "這不只是吃的問題", description: "食物是一部分，但有更深的東西在拉著我。" },
    { id: "loop",   label: "腦子一直轉不停",   description: "那個念頭一直重新打開，就算我想停也停不了。" },
  ],
};

export const LAYER2_DATA: Record<UiLang, Record<Mode, { question: string; chips: string[] }>> = {
  en: {
    before: {
      question: "What feels wrong before you even start?",
      chips: ["I'm afraid I'll choose wrong", "I can't stop comparing", "I'm worried I'll regret it", "I'm panicking and I haven't even decided yet", "I'm so hungry I feel less in control", "I want it, but I don't feel allowed to", "Let me type it out"],
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
      chips: ["我怕選錯", "我停不下來比較", "我怕自己會後悔", "我還沒決定，已經開始慌了", "我太餓了，覺得自己快要失控", "我想要，但感覺自己沒有資格", "讓我自己打"],
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

export const BROAD_CHIP_ROUTING: Record<string, { response: string; suggestions: string[] }> = {
  "I want it, but I don't feel allowed to": {
    response: "What does 'not allowed' feel closest to right now?",
    suggestions: ["I feel like I haven't done enough to deserve it", "Wanting it already feels like something's wrong", "I feel like I need a reason — hunger doesn't feel like enough", "I'm not sure if I'm actually hungry or just wanting", "Let me type it"],
  },
  "我想要，但感覺自己沒有資格": {
    response: "這個「沒有資格」，比較像哪一種？",
    suggestions: ["我覺得我還沒做到什麼，不值得吃這個", "光是想要這個，感覺就已經不對了", "我覺得我需要一個理由——餓好像不夠", "我不確定我是真的餓，還是只是想要", "讓我自己打"],
  },
  "I can't explain it — I'm just still stuck": {
    response: "What does 'still stuck' feel closest to?",
    suggestions: ["Maybe I still don't feel satisfied", "Maybe I feel like I chose wrong or I regret it", "Maybe something didn't land — body or mind", "Maybe there's something I haven't named yet", "Let me type it"],
  },
  "It feels tied to something deeper": {
    response: "What does 'something deeper' feel like?",
    suggestions: ["A stuck feeling I can't shake", "It's tied to a person or relationship", "Related to money or pressure, but it's more than that", "About how I see myself or whether I'm enough", "Let me type it"],
  },
  "Something about food": {
    response: "What part about food keeps coming back?",
    suggestions: ["I keep thinking about what I just ate", "I keep thinking about what to eat next", "I ate, but I still haven't settled", "It's not just this meal — it's a bigger pattern", "Let me type it"],
  },
  "A feeling I can't name": {
    response: "Even if you can't name it — which of these feels closest?",
    suggestions: ["Something like anxiety or unease", "Something like sadness or disappointment", "I'm just exhausted and nothing feels like enough", "An empty, floating, unsettled feeling", "Let me type it"],
  },
  "It still feels unfinished": {
    response: "What kind of 'unfinished' does this feel like?",
    suggestions: ["Something is still hanging, not landed", "This moment still needs one thing to make it count", "I know it's over, but my mind won't let it close", "I'm dreading the time ahead — I don't know how to get through it", "Let me type it"],
  },
  "我也說不上來，就是還卡著": {
    response: "這個卡，比較像是哪一塊？",
    suggestions: ["可能是還沒被真的滿足到", "可能是覺得選錯了或後悔", "可能是吃完身體和心裡都還沒到位", "可能是有什麼還沒說出來的", "讓我自己打"],
  },
  "感覺跟某件更深的事有關": {
    response: "這個「更深」，比較像是哪一種？",
    suggestions: ["比較像一種被困住、走不出去的感覺", "跟某個人或關係有關", "跟錢或壓力有關，但不只那樣", "關於我怎麼看自己，或我夠不夠", "讓我自己打"],
  },
};

export const UI_TEXT = {
  en: {
    brand: "Untangle",
    headline: "What feels tangled\nright now?",
    subtext: "Start where the loop is happening.",
    inputPlaceholder: "Or type what's tangled.",
    layer2TypePlaceholder: "Write it here...",
    chatPlaceholder: "What else is here...",
    saveThis: "Save this moment",
    saved: "Saved",
    closeLoop: "Stop here for now",
    stillThinking: "Go deeper",
    history: "Past moments",
    historySub: "Tap a moment to revisit it.",
    moments: "Moments",
    momentsSub: "Your saved stopping lines.",
    emptyHistory: "No sessions yet.",
    emptyMoments: "No saved moments yet.",
    back: "Back",
    whatsLooping: "What's looping",
    stoppingLine: "Your stopping line",
    deeperLayerLabel: "One layer deeper",
    surface: "Surface",
    underneath: "Underneath",
  },
  tc: {
    brand: "Untangle",
    headline: "現在卡住你的\n是什麼？",
    subtext: "從最卡的地方開始。",
    inputPlaceholder: "或者直接打出來。",
    layer2TypePlaceholder: "在這裡打...",
    chatPlaceholder: "還有什麼想說的...",
    saveThis: "存下這句",
    saved: "已儲存",
    closeLoop: "先停在這裡",
    stillThinking: "再看深一點",
    history: "過去的時刻",
    historySub: "點進去重新看看。",
    moments: "紀錄",
    momentsSub: "你存下的停止句。",
    emptyHistory: "還沒有記錄。",
    emptyMoments: "還沒有儲存的時刻。",
    back: "返回",
    whatsLooping: "一直在轉的是",
    stoppingLine: "你的停止句",
    deeperLayerLabel: "再往下看一層",
    surface: "表層",
    underneath: "更底下",
  },
} as const;
