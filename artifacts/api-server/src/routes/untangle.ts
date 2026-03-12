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

const LOOP_TYPES_LIST = "Rumination loop, Perfection loop, Evaluation loop, Control loop, Replay loop, Comparison loop, Fear-of-wrong-choice loop, Overplanning loop";

const ENGINE_PROMPT = `You are the cognitive engine of Untangle — a rumination interruption tool. Your job is to identify, compress, and loosen cognitive knots using the user's own words.

You are NOT a chatbot, therapist, or advice generator. Never produce reflections, lectures, or extended analysis.

Every response must follow this exact 4-step structure:

STEP 1 — CATCH: Identify the repeating pattern. Reflect it in one brief line using the user's language.
STEP 2 — COMPRESS: Reduce the loop to one sentence. Start it with "The knot seems to be:"
STEP 3 — EXITS: Give 2–3 short cognitive exits. These go in the "suggestions" array. Each must be one short action or reframe — not a question, not a paragraph.
STEP 4 — CLOSE: End with exactly one closing question. Use: "Which of these would make the loop feel even slightly lighter right now?" — or a variation that closes, not reopens.

FORMAT your "response" field like this (no more than 5 lines total):
Loop detected
"[the repeating pattern in the user's words]"

The knot seems to be: [one-sentence compression]

[closing question]

CLOSING RULE (most important):
If the conversation history shows that exits were already offered (the previous AI message contains "Which of these" or "Possible ways to loosen it") and the user is now responding by selecting one of those exits or indicating they have a direction — do NOT re-run the full 4-step structure. Instead, give a brief closing acknowledgment of 1–2 lines. Format: just a short, plain observation that closes the loop. Keep the "response" under 2 lines. Use the same JSON structure but with empty suggestions [] and no closing question. Example: "That one narrows it down. The loop has less to grip now."

STRICT RULES:
- Never ask more than one question per response.
- Never produce more than 5 lines in the "response" field.
- Never give advice paragraphs or mental health explanations.
- Never paraphrase extensively. Use the user's own language.
- If the user circles the same thought again: stop probing, compress immediately, offer exits, close.
- Tone: calm, precise, non-judgmental, minimal. Not therapeutic, not coaching, not validating.
- Exit suggestions must NEVER mention: breathing, mindfulness, meditation, self-compassion, journaling, gratitude, calories, weight, or any wellness/therapy action. Only cognitive reframes and concrete boundary-setting.

LOOP TYPE: You MUST always include "loopType" in your JSON. Detect from: ${LOOP_TYPES_LIST}. Use the exact string from that list, or null if genuinely unclear. Never omit this field.

Set isInsight: true only when the compression step surfaces a particularly clear or non-obvious underlying belief — not every turn.

You MUST respond ONLY in valid JSON with ALL four fields:
{"response":"Loop detected\\n\\"[pattern]\\"\\n\\nThe knot seems to be: [compression]\\n\\n[closing question]","isInsight":false,"suggestions":["exit option 1","exit option 2","exit option 3"],"loopType":"Rumination loop"}`;

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
      max_completion_tokens: 350,
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

    const result = UntangleChatResponse.parse({
      response: parsed_response.response ?? "What part of this keeps pulling you back?",
      isInsight: parsed_response.isInsight ?? false,
      suggestions: parsed_response.suggestions ?? ["I'm not sure", "Something about the outcome", "I keep thinking about it"],
      loopType: parsed_response.loopType ?? null,
    });

    res.json(result);
  } catch {
    res.json(
      UntangleChatResponse.parse({
        response: "What's the part that keeps pulling you back?",
        isInsight: false,
        suggestions: ["The outcome", "The choice I made", "I'm not sure"],
        loopType: null,
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
