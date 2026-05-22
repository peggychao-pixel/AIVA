Untangle Issue Tracker
Testing Context
This issue tracker summarizes the main usability and testing-process issues found during the current Untangle usability testing round.
Testing round: AIVA Unit 9 Testing Analysis
Prototype: Untangle current version
Completed usability sessions: 3
Screened out / rejected participants: 2
Participant confidence: Low to medium for open-form respondents; higher-quality warm-introduction testing is planned next.
## Issue 1: Product may feel like open-ended chat

**Description:** Some users interpreted Untangle as something they could continue chatting with.

**Evidence:** One participant wanted to keep interacting / continue the conversation.

**Severity:** High  
**Frequency:** 1/3 participants, 33%  
**Original Goal:** Misaligned. Untangle is meant to create bounded interruption, not open-ended AI conversation.  
**Category:** Usability / Flow Boundary  
**Priority:** P1 Major  
**MoSCoW:** MUST

**Action Plan:**
- Remove or de-emphasize any “keep talking” CTA.
- Replace open-ended language with bounded actions:
  - Add one line
  - Do a short reset
  - Done for now
  - Reach someone

**Teach Me Debugging Notes:**
Root cause investigation found that the post-response terminal card in `SessionFlow.tsx` includes a visible “Keep talking” CTA. When selected, it sets `keepTalkingOpen = true`, which reopens the free-text chat input. This makes the flow feel like an open-ended chatbot instead of a bounded interruption tool.

**Where to look first:**
- `artifacts/untangle/src/pages/SessionFlow.tsx`
- `keepTalking` label
- `keepTalkingOpen` state
- terminal-card CTA hierarchy
- post-response input gate
- `inChatTypeHint`

**Recommended Fix Plan:**
- Remove the unbounded “Keep talking” CTA.
- Remove or simplify the `keepTalkingOpen` pathway if no longer needed.
- Keep bounded continuation paths such as “Let me add one line” and “Go a bit deeper.”
- Tighten the free-form chat hint so it does not make the product feel like a general chatbot.

**Status:** Investigation complete. No code changed yet.
Issue 2: Entry screen needs clearer onboarding
Description: Users may need a short onboarding gate before seeing voice, chips, typing, and support paths.
Evidence: One participant suggested that the entry interface should first help users understand where to begin.
Severity: Medium–High
Frequency: 1/3 participants, 33%
Original Goal: Aligned. A clearer entry point helps users choose the right level of support quickly.
Category: Missing Feature / Usability
Priority: P1 Major
MoSCoW: MUST
Action Plan:
Add a short entry gate with the prompt: “What do you need right now?”
Suggested options:
I can’t explain — let me listen first
I can name a little
I need a person
I want to type one line
Issue 3: Voice Bridge opening tone feels awkward
Description: The Voice Bridge opening language may feel too intimate or unnatural.
Evidence: “Hey baby” felt embarrassing / awkward at the start of the voice path.
Severity: Medium–High
Frequency: 1/3 participants, 33%
Original Goal: Misaligned. Voice Bridge should feel grounding and low-pressure, not overly intimate or fake.
Category: Usability / Copy
Priority: P1 Major
MoSCoW: MUST
Action Plan:
Remove overly intimate language.
Replace with calmer, lower-pressure wording:
“I’m here. You don’t have to explain yet.”
“No explaining. Just listen first.”
“You don’t have to solve this right now.”
Issue 4: Reset activity may feel like a performance task
Description: The reset activity was misunderstood as a performance or intelligence task.
Evidence: One participant thought the simple game might be testing intelligence.
Severity: Medium–High
Frequency: 1/3 participants, 33%
Original Goal: Misaligned. Reset should be a low-pressure pause, not a challenge.
Category: Usability / Copy
Priority: P1 Major
MoSCoW: MUST
Action Plan:
Add low-pressure framing above the activity:
“No score.”
“No need to finish.”
“This is just something small to hold your attention for a minute.”
Make skip / exit options visible.
Issue 5: Some wording feels unnatural
Description: Some copy felt awkward or not human enough.
Evidence: Multiple comments pointed to wording that did not feel fully natural.
Severity: Medium
Frequency: Estimated 2/3 participants, 67%
Original Goal: Misaligned. Untangle depends on emotionally precise, trustworthy language.
Category: Usability / Copy
Priority: P1 Major
MoSCoW: SHOULD
Action Plan:
Run a copy pass on:
Entry gate
Voice Bridge
Reset page
One-line correction
Trusted-person message
Prioritize clarity, low pressure, and emotional naturalness.
Issue 6: Outside resources feel secondary
Description: Outside resources under the real-person path felt less central and somewhat decorative.
Evidence: Resources did not feel like the main user path compared with trusted-person support.
Severity: Low–Medium
Frequency: 1/3 participants, 33%
Original Goal: Partially aligned. Resources are useful as safety fallback, but should not distract from the main flow.
Category: Enhancement / UI Hierarchy
Priority: P2 Minor
MoSCoW: COULD
Action Plan:
Keep crisis resources available.
Collapse or visually lower outside resource links.
Emphasize trusted-person and professional-support paths first.
Issue 7: Open-form recruitment produced low-confidence data
Description: Open-form respondents showed repeated phrasing patterns, unclear motivation, and limited product-specific feedback.
Evidence: Several respondents used very similar language and appeared more incentive-driven than product-focused.
Severity: High for research quality, not a product blocker
Frequency: Most open-form respondents
Original Goal: Misaligned with the goal of getting high-quality usability feedback.
Category: Research Process / Recruitment
Priority: Research P1
MoSCoW: MUST
Action Plan:
Mark open-form participants as low-confidence.
Use their sessions only for basic flow and friction observations.
Do not use these sessions as strong validation or testimonials.
Prioritize:
Warm introductions
Advisor referrals
Professional reviewers
Screened participants
Next Iteration Summary
The next iteration should focus on boundary, entry clarity, and copy rather than adding new features.
Highest-priority changes:
Remove open-ended chat cues.
Add a short onboarding gate.
Rewrite the Voice Bridge opening.
Clarify that reset activities are low-pressure and not scored.
Lower the visual priority of outside resources.
Improve recruitment screening before the next testing round.
