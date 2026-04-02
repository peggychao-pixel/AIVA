import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LangContext";
import { UI_TEXT } from "@/constants/product";
import { useQuery } from "@tanstack/react-query";
import { listSessions } from "@workspace/api-client-react";
import colors from "@/constants/colors";

function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    if (lang === "tc") {
      return d.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useLang();
  const t = UI_TEXT[lang];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: sessions, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: () => listSessions() });
  const session = sessions?.find((s: { id: number; ruminationThought: string; aiResponse?: string | null; timerCompleted: boolean; createdAt: string }) => String(s.id) === id);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Feather name="arrow-left" size={20} color={c.mutedForeground} />
          <Text style={[styles.backLabel, { color: c.mutedForeground }]}>{t.back}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : !session ? (
        <View style={styles.center}>
          <Text style={[styles.notFound, { color: c.mutedForeground }]}>
            {lang === "tc" ? "找不到這個時刻" : "Session not found"}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.dateLabel, { color: c.mutedForeground }]}>
            {formatDate(session.createdAt, lang)}
          </Text>

          {session.aiResponse ? (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.cardLabel, { color: c.primary }]}>
                {lang === "tc" ? "AI 洞察" : "AI insight"}
              </Text>
              <Text style={[styles.aiResponse, { color: c.foreground }]}>{session.aiResponse}</Text>
            </View>
          ) : null}

          <View style={[styles.card, styles.thoughtCard, { backgroundColor: c.background, borderColor: c.border }]}>
            <Text style={[styles.cardLabel, { color: c.mutedForeground }]}>
              {lang === "tc" ? "你帶來的是" : "What you brought in"}
            </Text>
            <Text style={[styles.thought, { color: c.foreground }]}>{session.ruminationThought}</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  thoughtCard: {
    marginTop: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiResponse: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    lineHeight: 25,
  },
  thought: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFound: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
