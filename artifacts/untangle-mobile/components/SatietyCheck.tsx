import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

export type SatietyKey =
  | "full+satisfied"
  | "full+unsatisfied"
  | "notfull+satisfied"
  | "notfull+unsatisfied"
  | "notfull+bloated";

const SATIETY_OPTIONS: { key: SatietyKey; en: string; tc: string }[] = [
  { key: "full+satisfied",      en: "I'm full and satisfied",                      tc: "我很飽，也有被滿足到" },
  { key: "full+unsatisfied",    en: "I'm full but mentally not satisfied",          tc: "我很飽，但心裡還是不滿足" },
  { key: "notfull+satisfied",   en: "I'm not full but the experience felt settled", tc: "我還沒飽，但心裡有比較安定" },
  { key: "notfull+unsatisfied", en: "I'm not full and not satisfied",              tc: "我不飽，也沒有被滿足到" },
  { key: "notfull+bloated",     en: "I'm not full, not satisfied — just bloated",  tc: "我沒有飽，也沒有被滿足到，只是覺得脹" },
];

const SATIETY_RESPONSES: Record<SatietyKey, { en: string; tc: string }> = {
  "full+satisfied":      {
    en: "This meal landed.\nThere's nothing more to figure out right now.",
    tc: "這餐有到位。\n現在比較不需要再往下追了。",
  },
  "full+unsatisfied":    {
    en: "Your body is done, but something inside still hasn't settled.\nSo you'll keep thinking — because what's stuck isn't the portion, it's something else entirely.",
    tc: "身體夠了，但心裡還沒被安頓。\n所以你還會繼續想，因為卡住的不是份量，是心裡還沒有真的安定。",
  },
  "notfull+satisfied":   {
    en: "Your body may still need a little more.\nBut this meal at least brought you to a more complete place than you were before.",
    tc: "身體可能還需要一點，\n但這餐至少有把你帶到比較完整的地方。",
  },
  "notfull+unsatisfied": {
    en: "This means neither side actually finished — not the body, not the experience.\nSo your mind is still looking for a reason it can use to close the loop.",
    tc: "這代表這餐兩邊都沒有真正完成。\n所以你的腦子還在找一個可以結束的理由。",
  },
  "notfull+bloated":     {
    en: "This isn't completion — it's your body carrying something without the meal actually landing.\nThat's why you feel more stuck, not more settled.",
    tc: "這不是完成感，是身體有負擔，但這餐沒有真的把你帶到位。\n所以你才會更卡，而不是更安心。",
  },
};

interface SatietyCheckProps {
  isTc: boolean;
  answer: SatietyKey | null;
  onAnswer: (k: SatietyKey) => void;
}

export function SatietyCheck({ isTc, answer, onAnswer }: SatietyCheckProps) {
  const c = useColors();
  const selected = answer ? SATIETY_OPTIONS.find((o) => o.key === answer) : null;
  const response = answer ? SATIETY_RESPONSES[answer] : null;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.question, { color: c.mutedForeground }]}>
        {isTc ? "現在更像哪個？" : "Right now — which one feels true?"}
      </Text>

      {!answer ? (
        <View style={styles.options}>
          {SATIETY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => onAnswer(opt.key)}
              style={({ pressed }) => [
                styles.option,
                { borderColor: c.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.optionText, { color: c.mutedForeground }]}>
                {isTc ? opt.tc : opt.en}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.result}>
          <Text style={[styles.choseLabel, { color: c.mutedForeground }]}>
            {isTc ? "你選的是：" : "You chose: "}
            <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium" }}>
              {selected ? (isTc ? selected.tc : selected.en) : ""}
            </Text>
          </Text>
          {response ? (
            <Text style={[styles.responseText, { color: c.foreground }]}>
              {isTc ? response.tc : response.en}
            </Text>
          ) : null}
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
    marginBottom: 12,
    gap: 12,
  },
  question: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  options: {
    gap: 8,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderRadius: 10,
  },
  optionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  result: {
    gap: 8,
  },
  choseLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  responseText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
});
