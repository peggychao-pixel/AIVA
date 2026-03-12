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

const LOOP_TYPES = [
  "Rumination loop",
  "Perfection loop",
  "Evaluation loop",
  "Control loop",
  "Replay loop",
  "Comparison loop",
  "Fear-of-wrong-choice loop",
  "Overplanning loop",
];

const LOOP_TYPES_LIST = LOOP_TYPES.join(", ");

const BASE_RULES = `
Rules:
- Ask ONE question per turn. Max 2 sentences total.
- Never repeat or paraphrase what the user just said.
- Never use therapy language ("that must be hard", "I hear you", "it's okay").
- Never mention breathing, mindfulness, self-compassion, calories, or weight.
- Be dry, precise, and curious — like a sharp analyst noticing patterns.
- If the user appears to circle back to the same topic 2+ times, reflect it plainly: "We might be circling the same thought." or "Your mind keeps returning to this — what does it want to resolve?"
- Every 3–4 turns, if a real pattern is visible, surface a brief insight (isInsight: true, max 2 sentences, calm and observational, NOT therapeutic).
- Identify the thinking loop type if clear, from: ${LOOP_TYPES_LIST}. Set loopType to the detected type, or null if unclear.
- Suggestion chips must be 4–7 word honest user-voice replies — not reflective prompts, not questions.
- Respond ONLY in valid JSON: {"response":"...","isInsight":false,"suggestions":["...","...","..."],"loopType":null}`;

const SYSTEM_PROMPTS: Record<string, string> = {
  before: `You are a thinking mirror. The user is overplanning or overthinking what to eat before a meal. Help them see the loop — not solve it. Notice if they're chasing perfection, avoiding a wrong choice, or trying to optimize. Ask one sharp question per turn.
${BASE_RULES}`,

  after: `You are a thinking mirror. The user is replaying, evaluating, or judging a meal they already ate. Help them notice the replay or evaluation loop. Notice if they're trying to mentally "solve" something that's already done. Ask one sharp question per turn.
${BASE_RULES}`,

  loop: `You are a thinking mirror. The user's mind is stuck — repetitive thoughts, replays, circular thinking. Help them see the structure of the loop: what keeps pulling them back, what it's trying to resolve. Ask one sharp question per turn.
${BASE_RULES}`,

  pressure: `You are a thinking mirror. The user feels pressure — to make the right choice, to control the outcome, to do it perfectly. Help them notice the control or perfection loop underneath the pressure. Ask one sharp question per turn.
${BASE_RULES}`,

  other: `You are a thinking mirror helping someone notice a mental loop. Ask one sharp question per turn. Notice patterns. Surface what the mind is trying to resolve.
${BASE_RULES}`,
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
      max_completion_tokens: 220,
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
