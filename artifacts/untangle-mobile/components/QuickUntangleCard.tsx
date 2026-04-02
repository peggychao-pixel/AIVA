import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { quickUntangle } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface QuickUntangleCardProps {
  onClose: () => void;
  isTc: boolean;
}

export function QuickUntangleCard({ onClose, isTc }: QuickUntangleCardProps) {
  const c = useColors();
  const [thought, setThought] = useState("");

  const { mutateAsync: runQuick, isPending, data: result } = useMutation({
    mutationFn: (body: { thought: string }) => quickUntangle(body),
  });

  const handleSubmit = async () => {
    if (!thought.trim() || isPending) return;
    await runQuick({ thought: thought.trim() }).catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>
          {isTc ? "快速解開" : "Quick untangle"}
        </Text>
        <Pressable onPress={onClose} hitSlop={10}>
          <Feather name="x" size={18} color={c.mutedForeground} />
        </Pressable>
      </View>

      {!result ? (
        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: c.background, borderColor: c.border, color: c.foreground },
            ]}
            placeholder={isTc ? "什麼念頭在轉..." : "What thought is looping..."}
            placeholderTextColor={c.mutedForeground}
            value={thought}
            onChangeText={setThought}
            multiline
            editable={!isPending}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!thought.trim() || isPending}
            style={[
              styles.submitBtn,
              {
                backgroundColor: c.primary,
                opacity: thought.trim() && !isPending ? 1 : 0.4,
              },
            ]}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={c.primaryForeground} />
            ) : (
              <Text style={[styles.submitBtnText, { color: c.primaryForeground }]}>
                {isTc ? "解開 →" : "Untangle →"}
              </Text>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.result}>
          <Text style={[styles.insight, { color: c.foreground }]}>{result.insight}</Text>
          {result.anchorPhrase ? (
            <View style={[styles.anchor, { borderTopColor: c.border }]}>
              <Text style={[styles.anchorLabel, { color: c.mutedForeground }]}>
                {isTc ? "記住這句" : "Keep this"}
              </Text>
              <Text style={[styles.anchorText, { color: c.primary }]}>
                {isTc ? `「${result.anchorPhrase}」` : `"${result.anchorPhrase}"`}
              </Text>
            </View>
          ) : null}
          {result.suggestion ? (
            <View style={[styles.suggestion, { backgroundColor: c.secondary }]}>
              <Text style={[styles.suggestionText, { color: c.foreground }]}>
                {result.suggestion}
              </Text>
            </View>
          ) : null}
          <Pressable onPress={onClose}>
            <Text style={[styles.closeLink, { color: c.mutedForeground }]}>
              {isTc ? "← 關閉" : "← Close"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: colors.radius,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  form: {
    gap: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 70,
    maxHeight: 120,
  },
  submitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  result: {
    gap: 12,
  },
  insight: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  anchor: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 3,
  },
  anchorLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  anchorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  suggestion: {
    borderRadius: 8,
    padding: 12,
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
    opacity: 0.7,
  },
  closeLink: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
