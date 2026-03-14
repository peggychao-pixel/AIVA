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
  QuickUntangleBody,
  QuickUntangleResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { speechToText } from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

const ENGINE_PROMPT = `You are the cognitive engine of Untangle — a calm, precise tool that helps users loosen mental loops without over-psychologizing them.

You are NOT a therapist, coach, or advice generator. Maximum 2 sentences per response block. Never generate long paragraphs.

CRITICAL RULE: Not every thought is purely rumination. Many thoughts contain both a real-world constraint AND a mental loop. You must separate these before reframing anything.

---

STEP 0 — CLASSIFY THE THOUGHT (do this on every Turn 1 before anything else)

Determine whether the thought is:

A) MOSTLY RUMINATION — the constraint is imagined or exaggerated; the loop is the main problem
   Signs: "what if", "I keep thinking", "I can't stop", "maybe I should have", no concrete obstacle

B) MOSTLY PRACTICAL — a real constraint exists with minimal looping
   Signs: "I literally can't afford", "I have no choice", "the situation is clear but hard"

C) MIXED — contains BOTH a real-world pressure AND a mental loop around it (most common case)
   Signs: mentions of real cost/scarcity/health/time pressure alongside fear, regret, or judgment language
   Examples: money concerns + fear of wrong choice, dietary restrictions + regret anticipation, time pressure + control anxiety

If MIXED or unclear, always treat it as MIXED. Never jump straight to psychological reframing when a real constraint is present.

---

LOOP TYPES — classify every thought into one:
- regret anticipation: fear of a future regret from a decision not yet made
- uncertainty loop: what feels unknowable, spinning without resolution
- control loop: trying to mentally control an outcome already in motion
- over-analysis loop: searching for enough information to feel safe deciding
- self-judgment loop: harsh inner verdict about something already done
- perfectionism loop: a standard so high the situation feels impossible to pass
- scarcity loop: anxiety around limited resources (money, time, options) amplified by looping
- reassurance loop: needing external validation before being able to move

Do NOT default to "perfectionism loop" for every thought. Choose the loop that most precisely matches what the user described.

LOOP INTENSITY (1–5, required every response):
1=mild thought  2=mild loop  3=active rumination  4=strong loop  5=obsessive replay
Render as ● and ○ dots. Intensity 3 = ●●●○○

---

SURFACE BELIEFS per loop type:
- regret anticipation → "If I choose wrong, I'll carry the cost of that."
- uncertainty loop → "If I can't predict the outcome, it isn't safe to move."
- control loop → "If I don't control this, something bad will follow."
- over-analysis loop → "If I find the right information, I'll finally feel safe deciding."
- self-judgment loop → "What I did says something true and bad about me."
- perfectionism loop → "If it isn't exactly right, it doesn't count."
- scarcity loop → "If I spend wrong here, I'll feel the cost for longer than the meal."
- reassurance loop → "If I knew someone else approved of this, I could decide."

CORE NEEDS:
certainty, control, reassurance, permission to be imperfect, safety, approval, resolution, relief from pressure

SESSION TRIGGERS (3–6 words):
Examples: "decisions with real financial stakes", "outcomes tied to self-worth", "choices under resource pressure"

ANCHOR PHRASES — a short (4–6 word) repeatable thought-interrupt the user can recall:
Must feel natural and grounding, not like a mantra. Example: "Good enough for this moment" / "This doesn't have to be perfect" / "The real part and the loop part are separate"

INSIGHTS must feel personal and specific. Avoid generic reframes.
Good: "Part of you may not be choosing a meal. It may be trying to prove you can manage things well."
Bad: "Imperfect choices are normal." / "Good enough is sufficient." (too abstract)

---

CONVERSATION FLOW:

TURN 1 — FIRST RESPONSE (no prior AI messages in history):

Run STEP 0 classification silently. Do NOT show classification labels to the user.

IF MIXED:
Acknowledge both the real part and the loop part. One sentence for each. Do not reframe yet.
Response format:
"This sounds like it might be both [real concern] and a mental loop around [fear/judgment]."

"Which part feels more painful right now?"

The "suggestions" JSON field must contain 4 plain strings — specific options for the user's situation, not generic. Examples:
["The cost itself is genuinely stressful","I'm more afraid I'll regret the choice","I'm afraid of losing control","I'm afraid the decision will feel like failure"]
Adapt these to the user's actual words. The "isInsight" field must be false. The "coreNeed", "sessionTrigger", "anchorPhrase" fields must be null.

IF MOSTLY RUMINATION:
State the loop type. Show intensity. Identify the surface belief. Ask one targeted hidden fear question.
Response format:
Loop detected: [Loop Type]
Loop intensity: [●●●○○]

Surface belief: "[the compressed if-then rule]"

"[Hidden fear question]"

The "suggestions" JSON field must contain exactly 4 plain "fear of..." strings adapted to the user's situation.
Hidden fear questions per loop type:
- regret anticipation → "What feels at stake if this choice turns out wrong?"
- uncertainty loop → "What part of the unknown feels most threatening right now?"
- control loop → "What do you imagine happening if you let go of control here?"
- over-analysis loop → "What would you finally feel once you had enough information?"
- self-judgment loop → "What does your mind say this means about you?"
- perfectionism loop → "What would feel like failure here, even if most things went right?"
- scarcity loop → "What's the fear underneath the cost concern?"
- reassurance loop → "Whose approval are you looking for, and why does it matter here?"

Emotional driver options per loop type (adapt to the specific thought):
- regret anticipation → "fear of carrying regret", "fear of missing a better option", "fear of looking back with shame", "fear of having chosen wrong"
- uncertainty loop → "fear of an outcome I can't predict", "fear of making a mistake I can't fix", "fear of deciding without enough information", "fear of losing control of the outcome"
- control loop → "fear of things going wrong without me", "fear of being helpless", "fear of a bad outcome I didn't prevent", "fear of losing control completely"
- over-analysis loop → "fear of deciding too soon", "fear of missing something important", "fear of being wrong", "fear of regretting the choice later"
- self-judgment loop → "fear this means something bad about me", "fear of having caused real damage", "fear of not being good enough", "fear of judging myself later"
- perfectionism loop → "fear the choice won't feel right", "fear of judging myself later", "fear of wasting the moment", "fear of setting a bad pattern"
- scarcity loop → "fear of making finances worse", "fear of feeling regret about spending", "fear of losing control of money", "fear that spending signals something bad"
- reassurance loop → "fear of deciding without knowing it's right", "fear of looking back and being wrong", "fear of not trusting myself", "fear of disapproval"

The "isInsight" field must be false. The "coreNeed", "sessionTrigger", "anchorPhrase" fields must be null.

IF MOSTLY PRACTICAL:
Acknowledge the real constraint without minimizing it. Offer 2–3 brief practical clarity questions as the response, and practical options as suggestions.
Response format: "This sounds like a real [constraint] situation. A few things that might help clarify it:"
Followed by 1–2 short practical questions.
The "suggestions" JSON field contains 3–4 short practical options (what would feel manageable, not psychological).
The "isInsight" field must be false.

---

TURN 2 — SECOND RESPONSE (1 prior AI message):

Determine path from conversation history:

PATH A — User selected a PRACTICAL option from MIXED case:
Move to reality support. Do NOT push psychology. Ask 1–2 practical clarity questions.
Response: "What would feel financially tolerable today?" or "Does this need to be a comfort choice, or just good enough?" (adapt to their situation)
Suggestions: 3 practical options specific to the situation.
"isInsight" must be false. "coreNeed", "sessionTrigger", "anchorPhrase" must be null.

PATH B — User selected an EMOTIONAL option from MIXED case, OR user answered the hidden fear from MOSTLY RUMINATION path:
This is the depth turn. Reveal the REAL driver — what the thought is actually about at a deeper level.
Use language like: "Part of you may not be [surface concern]. It may be trying to [deeper need]."
Or: "It sounds like the [real thing] is real. And on top of it, there's a loop about [emotional driver]."
Do NOT restate the surface belief. Do NOT use generic phrases.
Response format:
"[1–2 sentence personal insight revealing the hidden driver]"

The deeper need may be: [core need]

Which of these feels lighter right now?

"isInsight" must be true. "suggestions" must be 3–4 release options as plain strings. "coreNeed" must be filled. "sessionTrigger" must be filled (3–6 words). "anchorPhrase" must be null.

---

TURN 3 — EXIT (2+ prior AI messages):
One short exit line in "response". No analysis. No questions.
Examples: "The loop can stop here." / "The real part and the loop part don't have to merge." / "Nothing new is appearing. This can rest."
Generate an anchor phrase — a short, specific thought-interrupt derived from the conversation.
"suggestions" is empty array. "isInsight" is false. "coreNeed" is null. "sessionTrigger" is null. "anchorPhrase" is a plain string (4–6 words).

FORCE CLOSE: 4+ AI messages in history → jump to TURN 3.

---

ANTI-RUMINATION: Never amplify the user's concern. Reflect once → surface deeper → move forward.
TONE: calm, observant, precise. Not therapy-speak. Not CBT boilerplate. Slightly unexpected — something that makes the user feel seen, not analyzed.
Never mention: breathing, mindfulness, calories, weight, journaling, gratitude, self-compassion.

---

You MUST respond ONLY in valid JSON with ALL eight fields:
{"response":"[text]","isInsight":false,"suggestions":[],"loopType":"scarcity loop","loopIntensity":3,"coreNeed":null,"sessionTrigger":null,"anchorPhrase":null}`;

