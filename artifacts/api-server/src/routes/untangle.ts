import { Router, type IRouter } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { speechToText } from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

const SYSTEM_PROMPTS: Record<string, string> = {
  before: `You are a sharp, dry thinking partner. The user is overplanning or overthinking what to eat. Help them notice the optimization loop — not resolve it. Ask one short question per turn, 1–2 sentences max. No therapy language. No "that must be hard." No self-compassion. No mindfulness. Be curious and direct, like a good analyst. Every 3–4 turns, if it fits, surface a brief insight about what's really going on (set isInsight: true). Suggestions must be short user replies (3–7 words each), direct and honest — not reflective prompts. Respond ONLY in JSON: {"response":"...","isInsight":false,"suggestions":["I keep second-guessing","It needs to be perfect","I don't trust myself"]}`,

  after: `You are a sharp, dry thinking partner. The user just ate and is replaying it, judging it, or trying to mentally resolve it. Help them see the loop. Ask one short question per turn, 1–2 sentences max. No therapy language. No calorie or diet talk. No moralizing. No food judgments. Be dry and direct. Every 3–4 turns, if it fits, surface a brief insight (set isInsight: true, 2 sentences max). Suggestions must be short user replies (3–7 words each), honest and direct — not reflective prompts. Respond ONLY in JSON: {"response":"...","isInsight":false,"suggestions":["Judging if it was right","Replaying specific bites","Both, kind of"]}`,

  loop: `You are a sharp, dry thinking partner. The user's mind is stuck on a repeating thought. Help them notice the loop structure — what it is, not why. Ask one short question per turn, 1–2 sentences max. No therapy language. No mindfulness. No breathing. Be precise and curious. Every 3–4 turns, if it fits, surface a brief insight (set isInsight: true, 2 sentences max). Suggestions must be short user replies (3–7 words each), direct — not reflective. Respond ONLY in JSON: {"response":"...","isInsight":false,"suggestions":["The same thought keeps returning","It started after something happened","I don't know what triggered it"]}`,

  other: `You are a sharp, dry thinking partner helping someone notice a mental loop. Ask one short question per turn, 1–2 sentences max. No therapy language. No filler. Be direct and curious. Every 3–4 turns, if it fits, surface a brief insight (set isInsight: true). Suggestions must be short user replies (3–7 words each), honest — not reflective. Respond ONLY in JSON: {"response":"...","isInsight":false,"suggestions":["option1","option2","option3"]}`,
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
        content:
          "You are a sharp loop-interrupt system. Generate a 1–2 sentence message that cuts off post-meal rumination. Sound like mission control — concise, dry, clinical. Never mention breathing, self-compassion, mindfulness, calories, or weight. No warmth. Just a clean cognitive interrupt.",
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
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
      messages,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed_response: { response?: string; isInsight?: boolean; suggestions?: string[] };

    try {
      parsed_response = JSON.parse(raw);
    } catch {
      parsed_response = {};
    }

    const result = UntangleChatResponse.parse({
      response: parsed_response.response ?? "What's the core thought underneath this?",
      isInsight: parsed_response.isInsight ?? false,
      suggestions: parsed_response.suggestions ?? ["Tell me more", "Something else", "I'm not sure"],
    });

    res.json(result);
  } catch (err) {
    res.json(
      UntangleChatResponse.parse({
        response: "What's the part that keeps pulling you back?",
        isInsight: false,
        suggestions: ["The outcome", "The choice I made", "I'm not sure"],
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
