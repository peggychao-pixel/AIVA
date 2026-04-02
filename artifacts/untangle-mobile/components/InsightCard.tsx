import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface InsightCardProps {
  content: string;
  anchorPhrase?: string | null;
  isSaved?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  savedLabel?: string;
}

export function InsightCard({ content, anchorPhrase, isSaved, onSave, saveLabel = "Save this moment", savedLabel = "Saved" }: InsightCardProps) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.content, { color: c.foreground }]}>{content}</Text>
      {anchorPhrase ? (
        <View style={[styles.anchor, { borderColor: c.border }]}>
          <Text style={[styles.anchorText, { color: c.primary }]}>{anchorPhrase}</Text>
        </View>
      ) : null}
      {onSave ? (
        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.7 : 1 }]}
          testID="save-moment-btn"
        >
          <Feather
            name={isSaved ? "bookmark" : "bookmark"}
            size={14}
            color={isSaved ? c.primary : c.mutedForeground}
          />
          <Text style={[styles.saveBtnText, { color: isSaved ? c.primary : c.mutedForeground }]}>
            {isSaved ? savedLabel : saveLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  anchor: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  anchorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
