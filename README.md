# elicit

A Socratic AI Tutor for my sister. Escaping the "answer-feeding" trap with Next.js, LangGraph, and DeepSeek.

## Overview
Elicit is a Next.js 16 + React 19 TypeScript web app that guides learners through questions using a Socratic approach. It integrates LangChain/LangGraph for conversational reasoning, various LLMs (like DeepSeek), Supabase for data and auth, and Alibaba Cloud OSS for media uploads.

## Tech Stack
- Language: TypeScript
- Framework: Next.js 16 (App Router, Route Handlers)
- UI: React 19, Tailwind CSS v4, shadcn/ui
- State: Zustand
- AI/Agents: LangChain, LangGraph, various LLM providers (`@langchain/openai`, `@langchain/google-vertexai`)
- Data: Supabase (Postgres) — browser client and local Supabase via CLI
- Server: Next.js Route Handlers under `src/app/api`
- Build/Quality: ESLint 9, TypeScript 5
- Package manager: pnpm

## Requirements
- Node.js 20+
- pnpm 9+
- Supabase CLI (for local development)

## Getting Started

### 1. Clone and Install
```bash
pnpm install
```

### 2. Environment Variables
Create a `.env.local` file in the project root by copying `.env.example` (TODO: Create a `.env.example` file) and add the following keys:

```bash
# LLM Providers (add keys for the models you want to use)
DEEPSEEK_API_KEY=...               # For DeepSeek model
DASHSCOPE_API_KEY=...              # For Qwen (Dashscope) model
# TODO: Add other provider keys (e.g., GOOGLE_API_KEY) as needed

# Supabase (for database, auth, and LangGraph checkpoints)
POSTGRES_URL="..."                 # Required for LangGraph checkpoints and Drizzle ORM
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Alibaba Cloud OSS (for file uploads)
OSS_ACCESS_KEY_ID=...
OSS_ACCESS_KEY_SECRET=...
OSS_STS_ROLE_ARN=...
OSS_BUCKET=...
OSS_REGION=...
```
- If you use different LLM providers, update the model configurations in `src/agents/models/`.

### 3. Start Services (Optional)
If you are using the local Supabase stack for development:
```bash
# Start the local Supabase services (Postgres, etc.)
pnpm supabase:start
```
This launches the local stack based on the configuration in `supabase/config.toml`.

### 4. Run the Application
```bash
# Run the development server
pnpm dev
```
The application will be available at `http://localhost:3000`.

## NPM Scripts
- `pnpm dev`: Starts the Next.js development server.
- `pnpm build`: Creates a production-ready build.
- `pnpm start`: Starts the production server.
- `pnpm lint`: Runs ESLint to check for code quality issues.
- `pnpm supabase:start`: Starts the local Supabase stack.
- `pnpm supabase:stop`: Stops the local Supabase stack.
- `pnpm supabase:reset`: Resets the local Supabase database (destructive).
- `pnpm supabase:diff`: Creates a new database migration file based on schema changes.
- `pnpm supabase:type`: Generates TypeScript types from your Supabase schema and saves them to `src/db/supabase/type.ts`.

## API Routes
- `POST /api/chat/[conversationId]`: Handles chat message processing via the LangGraph agent.
- `POST /api/oss/sign-for-upload/[conversationId]`: Generates a signed URL for uploading files to OSS.
- `POST /api/oss/sign-for-preview`: Generates a signed URL for previewing private OSS files.

## Project Structure
```
src/
├── agents/            # LangGraph agents, nodes, and model configurations
│   ├── graphs/        # LangGraph graph definitions (ChatGraph.ts)
│   ├── models/        # LLM configurations (DeepSeek, Qwen, etc.)
│   └── nodes/         # Individual nodes for the graph logic
├── app/               # Next.js App Router pages and API routes
│   ├── api/           # API route handlers
│   └── page.tsx       # Main application entry point
├── components/        # Shared UI components (e.g., shadcn/ui)
├── db/                # Database schemas, clients, and mappers
│   ├── schema/        # Drizzle ORM schemas
│   └── supabase/      # Supabase client and generated types
├── features/          # Feature-based components and screens
│   ├── chat/          # Components for the chat interface
│   └── auth/          # Authentication components
├── lib/               # Core utilities and helper functions (auth, date, etc.)
├── services/          # External service integrations (e.g., OssService)
├── stores/            # Zustand stores for global state management
└── types/             # TypeScript types and enums
    ├── enums/         # Application-wide enums
    └── request/       # Request payload types
supabase/              # Supabase CLI configuration and migrations
```

## Testing
There are currently no automated tests configured in this repository.
- **TODO**: Choose and configure a test runner (e.g., Vitest, Jest).
- **TODO**: Add unit tests for critical business logic and API routes.
- **TODO**: Add end-to-end tests with Playwright or Cypress for user flows.

## License
This project is licensed under the MIT License. See the `LICENSE` file for details.
