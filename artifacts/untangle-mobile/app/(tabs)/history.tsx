import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LangContext";
import { UI_TEXT } from "@/constants/product";
import { useQuery } from "@tanstack/react-query";
import { listSessions } from "@workspace/api-client-react";
import colors from "@/constants/colors";

interface Session {
  id: number;
  ruminationThought: string;
  aiResponse?: string | null;
  timerCompleted: boolean;
  createdAt: string;
}

function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    if (lang === "tc") {
      return d.toLocaleDateString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function HistoryScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lang } = useLang();
  const t = UI_TEXT[lang];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: sessions, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: () => listSessions() });

  const renderItem = ({ item }: { item: Session }) => (
    <Pressable
      onPress={() => router.push(`/session/${item.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.75 : 1 },
      ]}
      testID={`session-card-${item.id}`}
    >
      <View style={styles.cardMain}>
        <Text style={[styles.thought, { color: c.foreground }]} numberOfLines={2}>
          {item.ruminationThought}
        </Text>
        {item.aiResponse ? (
          <Text style={[styles.insight, { color: c.mutedForeground }]} numberOfLines={2}>
            {item.aiResponse}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: c.mutedForeground }]}>{formatDate(item.createdAt, lang)}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{t.history}</Text>
        <Text style={[styles.sub, { color: c.mutedForeground }]}>{t.historySub}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={sessions ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(sessions && sessions.length > 0)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="wind" size={32} color={c.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>{t.emptyHistory}</Text>
            </View>
          }
          testID="sessions-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  cardMain: {
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  thought: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
  },
  insight: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