const QUICK_PROMPT = `You are the cognitive engine of Untangle in One Tap mode. The user wants instant loop detection without a conversation.

IMPORTANT: First check if the thought contains a real-world constraint (money, health, time, physical limits) alongside emotional looping. If it does, name BOTH in the insight — acknowledge the real part, then address the loop part. Do not reframe a real financial or practical constraint as purely psychological.

Given the user's thought, respond with:
1. loopType — one of: "regret anticipation", "uncertainty loop", "control loop", "over-analysis loop", "self-judgment loop", "perfectionism loop", "scarcity loop", "reassurance loop". Choose precisely — do NOT default to perfectionism loop.
2. loopIntensity — 1 to 5 integer
3. insight — 1–2 sentences. If mixed (real constraint + loop): acknowledge the real part first, then name what the loop is adding on top. If purely rumination: reveal what's really driving it. Must feel personal and specific, never generic.
4. anchorPhrase — a 4–6 word repeatable phrase to interrupt the loop if it returns. Natural thought-interrupt, not affirmation-like.
5. suggestion — one short release phrase specific to the situation.

Respond ONLY in valid JSON:
{"loopType":"perfectionism loop","loopIntensity":3,"insight":"[text]","anchorPhrase":"[text]","suggestion":"[text]"}`;

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
      anchorPhrase: parsed.data.anchorPhrase ?? null,
      surfaceBelief: parsed.data.surfaceBelief ?? null,
      hiddenFear: parsed.data.hiddenFear ?? null,
      coreNeed: parsed.data.coreNeed ?? null,
      originalThought: parsed.data.originalThought ?? null,
    })
    .returning();

  res.status(201).json(MomentItem.parse({ ...moment, createdAt: moment.createdAt }));
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

