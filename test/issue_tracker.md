# Untangle Issue Tracker

## Testing Context

**Testing round:** AIVA Unit 9 Testing Analysis

**Prototype:** Untangle current version

**Completed usability sessions:** 3

**Screened out / rejected participants:** 2

**Participant confidence:** Low to medium for open-form respondents; higher-quality warm-introduction testing is planned next.

**Summary:** This issue tracker summarizes the main usability and testing-process issues found during the current Untangle usability testing round.

---

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

**Teach Me Debugging Output:**

**Root cause investigation:** The issue comes from the post-response terminal card in `SessionFlow.tsx`. The card includes a visible “Keep talking” CTA. When selected, it sets `keepTalkingOpen = true`, which reopens the free-text chat input. This turns a bounded terminal state back into an open-ended chat surface.

**Most likely root causes:**
1. The “Keep talking” CTA is visible after the response, which signals that continued conversation is expected.
2. `keepTalkingOpen` reopens the textarea without a clear turn cap, soft stop, or return to the terminal card.
3. “Let me add one line” and “Go a bit deeper” already provide bounded continuation paths, so “Keep talking” is redundant and more open-ended.
4. The in-chat hint “Or type the whole thing in your own words” may reinforce a free-form chat mental model.

**Where to look first:**
- `artifacts/untangle/src/pages/SessionFlow.tsx`
- `keepTalking` label
- `keepTalkingOpen` state
- Terminal-card CTA block
- Post-response input gate
- `inChatTypeHint`

**Recommended fix plan:**
1. Remove the unbounded “Keep talking” CTA.
2. Remove or simplify the `keepTalkingOpen` pathway if it is no longer needed.
3. Keep bounded continuation paths such as “Let me add one line” and “Go a bit deeper.”
4. Tighten the free-form chat hint so it appears less like a general chatbot invitation.

**Why this fix should work:** Removing the unbounded continuation path should make the terminal card feel truly bounded. Users can still add one line, go one layer deeper, reset, stop, or reach someone, but the product no longer invites open-ended conversation.

**Status:** Investigation complete. No code changed yet.
---

## Issue 2: Entry screen needs clearer onboarding

**Description:** Users may need a short onboarding gate before seeing voice, chips, typing, and support paths.

**Evidence:** One participant suggested that the entry interface should first help users understand where to begin.

**Severity:** Medium–High  
**Frequency:** 1/3 participants, 33%  
**Original Goal:** Aligned. A clearer entry point helps users choose the right level of support quickly.  
**Category:** Missing Feature / Usability  
**Priority:** P1 Major  
**MoSCoW:** MUST

**Action Plan:**
- Add a short entry gate with the prompt: “What do you need right now?”
- Suggested options:
  - I can’t explain — let me listen first
  - I can name a little
  - I need a person
  - I want to type one line

**Possible root causes:**
1. Too many entry paths appear at once.
2. The product does not first ask what state the user is in.
3. Voice, chips, typing, and support paths are all visible without a simple decision frame.

**Where to look first:**
- Home / entry screen component
- Entry card layout
- Voice Bridge entry point
- Main chip entry section

**Suggested fix approach:**
Add a lightweight onboarding gate before the main entry choices. Keep it short and moment-focused, not a long tutorial.

**Status:** Not fixed yet.

---

## Issue 3: Voice Bridge opening tone feels awkward

**Description:** The Voice Bridge opening language may feel too intimate or unnatural.

**Evidence:** “Hey baby” felt embarrassing / awkward at the start of the voice path.

**Severity:** Medium–High  
**Frequency:** 1/3 participants, 33%  
**Original Goal:** Misaligned. Voice Bridge should feel grounding and low-pressure, not overly intimate or fake.  
**Category:** Usability / Copy  
**Priority:** P1 Major  
**MoSCoW:** MUST

**Action Plan:**
- Remove overly intimate language.
- Replace with calmer, lower-pressure wording:
  - “I’m here. You don’t have to explain yet.”
  - “No explaining. Just listen first.”
  - “You don’t have to solve this right now.”

**Possible root causes:**
1. The opening phrase is too intimate for a first support moment.
2. The tone assumes a relationship the product has not earned.
3. Voice Bridge is an early overwhelmed-state entry, so awkward wording feels especially disruptive.

**Where to look first:**
- Voice Bridge copy
- Voice Bridge script / phrase list
- Any hardcoded opening lines

**Suggested fix approach:**
Replace the opening with language that feels steady, low-pressure, and not overly familiar.

**Status:** Not fixed yet.

---

## Issue 4: Reset activity may feel like a performance task

**Description:** The reset activity was misunderstood as a performance or intelligence task.

**Evidence:** One participant thought the simple game might be testing intelligence.

**Severity:** Medium–High  
**Frequency:** 1/3 participants, 33%  
**Original Goal:** Misaligned. Reset should be a low-pressure pause, not a challenge.  
**Category:** Usability / Copy  
**Priority:** P1 Major  
**MoSCoW:** MUST

