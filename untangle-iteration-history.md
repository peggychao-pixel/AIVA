# Untangle — Product Iteration History
*Reconstructed from git commit log and raw session prompts, chronological order*
*Mar 11 – Apr 3, 2026*

---

## Phase 1 — Foundation and First Rejection (Mar 11–12, first 90 minutes)

### Commit: `e7d19ec` — Initial commit (Mar 11, 23:58)
The project started as a generic React + Vite + Express monorepo with no product logic. Just scaffolding.

---

### Commit: `3ff856d` — "Add a tool to help users interrupt rumination after meals" (Mar 12, 00:39)

**What was built:**
First working version. A single page that let users type a rumination thought, receive an AI response (GPT-4o-mini), and run a timer. The database schema had `rumination_thought`, `ai_response`, `timer_completed`.

**Product problem being solved:**
After-meal mental replay. The assumption was: user eats, feels bad, loops. The app provides an exit.

**What it was:**
A single-turn interaction. You type → AI responds once → you use a timer → done.

---

### Commit: `8436086` — "Revamp the app to function as a cognitive interruption system" (Mar 12, 00:50)

**What changed:**
Eleven minutes after the first version was published, it was already being torn down. The UI was redesigned with a "mission-control aesthetic." Therapeutic language was explicitly removed. New micro-activities (a reaction game, anti-loop messages) replaced the soft, journaling-style interface. The DopamineRedirect component was deleted.

**Product decision:**
> *Replaced therapeutic language with sharp, concise copy.*

The first major positioning decision: this is not a wellness app. It is an interruption tool. Something more like a circuit breaker than a meditation guide.

**What was rejected:**
The soft, wellness-app framing. The idea that the user needs emotional warmth first. The initial version was too gentle and too passive.

---

## Phase 2 — Core Product Philosophy Established (Mar 12, daytime)

### Pasted prompt: "427" — "Update my app Untangle into a deeper AI reflection tool"

This is the first full product brief. Written by the user, pasted in as an instruction block. This is the document that defined most of what Untangle became.

**The explicit shift:**
> Untangle is NOT a therapy chatbot.
> It is a thinking partner that helps users notice mental loops and untangle their thoughts.

**Two user moments defined:**
1. Before meals — overplanning, trying to optimize, worrying about eating "correctly"
2. After meals — replaying, evaluating, rumination loops

**The three-input system:**
Every screen must support suggestion buttons, text typing, and voice. This was a firm UX constraint.

**Before meal mode goal:** Reduce overplanning.
**After meal mode goal:** Detect rumination.

**Conversation style rules, first version:**
- Ask thoughtful questions
- Avoid repeating user input
- Introduce new perspectives
- Be calm and concise
- Banned phrases: "I'm here to listen," "That must be difficult"
- Max response length: 1 sentence, except for insight moments

**Insight moment format established:**
> ✨ Untangle Moment
> "The pressure may not be the meal itself — but the need to get it exactly right."

**Product mission stated:**
> Untangle helps users notice and loosen the mental loops that keep them stuck.

---

### Commit: `66dd34f` — "Update conversational engine to manage user rumination loops effectively" (Mar 12, 17:44)

**What changed:**
The AI engine was replaced with a 4-step process: **Catch → Compress → Exits → Close**.

**What was added alongside this:**
Two text files were saved as attached assets — a full system spec and the loop detection layer. These are the raw thinking documents from which the engine was built.

---

### Pasted prompt: "382" — "ADDITIONAL ENGINE LAYER — LOOP DETECTION"

This is the first detailed specification of the loop detection system. Written immediately after the 4-step structure was established.

**Loop types defined (first version):**
- decision loop
- perfection loop
- guilt loop
- replay loop
- uncertainty loop
- control loop

**The Conversation Governor — key rules:**
> If question_count >= 2 → Stop asking deeper questions.
> If loop_turns >= 3 → Force compression and resolution.
> Never continue asking deeper "why" questions beyond two levels.

**Why this rule existed:**
> Rumination worsens when the system keeps digging. Your job is to stop digging and start resolving.

**Resolution paths defined:**
- LOWER THE STANDARD
- DELAY THE DECISION
- LIMIT THE REPLAY
- SEPARATE EMOTION FROM FACT
- MAKE A SMALL NEXT STEP

