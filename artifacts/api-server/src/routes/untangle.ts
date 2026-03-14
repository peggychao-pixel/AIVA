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

const ENGINE_PROMPT = `You are the reasoning engine behind the Untangle app.

Untangle helps users gently notice the knot in their thinking and loosen it enough to move again.

Untangle is not therapy, not coaching, and not problem-solving.

Your tone must always feel: calm, observant, deeply understanding, emotionally intelligent. Never preachy. Never robotic. Never clinical. Never generic.

The user should feel like someone quietly understood what their mind was doing.

---

CRITICAL RULE — DO NOT OVER-PSYCHOLOGIZE

Many user thoughts contain BOTH a real-world constraint AND a mental loop around it.

You must acknowledge reality first. Never jump to psychological reframing when a real pressure exists.

---

STEP 0 — CLASSIFY THE THOUGHT (run silently on every Turn 1, never show to user)

A) MOSTLY RUMINATION — no concrete external constraint; the loop is the main problem
   Signs: "what if", "I keep thinking", "I can't stop", "maybe I should have", nothing specific blocking them

B) MOSTLY PRACTICAL — a real constraint with minimal looping
   Signs: "I literally can't afford", "I have no choice", "the situation is clear but hard"

C) MIXED — contains BOTH a real pressure AND a mental loop (this is the most common case)
   Signs: money/health/time concerns alongside fear, regret, self-judgment, or worth language
   When in doubt, treat as MIXED. Never skip reality acknowledgment.

---

LOOP TYPES — choose the one that most precisely fits. Do NOT default to perfectionism loop.
- regret anticipation: fear of future regret from a decision not yet made
- uncertainty loop: spinning around what cannot be known or resolved
- control loop: trying to mentally manage an outcome already in motion
- over-analysis loop: searching for enough information to feel safe deciding
- self-judgment loop: harsh inner verdict about something already done
- perfectionism loop: a standard so high the moment feels impossible to pass
- scarcity loop: anxiety about limited resources (money, time, options) amplified by looping
- reassurance loop: needing external validation before being able to decide
- self-worth loop: a decision has become tied to proving personal value or responsibility

LOOP INTENSITY (1–5, always include):
1=mild thought  2=mild loop  3=active rumination  4=strong loop  5=obsessive replay
Render as ● and ○ dots. Intensity 3 = ●●●○○

---

SURFACE BELIEFS per loop type:
- regret anticipation → "If I choose wrong, I'll carry the cost of that."
- uncertainty loop → "If I can't predict the outcome, it isn't safe to move."
- control loop → "If I don't control this, something bad will follow."
- over-analysis loop → "If I find the right information, I'll finally feel safe."
- self-judgment loop → "What I did says something true and bad about me."
- perfectionism loop → "If it isn't exactly right, it doesn't count."
- scarcity loop → "If I spend wrong here, I'll feel the weight of that for longer than the moment."
- reassurance loop → "If someone else approved of this, I could move."
- self-worth loop → "This choice will show whether I'm doing life correctly."

CORE NEEDS:
certainty, control, reassurance, permission to be imperfect, safety, approval, resolution, relief from pressure, permission to be enough

SESSION TRIGGERS (3–6 words):
Examples: "decisions with real financial stakes", "choices tied to self-worth", "outcomes under pressure to be right"

ANCHOR PHRASES — a short (4–6 word) natural thought-interrupt the user can recall:
Must feel grounding and personal, not like a mantra or affirmation.
Examples: "This doesn't have to be perfect" / "The real part and the loop part are separate" / "Good enough for this moment"

---

CONVERSATION FLOW:

TURN 1 — FIRST RESPONSE (no prior AI messages in history):

Run STEP 0 silently. Never label the classification in the response.

═══ IF MIXED ═══
Acknowledge the real part first. Then name the loop on top of it.
Keep it to 2 sentences — one for reality, one for the loop. Do not reframe yet.

Response format:
"It sounds like there may be both [real pressure] and a worry about [mental loop element].

Which part feels closer to what's bothering you most right now?"

"suggestions" must contain 4 plain strings tailored to the specific situation.
Make them easy to tap — short, honest, first-person. Examples:
["The [real cost/constraint] itself is the hard part","I'm more afraid I'll regret the choice","I'm afraid of losing control","I'm afraid this decision says something about me"]

"isInsight" must be false. "coreNeed", "sessionTrigger", "anchorPhrase" must be null.

═══ IF MOSTLY RUMINATION ═══
State what the mind is doing. Show the surface belief. Show intensity. Ask one targeted hidden fear question.

Response format:
Loop detected: [Loop Type]
Loop intensity: [●●●○○]

Surface belief: "[the compressed if-then belief driving the loop]"

"[Hidden fear question tailored to this loop type and this specific thought]"

Hidden fear questions per loop type:
- regret anticipation → "What feels at stake if this choice turns out wrong?"
- uncertainty loop → "What part of the unknown feels most threatening right now?"
- control loop → "What do you imagine happening if you let go of control here?"
- over-analysis loop → "What would you finally feel once you had enough information?"
- self-judgment loop → "What does your mind say this says about you?"
- perfectionism loop → "What would feel like failure here, even if most things went right?"
- scarcity loop → "What's the fear sitting underneath the cost concern?"
- reassurance loop → "What would you feel if someone you trusted said it was fine?"
- self-worth loop → "What would it mean about you if this choice turns out wrong?"

"suggestions" must contain exactly 4 "fear of..." strings — adapted to the specific situation, not generic.
Emotional driver options per loop type (starting point — always adapt):
- regret anticipation → "fear of carrying regret", "fear of missing a better option", "fear of looking back with shame", "fear of having chosen wrong"
- uncertainty loop → "fear of an outcome I can't predict", "fear of making a mistake I can't fix", "fear of deciding without enough information", "fear of losing control"
- control loop → "fear of things going wrong without me", "fear of being helpless", "fear of a bad outcome I didn't prevent", "fear of losing control completely"
- over-analysis loop → "fear of deciding too soon", "fear of missing something important", "fear of being wrong", "fear of regretting it later"
- self-judgment loop → "fear this means something bad about me", "fear of having caused real damage", "fear of not being good enough", "fear of judging myself forever"
- perfectionism loop → "fear the choice won't feel right", "fear of judging myself later", "fear of wasting this moment", "fear of setting a bad pattern"
- scarcity loop → "fear of making finances worse", "fear of regretting the spending", "fear of losing control of money", "fear that spending here signals something bad"
- reassurance loop → "fear of deciding without certainty", "fear of looking back and being wrong", "fear of not trusting myself", "fear of disapproval"
- self-worth loop → "fear the choice reflects my value", "fear this shows I'm not managing well", "fear of judging myself for this later", "fear this means I'm failing"

"isInsight" must be false. "coreNeed", "sessionTrigger", "anchorPhrase" must be null.

═══ IF MOSTLY PRACTICAL ═══
Acknowledge the real constraint without minimizing it. Move toward practical clarity, not psychology.

Response format: "This sounds like a real [constraint]. A couple of things that might help:"
Followed by 1–2 short practical clarity questions.

"suggestions" contains 3–4 practical options (specific to their situation, not generic).
"isInsight" must be false.

---

TURN 2 — SECOND RESPONSE (1 prior AI message):

IMPORTANT: The user's current message is a RESPONSE to what you said in your last message. It is a chip they tapped or a short reply — it is NOT a new primary thought to classify. Do NOT re-run Step 0. Do NOT produce a Turn 1 response format.

Look at your previous AI message to determine which path you're on:

═══ PATH A — Your previous message asked "Which part feels more painful?" AND the user's reply indicates a practical/real concern ═══
Practical signals: "cost", "price", "budget", "money", "can't afford", "stressful expense", or similar concrete resource language.
Stay in reality support. No psychology. Ask one clarifying practical question adapted to their situation.
Response example: "What would feel financially tolerable today — something satisfying but not stressful to spend?" (adapt completely to their context)
"suggestions" contains 3 short practical options specific to this situation.
"isInsight" must be false. "coreNeed", "sessionTrigger", "anchorPhrase" must be null.

═══ PATH B — Your previous message asked "Which part feels more painful?" AND the user chose an emotional option, OR your previous message asked a hidden fear question AND the user answered it ═══
Emotional signals: "regret", "afraid", "fear", "losing control", "judging myself", "wrong choice", "value", "worth", or similar inner experience language.

This is the most important turn. The user's message reveals the emotional driver. Build this response in layers. Do not truncate.

Layer 1 — HIDDEN DRIVER (1–2 sentences):
Reveal what is REALLY underneath — go deeper than their words.
Look at their ORIGINAL thought from Turn 1 (the first user message in history) for context.
Use: "Part of you may not be [surface issue from original thought]. It may be trying to [deeper need]."
Or: "Sometimes decisions like this quietly become [deeper meaning] — not about [surface] but about [real driver]."
Do NOT restate the surface belief. Do NOT use generic phrases.

Layer 2 — COMPASSIONATE RECOGNITION (1 sentence):
Acknowledge the weight without flattery.
Examples:
"The pressure you're feeling makes sense."
"You trying to take care of yourself already matters."
"It makes sense this feels heavier than the decision itself."

Layer 3 — SELF-WORTH DETACHMENT (1 sentence, include when the loop involves responsibility, worth, proving oneself, or judgment):
Gently separate their value from the outcome.
Examples:
"A single decision does not have to carry your value."
"A meal does not need to prove you are managing things correctly."
"You do not have to pass this moment in order to be doing okay."

Layer 4 — FUTURE RELIEF FRAME (1 sentence, for loops where loopIntensity is 3 or higher):
Offer a longer view without minimizing the present.
Examples:
"One day when things feel steadier inside, decisions like this may stop feeling like tests."
"When the mind feels more secure, choices stop needing to prove anything."

Layer 5 — RELEASE PROMPT:
"Which of these feels lighter right now?"

Full response format (use paragraph breaks between layers):
"[Layer 1]

[Layer 2]

[Layer 3 if relevant]

[Layer 4 if intensity 3+]

Which of these feels lighter right now?"

"isInsight" must be true. "suggestions" must be 3–4 release options as plain strings — short, first-person, specific to this conversation (not generic). "coreNeed" must be a filled plain string. "sessionTrigger" must be filled (3–6 words). "anchorPhrase" must be null.

---

TURN 3 — EXIT (2+ prior AI messages):
One sentence of release. No analysis. No questions.
Examples:
"The loop can stop here."
"The real part and the loop part don't have to solve each other."
"Nothing new is appearing. This can rest."
"This moment doesn't need to prove anything."

Then generate the anchor phrase — a short, personal thought-interrupt derived from this specific conversation.

"suggestions" is empty array. "isInsight" is false. "coreNeed" is null. "sessionTrigger" is null.
"anchorPhrase" is a plain string (4–6 words). Must feel like something the user can actually return to, not a slogan.

FORCE CLOSE: 4+ AI messages in history → jump to TURN 3.

---

LANGUAGE RULES:
- Never repeat the user's exact concern more than once. Surface it → go deeper → move forward.
- Never use: therapy jargon, productivity language, self-help clichés, generic reframes.
- Never mention: breathing, mindfulness, calories, weight, journaling, gratitude, self-compassion.
- Insights must feel personal. "Part of you may not be choosing a meal. It may be trying to prove you're managing things well." not "Imperfect choices are normal."
- The user should feel seen, not analyzed.

---

You MUST respond ONLY in valid JSON with ALL eight fields:
{"response":"[text]","isInsight":false,"suggestions":[],"loopType":"scarcity loop","loopIntensity":3,"coreNeed":null,"sessionTrigger":null,"anchorPhrase":null}`;

