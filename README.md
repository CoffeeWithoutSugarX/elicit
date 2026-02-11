# elicit

A Socratic AI Tutor for my sister. Escaping the "answer-feeding" trap with Next.js, LangGraph, and DeepSeek.

## Overview
Elicit is a Next.js 16 + React 19 TypeScript web app that guides learners through questions using a Socratic approach. It integrates LangChain/LangGraph for conversational reasoning, DeepSeek for LLM responses, Supabase for data and auth, and Alibaba Cloud OSS for media uploads.

## Tech Stack
- Language: TypeScript
- Framework: Next.js 16 (App Router, Route Handlers)
- UI: React 19, Tailwind CSS v4
- State: Zustand
- AI/Agents: LangChain, LangGraph, DeepSeek (`@langchain/openai`)
- Data: Supabase (Postgres) — browser client and local Supabase via CLI
- Server: Next.js Route Handlers under `src/app/api`
- Build/Quality: ESLint 9, TypeScript 5
- Package manager: pnpm (repo has `pnpm-workspace.yaml`)

## Requirements
- Node.js 20+ (recommended to match dependencies)
- pnpm 9+
- Supabase CLI (for local development) — `npx supabase` is used by scripts

## Getting Started

### 1) Clone and install
```bash
pnpm install
```

### 2) Environment variables
Create a `.env.local` in the project root with the following keys:

```bash
# DeepSeek
DEEPSEEK_API_KEY=...               # required (used in src/agents/models/deppseek-model.ts)

# Supabase (browser client; see src/db/browers/supabase/supabase.ts)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Alibaba Cloud OSS (used by src/services/OssService.ts)
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_STS_ROLE_ARN=...
```

- The app also references a fixed OSS bucket/region in `OssService.ts` (`muzi-elicit`, `cn-shanghai`). Adjust code or set matching resources as needed. TODO: externalize these as env vars.
- If you use different LLM providers or models, update `src/agents/models/` accordingly. TODO: document additional provider keys if introduced (e.g., OpenAI keys).

### 3) Start services (optional but recommended)
If you plan to use local Supabase:
```bash
pnpm supabase:start
```
This launches local Postgres + APIs per `supabase/config.toml`.

To stop:
```bash
pnpm supabase:stop
```

### 4) Run the app
Development server:
```bash
pnpm dev
```

Build and run production locally:
```bash
pnpm build
pnpm start
```

## NPM Scripts
From `package.json`:
- `pnpm dev` — Next.js dev server
- `pnpm build` — production build
- `pnpm start` — start production server
- `pnpm lint` — run ESLint
- `pnpm supabase:start` — start local Supabase stack
- `pnpm supabase:stop` — stop local Supabase stack
- `pnpm supabase:reset` — reset local DB (destructive)
- `pnpm supabase:diff` — create a DB diff migration (uses migra)
- `pnpm supabaseLtype` — generate Supabase TypeScript types to `src/db/supabase/type.ts`

## API Routes (Entry Points)
- `GET/POST /api/chat/[conversationId]` — `src/app/api/chat/[conversationId]/route.ts`
- `POST /api/oss/sign-for-upload/[conversationId]` — `src/app/api/oss/sign-for-upload/[conversationId]/route.ts`
- App entry: `src/app/page.tsx` with layout `src/app/layout.tsx`

## Project Structure (selected)
```
src/
  agents/
    graphs/                # LangGraph definitions (e.g., ChatGraph)
    models/                # LLM model configs (DeepSeek etc.)
    nodes/                 # Graph nodes (ChatNode, ConversationNode)
    schemas/               # zod schemas for agent I/O
  app/
    api/                   # Next.js Route Handlers
      chat/[conversationId]/route.ts
      oss/sign-for-upload/[conversationId]/route.ts
    types/
    layout.tsx
    page.tsx
  body/                    # Request/response DTOs
  components/ui/           # UI primitives
  db/
    browers/supabase/      # Supabase browser client + generated types
    server/                # Drizzle ORM schemas/mappers (server-side)
  enums/
  lib/                     # auth, utils, time helpers
  request/                 # Fetch wrappers (ChatRequest, OssRequest)
  screen/                  # Feature screens (auth, chat, welcome)
  services/                # Integrations (Ali OSS)
  stores/                  # Zustand stores
supabase/                  # Supabase CLI config/migrations
```

## Testing
There are currently no automated tests configured in this repository. TODO:
- Choose a test runner (e.g., Vitest/Jest, Playwright for e2e)
- Add minimal smoke tests for API routes and UI flows

## Environment & Security Notes
- Do not commit real API keys. Use `.env.local` for local dev and appropriate secrets managers in deployment.
- If deploying to Vercel/Netlify/etc., set the environment variables in the platform dashboard. TODO: add deployment guide.

## License
This project is licensed under the MIT License. See `LICENSE` for details.
