# Untangle — Changelog (May 2026)

Build-cycle summary of completed work on the Untangle web app
(`artifacts/untangle`) through May 2026. This document records completed,
verified changes only. Planned or proposed items belong in ROADMAP_NEXT.md.

---

## AI privacy / safety preprocessing

- Added a shared Untangle safety preprocessing layer before model calls.
- The preprocessing layer removes or transforms identifying and unnecessary
  sensitive details, including emails, phone numbers, likely names where
  detectable, locations, calorie numbers, weight/body metrics, and overly
  specific food details.
- Updated model-facing routes receive a structured, minimized moment summary
  instead of raw free-text history where the safety layer has been wired in.
- Crisis, human-support, and stop-here routes are handled before model
  generation when detected.
- Safety routing now distinguishes bounded loop support, short holds, safety
  interruption, human support, crisis routing, and clean stop states.
- Server logging was tightened so relevant routes record metadata such as
  route, risk level, flag counts, and message length rather than raw user text.

## AI route sanitization

- Wired the safety layer into the audited Untangle-facing AI routes, including:
  chat, profile matching, analyzer, quick response, and AI response routes.
- Updated model prompts to include route-specific boundaries and forbidden
  response types, including calorie, weight-loss, meal-plan, compensation,
  body-checking, restriction, and open-ended reassurance-loop responses.
- Added defense-in-depth routing so crisis, human-support, and stop-here cases
  do not rely on the model to improvise the next step.
- Out-of-scope AI routes were left documented separately rather than described
  as completed.

## Storage / logging cleanup

- Sanitized new profile-signal and saved-moment text before persistence where
  covered by the Stage 1 cleanup.
- Removed or replaced raw-text logging in the audited Untangle/Profile/Analyzer
  routes.
- Audited analytics payloads for raw free-text fields; no raw free-text payloads
  were intentionally added in this cycle.
- Voice transcript handling was audited: transcript text is returned to the
  client for the active flow but is not intentionally stored in localStorage or
  sessionStorage.

## VoiceBridge flow

- Removed legacy reflection-heavy VoiceBridge stages.
- VoiceBridge now ends in a clean choice point instead of pushing the user into
  more reflection.
- VoiceBridge done state offers:
  - Do a short reset
  - Done for now
  - Contact someone
- VoiceBridge reset includes a two-minute reset timer and clear exits:
  - I'm good for now
  - I need a person
- VoiceBridge entry copy was changed from relapse-coded wording to:
  - “I need a voice for a minute”
  - “No explaining needed. Just listen.”

## Timer / ResetTools

- HoldOffer now has a post-completion fork:
  - Do one more round
  - I'm good for now
  - I need a person
- ResetTools was extracted into a shared component and mounted under both
  VoiceBridge reset and HoldOffer active timer.
- ResetTools uses neutral, non-food/body/weight word lists centralized in
  `reset-words.ts`.

## Clean exits

- Main emotional exit copy was aligned to:
  - “I'm good for now”
  - 「我現在先這樣就好」
- The main response closure block was visually adjusted so the clean exit reads
  as the primary/default path, while continuation actions are secondary.
- VoiceBridge and HoldOffer each preserve a path to human support without
  routing through an AI substitute.

## Branch-option UI alignment

- L1, L2, and follow-up branch-choice options were aligned toward a shared
  trigger-style long-option visual language.
- Branch-choice options were kept as long selectable options, not tiny quick
  reply pills and not oversized insight cards.
- Home mode cards, InsightCard, DeeperLayerCard, Keep-this surfaces, closure
  buttons, support paths, and timer tools were kept separate from the branch
  option style.

## Routing guards and routing-token fixes

- Added a dev-only L1 routing consistency guard for visible chip labels and
  `BROAD_CHIP_ROUTING` coverage.
- Cleaned the dev guard output so L1 gaps remain loud while L2/suggestion gaps
  are summarized separately.
- Fixed surfaced L1 routing-token drift in `lib/untangle-chips`.
- Fixed three high-confidence L2 routing-token drift cases.
- Remaining L2 copy-sensitive gaps and the larger suggestion-gap policy remain
  deferred.

## Copy fixes

- Updated the Before entry question:
  - “What's making this feel hard already?”
  - → “What's making this feel hard right now?”
- Updated selected English microcopy in SessionFlow:
  - “Or type what's tangled.”
  - → “Or just type it.”
  - “Skip the conversation. Get one sharp insight.”
  - → “Skip the conversation. Get a clear read.”
  - “Write or hold mic to speak...”
  - → “Type, or hold the mic to talk…”
  - “Or type the whole thing in your own words.”
  - → “Or just type it in your own words.”
- Updated RepairEntry:
  - “Let's re-catch the knot.”
  - → “Let me try this again.”
- Updated ResetTools:
  - “Pick something tiny to keep your brain busy while the wave passes.”
  - → “Pick something small for your brain to do for a minute.”
- Updated one mode description:
  - “checking how it landed”
  - → “checking how it felt”

## Suggestion-card / branch-choice UI bug work

- Investigated missing follow-up options under the “not a meal” flow.
- Confirmed the issue was not routing/data loss: the follow-up suggestion data
  existed and the render gate could pass.
- Added a defensive suggestion gate fallback for transient message-index misses.
- Added explicit message scroll-container handling and bottom spacing to reduce
  composer overlap.
- Later clarified that the desired UI was not a tiny quick-reply pill and not a
  large insight card, but a trigger-style long branch option.
- Aligned follow-up options with the shared branch-choice visual language.

## Deferred / known pending work

- Stage 7B safe copy-only edits still need implementation/review if not already
  completed in a later commit.
- Fear / Hidden fear vocabulary decision remains pending.
- Urge / Pull vocabulary decision remains pending.
- VoiceBridge done-header tone decision remains pending.
- AntiLoopMessages tone pass remains pending.
- `land / landing / landed` systematic cleanup remains pending.
- Copy-sensitive L2 gaps remain deferred.
- Suggestion-gap policy remains deferred.
- Landing page and visual personalization remain proposed, not completed.
- Mobile alignment remains deferred.