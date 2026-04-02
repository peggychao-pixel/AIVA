import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LangContext";
import { KnotSvg } from "@/components/KnotSvg";
import { InsightCard } from "@/components/InsightCard";
import { ChatBubble } from "@/components/ChatBubble";
import { DeeperLayerCard } from "@/components/DeeperLayerCard";
import { SatietyCheck } from "@/components/SatietyCheck";
import { AnchorCard } from "@/components/AnchorCard";
import { QuickUntangleCard } from "@/components/QuickUntangleCard";
import { TypingIndicator } from "@/components/TypingIndicator";
import type { SatietyKey } from "@/components/SatietyCheck";
import colors from "@/constants/colors";
import {
  MODE_OPTIONS_DATA,
  LAYER2_DATA,
  BROAD_CHIP_ROUTING,
  UI_TEXT,
  type Mode,
} from "@/constants/product";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSession,
  untangleChat as untangleChatFn,
  saveMoment as saveMomentFn,
  listMoments,
} from "@workspace/api-client-react";

type Step = "home" | "layer2" | "chat";
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

const OVERATE_CHIPS = [
  "I think I ate too much, and now I feel guilty",
  "我覺得我吃太多了，現在很罪惡",
];

function genId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { lang, setLang } = useLang();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("home");
  const [mode, setMode] = useState<Mode>("after");
  const [uiLang, setUiLang] = useState<UiLang>("auto");
  const [freeInput, setFreeInput] = useState("");
  const [layer2TypeInput, setLayer2TypeInput] = useState("");
  const [showLayer2Type, setShowLayer2Type] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
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

  const messagesRef = useRef<ChatMessage[]>([]);
  const modeRef = useRef<Mode>("after");
  const scrollRef = useRef<ScrollView>(null);

  const createSessionMutation = useMutation({
    mutationFn: (body: { ruminationThought: string }) => createSession(body),
  });
  const untangleChatMutation = useMutation({
    mutationFn: (body: { message: string; mode: string; history?: { role: string; content: string }[]; language?: string }) =>
      untangleChatFn(body as any),
  });
  const saveMomentMutation = useMutation({
    mutationFn: (body: {
      content: string;
      loopType?: string;
      anchorPhrase?: string;
      surfaceBelief?: string;
      hiddenFear?: string;
      coreNeed?: string;
      originalThought?: string;
    }) => saveMomentFn(body),
  });

  const { data: savedMoments } = useQuery({
    queryKey: ["moments"],
    queryFn: () => listMoments(),
  });

  const recentMomentCount = useMemo(() => savedMoments?.length ?? 0, [savedMoments]);

  const isTc = useMemo(() => {
    if (uiLang === "tc") return true;
    if (uiLang === "en") return false;
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.content).join("");
    return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(userTexts);
  }, [uiLang, messages]);

  const langKey = isTc ? "tc" : "en";
  const t = UI_TEXT[langKey];
  const modeOptions = MODE_OPTIONS_DATA[langKey];

  const getModeLabel = (m: Mode) => modeOptions.find((o) => o.id === m)?.label ?? m;

  const exitMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && (msg.anchorPhrase || msg.isInsight)) {
        const hasUserAfter = messages.slice(i + 1).some((m) => m.role === "user");
        return hasUserAfter ? null : msg;
      }
    }
    return null;
  }, [messages]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const doSendMessage = useCallback(
    async (text: string, currentMode: Mode, currentMessages: ChatMessage[]) => {
      const aiResponseCount = currentMessages.filter(
        (m) => m.role === "assistant" && m.id !== "opener"
      ).length;

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
      };
      const updatedMessages = [...currentMessages, userMsg];
      setMessages(updatedMessages);
      messagesRef.current = updatedMessages;
      setIsThinking(true);
      scrollToBottom();

      if (aiResponseCount === 0) setOriginalThought(text.trim());
      if (aiResponseCount === 1) setHiddenFear(text.trim());

      if (aiResponseCount === 0) {
        const broadRoute = BROAD_CHIP_ROUTING[text.trim()];
        if (broadRoute) {
          const syntheticMsg: ChatMessage = {
            id: genId(),
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
          scrollToBottom();
          return;
        }
      }

      try {
        const history = currentMessages.map((m) => ({ role: m.role, content: m.content }));
        const textHasTc = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text.trim());
        const effectiveLang: "tc" | "en" =
          uiLang === "tc" ? "tc"
          : uiLang === "en" ? "en"
          : isTc || textHasTc ? "tc"
          : "en";

        const res = await untangleChatMutation.mutateAsync({
          message: text.trim(),
          mode: currentMode,
          history,
          language: effectiveLang,
        });

        const resAny = res as any;

        if (resAny.coreNeed) {
          setCoreNeeds((p) => (p.includes(resAny.coreNeed) ? p : [...p, resAny.coreNeed]));
        }
        if (resAny.anchorPhrase) setAnchorPhrase(resAny.anchorPhrase);
        if (resAny.notNow) setNotNowMode(true);
        if (resAny.lightRevisit) setLightRevisitMode(true);

        if (aiResponseCount === 0) {
          const match = resAny.response?.match(/Surface belief:\s*"([^"]+)"/);
          if (match) setSurfaceBelief(match[1]);
        }

        const aiMsg: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: resAny.response,
          isInsight: resAny.isInsight,
          notNow: resAny.notNow,
          lightRevisit: resAny.lightRevisit,
          deeperLayer: resAny.deeperLayer ?? null,
          suggestions: resAny.suggestions,
          loopType: resAny.loopType,
          loopIntensity: resAny.loopIntensity,
          coreNeed: resAny.coreNeed,
          sessionTrigger: resAny.sessionTrigger,
          anchorPhrase: resAny.anchorPhrase,
        };
        const withAi = [...updatedMessages, aiMsg];
        setMessages(withAi);
        messagesRef.current = withAi;
        scrollToBottom();
      } catch {
        const fallback: ChatMessage = {
          id: genId(),
          role: "assistant",
          content: isTc
            ? "連線出了問題，請再試一次。"
            : "What's the part that keeps pulling you back?",
          isInsight: false,
          suggestions: [],
          loopType: null,
        };
        const withFallback = [...updatedMessages, fallback];
        setMessages(withFallback);
        messagesRef.current = withFallback;
        scrollToBottom();
      } finally {
        setIsThinking(false);
      }
    },
    [untangleChatMutation, isTc, uiLang, scrollToBottom]
  );

  const goToChat = useCallback(
    (selectedMode: Mode, initialText: string) => {
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

      createSessionMutation
        .mutateAsync({ ruminationThought: getModeLabel(selectedMode) })
        .catch(() => {});

      setTimeout(() => doSendMessage(initialText, selectedMode, []), 200);
    },
    [createSessionMutation, doSendMessage, modeOptions]
  );

  const handleModeCard = useCallback(
    async (selectedMode: Mode) => {
      await Haptics.selectionAsync();
      setMode(selectedMode);
      modeRef.current = selectedMode;
      setShowLayer2Type(false);
      setLayer2TypeInput("");
      setStep("layer2");
    },
    []
  );

  const handleLayer2Chip = useCallback(
    async (chip: string) => {
      const l2 = LAYER2_DATA[langKey][mode];
      const typeChip = l2.chips[l2.chips.length - 1];
      if (chip === typeChip) {
        setShowLayer2Type(true);
        return;
      }
      if (OVERATE_CHIPS.includes(chip)) setOverateEntry(true);
      else setOverateEntry(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      goToChat(mode, chip);
    },
    [langKey, mode, goToChat]
  );

  const handleLayer2TypeSubmit = useCallback(async () => {
    const text = layer2TypeInput.trim();
    if (!text) return;
    setLayer2TypeInput("");
    goToChat(mode, text);
  }, [layer2TypeInput, mode, goToChat]);

  const handleSend = useCallback(async () => {
    if (!chatInput.trim() || isThinking) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const text = chatInput;
    setChatInput("");
    doSendMessage(text, modeRef.current, messagesRef.current);
  }, [chatInput, isThinking, doSendMessage]);

  const handleSuggestion = useCallback(
    async (text: string) => {
      if (isThinking) return;
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      doSendMessage(text, modeRef.current, messagesRef.current);
    },
    [isThinking, doSendMessage]
  );

  const handleSaveMoment = useCallback(
    async (msg: ChatMessage) => {
      if (savedMomentIds.has(msg.id)) return;
      setSavedMomentIds((prev) => new Set(prev).add(msg.id));
      const saveContent = msg.deeperLayer
        ? `${msg.deeperLayer.deeper}\n${msg.deeperLayer.landing}`
        : msg.content;
      const saveAnchor = msg.deeperLayer
        ? msg.deeperLayer.landing
        : (anchorPhrase ?? undefined);
      try {
        await saveMomentMutation.mutateAsync({
          content: saveContent,
          loopType: msg.loopType ?? undefined,
          anchorPhrase: saveAnchor,
          surfaceBelief: surfaceBelief ?? undefined,
          hiddenFear: hiddenFear ?? undefined,
          coreNeed: msg.coreNeed ?? coreNeeds[0] ?? undefined,
          originalThought: originalThought ?? undefined,
        });
        queryClient.invalidateQueries({ queryKey: ["moments"] });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        setSavedMomentIds((prev) => {
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
      }
    },
    [
      savedMomentIds,
      saveMomentMutation,
      anchorPhrase,
      surfaceBelief,
      hiddenFear,
      coreNeeds,
      originalThought,
      queryClient,
    ]
  );

  const handleGoDeeper = useCallback(() => {
    setLoopDismissed(true);
    const msg = isTc
      ? "還有什麼可以再往下看嗎？還是換個角度？"
      : "Can you go one layer deeper, or try a different angle?";
    doSendMessage(msg, modeRef.current, messagesRef.current);
  }, [isTc, doSendMessage]);

  const handleFreeSubmit = useCallback(() => {
    if (!freeInput.trim()) return;
    const text = freeInput.trim();
    setFreeInput("");
    setMode("other");
    modeRef.current = "other";
    goToChat("other", text);
  }, [freeInput, goToChat]);

  const reset = useCallback(() => {
    setStep("home");
    setFreeInput("");
    setLayer2TypeInput("");
    setShowLayer2Type(false);
    setMessages([]);
    messagesRef.current = [];
    setChatInput("");
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
    setShowQuick(false);
  }, []);

  const toggleLang = useCallback(
    (target: "tc" | "en") => {
      setUiLang((prev) => (prev === target ? "auto" : target));
      setLang(target === "tc" ? "tc" : "en");
    },
    [setLang]
  );

  const l2 = step === "layer2" ? LAYER2_DATA[langKey][mode] : null;

  if (step === "home") {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View
          style={[
            styles.homeHeader,
            { paddingTop: topPad + 8, borderBottomColor: c.border },
          ]}
        >
          <Text style={[styles.brand, { color: c.foreground }]}>Untangle</Text>
          <View style={styles.headerRight}>
            <LangToggle isTc={isTc} onToggle={toggleLang} c={c} />
            <Text style={[styles.momentsBadge, { color: c.mutedForeground }]}>
              {recentMomentCount > 0
                ? isTc
                  ? `${recentMomentCount} 已儲存`
                  : `${recentMomentCount} saved`
                : isTc
                ? "紀錄"
                : "Moments"}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.homeContent, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.knotWrap}>
            <KnotSvg size={110} />
          </View>
          <Text style={[styles.headline, { color: c.foreground }]}>{t.headline}</Text>
          <Text style={[styles.subtext, { color: c.mutedForeground }]}>{t.subtext}</Text>

          <View style={styles.modeGrid}>
            <View style={styles.modeRow}>
              {modeOptions.slice(0, 2).map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => handleModeCard(opt.id)}
                  style={({ pressed }) => [
                    styles.modeCard,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  testID={`mode-${opt.id}`}
                >
                  <Text style={[styles.modeCardLabel, { color: c.foreground }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.modeCardDesc, { color: c.mutedForeground }]}>
                    {opt.description}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.modeRow, { marginTop: 10 }]}>
              {modeOptions.slice(2, 4).map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => handleModeCard(opt.id)}
                  style={({ pressed }) => [
                    styles.modeCard,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  testID={`mode-${opt.id}`}
                >
                  <Text style={[styles.modeCardLabel, { color: c.foreground }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.modeCardDesc, { color: c.mutedForeground }]}>
                    {opt.description}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.freeInputRow}>
            <TextInput
              style={[
                styles.freeInput,
                { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
              ]}
              placeholder={isTc ? "或者直接打出來。" : "Or type what's tangled."}
              placeholderTextColor={c.mutedForeground}
              value={freeInput}
              onChangeText={setFreeInput}
              returnKeyType="send"
              onSubmitEditing={handleFreeSubmit}
            />
            <Pressable
              onPress={handleFreeSubmit}
              disabled={!freeInput.trim()}
              style={[
                styles.freeSubmitBtn,
                {
                  backgroundColor: c.primary,
                  opacity: freeInput.trim() ? 1 : 0.35,
                },
              ]}
            >
              <Feather name="arrow-right" size={18} color={c.primaryForeground} />
            </Pressable>
          </View>

          <View style={styles.quickWrap}>
            {showQuick ? (
              <QuickUntangleCard onClose={() => setShowQuick(false)} isTc={isTc} />
            ) : (
              <Pressable
                onPress={() => setShowQuick(true)}
                style={({ pressed }) => [
                  styles.quickBtn,
                  {
                    borderColor: c.border,
                    backgroundColor: pressed ? c.card : "transparent",
                  },
                ]}
              >
                <View style={styles.quickBtnContent}>
                  <View>
                    <Text style={[styles.quickBtnLabel, { color: c.mutedForeground }]}>
                      {isTc ? "快速解開" : "Quick untangle"}
                    </Text>
                    <Text style={[styles.quickBtnSub, { color: c.mutedForeground }]}>
                      {isTc
                        ? "跳過對話，直接得到一個精準洞察。"
                        : "Skip the conversation. Get one sharp insight."}
                    </Text>
                  </View>
                  <Feather name="arrow-right" size={16} color={c.mutedForeground} />
                </View>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === "layer2" && l2) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.layer2Header,
              { paddingTop: topPad + 8, borderBottomColor: c.border },
            ]}
          >
            <Pressable onPress={reset} style={styles.backBtn} testID="back-btn">
              <Feather name="arrow-left" size={20} color={c.mutedForeground} />
            </Pressable>
            <View style={styles.knotWrapSmall}>
              <KnotSvg size={60} loose />
            </View>
            <View style={{ flex: 1 }} />
            <LangToggle isTc={isTc} onToggle={toggleLang} c={c} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.layer2Content, { paddingBottom: bottomPad + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.layer2Question, { color: c.foreground }]}>
              {l2.question}
            </Text>

            <View style={styles.chipsWrap}>
              {l2.chips.slice(0, -1).map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => handleLayer2Chip(chip)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: c.border,
                      backgroundColor: pressed ? c.card : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  testID={`chip-${chip.substring(0, 15)}`}
                >
                  <Text style={[styles.chipText, { color: c.foreground }]}>{chip}</Text>
                </Pressable>
              ))}
            </View>

            {!showLayer2Type ? (
              <Pressable
                onPress={() => handleLayer2Chip(l2.chips[l2.chips.length - 1])}
                style={({ pressed }) => [
                  styles.typeItChip,
                  {
                    borderColor: c.border,
                    backgroundColor: pressed ? c.card : "transparent",
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: c.mutedForeground }]}>
                  {l2.chips[l2.chips.length - 1]}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.typeInputWrap}>
                <TextInput
                  style={[
                    styles.typeInput,
                    {
                      backgroundColor: c.card,
                      borderColor: c.border,
                      color: c.foreground,
                    },
                  ]}
                  placeholder={isTc ? "在這裡打..." : "Write it here..."}
                  placeholderTextColor={c.mutedForeground}
                  value={layer2TypeInput}
                  onChangeText={setLayer2TypeInput}
                  multiline
                  autoFocus
                  returnKeyType="done"
                  testID="layer2-input"
                />
                <Pressable
                  onPress={handleLayer2TypeSubmit}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: c.primary,
                      opacity: layer2TypeInput.trim() ? 1 : 0.4,
                    },
                  ]}
                  disabled={!layer2TypeInput.trim()}
                  testID="layer2-submit"
                >
                  <Feather name="arrow-right" size={18} color={c.primaryForeground} />
                </Pressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.chatHeader,
            { paddingTop: topPad + 8, borderBottomColor: c.border },
          ]}
        >
          <Pressable onPress={reset} style={styles.backBtn} testID="back-to-home">
            <Feather name="arrow-left" size={20} color={c.mutedForeground} />
          </Pressable>
          <View
            style={[
              styles.modeChip,
              { borderColor: c.border },
            ]}
          >
            <Text style={[styles.modeChipText, { color: c.mutedForeground }]}>
              {modeOptions.find((m) => m.id === mode)?.label ?? mode}
            </Text>
          </View>
          <View style={{ flex: 1 }} />
          <LangToggle isTc={isTc} onToggle={toggleLang} c={c} />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.chatList,
            { paddingTop: 16, paddingBottom: bottomPad + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID="chat-list"
        >
          {messages.map((msg, idx) => {
            if (msg.role === "user") {
              return <ChatBubble key={msg.id} role="user" content={msg.content} />;
            }

            const hasUserAfter = messages.slice(idx + 1).some((m) => m.role === "user");

            if (msg.deeperLayer) {
              return (
                <View key={msg.id} style={styles.insightWrap}>
                  <DeeperLayerCard
                    surface={msg.deeperLayer.surface}
                    deeper={msg.deeperLayer.deeper}
                    landing={msg.deeperLayer.landing}
                    isSaved={savedMomentIds.has(msg.id)}
                    onSave={() => handleSaveMoment(msg)}
                    saveLabel={isTc ? "存下這句" : "Save this moment"}
                    savedLabel={isTc ? "已儲存" : "Saved"}
                    isTc={isTc}
                  />
                </View>
              );
            }

            if (msg.isInsight) {
              return (
                <View key={msg.id} style={styles.insightWrap}>
                  <InsightCard
                    content={msg.content}
                    anchorPhrase={msg.anchorPhrase}
                    isSaved={savedMomentIds.has(msg.id)}
                    onSave={() => handleSaveMoment(msg)}
                    saveLabel={isTc ? "存下這句" : "Save this moment"}
                    savedLabel={isTc ? "已儲存" : "Saved"}
                  />
                </View>
              );
            }

            return (
              <View key={msg.id}>
                <ChatBubble role="assistant" content={msg.content} />
                {msg.suggestions &&
                  msg.suggestions.length > 0 &&
                  !hasUserAfter && (
                    <View style={styles.chipsRow}>
                      {msg.suggestions.map((s) => (
                        <Pressable
                          key={s}
                          onPress={() => handleSuggestion(s)}
                          disabled={isThinking}
                          style={({ pressed }) => [
                            styles.suggestionChip,
                            {
                              borderColor: c.border,
                              backgroundColor: pressed ? c.card : "transparent",
                              opacity: isThinking ? 0.4 : pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.suggestionChipText, { color: c.mutedForeground }]}>
                            {s}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
              </View>
            );
          })}

          {isThinking && <TypingIndicator />}

          {anchorPhrase && exitMessage ? (
            <View style={styles.insightWrap}>
              <AnchorCard phrase={anchorPhrase} isTc={isTc} />
            </View>
          ) : null}

          {exitMessage && !loopDismissed && mode === "after" && !overateEntry ? (
            <View style={styles.insightWrap}>
              <SatietyCheck
                isTc={isTc}
                answer={satietyAnswer}
                onAnswer={setSatietyAnswer}
              />
            </View>
          ) : null}

          {exitMessage ? (
            <View style={[styles.insightWrap, styles.closureActions]}>
              <Pressable
                onPress={reset}
                style={[styles.closeLoopBtn, { backgroundColor: c.primary }]}
                testID="close-loop-btn"
              >
                <Text style={[styles.closeLoopBtnText, { color: c.primaryForeground }]}>
                  {isTc ? "先停在這裡" : "Stop here for now"}
                </Text>
              </Pressable>
              {!notNowMode && !lightRevisitMode && !loopDismissed ? (
                <Pressable
                  onPress={handleGoDeeper}
                  style={[styles.deeperBtn, { borderColor: c.border, backgroundColor: c.card }]}
                  testID="go-deeper-btn"
                >
                  <Text style={[styles.deeperBtnText, { color: c.mutedForeground }]}>
                    {isTc ? "再看深一點" : "Go deeper"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: c.border,
              paddingBottom: bottomPad + 8,
              backgroundColor: c.background,
            },
          ]}
        >
          <TextInput
            style={[
              styles.chatInput,
              { backgroundColor: c.card, borderColor: c.border, color: c.foreground },
            ]}
            placeholder={isTc ? "直接打出來" : "Write what's tangled..."}
            placeholderTextColor={c.mutedForeground}
            value={chatInput}
            onChangeText={setChatInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!isThinking}
            testID="chat-input"
          />
          <Pressable
            onPress={handleSend}
            disabled={!chatInput.trim() || isThinking}
            style={[
              styles.sendBtn,
              {
                backgroundColor: c.primary,
                opacity: chatInput.trim() && !isThinking ? 1 : 0.35,
              },
            ]}
            testID="send-btn"
          >
            <Feather name="arrow-up" size={18} color={c.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function LangToggle({
  isTc,
  onToggle,
  c,
}: {
  isTc: boolean;
  onToggle: (t: "tc" | "en") => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[langStyles.wrap, { borderColor: c.border }]}>
      <Pressable
        onPress={() => onToggle("tc")}
        style={[
          langStyles.btn,
          isTc && { backgroundColor: c.primary + "26" },
        ]}
      >
        <Text
          style={[
            langStyles.label,
            { color: isTc ? c.foreground : c.mutedForeground },
            isTc && { fontFamily: "Inter_500Medium" },
          ]}
        >
          繁中
        </Text>
      </Pressable>
      <View style={[langStyles.divider, { backgroundColor: c.border }]} />
      <Pressable
        onPress={() => onToggle("en")}
        style={[
          langStyles.btn,
          !isTc && { backgroundColor: c.primary + "26" },
        ]}
      >
        <Text
          style={[
            langStyles.label,
            { color: !isTc ? c.foreground : c.mutedForeground },
            !isTc && { fontFamily: "Inter_500Medium" },
          ]}
        >
          EN
        </Text>
      </Pressable>
    </View>
  );
}

const langStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    overflow: "hidden",
    height: 28,
  },
  btn: {
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    width: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  brand: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    opacity: 0.7,
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  momentsBadge: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  homeContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  knotWrap: {
    alignItems: "center",
    marginVertical: 20,
  },
  headline: {
    fontSize: 26,
    fontFamily: "Inter_500Medium",
    lineHeight: 34,
    textAlign: "center",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 24,
  },
  modeGrid: {},
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  modeCardLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  modeCardDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  freeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  freeInput: {
    flex: 1,
    borderRadius: colors.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 44,
  },
  freeSubmitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  quickWrap: {
    marginTop: 16,
  },
  quickBtn: {
    borderWidth: 1,
    borderStyle: "dotted",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quickBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickBtnLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  quickBtnSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    opacity: 0.5,
  },
  layer2Header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  knotWrapSmall: {},
  backBtn: {
    padding: 4,
  },
  layer2Content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  layer2Question: {
    fontSize: 20,
    fontFamily: "Inter_500Medium",
    lineHeight: 28,
    marginBottom: 20,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  typeItChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: "dotted",
    borderRadius: 999,
    marginTop: 4,
  },
  typeInputWrap: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  typeInput: {
    flex: 1,
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 56,
    maxHeight: 120,
  },
  submitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modeChipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  chatList: {},
  insightWrap: {
    paddingHorizontal: 20,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 999,
  },
  suggestionChipText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  closureActions: {
    gap: 8,
    marginTop: 4,
  },
  closeLoopBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeLoopBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  deeperBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  deeperBtnText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderRadius: colors.radius,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    minHeight: 44,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
