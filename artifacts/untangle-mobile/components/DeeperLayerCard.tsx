import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface DeeperLayerCardProps {
  surface: string;
  deeper: string;
  landing: string;
  isSaved?: boolean;
  onSave?: () => void;
  saveLabel?: string;
  savedLabel?: string;
  isTc?: boolean;
}

export function DeeperLayerCard({
  surface,
  deeper,
  landing,
  isSaved,
  onSave,
  saveLabel = "Save this moment",
  savedLabel = "Saved",
  isTc = false,
}: DeeperLayerCardProps) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>
        {isTc ? "再往下看一層" : "One layer deeper"}
      </Text>

      <View style={styles.sections}>
        <View style={styles.section}>
          <Text style={[styles.microLabel, { color: c.mutedForeground }]}>
            {isTc ? "表層" : "SURFACE"}
          </Text>
          <Text style={[styles.sectionText, { color: c.foreground, opacity: 0.7 }]}>{surface}</Text>
        </View>
        <View style={styles.section}>
          <Text style={[styles.microLabel, { color: c.mutedForeground }]}>
            {isTc ? "更底下" : "UNDERNEATH"}
          </Text>
          <Text style={[styles.sectionText, { color: c.foreground }]}>{deeper}</Text>
        </View>
      </View>

      <View style={[styles.landingWrap, { borderTopColor: c.border }]}>
        <Text style={[styles.microLabel, { color: c.mutedForeground }]}>
          {isTc ? "接住句" : "SOFTER HOLD"}
        </Text>
        <Text style={[styles.landingText, { color: c.foreground }]}>
          {isTc ? `「${landing}」` : `"${landing}"`}
        </Text>
      </View>

      {onSave ? (
        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.7 : 1 }]}
          testID="save-moment-btn"
        >
          <Feather name="bookmark" size={14} color={isSaved ? c.primary : c.mutedForeground} />
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
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
  },
  sections: {
    gap: 10,
  },
  section: {
    gap: 3,
  },
  microLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  landingWrap: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 3,
  },
  landingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    fontStyle: "italic",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