**Loop meter introduced:**
Internal intensity scale 1–5. Displayed to user when useful.
> Loop intensity: ●●●●○

**Anti-rumination rule:**
> Never mirror rumination language excessively. Reflect → compress → move forward.

**Product mindset restated:**
> Untangle is a tool. Not a therapist. Not a coach. Not a journaling partner.
> The goal is not to explore the user's mind endlessly. The goal is to restore mental movement.

---

### Commit: `df51c73` — "Improve loop detection and resolution by adding intensity and type tracking" (Mar 12, 17:50)

The loop meter and loop type taxonomy were implemented in the engine.

---

## Phase 3 — Emotional Depth and the First Persona Attempts (Mar 12–14)

### Commits: `af46160`, `779c43d`, `a392412` (Mar 12, evening)

The conversation started going deeper. Emotional drivers were added as a selectable layer. The AI was asked to uncover why a loop was happening, not just that it was happening.

**Commit `779c43d`:** "Improve conversation depth to uncover emotional drivers"
**Commit `a392412`:** "Add selectable emotional drivers to deepen self-understanding"

The product was adding psychological depth: rather than just identifying "this is a guilt loop," the system was asked to identify what fear or belief was underneath it.

---

### Commit: `a5637e2` — "Update system specification document with detailed interaction flows" (Mar 12, 22:37)

A full system spec was written and saved as a text document. This was the first attempt to write down the entire interaction architecture in one place.

**Core conversation structure defined:**
`Thought → Loop Detection → Surface Belief → Hidden Fear → Core Need → Insight → Release → Anchor Phrase → Saved Insight`

**Key rule:**
> The system may move deeper into understanding but must always end with release rather than continued analysis.

---

### Commit: `cef3aa1` — "Add anchor phrases and detailed insights to saved moments" (Mar 12, 22:49)

Saved moments now stored anchor phrases — short, repeatable sentences the user could take with them after a session. This was the first version of the "stop line" concept.

---

### Commit: `e7c2979` — "Add a self-worth loop and refine the engine's prompt structure" (Mar 14, 05:30)

**New loop type added:**
The self-worth loop — the belief that a food choice says something about the person's value or identity. This was the beginning of the product moving beyond "I can't decide what to eat" into "I'm afraid of what my choices reveal about me."

---

## Phase 4 — Rapid Loop Expansion and Tone Failures (Mar 14, 22:00–23:30)

Five commits in 90 minutes:

- `37aa5ef` — New loops and refined response structures
- `2a5bddf` — More empathetic, more insightful tone
- `9a858b1` — Deeper emotional insights
- `bc1fe85` — New loop classifications
- `00c0efa` — Unmet needs and reward mismatches detected
- `ef4bd71` — Language mirroring and tonal refinement
- `667290e` — **Critical: "Improve insight generation to avoid premature psychological interpretations"**

**What was being rejected in `667290e`:**
The engine was over-interpreting. It was jumping to deep psychological conclusions too fast, before the user had given enough signal. The fix: require more evidence before naming hidden fears. Avoid generic psychological frames when the user has only said something simple.

**Commit `27be370`:** "Improve AI's ability to provide grounded and relevant responses" — further correction of the same failure. The AI was giving responses that were technically deep but not actually accurate to what the user had said.

---

## Phase 5 — The Protective Friend Persona (Mar 15)

### Commits: `205edfd`, `86c2c0d`, `bd3f617`, `45c8f04` (Mar 15, 04:39–05:36)

**`205edfd`:** A new rule: the AI must not repeat back what the user just said. Mirroring was making responses feel hollow.

**`86c2c0d`:** Physical needs mode added. When the user is simply hungry and has unmet physical needs (not a psychological loop), the engine must recognize this and not project emotional complexity onto it.

**`bd3f617`:** Interface update — calmer, quieter. Less cognitive load in the visual design.

**`45c8f04`:** The major persona shift.

### The "PROTECTIVE PRECISE STOP" Engine — Pasted prompt

This is one of the most important documents in the project. A complete rewrite of the engine's personality and voice.

**Persona defined:**
> Untangle should feel like a very emotionally intelligent, protective, grounded, sharp friend who understands the user quickly, says the most accurate thing directly, and helps stop the rumination loop.

