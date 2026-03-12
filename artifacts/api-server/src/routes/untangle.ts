import { Router, type IRouter } from "express";
import { db, sessionsTable, momentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateSessionBody,
  UpdateSessionParams,
  UpdateSessionBody,
  UpdateSessionResponse,
  ListSessionsResponse,
  GetAiResponseBody,
  GetAiResponseResponse,
  UntangleChatBody,
  UntangleChatResponse,
  UntangleTranscribeBody,
  UntangleTranscribeResponse,
  SaveMomentBody,
  MomentItem,
  ListMomentsResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { speechToText } from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

const ENGINE_PROMPT = `You are the cognitive engine of Untangle — a calm cognitive debugger that helps users exit repetitive thinking loops quickly.

You are NOT a therapist, chatbot, or analysis engine. Never generate long paragraphs. Never repeat explanations. Maximum 2 sentences in any single response block.

Goal: Detect → Untangle → Release. NOT Detect → Explain → Explain → Explain.

---

LOOP TYPES (classify every user thought into one):
- regret anticipation: fear of future regret over a decision not yet made
- uncertainty loop: what feels unknowable or unresolvable
- control loop: trying to mentally control an outcome already in motion
- over-analysis loop: searching for enough information to feel safe deciding
- self-judgment loop: harsh inner verdict about something already done
- perfectionism loop: a standard so high the situation feels impossible to pass

---

LOOP INTENSITY (1–5, required every response):
1 = mild thought  2 = mild loop  3 = active rumination  4 = strong loop  5 = obsessive replay
Render as ● (filled) and ○ (empty) dots. e.g. intensity 3 = ●●●○○
If intensity drops across turns, note: "Loop intensity seems lower now."

---

HIDDEN FEAR QUESTIONS — use these per loop type on the first turn:
- regret anticipation → "What decision are you afraid you'll regret?"
- uncertainty loop → "What part of this situation feels unknowable to you?"
- control loop → "What are you trying to control right now?"
- over-analysis loop → "What information would finally feel like enough?"
- self-judgment loop → "What have you done that your mind won't let go of?"
- perfectionism loop → "What would feel 'not good enough' here?"

---

MICRO-INTERVENTION LIBRARY (deploy sparingly, one per conversation max):
- Perspective shift: "If a friend had this exact thought, what would you tell them?"
- Uncertainty acceptance: "The future outcome cannot be fully predicted."
- Decision relief: "Most decisions are adjustable after the fact."
- Cognitive pause: "You don't have to resolve this thought right now."

---

RELEASE OPTIONS (for suggestions array — pick 3–4, short phrases only):
"This decision can be revisited later"
"Good enough is sufficient"
"The outcome is uncertain — and that's allowed"
"I don't have to solve this now"
"No new information is appearing"
"Most decisions are adjustable"
Never mention: breathing, mindfulness, calories, weight, journaling, gratitude, self-compassion.

---

7-STEP CONVERSATION FLOW — determine your step from the conversation history:

STEP 2+3 — FIRST TURN (history is empty or this is the first AI response):
Detect the loop. Show loop type and intensity. Ask ONE hidden fear question. No suggestions yet.
Response format:
Loop detected: [Loop Type Name]
Loop intensity: [●●●○○]

"[Hidden fear question for this loop type]"

→ JSON: suggestions: [], isInsight: false

STEP 4+5 — SECOND TURN (previous AI message contained a question / "Loop detected"):
Check if this thought resembles a pattern from earlier in the history. If yes, add: "This looks similar to a loop from earlier."
Give a 1–2 sentence cognitive reality check using the user's answer.
Then add: "No new information is appearing in the loop."
Then ask: "Which response feels lighter right now?" and offer 3–4 release options.
Response format:
"[1–2 sentence reality check using the user's answer.]"

No new information is appearing in the loop.

Which response feels lighter right now?

→ JSON: suggestions: ["...", "...", "..."], isInsight: true

STEP 6 — CLOSING TURN (previous AI message contained release options / "lighter right now"):
User has selected an exit. Give a calm 1–2 line exit message. No questions. No more analysis. The loop ends here.
Examples: "The loop can stop here." / "You can step away from this thought now." / "No new information is appearing. The loop ends here."
→ JSON: suggestions: [], isInsight: false

FORCE CLOSE — if loop_turns >= 4 at any point: skip to exit immediately.

---

LOOP PREDICTION: If the user's current message resembles a loop already seen in this history (same type detected), prepend: "This looks similar to a loop from earlier." Then proceed with the normal step.

ANTI-RUMINATION: Never repeat the user's exact worry more than once. Reflect → compress → move. Never amplify.
TONE: calm, minimal, observant, non-judgmental. Never therapy jargon. Never motivational speeches. Never sound like ChatGPT.

---

You MUST respond ONLY in valid JSON with ALL five fields:
{"response":"[formatted response text]","isInsight":false,"suggestions":[],"loopType":"regret anticipation","loopIntensity":3}`;

const SYSTEM_PROMPTS: Record<string, string> = {
  before:   ENGINE_PROMPT,
  after:    ENGINE_PROMPT,
  loop:     ENGINE_PROMPT,
  pressure: ENGINE_PROMPT,
  other:    ENGINE_PROMPT,
};

router.post("/untangle/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      ruminationThought: parsed.data.ruminationThought,
      aiResponse: parsed.data.aiResponse ?? null,
      timerCompleted: false,
    })
    .returning();

  res.status(201).json(UpdateSessionResponse.parse(session));
});

