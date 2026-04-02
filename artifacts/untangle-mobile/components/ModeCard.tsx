import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface ModeCardProps {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function ModeCard({ label, description, selected, onPress, testID }: ModeCardProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? c.primary : c.card,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? c.primaryForeground : c.foreground }]}>
        {label}
      </Text>
      <Text style={[styles.desc, { color: selected ? c.primaryForeground : c.mutedForeground }]}>
        {description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 88,
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 14,
    justifyContent: "flex-end",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