**What the tone is:**
> Steady. Emotionally perceptive. Slightly protective. Clean and direct. Never preachy. Never overly soft. Never robotic. Never generic. Never like a therapist. Never like a self-help quote account.

**What the user should feel, stated in Traditional Chinese:**
> "靠，你怎麼這麼懂。" (How do you know this so well.)
> "對，就是這個。" (Yes, that's exactly it.)
> "好，我可以停在這裡。" (OK, I can stop here.)

**The 4-beat response structure:**
1. **HIT** — First sentence nails the tension. Creates: "wow, you got it."
2. **PATTERN** — Second sentence reveals the underlying pattern. Creates: "oh, this is the thing that keeps happening."
3. **VALIDATION** — Third sentence confirms why the user feels stuck. Creates: "yes, that's exactly why this is hard."
4. **ANCHOR LINE** — Fourth sentence is the stopping line. Short, strong, repeatable.

**Length rule:**
> Prefer 3–4 short sentences. Do not exceed 4 sentences. No bullet points in user-facing responses.

**What was explicitly banned:**
- 你值得被愛 (You deserve to be loved)
- 你很棒 (You're great)
- 沒關係慢慢來 (It's OK, take your time)
- 深呼吸 (Take a deep breath)
- 放輕鬆 (Relax)

> Unless the situation truly calls for it.

---

## Phase 6 — More Loops, Stop Line Corrections (Mar 15, afternoon)

- `9dfbe3e` — FOMO loop: fear of missing out on a better option
- `6d76101` — Replay loop: replaying an unsatisfying eating experience
- `8d561f8` — Response structure and voice guidelines updated
- `2425d0a` — Session flow simplified; closure actions added
- `39a7dcb` — Sentence library added as inspiration for AI responses

---

### Calorie loop and mental load loops (Mar 15–16)

Multiple new loop types were added during this period:
- Calorie / portion calculation loop
- Mental load / over-control loop
- Satiety reconnection module

The product was expanding its taxonomy of recognized mental states.

---

## Phase 7 — System Update and UI Language Redesign (late Mar)

### Pasted prompt: "UNTANGLE SYSTEM UPDATE" — Untangle is not a therapy chatbot

This was a reset prompt sent to re-anchor the engine after drift:

**Core output format reinstated:**
> "You're not [surface problem]. You're [deeper loop / hidden belief]."
> OR
> "This isn't about [surface]. It's about [hidden loop]."

**New loop classifier (cleaner version):**
1. SAFETY LOOP — "If I'm not safe, I cannot relax"
2. BURDEN LOOP — "If I cost others, I become a burden"
3. WORTHINESS LOOP — "I must earn the right to enjoy things"
4. WRONG CHOICE LOOP — "If I choose wrong, something is wrong with me"
5. REGRET LOOP
6. CONTROL LOOP
7. COMPARISON LOOP

**Restraint rule:**
> Maximum insight length: 2 sentences. No explanations after the insight. No coping advice. No filler.

---

### Commits: `e296489`, `ab74558` — Homepage IA redesign

The homepage was restructured. The single entry point was split into Before eating / After eating / My mind is looping, with language options and sub-options.

---

### Pasted prompt: "UNTANGLE PRODUCT + AI SYSTEM FINAL SPEC"

The most complete system specification. Synthesized everything established so far.

Key rule added:
> **Untangle should reduce thinking, not create another decision.**

> The key moment is: The user suddenly sees the hidden belief behind the loop.

> The homepage should NOT use a single flat list of mixed categories.

The product was being distinguished from both therapy apps (too slow, too exploratory) and productivity apps (too task-oriented). It was positioned as a recognition tool — the value is in the moment of "oh, that's what this is."

---

## Phase 8 — Critical Bug Fixes: What the AI Was Getting Wrong (late Mar)

This is the period when the engine was being tested against real use and specific failure modes were being caught and corrected.

### "CRITICAL STOP-LINE FIX — NEVER ECHO THE LOOP AS THE STOP LINE"

**The failure:**
User says: "I'm worried I'll regret it."
System generates stop line: "這樣做會不會讓我後悔？" (Will this make me regret it?)

> This is a total failure. That sentence is not a stop line. That sentence is the loop itself.

**Hard rule established:**
> A stop line must never be: the user's original fear, the user's original question, or a restated version of the user's looping sentence.

**Quality test added:**
> Before showing a stop line, ask: Does this sentence (A) close the loop a little, or (B) reopen the exact same loop? If B, reject it immediately.

---

### "CRITICAL TONE SAFETY FIX — NEVER SOUND SARCASTIC, SMART-ALECK, SCOLDING, OR CHALLENGING"

**The failure:**
System generated: 「花了錢還不滿足，本來就會煩。」
(You spent money and you're still not satisfied, of course you'd be annoyed.)

> This is unacceptable. It feels dismissive. Provocative. Emotionally careless. Almost sarcastic. Like the app is explaining the user to themselves in a cold way.

**Hard ban established:**
> Never generate lines that sound like: "Well of course that would happen," "本來就會…," "當然會…," "所以才會這樣啊." The app must never sound like it is winning an argument.

---

### "CRITICAL FIX — DO NOT TURN REALITY INTO A STOP LINE"

**The failure:**
System detected a real external constraint (fixed budget) and generated as a stop line: 「我真的有現實限制，不能不承認。」(I really do have real limitations, I have to admit it.)

> This is not helpful. It only repeats the burden.

**New rule:**
> A stop line must reduce loop pressure, not restate it. Stop lines for real-constraint scenarios should help the user hold reality more gently, not force acceptance.

---

### "EXTERNAL CONSTRAINT BUG FIX — DO NOT MISLABEL REAL LIMITS AS INTERNAL CALCULATION"

**The failure:**
When a user described a real, external budget constraint ("My dad only gives me 50 a day"), the system was treating it as abstract money anxiety and telling the user not to overthink resources.

> That invalidates the user's reality.

**New subtype added:**
REAL CONSTRAINT + CAN'T ASK LOOP — the user has a genuine external limit and also cannot speak honestly about what they need.

---

## Phase 9 — The Big Reframe: Anticipatory Panic (Mar 29–31)

### Pasted prompt: "IMPORTANT PRODUCT INSIGHT UPDATE — SHIFT FROM POST-MEAL RUMINATION TO ANTICIPATORY PANIC"

This was the most significant product reframe in the project. It changed the primary problem being solved.

**Old framing:**
> The app helps users after eating, when rumination starts.

**New framing:**
> The core problem often begins earlier — as anticipatory panic.
> The user becomes distressed as soon as she senses that the day may not end with emotional closure.

**The full distress arc described:**
1. The user predicts tonight may not end well
2. Anticipatory panic starts
3. Search / vigilance / planning / mental preoccupation take over
4. The eating process itself becomes tense
5. If the night still doesn't end with closure, the user stays mentally "hung" and may struggle to sleep

**The food-as-completion-object insight:**
> The food item (often dessert, cake, or some final treat) is not just food. It often functions as a completion object, a landing signal, an ending marker, proof that the day can close safely.

**Product timing implication:**
> The most important intervention moment may not be the collapse phase. It may be the anticipatory phase.

**What was rejected:**
The assumption that the product was primarily a post-meal tool.

---

### Pasted prompt: "IMPORTANT PRODUCT INSIGHT — MAXIMIZER MODE AS SAFETY-SEEKING, NOT JUST PREFERENCE"

**The insight:**
> This user is not just a generic maximizer. She often links "the best option" to emotional safety, closure, enoughness, preventing regret, preventing painful rumination later.

**Old interpretation:**
The user is perfectionistic or picky.

**New interpretation:**
> The user may stay in search mode because "good enough" does not feel emotionally safe enough. Maximizing is not just a preference style. It can function as a safety-seeking strategy.

**What was rejected:**
Treating this as perfectionism, greed, or craving the best thing.

---

### Pasted prompt: "IMPORTANT USER INSIGHT — LONELINESS IS NOT JUST NO ONE AROUND"

**The insight:**
> The user's loneliness is not ordinary loneliness. It is not simply "having no one to hang out with."
> A more accurate description is: The user lacks a stable other who helps her settle, come down, close the day, hold the emotional drop.

**Implication:**
The food, the dessert, the specific meal — these are sometimes functioning as a substitute stable other. The product is dealing with what happens when that substitute doesn't work.

**Guardrail stated:**
> Do not let this turn the product into a general loneliness app. This is still a lightweight, moment-based tool for eating-related loops, nighttime search, unfinished endings.

---

## Phase 10 — Core User Model Deep Revision (Mar 31–Apr 1)

### Commit `6a9f7a0` — "Update user model and response logic to reflect nuanced user needs" (Mar 31)

This commit integrated the most important rewrite of the core user model.

### Pasted prompt: "Please update Untangle's core user model and response logic"

**The explicit correction about who this user is:**
> The user is NOT a stereotypical restrictive-anorexia or "wants to be as skinny as possible" profile. She may genuinely love food, sweets, beautiful meals, rich flavors, and emotionally meaningful eating experiences. Her problem is often not "I want to eat less." Her problem is more like: fear of losing control once she starts. Fear of not being able to stop or land the ending safely.

> She is often not primarily calculating calories. She is calculating risk.

> Many of her protective behaviors come from past binge / loss-of-control experiences, not from vanity or simple dieting.

**Four internal states the product must recognize:**
1. Anticipatory panic
2. In-the-moment conflict / tug-of-war
3. Inability to end / unsafe landing
4. Post-eating rumination / guilt spiral

**What the assistant must prioritize:**
- Lowering catastrophe
- Lowering loss-of-control feelings
- Helping the user feel less alone in the moment
- Helping the user land the ending safely
- Reducing shame

**What the assistant must NOT do:**
- Assume the user's main goal is thinness
- Overfocus on calories, weight, macros, discipline, or restriction
- Sound like a diet app or nutrition coach
- Treat the user as simply lacking willpower

---

### "GUILT ROUTING FIX — DISTINGUISH RESOURCE GUILT FROM IDENTITY GUILT"

**The failure being corrected:**
The system was treating all guilt as identity guilt — "something is wrong with me as a person." But many guilt moments are specifically about money, spending, or relational burden, not self-worth.

**New split:**
- **Identity guilt** — I crossed a moral line, I am imperfect
- **Resource guilt** — I spent too much, I used resources badly
- **Relational guilt** — I feel bad because of what others gave up for me
- **Appetite / eating guilt** — I ate too much, I overdid it

These must route to different responses.

---

### "COMFORT DESIGN RULE — HOW TO RESPOND EFFECTIVELY TO FOOD-SPENDING GUILT"

**The first move for spending guilt:**
> Separate "this feels heavy" from "I did something wrong." This distinction is key.

**What not to do:**
- Your worth is not defined by material things
- Being imperfect doesn't mean you're wrong
- This is really about your self-worth

> These are too abstract, too fast, and often misread the actual moment.

---

### Pasted prompts: "Please add this psychological insight to Untangle's user model" (series, Mar 31–Apr 3)

A series of standalone insight prompts, each adding a specific psychological concept to the engine:

**Craving strong, rich, high-intensity foods:**
> Sometimes she wants something salty, heavy, rich, warm, or high-impact because she needs immediate sensory and emotional landing. But these foods may also trigger internal conflict — "I want this" / "I shouldn't eat this." The shame may come from not wanting others to witness the inner struggle attached to it.

**Body-memory fear — aftermath from prior experiences:**
> Some food anxiety comes from real aftermath memory. The user may be responding not only to craving or shame, but to a remembered physical consequence. "I'm scared of what happened last time happening again."
> This must be distinguished from: fear based on restriction / body image.

**High-trigger, low-holding foods:**
> Sometimes the user is hungry but still does not want to "risk" a certain food. Not because she wants to restrict, but because the food feels emotionally risky — easy to enter, hard to stop, poor at creating safety or real fullness.
> The core internal question: "Will this actually hold me?"

**Food coherence / whole-ness anxiety:**
> Sometimes what distresses the user is not what she ate, but the fact that it doesn't feel like a coherent, recognizable whole. If the food doesn't look like "a real snack" or "a proper meal," she may feel agitated or dysregulated afterward.

---

### Commit `6ca2d09` — "Add a new theme for users questioning their right to eat" (Apr 1)

**New insight added:**
Some users feel they have not "earned" the right to eat — not because of dieting rules, but because of shame, resource guilt, or a belief that need itself is not legitimate.

---

## Phase 11 — Worth-It Food as Emotional Anchoring (Apr 3)

### Pasted prompt: "Please add this psychological insight" — emotional-value anchoring

**The insight:**
> Sometimes the user is not only looking for flavor. She is looking for something that makes the moment feel worth something. That makes her feel less low. That rescues the day from feeling cheap or wasted.

> What looks like "wanting high-end food" may actually be an attempt to secure: comfort, dignity, emotional justification, a sense of being worth care, a reason the day did not feel like meaningless depletion.

**Distinction established:**
1. Simple craving
2. Sensory desire
3. Emotional-value anchoring through "worth-it" food

**Product behavior required:**
> Do not moralize this. Do not make it sound like the user is shallow or indulgent. Stay psychologically precise.

**Commit `9f64531`:** This insight was integrated into 6 locations in the engine prompt.

---

### Commit `befec32` — "Distinguish between emotional and physical unsettledness for user responses" (Apr 3)

**The safety problem being fixed:**
The engine was using the same "closure / acceptance" language for two completely different user states:

**Type 1 — Emotional loop:**
The unsettled feeling is a rumination pattern. Insight + stop lines are appropriate.

**Type 2 — Physical incompletion:**
The user's body is genuinely not done. They are physically hungry or physically uncomfortable. Closure language in this case is dangerous — it tells a physically hungry person to accept that they don't need more.

**Safety rules added:**
- PHYSICAL NEED GATE: Before generating closure language, check whether physical need is actually present
- GLOBAL SAFETY RULE: Closure / acceptance language is prohibited when physical need is detected
- BODY-NOT-DONE LOOP handler explicitly separated from emotional closure flows

---

## Phase 12 — iOS Build (Apr 2–3)

Approximately 15 commits over 24 hours, all focused on getting the iOS app to build and run without crashing:

- `4be54ea` — EAS / App Store configuration added
- `e09472c` — App Store submission prep
- `5b1c6be` — Restored web app after React Native import errors broke it
- `389a162` — Fixed immediate crashes on TestFlight launch
- `632c4b3` — Removed unused native packages that were causing startup crashes
- `686c7fd` — Downgraded `react-native-reanimated` from 4.x to 3.x, disabled New Architecture

**Root cause of the crash:**
`react-native-worklets 0.5.1` and Reanimated 4.x required the New Architecture JSI C++ runtime, which was not stable on Expo SDK 54 + React Native 0.81. Downgrading to Reanimated 3.x (Old Architecture) resolved it.

**Build 7 submitted to TestFlight.**

---

## What Was Consistently Rejected Throughout

Across every phase, the same things were explicitly corrected when the engine drifted toward them:

- **Generic therapy language** — "I'm here to listen," "that must be difficult," "you deserve to be loved"
- **Mirroring the loop back as insight** — restating what the user said as if it were a revelation
- **Echoing the loop as the stop line** — using the user's fear as the stopping sentence
- **Premature depth** — jumping to deep psychological conclusions without sufficient signal from the user
- **Scolding or verdict-like tone** — "本來就會…" / "of course that would happen"
- **Treating all users as restricting/dieting** — the user is not trying to eat less, she is trying not to spiral
- **Closure language for physical needs** — telling a hungry person they don't need more
- **Turning real external constraints into internal anxieties** — invalidating genuine limits by reframing them as overthinking
- **Generic wellness advice** — "just breathe," "take it slow," "it's OK"
- **Over-long responses** — the 4-sentence rule was re-enforced many times

---

## What Was Consistently Added Throughout

The things that were layered in and never removed:

- The stop line (anchor phrase) — short, repeatable, takes with you
- Bilingual output (Traditional Chinese + English) — never Simplified Chinese, never sounding translated
- The 4-beat structure: Hit → Pattern → Validation → Anchor
- The conversation governor: stop probing after 2 questions
- The distinction between internal loops and real external conditions
- The recognition that food carries emotional weight beyond nutrition
- The recognition that this user loves food — the problem is not the food

---

*Document compiled from 120+ git commits, 40+ raw prompt files saved as attached assets, Apr 3, 2026.*
