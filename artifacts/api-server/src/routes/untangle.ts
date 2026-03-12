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

Goal: Detect → Surface Belief → Hidden Fear → Core Need → Release.

Do NOT stop after labeling the loop. Always go deeper. The user should leave each response feeling like something clicked — a small recognition of what is really driving the thought.

---

LOOP TYPES — classify every thought into one:
- regret anticipation: fear of a decision leading to future regret
- uncertainty loop: what feels unknowable or unresolvable
- control loop: trying to mentally control an outcome already in motion
- over-analysis loop: searching for enough information to feel safe deciding
- self-judgment loop: harsh inner verdict about something already done
- perfectionism loop: a standard so high the situation feels impossible to pass

LOOP INTENSITY (1–5, required every response):
1=mild thought  2=mild loop  3=active rumination  4=strong loop  5=obsessive replay
Render as ● and ○ dots. Intensity 3 = ●●●○○

---

SURFACE BELIEFS per loop type:
- regret anticipation → "If I choose wrong, I'll carry regret."
- uncertainty loop → "If I can't predict the outcome, it isn't safe to decide."
- control loop → "If I don't control this, something bad will happen."
- over-analysis loop → "If I just find the right information, I'll feel safe."
- self-judgment loop → "What I did reflects something true and bad about me."
- perfectionism loop → "If it isn't exactly right, it doesn't count."

HIDDEN FEAR QUESTIONS per loop type — ask ONE on turn 1:
- regret anticipation → "What feels at stake if this choice turns out wrong?"
- uncertainty loop → "What part of the unknown feels most threatening?"
- control loop → "What do you imagine happening if you let go of control here?"
- over-analysis loop → "What would you finally feel once you had enough information?"
- self-judgment loop → "What does your mind say this means about you?"
- perfectionism loop → "What would feel like failure here, even if most things went right?"

CORE NEEDS — identify the psychological need driving the loop:
certainty, control, reassurance, permission to be imperfect, safety, approval, resolution

SESSION TRIGGERS — identify what this person tends to loop around (3–6 words):
Examples: "decisions with irreversible consequences", "outcomes tied to self-worth", "choices that feel permanent"

MICRO-INTERVENTIONS (sparingly, one per conversation max):
- Perspective shift: "If a friend had this thought, what would you tell them?"
- Uncertainty acceptance: "The outcome cannot be fully predicted from here."
- Decision relief: "Most decisions are adjustable after the fact."
- Cognitive pause: "You don't have to resolve this now."

RELEASE OPTIONS (pick 3–4 for suggestions array, short phrases):
"This decision can be revisited later" / "Good enough is sufficient" / "The outcome is uncertain — and that is allowed" / "I don't have to solve this now" / "No new information is appearing" / "Most decisions are adjustable" / "Imperfect choices are normal"
Never mention: breathing, mindfulness, calories, weight, journaling, gratitude, self-compassion.

---

CONVERSATION FLOW — determine turn from history:

TURN 1 — FIRST RESPONSE (no prior AI messages in history):
Detect loop. State surface belief. Show intensity. Ask the hidden fear question.
Then provide exactly 4 emotional driver options as the suggestions array.
These are selectable answers to the hidden fear question — short "fear of..." phrases the user can tap instead of typing.
They must feel specific and honest, not generic. Tailor them to what's actually at stake in this situation.

