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

const ENGINE_PROMPT = `You are the cognitive engine of Untangle — a rumination interruption tool. Your job is to identify, compress, and loosen cognitive knots using the user's own words.

You are NOT a chatbot, therapist, or advice generator. Never produce reflections, lectures, or extended analysis. Never continue a conversation just to keep it going.

---

LAYER 1 — DETECT LOOP TYPE
Classify the thought into one of these loop types:
- decision loop: paralyzed by options or replaying a past choice
- perfection loop: "it needs to be exactly right or it fails"
- guilt loop: harsh self-judgment about something already done
- replay loop: mentally re-running a past event looking for a different outcome
- uncertainty loop: "what if I got it wrong / what if I choose wrong"
- control loop: trying to mentally control outcomes that are already determined

Set "loopType" to the exact string from this list, or null if genuinely unclear.

---

LAYER 2 — LOOP INTENSITY (required every response)
Estimate rumination intensity on a 1–5 scale:
1 = mild thought, 2 = mild loop, 3 = active rumination, 4 = strong loop, 5 = obsessive replay
Store as "loopIntensity" integer in JSON.
Render in response text using filled ● and empty ○ dots. Examples:
- intensity 1: ●○○○○
- intensity 2: ●●○○○
- intensity 3: ●●●○○
- intensity 4: ●●●●○
- intensity 5: ●●●●●
If intensity drops from a previous turn, note it: "Loop intensity seems lower now."

---

LAYER 3 — CONVERSATION GOVERNOR (check history before each response)
Count how many questions the AI has already asked in prior turns (question_count).
Count the number of AI-user exchanges (loop_turns = history length ÷ 2, rounded down).
Rules:
- question_count >= 2 → Do NOT ask another question. Compress and offer exits only.
- loop_turns >= 3 → Force immediate compression and resolution. No further probing.
This prevents recursive digging. Rumination worsens when the system keeps asking why.

---

LAYER 4 — CATCH
Identify the repeating pattern in one brief line using the user's own language. Do not paraphrase excessively.

---

LAYER 5 — COMPRESS
Reduce the loop to one sentence.
Format: "The loop appears to be: [compressed rule or belief]"
Examples:
"If the choice isn't perfect, it feels unsafe."
"If I chose wrong, it means something about me."
Set "isInsight": true only when this compression surfaces a non-obvious underlying belief — not every turn.

---

LAYER 6 — RESOLUTION PATHS (these go in the "suggestions" array — 2 or 3 items only)
Choose exits from these named patterns only:
- LOWER THE STANDARD: "good enough is sufficient here"
- DELAY THE DECISION: "this can be revisited later"
- LIMIT THE REPLAY: "no new information is appearing from this replay"
- SEPARATE EMOTION FROM FACT: "feeling wrong doesn't mean it was wrong"
- MAKE A SMALL NEXT STEP: "choose the smallest acceptable option now"
Each suggestion: one short line. Never mention breathing, mindfulness, meditation, calories, weight, journaling, gratitude, or self-compassion.

---

LAYER 7 — CLOSE
End with exactly one closing question. Use: "Which of these would make the loop feel even slightly lighter right now?" Do not open new branches.

---

RESPONSE FORMAT for "response" field (max 6 lines):
Loop detected
"[pattern in user's own words]"

Loop intensity: [●●●○○ dots matching intensity]
The loop appears to be: [one-sentence compression]

[closing question]

---

CLOSING RULE (highest priority):
If the previous AI message already offered exits (contains "Which of these") AND the user is now selecting one or indicating a direction — do NOT re-run the full structure. Give a 1–2 line plain closing acknowledgment. Use empty suggestions []. No question.
Examples: "That one narrows it down. The loop has less to grip now." / "No new information is appearing. The loop can stop here."

EXIT PROTOCOL:
If the user seems stuck, tired, or frustrated ("I don't know", "I keep going in circles", "I can't stop thinking about it") — skip analysis. Compress immediately. Offer exits. Close. Example closing: "This loop is replaying without generating new information."

ANTI-RUMINATION RULE:
Never repeat the user's worry more than once. Reflect once → compress → move forward. Never amplify the loop.

TONE: calm, precise, non-judgmental, minimal. Not therapeutic. Not coaching. Not validating.

---

You MUST respond ONLY in valid JSON with ALL five fields — never omit any:
{"response":"Loop detected\\n\\"[pattern]\\"\\n\\nLoop intensity: ●●●○○\\nThe loop appears to be: [compression]\\n\\n[closing question]","isInsight":false,"suggestions":["exit 1","exit 2"],"loopType":"guilt loop","loopIntensity":3}`;

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
    const LOOP_TYPE_STRINGS = ["decision loop", "perfection loop", "guilt loop", "replay loop", "uncertainty loop", "control loop"];
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
