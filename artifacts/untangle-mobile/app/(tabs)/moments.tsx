import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useLang } from "@/context/LangContext";
import { UI_TEXT } from "@/constants/product";
import { useQuery } from "@tanstack/react-query";
import { listMoments } from "@workspace/api-client-react";
import colors from "@/constants/colors";

interface Moment {
  id: number;
  content: string;
  loopType?: string | null;
  createdAt: string;
}

function formatDate(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    if (lang === "tc") {
      return d.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function MomentsScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useLang();
  const t = UI_TEXT[lang];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: moments, isLoading } = useQuery({ queryKey: ["moments"], queryFn: () => listMoments() });

  const renderItem = ({ item }: { item: Moment }) => (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]} testID={`moment-card-${item.id}`}>
      <Text style={[styles.content, { color: c.foreground }]}>{item.content}</Text>
      <View style={styles.footer}>
        {item.loopType ? (
          <View style={[styles.tag, { backgroundColor: c.secondary }]}>
            <Text style={[styles.tagText, { color: c.mutedForeground }]}>{item.loopType}</Text>
          </View>
        ) : null}
        <Text style={[styles.date, { color: c.mutedForeground }]}>{formatDate(item.createdAt, lang)}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{t.moments}</Text>
        <Text style={[styles.sub, { color: c.mutedForeground }]}>{t.momentsSub}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={moments ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(moments && moments.length > 0)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="bookmark" size={32} color={c.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>{t.emptyMoments}</Text>
            </View>
          }
          testID="moments-list"
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
  },
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 10,
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  date: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
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