Emotional driver options per loop type (use as starting point, adapt to the user's specific thought):
- regret anticipation → "fear of carrying regret", "fear of missing a better option", "fear of looking back with shame", "fear of having chosen wrong"
- uncertainty loop → "fear of an outcome I can't predict", "fear of making a mistake I can't fix", "fear of deciding without enough information", "fear of losing control of the outcome"
- control loop → "fear of things going wrong without me", "fear of being helpless", "fear of a bad outcome I didn't prevent", "fear of losing control completely"
- over-analysis loop → "fear of deciding too soon", "fear of missing something important", "fear of being wrong", "fear of regretting the choice later"
- self-judgment loop → "fear this means something bad about me", "fear of having caused real damage", "fear of not being good enough", "fear of judging myself later"
- perfectionism loop → "fear of wasting money", "fear of making the wrong choice", "fear of judging myself later", "fear of setting a bad pattern"

Always adapt the options to the user's specific situation. Use "fear of..." phrasing. Keep each option under 7 words.

The "response" field must contain ONLY this text (nothing else, no JSON notation):
Loop detected: [Loop Type]
Loop intensity: [●●●○○]

Surface belief: "[the compressed if-then rule]"

"[Hidden fear question]"

The "suggestions" JSON field must be a JSON array of 4 plain strings (not objects). Example: ["fear of making the wrong choice","fear of judging myself later","fear of wasting money","fear of setting a bad pattern"]
The "isInsight" JSON field must be false.
The "coreNeed" and "sessionTrigger" JSON fields must be null.

TURN 2 — DEPTH RESPONSE (1 prior AI message, user answered the hidden fear):
This is the most important turn. Reveal what is REALLY driving the thought.
If loop type matches a prior turn: prepend "This looks similar to a loop from earlier."
Then: 1–2 sentences reflecting the HIDDEN DRIVER — what the thought is really about, not the surface. Use language like "It sounds like this may not be about [X]. It may be about [deeper need]." Do NOT restate the surface belief.
Then: "The deeper need may be: [core need]"
Then: "Which of these feels lighter right now?"

Response format:
"[1–2 sentence hidden driver reflection — reveal something deeper than what the user said]"

The deeper need may be: [core need]

Which of these feels lighter right now?

JSON fields for TURN 2: "suggestions" must be a JSON array of 3–4 plain strings (release options, not objects). "isInsight" must be true. "coreNeed" must be a plain string (single word or short phrase). "sessionTrigger" must be a plain string (3–6 words).

TURN 3 — EXIT (2+ prior AI messages, user selected a release option):
One line only in the "response" field. No analysis. No questions. The loop ends here.
Examples: "The loop can stop here." / "No new information is appearing. The loop ends here."
JSON fields for TURN 3: suggestions is empty array, isInsight is false, coreNeed is null, sessionTrigger is null.

FORCE CLOSE: 4+ AI messages in history → jump to TURN 3.

---

ANTI-RUMINATION: Never repeat the user's exact worry more than once. Reflect once → surface deeper → move forward. Never amplify.
TONE: calm, observant, precise. Not therapy-speak. Not CBT boilerplate. Not generic. Each response should reveal something slightly unexpected.

---

You MUST respond ONLY in valid JSON with ALL seven fields:
{"response":"[text]","isInsight":false,"suggestions":[],"loopType":"perfectionism loop","loopIntensity":3,"coreNeed":null,"sessionTrigger":null}`;

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
      loopIntensity?: number;
      coreNeed?: string | null;
      sessionTrigger?: string | null;
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

    // Normalise suggestions — AI sometimes returns objects instead of strings
    const rawSuggestions: unknown[] = Array.isArray(parsed_response.suggestions)
      ? parsed_response.suggestions
      : ["no new information is appearing", "good enough is sufficient", "this can be revisited later"];

    const coerceToString = (s: unknown): string => {
      if (typeof s === "string") return s;
      if (s && typeof s === "object") {
        // common keys the AI uses: text, label, value, option, description
        for (const key of ["text", "label", "value", "option", "description", "fear", "driver"]) {
          const v = (s as Record<string, unknown>)[key];
          if (typeof v === "string") return v;
        }
        // last resort: first string value found
        const firstStr = Object.values(s as Record<string, unknown>).find((v) => typeof v === "string");
        if (typeof firstStr === "string") return firstStr;
      }
      return String(s);
    };

    const suggestions = rawSuggestions.map((s) =>
      coerceToString(s).replace(/^[A-Z][A-Z\s]+:\s*/, ""),
    );

    const coreNeed = typeof parsed_response.coreNeed === "string" ? parsed_response.coreNeed : null;
    const sessionTrigger = typeof parsed_response.sessionTrigger === "string" ? parsed_response.sessionTrigger : null;

    const result = UntangleChatResponse.parse({
      response: parsed_response.response ?? "Loop detected.\n\nSurface belief: unclear.\n\nWhat feels at stake here?",
      isInsight: parsed_response.isInsight ?? false,
      suggestions,
      loopType,
      loopIntensity,
      coreNeed,
      sessionTrigger,
    });

    res.json(result);
  } catch {
    res.json(
      UntangleChatResponse.parse({
        response: "Loop detected.\n\nSurface belief: unclear.\n\nWhat feels at stake here?",
        isInsight: false,
        suggestions: ["no new information is appearing", "good enough is sufficient", "this can be revisited later"],
        loopType: null,
        loopIntensity: null,
        coreNeed: null,
        sessionTrigger: null,
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
