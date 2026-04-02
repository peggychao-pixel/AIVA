# Untangle

## Product

Untangle is an AI-powered thinking partner that helps users notice and exit mental loops around food — before and after meals. It is explicitly not a therapy chatbot. The tone is sharp, dry, and direct. No therapy clichés, no self-compassion prompts.

**Core flow**: User selects a context (Before eating / After eating / Mind is looping / Something else) or types freely. A multi-turn AI conversation begins. The AI asks one pointed question per turn and surfaces occasional insights. Users can tap suggestion chips or type replies, with voice input support.

## Architecture

- **Frontend (Web)**: React + Vite at `/` (`artifacts/untangle`)
- **Frontend (iOS)**: Expo/React Native (`artifacts/untangle-mobile`) — 3-tab app (Home, History, Moments) — mirrors web app completely
- **Backend**: Express 5 API server at `/api` (`artifacts/api-server`)
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **AI**: OpenAI `gpt-4o-mini` via Replit AI Integrations (`lib/integrations-openai-ai-server`)
- **Audio**: `speechToText` from `@workspace/integrations-openai-ai-server/audio`
- **API Client**: `lib/api-client-react` — shared React Query hooks/functions with `setBaseUrl`/`setAuthTokenGetter` support

## Key Endpoints

- `POST /api/untangle/sessions` — Create a session
- `GET /api/untangle/sessions` — List all past sessions
- `PATCH /api/untangle/sessions/:id` — Update session
- `POST /api/untangle/ai-response` — Legacy single-shot AI response
- `POST /api/untangle/chat` — Multi-turn AI conversation (returns JSON: response, isInsight, suggestions[])
- `POST /api/untangle/transcribe` — Voice transcription (base64 audio → text)

## Key Components

### Web (`artifacts/untangle/src/`)
- `pages/SessionFlow.tsx` — Full app (home + conversation UI, 1351 lines)
- `pages/History.tsx` — Session log
- `components/VoiceButton.tsx` — Hold-to-record mic button → transcribes via backend
- `components/Timer.tsx`, `ReactionGame.tsx`, `AntiLoopMessages.tsx` — Available but not in main flow

### Mobile (`artifacts/untangle-mobile/`)
- `app/(tabs)/index.tsx` — Full session flow mirroring web: mode grid, free-text input, QuickUntangle, layer2 chips, full chat with DeeperLayerCard/InsightCard/AnchorCard/SatietyCheck, closure buttons, language toggle, typing indicator
- `components/DeeperLayerCard.tsx` — 3-section card (Surface/Underneath/Softer Hold)
- `components/SatietyCheck.tsx` — 5-option satiety module for "after" mode
- `components/AnchorCard.tsx` — Anchor phrase display card
- `components/QuickUntangleCard.tsx` — Quick untangle panel with thought input + insight
- `components/TypingIndicator.tsx` — 3 animated dots typing indicator
- `components/InsightCard.tsx` — Insight moment card with save button
- `components/ChatBubble.tsx` — User/assistant chat bubbles
- `constants/product.ts` — Shared MODE_OPTIONS_DATA, LAYER2_DATA, BROAD_CHIP_ROUTING, UI_TEXT
- `context/LangContext.tsx` — Global language state (tc/en) for history/moments tabs

## AI System Design

Four mode-specific system prompts (before/after/loop/other) instruct the model to:
- Ask 1 question per turn, max 2 sentences
- Never use therapy language, mindfulness, breathing, or calorie talk
- Return JSON: `{ response, isInsight, suggestions[] }`
- Surface insights occasionally with `isInsight: true` (renders as ✦ UNTANGLE MOMENT card)
- Keep suggestion chips as short, honest user-voice replies (not reflective prompts)

### Prompt Architecture (ENGINE_PROMPT, ~2800 lines)

- **STEP 0**: Multi-class classification (loop type + state detection: NOT_NOW, LIGHT_REVISIT, PHYSICAL_NEED, REWARD_MISMATCH, etc.)
- **SPECIFICITY LEVEL ROUTER**: LEVEL1 (broad) → chips, LEVEL2 → direct insight, LEVEL3 → deep insight
- **LAYER-2 CHIP ENTRY CHECK**: Hard override before SPECIFICITY LEVEL ROUTER — specific chip phrases always return clarifying chips
- **POST-INSIGHT NEXT-STEP ROUTING**: Type A (validation), Type B (branch clarifier), Type D (real constraint) — never empty suggestions on insight
- **DEEPER LAYER RESPONSE RULE**: 3-part format (surface/deeper/landing); self-worth escalation guard; identity jump banned without explicit shame signal
- **NOT_NOW / LIGHT_REVISIT RESPONSE RULES**: Gentle exits with no deeper pressure

### Client-Side Chip Routing (BROAD_CHIP_ROUTING)

Five Level-1 broad chip entries are intercepted on the frontend (SessionFlow.tsx) before hitting the API, with pre-defined clarifying chip sets. This ensures 100% reliable routing regardless of model behavior:
- "I can't explain it — I'm just still stuck" / "我也說不上來，就是還卡著"
- "It feels tied to something deeper" / "感覺跟某件更深的事有關"
- "Something about food" / "跟食物有關"
- "A feeling I can't name" / "一種說不出來的感覺"
- "It still feels unfinished" / "感覺還沒結束"

### Frontend State (SessionFlow.tsx)

- `exitMessage`: useMemo — last assistant message with `isInsight || anchorPhrase` that has no user message after it
- `loopDismissed`: set to true when user clicks "Go deeper". Gates only the go-deeper button, NOT the "Close this loop" button
- `notNowMode` / `lightRevisitMode`: suppress go-deeper button
- `anchorPhrase`: updated on every response where API returns non-null anchorPhrase
- `overateEntry`: set true for guilt+overeating path — suppresses satiety check

---

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