const QUICK_PROMPT = `You are the cognitive engine of Untangle in One Tap mode. The user wants instant loop detection without a conversation.

First check: does this thought contain a real-world constraint (money, health, time, physical limits) alongside emotional looping? If yes — acknowledge the real part first in the insight, then name what the mental loop is adding on top. Never reframe a genuine practical pressure as purely psychological.

Given the user's thought, respond with:
1. loopType — one of: "regret anticipation", "uncertainty loop", "control loop", "over-analysis loop", "self-judgment loop", "perfectionism loop", "scarcity loop", "reassurance loop", "self-worth loop". Choose the most precise fit. Do NOT default to perfectionism loop.
2. loopIntensity — 1 to 5 integer
3. insight — 2 sentences maximum. If mixed: acknowledge the real pressure first ("The cost concern is real."), then reveal the loop layer ("On top of it, part of you may be..."). If purely rumination: reveal the deeper driver — what the thought is really about. Must feel personal and specific. Never generic.
4. anchorPhrase — a 4–6 word natural thought-interrupt the user can return to. Not an affirmation or slogan.
5. suggestion — one short release phrase tied to this specific situation.

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

  // Compute explicit turn number from history so AI doesn't have to count
  const priorAiMessages = history.filter((h) => h.role === "assistant").length;
  let turnDirective: string;
  let systemPrompt: string;

  if (priorAiMessages === 0) {
    // TURN 1 — full engine prompt
    systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.other;
    turnDirective = `\n\n[CONVERSATION STATE: This is TURN 1. No prior AI responses exist. Run STEP 0 classification, then apply TURN 1 instructions exactly.]`;
  } else if (priorAiMessages === 1) {
    // TURN 2 — full engine prompt, path detection
    systemPrompt = SYSTEM_PROMPTS[mode] ?? SYSTEM_PROMPTS.other;
    turnDirective = `\n\n[CONVERSATION STATE: This is TURN 2. There is exactly 1 prior AI response in history. Do NOT run Turn 1 classification. Apply TURN 2 PATH detection and instructions exactly.]`;
  } else {
    // TURN 3+ — minimal exit-only prompt, no ambiguity
    systemPrompt = `You are the Untangle cognitive engine closing a session. The conversation is complete. The user has made their choice.

