## AI Quiz App

AI Quiz is a Next.js application that generates multiple-choice quizzes on demand using the Groq API. Authenticated users can store quizzes in Supabase, revisit past quizzes from a personal library, and see inline feedback while working through questions.

## Features

- AI-powered quiz generation for any topic in seconds
- Email/password authentication backed by Supabase Auth
- Personal quiz library with duplicate detection and inline search
- Immediate answer validation and score tallying in the UI

## Tech Stack

- Next.js App Router (TypeScript, React Server/Client Components)
- Tailwind CSS utility styling
- Supabase (Auth + Postgres) for persistence
- Groq API for LLM-driven quiz creation

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project with email/password auth enabled
- A Groq API key with access to the model you plan to use

### Environment Variables

Create a `.env.local` file at the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
AI_API_KEY=your_groq_api_key
```

### Database Schema

Run this SQL in Supabase to create the quizzes table:

```
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  questions jsonb not null,
  is_public boolean default false,
  share_id text unique,
  created_at timestamptz default now()
);
```

Enable Row Level Security and add policies so that only owners can modify their quizzes but public ones remain readable:

```
alter table public.quizzes enable row level security;

create policy if not exists quizzes_select_own
on public.quizzes for select to authenticated
using (auth.uid() = user_id);

create policy if not exists quizzes_insert_own
on public.quizzes for insert to authenticated
with check (auth.uid() = user_id);

create policy if not exists quizzes_update_own
on public.quizzes for update to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy if not exists quizzes_delete_own
on public.quizzes for delete to authenticated
using (auth.uid() = user_id);

create policy if not exists quizzes_select_public
on public.quizzes for select to anon, authenticated
using (is_public = true);
```

### Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 to sign in and start generating quizzes.

## Project Structure

- `app/` – App Router pages and components (home workspace, profile, API routes)
- `app/api/ai/route.ts` – Calls the Groq API and returns quiz JSON
- `app/Logic/` – Supabase helper utilities
- `lib/supabaseClient.ts` – Configures the Supabase client for client-side usage

## Available Scripts

- `npm run dev` – Start the local development server
- `npm run build` – Create an optimized production build
- `npm start` – Serve the production build
- `npm run lint` – Run Next.js ESLint checks

## Deployment

Deploy anywhere that supports Next.js (Vercel, Netlify, etc.). Ensure all environment variables are configured in the hosting provider, including Supabase credentials and the Groq API key.

## Contributing

Feel free to open a pull request or create an issue on GitHub for bug reports, enhancements, or questions.
