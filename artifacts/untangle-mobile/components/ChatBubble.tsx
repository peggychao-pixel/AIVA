import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const c = useColors();
  const isUser = role === "user";
  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: c.primary }]
            : [styles.bubbleAssistant, { backgroundColor: c.card, borderColor: c.border }],
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isUser ? c.primaryForeground : c.foreground },
          ]}
        >
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  rowUser: {
    alignItems: "flex-end",
  },
  rowAssistant: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: colors.radius,
  },
  bubbleUser: {
    borderBottomRightRadius: 3,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 3,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
