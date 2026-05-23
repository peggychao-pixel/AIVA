# Untangle Test Checklist

## Test Context

**App name:** Untangle

**Testing round:** AIVA Unit 9 Activity 3 — Test, Validate, and Document Fixes

**Last tested date:** May 22, 2026

**Tester:** [Tester name]

**Prototype version:** Untangle current version after Stage 5A fix

**Recent fix being validated:** Removed open-ended “Keep talking” path from the post-response terminal card and tightened the ambient free-form chat hint.

---

## Core Functionality Tests

### Test 1: Start a main Untangle flow

**Purpose:** Confirm the main user journey still works after the fix.

**Steps:**
1. Open Untangle.
2. Select one main entry card, such as “Before eating,” “After eating,” “This feels bigger than one meal,” or “Looping.”
3. Select one second-layer option or enter a mild fictional example.
4. Submit the moment.

**Expected result:**
- The app generates a response.
- The page does not crash.
- The user reaches the post-response terminal card.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 2: Post-response terminal card no longer shows “Keep talking”

**Purpose:** Confirm the open-ended chat cue was removed.

**Steps:**
1. Complete a main Untangle flow until the post-response terminal card appears.
2. Look at all options shown under the response.

**Expected result:**
- “Keep talking” does not appear.
- The visible options guide the user toward bounded next steps.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 3: Chat textarea does not reopen after terminal card

**Purpose:** Confirm the removed `keepTalkingOpen` pathway no longer remounts the open-ended chat input.

**Steps:**
1. Complete a main Untangle flow until the terminal card appears.
2. Look below the terminal card.
3. Try to find any open-ended chat textarea.

**Expected result:**
- No free-form chat textarea appears after the terminal card.
- The user cannot reopen an unbounded chat surface from the terminal card.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 4: “I’m good for now” still works

**Purpose:** Confirm the main bounded exit still works.

**Steps:**
1. Complete a main Untangle flow until the terminal card appears.
2. Click “I’m good for now.”

**Expected result:**
- The session closes or resets cleanly.
- No console errors appear.
- The app does not reopen the chat input.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 5: “Let me add one line” still works

**Purpose:** Confirm bounded correction still works after removing “Keep talking.”

**Steps:**
1. Complete a main Untangle flow until the terminal card appears.
2. Click “Let me add one line.”
3. Enter one short additional line.
4. Submit it.

**Expected result:**
- The app accepts the one-line correction.
- A new response appears.
- The terminal card appears again.
- “Keep talking” still does not appear.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 6: “Go a bit deeper” still works when available

**Purpose:** Confirm bounded deeper-layer continuation still works.

**Steps:**
1. Complete a flow where “Go a bit deeper” appears.
2. Click “Go a bit deeper.”
3. Follow the next prompt.

**Expected result:**
- The deeper layer appears only when appropriate.
- The user is not sent into open-ended chat.
- The terminal card returns after the deeper step.

**Result:** [Pass / Fail / Not available]

**Notes:** [Add notes]

---

### Test 7: Human support path still appears

**Purpose:** Confirm the fix did not break the real-person support path.

**Steps:**
1. Complete a main Untangle flow until the terminal card appears.
2. Scroll to the support section.
3. Click the human support / talk to someone option.

**Expected result:**
- The human support path appears.
- Trusted-person / personal support options still work.
- The support path does not depend on “Keep talking.”

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

## Recent Bug Fix Validation

### Test 8: Stage 5A fix — bounded conversation path

**Purpose:** Validate the specific bug fix from Stage 5A.

**Steps:**
1. Reproduce the original flow where “Keep talking” previously appeared.
2. Confirm the terminal card now shows only bounded options.
3. Confirm the chat input does not remount after the terminal card.
4. Confirm no stale references or console errors appear.

**Expected result:**
- “Keep talking” is gone.
- `keepTalkingOpen` behavior is gone.
- The terminal state remains bounded.
- The user can still stop, add one line, go deeper when available, reset, or reach someone.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 9: Ambient free-form hint appears only before first response

**Purpose:** Confirm the free-form hint no longer reinforces chat after the first response.

**Steps:**
1. Start a fresh session.
2. Before the first AI response, look for the hint “Or type the whole thing in your own words.”
3. Submit the first message or chip path.
4. After the first AI response, check whether the hint appears again.

**Expected result:**
- The hint appears only at turn 0.
- After the first AI response, the hint no longer appears.
- The textarea remains usable during the pre-closure phase as intended.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

## Regression Tests

### Test 10: VoiceBridge still works

**Purpose:** Confirm Stage 5A did not affect VoiceBridge.

**Steps:**
1. Open Untangle.
2. Use the voice-first / no-typing path.
3. Complete the VoiceBridge flow.

**Expected result:**
- VoiceBridge still opens.
- The voice-first flow still works.
- The user can continue to reset, finish, or contact someone afterward.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 11: Reset tools still work

**Purpose:** Confirm Stage 5A did not affect reset tools.

**Steps:**
1. Enter the short reset path.
2. Try one reset activity, such as Mini Sudoku, Word Search, Hangman, or Find a word.
3. Exit using “I’m good for now” or “I need a person.”

**Expected result:**
- The reset tool loads.
- Timer and activity display correctly.
- Exit options work.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 12: Repair / report response path still works

**Purpose:** Confirm the repair flow was not broken by the terminal-card fix.

**Steps:**
1. Complete a main flow until a response appears.
2. Use “Report this response” or the repair / misattunement path if available.
3. Submit a repair signal.

**Expected result:**
- The repair path opens.
- The app does not show the removed “Keep talking” path.
- The user can return to a bounded flow.

**Result:** [Pass / Fail / Not available]

**Notes:** [Add notes]

---

## Edge Case Tests

### Test 13: Empty input

**Purpose:** Confirm empty input does not break the app.

**Steps:**
1. Open a text input path.
2. Try submitting an empty message.

**Expected result:**
- The app does not crash.
- The user is prevented from submitting or receives a clear prompt.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 14: Long input

**Purpose:** Confirm long input does not break the app.

**Steps:**
1. Open a text input path.
2. Enter a long fictional message of 100+ words.
3. Submit.

**Expected result:**
- The app handles the input without crashing.
- The response appears or the app gives a clear limit message.
- No raw sensitive details are displayed unexpectedly.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 15: Rapid clicking

**Purpose:** Confirm rapid clicks do not create duplicate or broken states.

**Steps:**
1. Click an entry card or submit button multiple times quickly.
2. Observe whether duplicate responses or UI glitches appear.

**Expected result:**
- The app does not crash.
- Duplicate submissions are prevented or handled safely.
- The UI remains stable.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

### Test 16: Mobile viewport

**Purpose:** Confirm the flow works on a phone-sized screen.

**Steps:**
1. Open DevTools device mode or test on a phone.
2. Run one full main flow.
3. Check terminal card, reset path, and human support path.

**Expected result:**
- Layout remains readable.
- Buttons are tappable.
- The terminal card does not overflow or hide key actions.
- “Keep talking” does not appear.

**Result:** [Pass / Fail]

**Notes:** [Add notes]

---

## Final Validation Summary

**Overall result:** [Pass / Fail]

**Main fix confirmed:** [Yes / No]

**Any regressions found:** [Yes / No]

**Regression notes:** [Add notes]

**Next issues to address:**
1. VoiceBridge opening tone feels awkward.
2. Entry screen needs clearer onboarding.
3. Reset page needs clearer no-score / low-pressure framing.
4. Open-form recruitment needs stronger screening.

**Commit message for checklist:** Add fix validation checklist