import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LangContext";
import { KnotSvg } from "@/components/KnotSvg";
import { ModeCard } from "@/components/ModeCard";
import { Chip } from "@/components/Chip";
import { InsightCard } from "@/components/InsightCard";
import { ChatBubble } from "@/components/ChatBubble";
import colors from "@/constants/colors";
import {
  MODE_OPTIONS_DATA,
  LAYER2_DATA,
  BROAD_CHIP_ROUTING,
  UI_TEXT,
  type Mode,
} from "@/constants/product";
import { useMutation } from "@tanstack/react-query";
import {
  createSession,
  untangleChat as untangleChatFn,
  saveMoment as saveMomentFn,
} from "@workspace/api-client-react";

type Step = "home" | "layer2" | "chat";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isInsight?: boolean;
  anchorPhrase?: string | null;
  suggestions?: string[];
}

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function HomeScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const t = UI_TEXT[lang];

  const [step, setStep] = useState<Step>("home");
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [layer2Input, setLayer2Input] = useState("");
  const [showLayer2Input, setShowLayer2Input] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [savedMomentIds, setSavedMomentIds] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [aiResponseCount, setAiResponseCount] = useState(0);

  const createSessionMutation = useMutation({ mutationFn: (body: { ruminationThought: string; aiResponse?: string }) => createSession(body) });
  const untangleChatMutation = useMutation({ mutationFn: (body: { message: string; mode: string; history?: { role: string; content: string }[] }) => untangleChatFn(body) });
  const saveMomentMutation = useMutation({ mutationFn: (body: { content: string; loopType?: string }) => saveMomentFn(body) });

  const modes = MODE_OPTIONS_DATA[lang];
  const layer2 = selectedMode ? LAYER2_DATA[lang][selectedMode] : null;

  const flatListRef = useRef<FlatList>(null);

  const handleModeSelect = useCallback(async (mode: Mode) => {
    await Haptics.selectionAsync();
    setSelectedMode(mode);
    setStep("layer2");
    setLayer2Input("");
    setShowLayer2Input(false);
    setMessages([]);
    setAiResponseCount(0);
    setSavedMomentIds(new Set());
    setSessionId(null);
  }, []);

  const handleReset = useCallback(() => {
    setStep("home");
    setSelectedMode(null);
    setLayer2Input("");
    setShowLayer2Input(false);
    setMessages([]);
    setAiResponseCount(0);
    setSavedMomentIds(new Set());
    setSessionId(null);
  }, []);

  const sendToChat = useCallback(async (userMessage: string, isChipMessage = false) => {
    if (!userMessage.trim() || !selectedMode) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { id: genId(), role: "user", content: userMessage };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    const isFirstMessage = aiResponseCount === 0;
    const broadRoute = isFirstMessage && isChipMessage ? BROAD_CHIP_ROUTING[userMessage] : null;

    if (broadRoute) {
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: broadRoute.response,
        suggestions: broadRoute.suggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setAiResponseCount((n) => n + 1);
      return;
    }

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await untangleChatMutation.mutateAsync({
        message: userMessage,
        mode: selectedMode,
        history,
      });

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: res.response,
        isInsight: res.isInsight,
        anchorPhrase: (res as any).anchorPhrase ?? null,
        suggestions: res.suggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setAiResponseCount((n) => n + 1);

      if (sessionId === null && res.isInsight) {
        try {
          const session = await createSessionMutation.mutateAsync({
            ruminationThought: userMessage,
            aiResponse: res.response,
          });
          setSessionId(session.id);
        } catch {}
      }
    } catch (err) {
      const errMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: lang === "tc" ? "連線出了問題，請再試一次。" : "Something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  }, [selectedMode, messages, aiResponseCount, sessionId, lang, untangleChatMutation, createSessionMutation]);

  const handleLayer2Submit = useCallback(async () => {
    const text = layer2Input.trim();
    if (!text || !selectedMode) return;
    setStep("chat");
    await sendToChat(text, false);
  }, [layer2Input, selectedMode, sendToChat]);

  const handleChipPress = useCallback(async (chip: string) => {
    const isTypeChip = chip === "Let me type it out" || chip === "讓我自己打" || chip === "Let me type it";
    if (isTypeChip) {
      if (step === "layer2") {
        setShowLayer2Input(true);
      }
      return;
    }
    if (step === "layer2") {
      setStep("chat");
      await sendToChat(chip, true);
    } else {
      await sendToChat(chip, true);
    }
  }, [step, sendToChat]);

  const handleSaveMoment = useCallback(async (msg: ChatMessage) => {
    if (savedMomentIds.has(msg.id)) return;
    try {
      await saveMomentMutation.mutateAsync({ content: msg.content, loopType: selectedMode ?? undefined });
      setSavedMomentIds((prev) => new Set([...prev, msg.id]));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, [savedMomentIds, saveMomentMutation, selectedMode]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.role === "user") {
      return <ChatBubble role="user" content={item.content} />;
    }
    if (item.isInsight) {
      return (
        <View style={styles.insightWrap}>
          <InsightCard
            content={item.content}
            anchorPhrase={item.anchorPhrase}
            isSaved={savedMomentIds.has(item.id)}
            onSave={() => handleSaveMoment(item)}
            saveLabel={t.saveThis}
            savedLabel={t.saved}
          />
        </View>
      );
    }
    return (
      <View>
        <ChatBubble role="assistant" content={item.content} />
        {item.suggestions && item.suggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
            style={styles.chipScroll}
          >
            {item.suggestions.map((s) => (
              <Chip key={s} label={s} onPress={() => handleChipPress(s)} />
            ))}
          </ScrollView>
        )}
      </View>
    );
  }, [savedMomentIds, handleSaveMoment, handleChipPress, t]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (step === "home") {
    return (
      <View style={[styles.container, { backgroundColor: c.background, paddingTop: topPad }]}>
        <ScrollView
          contentContainerStyle={[styles.homeContent, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.knotWrap}>
            <KnotSvg size={110} />
          </View>
          <Text style={[styles.headline, { color: c.foreground }]}>{t.headline}</Text>
          <Text style={[styles.subtext, { color: c.mutedForeground }]}>{t.subtext}</Text>

          <View style={styles.modeGrid}>
            <View style={styles.modeRow}>
              <ModeCard
                label={modes[0].label}
                description={modes[0].description}
                selected={false}
                onPress={() => handleModeSelect(modes[0].id)}
                testID="mode-before"
              />
              <View style={styles.modeGutter} />
              <ModeCard
                label={modes[1].label}
                description={modes[1].description}
                selected={false}
                onPress={() => handleModeSelect(modes[1].id)}
                testID="mode-after"
              />
            </View>
            <View style={[styles.modeRow, { marginTop: 10 }]}>
              <ModeCard
                label={modes[2].label}
                description={modes[2].description}
                selected={false}
                onPress={() => handleModeSelect(modes[2].id)}
                testID="mode-other"
              />
              <View style={styles.modeGutter} />
              <ModeCard
                label={modes[3].label}
                description={modes[3].description}
                selected={false}
                onPress={() => handleModeSelect(modes[3].id)}
                testID="mode-loop"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === "layer2" && layer2) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.layer2Header, { paddingTop: topPad + 8, borderBottomColor: c.border }]}>
            <Pressable onPress={handleReset} style={styles.backBtn} testID="back-btn">
              <Feather name="arrow-left" size={20} color={c.mutedForeground} />
            </Pressable>
            <View style={styles.knotWrapSmall}>
              <KnotSvg size={60} loose />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.layer2Content, { paddingBottom: bottomPad + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.layer2Question, { color: c.foreground }]}>{layer2.question}</Text>

            <View style={styles.chipsWrap}>
              {layer2.chips.map((chip) => (
                <Chip
                  key={chip}
                  label={chip}
                  onPress={() => handleChipPress(chip)}
                  testID={`chip-${chip.substring(0, 15)}`}
                />
              ))}
            </View>

            {showLayer2Input && (
              <View style={styles.typeInputWrap}>
                <TextInput
                  style={[styles.typeInput, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]}
                  placeholder={t.layer2TypePlaceholder}
                  placeholderTextColor={c.mutedForeground}
                  value={layer2Input}
                  onChangeText={setLayer2Input}
                  multiline
                  autoFocus
                  returnKeyType="done"
                  testID="layer2-input"
                />
                <Pressable
                  onPress={handleLayer2Submit}
                  style={[styles.submitBtn, { backgroundColor: c.primary, opacity: layer2Input.trim() ? 1 : 0.4 }]}
                  disabled={!layer2Input.trim()}
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
        <View style={[styles.chatHeader, { paddingTop: topPad + 8, borderBottomColor: c.border }]}>
          <Pressable onPress={handleReset} style={styles.backBtn} testID="back-to-home">
            <Feather name="arrow-left" size={20} color={c.mutedForeground} />
          </Pressable>
          <Text style={[styles.chatHeaderTitle, { color: c.mutedForeground }]}>
            {selectedMode ? MODE_OPTIONS_DATA[lang].find((m) => m.id === selectedMode)?.label : ""}
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.chatList, { paddingTop: 16, paddingBottom: bottomPad + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={messages.length > 0}
          ListFooterComponent={
            untangleChatMutation.isPending ? (
              <View style={styles.typingWrap}>
                <ActivityIndicator size="small" color={c.mutedForeground} />
              </View>
            ) : null
          }
          testID="chat-list"
        />

        <View style={[styles.inputBar, { borderTopColor: c.border, paddingBottom: bottomPad + 8, backgroundColor: c.background }]}>
          <TextInput
            style={[styles.chatInput, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]}
            placeholder={t.chatPlaceholder}
            placeholderTextColor={c.mutedForeground}
            value={chatInput}
            onChangeText={setChatInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendToChat(chatInput, false)}
            testID="chat-input"
          />
          <Pressable
            onPress={() => sendToChat(chatInput, false)}
            style={[styles.sendBtn, { backgroundColor: c.primary, opacity: chatInput.trim() && !untangleChatMutation.isPending ? 1 : 0.35 }]}
            disabled={!chatInput.trim() || untangleChatMutation.isPending}
            testID="send-btn"
          >
            <Feather name="arrow-up" size={18} color={c.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 28,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 36,
    marginBottom: 8,
    textAlign: "center",
  },
  subtext: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 28,
  },
  modeGrid: {
    gap: 0,
  },
  modeRow: {
    flexDirection: "row",
  },
  modeGutter: {
    width: 10,
  },
  layer2Header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  knotWrapSmall: {
    marginLeft: 12,
  },
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
    gap: 12,
  },
  chatHeaderTitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  chatList: {},
  insightWrap: {
    paddingHorizontal: 20,
  },
  chipRow: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  chipScroll: {
    marginTop: 4,
    marginBottom: 8,
  },
  typingWrap: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: "flex-start",
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