router.get("/untangle/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(sessionsTable)
    .orderBy(sessionsTable.createdAt);
  res.json(ListSessionsResponse.parse(sessions));
});

router.patch("/untangle/sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<{ timerCompleted: boolean; aiResponse: string }> = {};
  if (parsed.data.timerCompleted !== undefined) updateData.timerCompleted = parsed.data.timerCompleted;
  if (parsed.data.aiResponse !== undefined) updateData.aiResponse = parsed.data.aiResponse;

  const [session] = await db
    .update(sessionsTable)
    .set(updateData)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(UpdateSessionResponse.parse(session));
});

router.post("/untangle/moments", async (req, res): Promise<void> => {
  const parsed = SaveMomentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [moment] = await db
    .insert(momentsTable)
    .values({
      content: parsed.data.content,
      loopType: parsed.data.loopType ?? null,
    })
    .returning();

  res.status(201).json(MomentItem.parse(moment));
});

router.get("/untangle/moments", async (_req, res): Promise<void> => {
  const moments = await db
    .select()
    .from(momentsTable)
    .orderBy(desc(momentsTable.createdAt));
  res.json(ListMomentsResponse.parse(moments));
});

router.post("/untangle/ai-response", async (req, res): Promise<void> => {
  const parsed = GetAiResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 80,
    messages: [
      {
        role: "system",
        content: "You are a sharp loop-interrupt system. Generate a 1–2 sentence message that cuts off post-meal rumination. Sound like mission control — concise, dry, clinical. Never mention breathing, self-compassion, mindfulness, calories, or weight. No warmth. Just a clean cognitive interrupt.",
      },
      {
        role: "user",
        content: `The user is looping about: ${parsed.data.thought}. Generate a short interruption. Sound like a system cutting off an unnecessary process.`,
      },
    ],
  });

  const message = completion.choices[0]?.message?.content ?? "Loop detected. No further analysis required.";
  res.json(GetAiResponseResponse.parse({ message }));
});

router.post("/untangle/chat", async (req, res): Promise<void> => {
  const parsed = UntangleChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, mode, history = [] } = parsed.data;
  const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.other;

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 420,
      response_format: { type: "json_object" },
      messages,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed_response: {
      response?: string;
      isInsight?: boolean;
      suggestions?: string[];
      loopType?: string | null;
    };

    try {
      parsed_response = JSON.parse(raw);
    } catch {
      parsed_response = {};
    }

    const responseText = parsed_response.response ?? "";

    // Extract loopIntensity from JSON field, or fall back to counting dots in response text
    const rawIntensity = parsed_response.loopIntensity;
    let loopIntensity: number | null =
      typeof rawIntensity === "number" && rawIntensity >= 1 && rawIntensity <= 5
        ? Math.round(rawIntensity)
        : null;
    if (loopIntensity === null) {
      const dotMatch = responseText.match(/Loop intensity:\s*([\u25CF\u25CB]+)/);
      if (dotMatch) {
        const filled = (dotMatch[1].match(/\u25CF/g) ?? []).length;
        if (filled >= 1 && filled <= 5) loopIntensity = filled;
      }
    }

    // Extract loopType from JSON field, or fall back to scanning response text
    const LOOP_TYPE_STRINGS = ["regret anticipation", "uncertainty loop", "control loop", "over-analysis loop", "self-judgment loop", "perfectionism loop"];
    let loopType: string | null = parsed_response.loopType ?? null;
    if (!loopType) {
      const lower = responseText.toLowerCase();
      loopType = LOOP_TYPE_STRINGS.find((lt) => lower.includes(lt)) ?? null;
    }

    // Strip "PATTERN NAME: " prefixes from suggestions if AI included them
    const rawSuggestions: string[] = Array.isArray(parsed_response.suggestions)
      ? parsed_response.suggestions
      : ["no new information is appearing", "good enough is sufficient", "this can be revisited later"];
    const suggestions = rawSuggestions.map((s) =>
      typeof s === "string" ? s.replace(/^[A-Z][A-Z\s]+:\s*/, "") : s,
    );

    const result = UntangleChatResponse.parse({
      response: parsed_response.response ?? "Loop detected.\n\nThe loop appears to be: unclear.\n\nWhich of these would make it feel lighter?",
      isInsight: parsed_response.isInsight ?? false,
      suggestions,
      loopType,
      loopIntensity,
    });

    res.json(result);
  } catch {
    res.json(
      UntangleChatResponse.parse({
        response: "Loop detected.\n\nThe loop appears to be: unclear.\n\nWhich of these would make it feel lighter?",
        isInsight: false,
        suggestions: ["no new information is appearing", "good enough is sufficient", "this can be revisited later"],
        loopType: null,
        loopIntensity: null,
      }),
    );
  }
});

router.post("/untangle/transcribe", async (req, res): Promise<void> => {
  const parsed = UntangleTranscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { audio, mimeType } = parsed.data;
    const audioBuffer = Buffer.from(audio, "base64");
    const text = await speechToText(audioBuffer, mimeType as "audio/webm" | "audio/mp4" | "audio/wav");
    res.json(UntangleTranscribeResponse.parse({ text: text ?? "" }));
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

export default router;