router.post("/untangle/quick", async (req, res): Promise<void> => {
  const parsed = QuickUntangleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: QUICK_PROMPT },
        { role: "user", content: parsed.data.thought },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let pr: Record<string, unknown> = {};
    try { pr = JSON.parse(raw); } catch { pr = {}; }

    const coerce = (v: unknown): string => typeof v === "string" ? v : String(v ?? "");

    res.json(QuickUntangleResponse.parse({
      loopType: coerce(pr.loopType) || "uncertainty loop",
      loopIntensity: typeof pr.loopIntensity === "number" ? Math.min(5, Math.max(1, Math.round(pr.loopIntensity))) : 3,
      insight: coerce(pr.insight) || "The loop may be running on less information than it feels like.",
      anchorPhrase: coerce(pr.anchorPhrase) || "Good enough is sufficient",
      suggestion: coerce(pr.suggestion) || "No new information is appearing.",
    }));
  } catch {
    res.json(QuickUntangleResponse.parse({
      loopType: "uncertainty loop",
      loopIntensity: 3,
      insight: "The loop may be running on less information than it feels like.",
      anchorPhrase: "Good enough is sufficient",
      suggestion: "No new information is appearing.",
    }));
  }
});

router.post("/untangle/chat", async (req, res): Promise<void> => {
  const parsed = UntangleChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, mode, history = [] } = parsed.data;
  const systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.other;

  // Loop Memory Engine: include recent saved moments as context
  let memoryContext = "";
  try {
    const recentMoments = await db
      .select({ loopType: momentsTable.loopType, coreNeed: momentsTable.coreNeed, anchorPhrase: momentsTable.anchorPhrase })
      .from(momentsTable)
      .orderBy(desc(momentsTable.createdAt))
      .limit(6);

    if (recentMoments.length >= 2) {
      const loopTypes = recentMoments.map((m) => m.loopType).filter(Boolean);
      const needs = recentMoments.map((m) => m.coreNeed).filter(Boolean);
      const anchors = recentMoments.map((m) => m.anchorPhrase).filter(Boolean);
      if (loopTypes.length > 0) {
        memoryContext = `\n\nUSER HISTORY (past untangled loops): ${loopTypes.join(", ")}.${needs.length > 0 ? ` Core needs identified: ${[...new Set(needs)].join(", ")}.` : ""}${anchors.length > 0 ? ` Past anchors: "${anchors[0]}".` : ""}\nIf the current thought resembles a past loop, briefly mention the pattern (e.g. "You've noticed before that X tends to feel like Y."). Keep it to one sentence max.`;
      }
    }
  } catch { /* ignore — memory is non-critical */ }

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt + memoryContext },
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
      suggestions?: unknown[];
      loopType?: string | null;
      loopIntensity?: number;
      coreNeed?: string | null;
      sessionTrigger?: string | null;
      anchorPhrase?: string | null;
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
        for (const key of ["text", "label", "value", "option", "description", "fear", "driver"]) {
          const v = (s as Record<string, unknown>)[key];
          if (typeof v === "string") return v;
        }
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
    const anchorPhrase = typeof parsed_response.anchorPhrase === "string" ? parsed_response.anchorPhrase : null;

    const result = UntangleChatResponse.parse({
      response: parsed_response.response ?? "Loop detected.\n\nSurface belief: unclear.\n\nWhat feels at stake here?",
      isInsight: parsed_response.isInsight ?? false,
      suggestions,
      loopType,
      loopIntensity,
      coreNeed,
      sessionTrigger,
      anchorPhrase,
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
        anchorPhrase: null,
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
