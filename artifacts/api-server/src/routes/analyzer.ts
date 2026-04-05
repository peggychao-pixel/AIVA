// AI Insight Analyzer route — POST /api/analyze
// Calls Gemini API with the user's text and returns loopType, insight, nextQuestion

import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

// Reads GOOGLE_API_KEY from environment (set in .env or Replit Secrets)
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env["GOOGLE_API_KEY"] ?? process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Please add it to your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
}

const SYSTEM_PROMPT = `You are a psychological pattern analyst for Untangle, an app that helps people untangle food-related mental rumination.

Your job is to read a short note about someone's eating-related struggle — anticipatory panic, self-judgment, hidden difficulty, loops that won't stop — and return a concise, precise analysis.

Context for Untangle's world:
- Users often describe obsessive food thinking, fear of choosing wrong, fear of judgment after eating, difficulty reaching "enough", anticipatory spiraling before meals, shame around wanting food, or replaying choices afterward
- Patterns may include: comparison loops, regret anticipation, self-worth loops, over-control, scarcity anxiety, high-intensity craving, aftermath obsession, sequence control paralysis, premeal interference, emotional value anchoring, and more
- Your analysis should feel like a thoughtful clinician who is NOT moralizing, NOT giving medical advice, and NOT reducing the experience to "willpower" or simple hunger

Rules:
- Tone: calm, precise, low-shame, psychologically sharp
- Do NOT sound clinical, robotic, or corporate
- Do NOT moralize food choices or body issues
- Do NOT give medical advice
- If the input is too short or vague to say anything meaningful, set loopType to "unclear" and ask for more context in nextQuestion
- Keep insight to 1–3 sentences maximum
- Keep nextQuestion to one specific, open question
- Return ONLY valid JSON with exactly these three fields: loopType, insight, nextQuestion

Example output:
{
  "loopType": "anticipatory panic",
  "insight": "The distress seems to begin before eating starts — when the mind is already predicting the meal won't go well and bracing for the aftermath.",
  "nextQuestion": "What part of how the meal might end feels hardest to leave uncertain?"
}`;

router.post("/analyze", async (req, res) => {
  const { text } = req.body as { text?: string };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Please provide some text to analyze." });
    return;
  }

  if (text.trim().length < 15) {
    res.json({
      loopType: "unclear",
      insight: "This is a little short to say anything useful.",
      nextQuestion: "Can you say a bit more about what the experience felt like?",
    });
    return;
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "API key not configured.";
    res.status(500).json({ error: message });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: `${SYSTEM_PROMPT}\n\nUser note:\n${text.trim()}` }] },
      ],
    });

    const raw = response.text ?? "";
    console.log("[Analyzer] Raw Gemini response:", raw.slice(0, 400));

    // Extract and parse JSON from Gemini's response robustly
    let parsed: { loopType?: string; insight?: string; nextQuestion?: string } = {};

    // Strip markdown fences if present
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/s);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    // Find first JSON object block
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/s);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }

    // Try clean parse first
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback: extract fields individually using regex in case JSON was truncated
      console.warn("[Analyzer] JSON parse failed, attempting field extraction. Raw:", raw.slice(0, 200));
      const loopTypeMatch = raw.match(/"loopType"\s*:\s*"([^"]+)"/);
      const insightMatch = raw.match(/"insight"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      const nextQuestionMatch = raw.match(/"nextQuestion"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      if (loopTypeMatch) parsed.loopType = loopTypeMatch[1];
      if (insightMatch) parsed.insight = insightMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
      if (nextQuestionMatch) parsed.nextQuestion = nextQuestionMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
    }

    const loopType = (parsed.loopType ?? "").trim();
    const insight = (parsed.insight ?? "").trim();
    const nextQuestion = (parsed.nextQuestion ?? "").trim();

    if (!loopType || !insight || !nextQuestion) {
      throw new Error("Incomplete response from Gemini.");
    }

    res.json({ loopType, insight, nextQuestion });
  } catch (err: unknown) {
    console.error("[Analyzer] Gemini error:", err);
    res.status(500).json({
      error: "Something went wrong while analyzing. Please try again.",
    });
  }
});

export default router;
