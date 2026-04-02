import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

export function TypingIndicator() {
  const c = useColors();
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const makePulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 280, useNativeDriver: true }),
          Animated.delay(400),
        ])
      );

    const a0 = makePulse(dot0, 0);
    const a1 = makePulse(dot1, 200);
    const a2 = makePulse(dot2, 400);

    a0.start();
    a1.start();
    a2.start();

    return () => {
      a0.stop();
      a1.stop();
      a2.stop();
    };
  }, [dot0, dot1, dot2]);

  return (
    <View style={styles.row}>
      <View
        style={[styles.bubble, { backgroundColor: c.card, borderColor: c.border }]}
      >
        <View style={styles.dots}>
          {[dot0, dot1, dot2].map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: c.mutedForeground, opacity: dot },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: colors.radius,
    borderBottomLeftRadius: 3,
    borderWidth: 1,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