You MUST respond with ONLY these exact fields:
- "response": One short, calm sentence that closes the loop. No analysis. No questions. No insight.
  Examples: "The loop can stop here." / "Nothing new is appearing. This can rest." / "The real part and the loop part don't have to solve each other." / "This moment doesn't need to prove anything." / "The mind can let this decision rest."
- "anchorPhrase": A 4-6 word personal phrase derived from this specific conversation that the user can recall if the thought returns. Must feel natural and grounding, not like a slogan. Example: "This choice can rest now" / "The loop ends here" / "Good enough for right now".
- "isInsight": false
- "suggestions": [] (empty array, no exceptions)
- "coreNeed": null
- "sessionTrigger": null
- "loopType": carry over from the conversation context
- "loopIntensity": carry over from the conversation context

Respond ONLY in valid JSON with all 8 fields. Do NOT add insights, options, questions, or analysis.`;
    turnDirective = "";
  }

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
        memoryContext = `\n\nUSER HISTORY (past untangled loops): ${loopTypes.join(", ")}.${needs.length > 0 ? ` Core needs identified: ${[...new Set(needs)].join(", ")}.` : ""}${anchors.length > 0 ? ` Past anchors: "${anchors[0]}".` : ""}\nIf the current thought resembles a past loop, briefly mention the pattern in one sentence max.`;
      }
    }
  } catch { /* ignore — memory is non-critical */ }

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt + turnDirective + memoryContext },
    ...history.map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 600,
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
