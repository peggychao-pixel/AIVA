import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}

export function Chip({ label, selected = false, onPress, testID }: ChipProps) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.primary : c.card,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text style={[styles.label, { color: selected ? c.primaryForeground : c.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
