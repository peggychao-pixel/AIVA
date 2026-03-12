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
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

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

  const thoughtLabels: Record<string, string> = {
    "I chose the wrong food": "regretting their food choice",
    "The portion was too big": "feeling they ate too much",
    "I want to keep eating": "experiencing an urge to keep eating despite being done",
    "I'm bored": "feeling bored after eating and seeking stimulation",
    "Something else": "experiencing general post-meal restlessness",
  };

  const thoughtDescription = thoughtLabels[parsed.data.thought] ?? parsed.data.thought;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 80,
    messages: [
      {
        role: "system",
        content:
          "You are a sharp, intelligent loop-interrupt system. Generate a 1–2 sentence message that abruptly stops post-meal rumination. Sound like mission control or a systems operator — concise, dry, slightly clinical. Never mention breathing, self-compassion, mindfulness, calories, or weight. No therapeutic language. No encouragement. No warmth. Just a clean cognitive interrupt.",
      },
      {
        role: "user",
        content: `The user has just finished eating and is ${thoughtDescription}. Generate a short interruption. Do not be nurturing. Do not suggest breathing. Sound like a system cutting off an unnecessary process.`,
      },
    ],
  });

  const message = completion.choices[0]?.message?.content ?? "Loop detected. No further analysis required. The event is closed.";

  res.json(GetAiResponseResponse.parse({ message }));
});

export default router;