**Action Plan:**
- Add low-pressure framing above the activity:
  - “No score.”
  - “No need to finish.”
  - “This is just something small to hold your attention for a minute.”
- Make skip / exit options visible.

**Possible root causes:**
1. The activity looks like a game or puzzle without enough framing.
2. The page does not clearly say there is no score or performance expectation.
3. Users may assume any puzzle-like task is something they are expected to complete correctly.

**Where to look first:**
- Reset page
- ResetTools component
- Mini Sudoku / Word Search / Hangman / Find a word copy
- Timer page copy

**Suggested fix approach:**
Add explicit no-score, no-pressure language before the reset activity. Make clear that users do not need to finish or perform well.

**Status:** Not fixed yet.

---

## Issue 5: Some wording feels unnatural

**Description:** Some copy felt awkward or not human enough.

**Evidence:** Multiple comments pointed to wording that did not feel fully natural.

**Severity:** Medium  
**Frequency:** Estimated 2/3 participants, 67%  
**Original Goal:** Misaligned. Untangle depends on emotionally precise, trustworthy language.  
**Category:** Usability / Copy  
**Priority:** P1 Major  
**MoSCoW:** SHOULD

**Action Plan:**
- Run a copy pass on:
  - Entry gate
  - Voice Bridge
  - Reset page
  - One-line correction
  - Trusted-person message
- Prioritize clarity, low pressure, and emotional naturalness.

**Possible root causes:**
1. Some phrases sound too scripted or artificial.
2. Some support copy may feel too formal, too intimate, or not context-aware enough.
3. Sensitive moments require unusually careful wording, so small copy issues feel larger.

**Where to look first:**
- Entry gate
- Voice Bridge
- Reset page
- One-line correction
- Trusted-person message

**Suggested fix approach:**
Run a focused copy pass on the highest-friction screens. Prioritize clarity, low pressure, and emotionally natural language.

**Status:** Not fixed yet.

---

## Issue 6: Outside resources feel secondary

**Description:** Outside resources under the real-person path felt less central and somewhat decorative.

**Evidence:** Resources did not feel like the main user path compared with trusted-person support.

**Severity:** Low–Medium  
**Frequency:** 1/3 participants, 33%  
**Original Goal:** Partially aligned. Resources are useful as safety fallback, but should not distract from the main flow.  
**Category:** Enhancement / UI Hierarchy  
**Priority:** P2 Minor  
**MoSCoW:** COULD

**Action Plan:**
- Keep crisis resources available.
- Collapse or visually lower outside resource links.
- Emphasize trusted-person and professional-support paths first.

**Possible root causes:**
1. Outside resources appear near the real-person flow but do not feel action-oriented.
2. Trusted-person support feels more directly useful than resource browsing.
3. Too many fallback options may dilute the main human-support path.

**Where to look first:**
- HumanSupportEntry
- Talk to someone modal
- Crisis resources section
- More resources / directories section

**Suggested fix approach:**
Keep resources available as a safety fallback, but reduce visual priority so the main path remains trusted-person or professional support.

**Status:** Not fixed yet.

---

## Issue 7: Open-form recruitment produced low-confidence data

**Description:** Open-form respondents showed repeated phrasing patterns, unclear motivation, and limited product-specific feedback.

**Evidence:** Several respondents used very similar language and appeared more incentive-driven than product-focused.

**Severity:** High for research quality, not a product blocker  
**Frequency:** Most open-form respondents  
**Original Goal:** Misaligned with the goal of getting high-quality usability feedback.  
**Category:** Research Process / Recruitment  
**Priority:** Research P1  
**MoSCoW:** MUST

**Action Plan:**
- Mark open-form participants as low-confidence.
- Use their sessions only for basic flow and friction observations.
- Do not use these sessions as strong validation or testimonials.
- Prioritize:
  - Warm introductions
  - Advisor referrals
  - Professional reviewers
  - Screened participants

**Possible root causes:**
1. Open-form outreach attracted some incentive-driven participants.
2. The screener did not strongly filter for product-specific motivation.
3. The invitation did not require enough evidence that participants could think aloud and give useful feedback.

**Where to look first:**
- Screener form
- Outreach copy
- Participant scheduling process
- Fit questions before usability testing

**Suggested fix approach:**
Improve the screener before the next round. Ask participants to explain what they think Untangle is for, confirm they can use a mild or fictional example, and confirm they are comfortable thinking aloud.

**Status:** Process issue identified. Future recruitment will prioritize warm-introduction and screened participants.

---

## Next Iteration Summary

The next iteration should focus on boundary, entry clarity, and copy rather than adding new features.

**Highest-priority changes:**
1. Remove open-ended chat cues.
2. Add a short onboarding gate.
3. Rewrite the Voice Bridge opening.
4. Clarify that reset activities are low-pressure and not scored.
5. Lower the visual priority of outside resources.
6. Improve recruitment screening before the next testing round.
