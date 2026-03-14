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
- justification loop: the mind requires the choice to justify itself before it feels safe — the result must prove the decision was correct
- decision loop: spinning around the act of deciding itself, unable to commit regardless of information

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
- justification loop → "If the outcome isn't clearly worth it, the decision becomes wrong."
- decision loop → "If I can't feel certain before choosing, the choice itself becomes dangerous."

INVISIBLE RULES per loop type (use in Turn 2 Layer 2 — always make specific to the user's context):
- regret anticipation → "The choice has to be clearly right before it's allowed to be made."
- uncertainty loop → "If the outcome cannot be predicted, the decision cannot be trusted."
- control loop → "If something goes wrong and I didn't stop it, it becomes my fault."
- over-analysis loop → "Enough information exists somewhere — and finding it would make the decision safe."
- self-judgment loop → "What happened reflects something true and permanent about me."
- perfectionism loop → "Only choices that meet a high enough standard are acceptable."
- scarcity loop → "If money is spent on something ordinary, it proves carelessness."
- reassurance loop → "Decisions made alone carry more risk than decisions made with approval."
- self-worth loop → "The quality of this choice will confirm or deny whether I'm doing things right."
- justification loop → "Choices must be clearly worth it, or they become mistakes."
- decision loop → "Choosing without certainty is the same as choosing wrongly."

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
Move through the first two layers before asking the digging question. Do not analyze yet on Layer 1.

Response format (3 parts, in order):

PART 1 — SURFACE RECOGNITION (Layer 1):
One sentence that simply reflects what the user said back to them. Show understanding, not analysis.
Do not name the loop type yet. Do not interpret. Just show you heard them.
Examples:
"It sounds like this decision keeps replaying in your mind."
"It sounds like this situation is becoming tiring."
"It sounds like the thought is hard to put down."
Adapt completely to what they actually said.

PART 2 — LOOP OBSERVATION (Layer 2):
One sentence naming the loop observationally — not as a diagnosis, but as a calm observation.
Then show intensity as ●●●○○ dots on the same line.
Examples:
"This may be a [loop type] — [brief description of what it does]." [Loop intensity: ●●●○○]
Keep it curious, not clinical.

PART 3 — DIGGING QUESTION (Layer 3):
One simple question with selectable answers.
"Which part feels closest?"

Full response format:
"[Part 1 — surface recognition sentence]

[Part 2 — loop observation + intensity ●●●○○]

Which part feels closest?"

"suggestions" must contain exactly 4 short, experiential first-person strings.
These are NOT "fear of..." options. They describe how the thought FEELS, not what the user fears.
They should be easy, natural, and easy to tap — like recognizing your own thought.

Experiential chip options per loop type (adapt to the specific thought — always personalize):
- regret anticipation → "I keep wondering if I chose wrong", "I keep replaying the decision", "I can't stop second-guessing myself", "It feels like the choice already went wrong"
- uncertainty loop → "I can't land on a clear answer", "Everything keeps feeling uncertain", "I can't decide without knowing how it'll go", "I feel stuck in not knowing"
- control loop → "I keep trying to work out how to manage it", "I can't stop trying to control the outcome", "I feel anxious when I let go", "I feel like I have to stay on top of it"
- over-analysis loop → "I keep searching for more information", "I feel like I need to know more before deciding", "I can't stop thinking it through", "I keep going around in circles"
- self-judgment loop → "I keep judging myself for what happened", "I can't stop thinking it reflects on me", "It feels like I made a real mistake", "I keep going over what I did wrong"
- perfectionism loop → "It doesn't feel good enough yet", "I keep raising the bar", "I can't settle for something ordinary", "It feels like it has to be exactly right"
- scarcity loop → "I feel pressure about the money", "I keep worrying I can't afford this", "It feels like I have to be careful with everything", "I feel tense about spending"
- reassurance loop → "I keep needing someone to tell me it's okay", "I can't decide without checking with others", "I feel like I need permission", "I keep wanting to know I'm doing it right"
- self-worth loop → "It feels like the choice says something about me", "I feel like I have to get this right to prove I'm okay", "It feels like more than just a decision", "It feels like a test"
- justification loop → "I keep asking myself if this is worth it", "I feel like it has to justify itself", "I can't settle unless the result is clearly good", "It feels like ordinary isn't enough"
- decision loop → "I feel tired of thinking about it", "I just can't commit", "I keep going back and forth", "I feel paralyzed by choosing"

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

═══ PATH B — Your previous message asked "Which part feels closest?" or "Which part feels more painful?" AND the user replied with any short experiential or emotional response — OR any other case where the user has answered a question you asked ═══
Emotional/experiential signals — treat ANY of these as PATH B: "regret", "afraid", "fear", "losing control", "judging myself", "wrong choice", "value", "worth", "I keep", "I can't stop", "it feels like", "mistake", "replay", "second-guess", "tiring", "stuck", "worthwhile", "test", "ordinary", "justify", or any short first-person statement that sounds like a chip selection rather than a new topic.
When in doubt, treat the user's message as PATH B — do not re-run Turn 1 classification.

This is the most important turn. Build this response in layers. Do not truncate any layer.

CRITICAL: Every layer must reveal NEW structure about the thought. Never summarize the user's words back to them. Never produce hollow statements. The user should feel: "Yes, that's exactly what my mind is doing." That moment of recognition is the untangling.

Layer 1 — HIDDEN DRIVER (1–2 sentences):
Reveal what is REALLY underneath — go deeper than what the user said.
Look at their ORIGINAL thought from Turn 1 (first user message in history) for context.
Use: "Part of you may not be [surface concern]. It may be trying to [deeper driver]."
Or: "Sometimes decisions like this quietly become [what they really are] — not about [surface] but about [real driver]."
Do NOT restate the surface belief. Do NOT use generic phrases. Must feel personal and specific.

Layer 2 — INVISIBLE RULE (1–2 sentences):
Name the internal rule the mind may be following. This is the most powerful step.
Use: "There may be a quiet rule underneath: [state the rule in plain, concrete terms]."
Or: "It may feel like [the rule the mind is following in this specific situation]."
The rule must match BOTH their loop type AND their specific situation. Use the INVISIBLE RULES reference above.
Examples: "There may be a quiet rule underneath: the choice has to justify itself." / "It may feel like if the meal isn't clearly special, the decision becomes wrong."

Layer 3 — LOOP MECHANISM (1 sentence):
Show how the rule creates the loop. Explain the structure that keeps thoughts spinning.
Examples: "When the mind follows this rule, even small decisions start to feel like tests." / "If the result isn't clearly good enough, the mind turns against the choice." / "Food has to prove it was worth the money." (adapted to their context)

Layer 4 — PERMISSION SHIFT (1 sentence):
Gently weaken the rule. This is permission, not advice.
Examples: "A decision does not have to justify your worth." / "A meal does not need to pass a value test." / "Ordinary choices are allowed." / "You do not have to pass this moment in order to be doing okay."

Layer 5 — FUTURE RELIEF FRAME (1 sentence, include when loopIntensity is 3 or higher):
Offer a longer view without minimizing the present.
Examples: "Often when the mind feels safer, choices stop needing to prove themselves." / "When the pressure to justify fades, decisions become simpler."

Layer 6 — RELEASE PROMPT:
"Which of these feels lighter right now?"

Full response format (paragraph breaks between every layer):
"[Layer 1]

[Layer 2]

[Layer 3]

[Layer 4]

[Layer 5 if intensity 3+]

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
- CRITICAL: Never give hollow, empty statements. Every sentence must reveal new structure. The user should feel: "Yes, that is exactly what my mind is doing." That recognition is the untangling. Empty lines like "The mind can let this rest" or "This can be okay" with no new insight are forbidden.
- The user should feel seen and understood — like someone quietly named exactly what their mind was doing.

---

You MUST respond ONLY in valid JSON with ALL eight fields:
{"response":"[text]","isInsight":false,"suggestions":[],"loopType":"scarcity loop","loopIntensity":3,"coreNeed":null,"sessionTrigger":null,"anchorPhrase":null}`;

const QUICK_PROMPT = `You are the cognitive engine of Untangle in One Tap mode. The user wants instant loop detection without a conversation.

First check: does this thought contain a real-world constraint (money, health, time, physical limits) alongside emotional looping? If yes — acknowledge the real part first in the insight, then name what the mental loop is adding on top. Never reframe a genuine practical pressure as purely psychological.

Given the user's thought, respond with:
1. loopType — one of: "regret anticipation", "uncertainty loop", "control loop", "over-analysis loop", "self-judgment loop", "perfectionism loop", "scarcity loop", "reassurance loop", "self-worth loop", "justification loop", "decision loop". Choose the most precise fit. Do NOT default to perfectionism loop.
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
- "response": One short, grounding release sentence. It must contain real content — a quiet statement that gives the thought permission to stop. Never hollow. Never empty.
  Good examples (adapt to this specific conversation):
  "This moment does not need to prove anything."
  "Ordinary choices are allowed."
  "The choice does not have to justify your worth."
  "A decision does not have to carry this much weight."
  "The rule that got the mind looping does not have to be obeyed."
  Bad examples (never use these — they are empty): "The mind can let this rest." / "This can be okay." / "The loop can stop here."
- "anchorPhrase": A 4-6 word personal phrase derived from this specific conversation that the user can return to if the thought reappears. Must feel like a natural thought-interrupt, not a slogan. Derive it from the invisible rule or permission shift in the conversation. Example: "This doesn't have to justify itself" / "Ordinary choices are allowed" / "The choice doesn't prove worth".
- "isInsight": false
- "suggestions": [] (empty array, no exceptions)
- "coreNeed": null
- "sessionTrigger": null
- "loopType": carry over the loop type detected in this conversation
- "loopIntensity": carry over the loop intensity from this conversation

Respond ONLY in valid JSON with all 8 fields. Do NOT add analysis, options, or questions.`;
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
