# Quiziverse — Project Context for AI Agents

## What is Quiziverse?

A **3D interactive quiz platform** that visualizes questions as stars on a knowledge globe. Built with React 19 + Three.js (React Three Fiber), styled with Tailwind CSS 4, backed by Supabase (Postgres + Auth + Realtime), and deployed on Vercel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, JSX (no TypeScript) |
| 3D Rendering | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite` plugin) |
| Backend/DB | Supabase (PostgreSQL, Auth, Realtime subscriptions) |
| Charts | Recharts |
| Testing | Vitest + Testing Library + jsdom |
| Deployment | Vercel (SPA with rewrites for `/daily-challenge` and `/live`) |
| Mobile | Capacitor (Android + iOS shells wrapping the web app) |
| LLM Integration | Groq (default) or Google Gemini for question classification |

## Project Structure

```
src/
├── App.jsx              # Root component, routing logic (path-based)
├── main.jsx             # Entry point
├── index.css            # Global styles
├── components/          # All UI components (flat, no nesting)
├── hooks/               # Custom React hooks (data fetching, state)
├── utils/               # Pure utilities (no React dependencies)
├── lib/supabase.js      # Supabase client singleton
├── data/questions.json  # Fallback local question bank
└── test/                # Test setup
supabase/                # SQL schema files (migrations)
public/                  # Static assets
```

## Key Architectural Decisions

1. **No router library** — uses `window.location.pathname` + `window.history.pushState` for `/daily-challenge` and `/live` routes
2. **Supabase with graceful fallback** — if Supabase is unconfigured, app works with local JSON data
3. **Role-based access** — `profiles.role` can be `user`, `quizmaster`, or `admin`
4. **Questions have domain weights** (13 domains, 1-10 scale) that determine 3D position on the globe
5. **Difficulty maps to radius** — easy questions near center, hard ones in outer orbits
6. **LLM-as-Judge** — auto-classifies contributed questions using Groq/Gemini API

## Environment Variables

```
VITE_SUPABASE_URL=         # Supabase project URL
VITE_SUPABASE_ANON_KEY=    # Supabase anonymous key
VITE_GROQ_API_KEY=         # Groq API key (for LLM classification)
VITE_GEMINI_API_KEY=       # Google Gemini API key (alternative)
VITE_LLM_PROVIDER=         # 'groq' (default) or 'gemini'
```

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests (Vitest)
npm run lint      # ESLint
```

## Coding Conventions

- **No TypeScript** — plain JSX with JSDoc comments where helpful
- **Flat component structure** — all components in `src/components/`, no subdirectories
- **Custom hooks pattern** — all data fetching/state logic in `src/hooks/`
- **Tailwind utility classes** — no CSS modules, no styled-components
- **Font: Orbitron** — used for headings (`font-orbitron` class)
- **Glass morphism UI** — `glass` and `glow-border` utility classes for panels
- **IST timezone** — daily challenges use UTC+5:30 for date boundaries

## Git Workflow

- Never merge directly to main
- Always push to a feature branch and create a PR first
- Merge only after PR is reviewed/approved
