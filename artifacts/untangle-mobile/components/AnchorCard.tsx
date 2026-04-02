import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface AnchorCardProps {
  phrase: string;
  isTc: boolean;
}

export function AnchorCard({ phrase, isTc }: AnchorCardProps) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.label, { color: c.mutedForeground }]}>
        {isTc ? "這句先放這裡，下次又開始轉的時候回來看" : "Come back to this when the loop returns."}
      </Text>
      <Text style={[styles.phrase, { color: c.foreground }]}>
        {isTc ? `「${phrase}」` : `"${phrase}"`}
      </Text>
      <Text style={[styles.sub, { color: c.mutedForeground }]}>
        {isTc ? "先把這句放在這裡。" : "Return here when the loop comes back."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  phrase: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 26,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
