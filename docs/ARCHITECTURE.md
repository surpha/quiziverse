# Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (SPA)                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ React 19 │  │ Three.js     │  │ Tailwind CSS 4   │  │
│  │ + Hooks  │  │ (R3F + Drei) │  │ (glass morphism) │  │
│  └────┬─────┘  └──────┬───────┘  └──────────────────┘  │
│       │                │                                 │
│       ▼                ▼                                 │
│  ┌─────────────────────────────┐                        │
│  │         App.jsx             │                        │
│  │  (state + routing + play)   │                        │
│  └─────────────┬───────────────┘                        │
└────────────────┼────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase                              │
│  ┌────────────┐  ┌─────────┐  ┌────────────────────┐   │
│  │ PostgreSQL │  │  Auth   │  │ Realtime (WebSocket)│   │
│  │ + RLS      │  │ + OAuth │  │ (live quizzes)     │   │
│  └────────────┘  └─────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│              LLM APIs (Server-side via client)           │
│  ┌──────────────┐  ┌──────────────────────────┐        │
│  │ Groq (Llama) │  │ Google Gemini (fallback)  │        │
│  └──────────────┘  └──────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

### Question Loading
```
App mounts → useQuestions() → Supabase query (status=approved)
                               ↓ (timeout/fail)
                           Local JSON fallback
                               ↓
                      computePositions() → adds [x,y,z] to each question
                               ↓
                      Scene renders StarNodes at positions
```

### Authentication Flow
```
User clicks "Enter" → AuthModal → signIn/signUp/signInWithGoogle
       ↓
  Supabase Auth → session token → onAuthStateChange listener
       ↓
  fetchProfile(userId) → profiles table → { role, username, ... }
       ↓
  App re-renders with user context (admin panel, contribute, etc.)
```

### Play Mode Flow
```
Play button → PlayFilters modal → user selects domains/difficulty/types
       ↓
  startPlayMode(filters) → globe spins (1.5s)
       ↓
  Pick random from filtered pool → zoom camera to star position (1.2s)
       ↓
  Show QuestionCard → user answers → LLM judges (optional)
       ↓
  "Next" → spin → pick next unshown → repeat
       ↓
  Pool exhausted → reset shown set or fallback to all questions
```

### Daily Challenge Flow
```
User logs in → useDailyChallenge(userId) → fetch today's challenge (IST date)
       ↓
  Auto-popup if not attempted today
       ↓
  Sequential questions with hints (cost deducted from score)
       ↓
  Submit each answer → upsert daily_attempts row
       ↓
  Completion → show total score + leaderboard
```

### Live Quiz Flow
```
Quizmaster creates quiz → gets join code/QR
       ↓
  Players join via /live?code=SLUG
       ↓
  Supabase Realtime subscription on live_quizzes table
       ↓
  Quizmaster advances questions → all players see update in real-time
       ↓
  Players submit answers → live_quiz_responses table
       ↓
  Quizmaster evaluates → scores update → live leaderboard
```

## Deployment

### Vercel (Web)
- SPA build via Vite
- `vercel.json` rewrites: `/daily-challenge` and `/live` → `index.html`
- Environment variables set in Vercel dashboard

### Capacitor (Mobile)
- `android/` and `ios/` folders contain native shells
- Web app is bundled into `public/` and served via WebView
- Same codebase, no native-specific code

## Build Pipeline
```
npm run build → Vite production build → dist/
                  ↓
         Vercel auto-deploys on push to main
```

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.6 | UI framework |
| three | ^0.184.0 | 3D rendering engine |
| @react-three/fiber | ^9.6.1 | React renderer for Three.js |
| @react-three/drei | ^10.7.7 | Three.js helpers (OrbitControls, etc.) |
| @supabase/supabase-js | ^2.105.4 | Database + Auth + Realtime |
| recharts | ^3.8.1 | Analytics charts |
| qrcode.react | ^4.2.0 | QR codes for live quiz join |
| tailwindcss | ^4.3.0 | Utility CSS |
| vite | ^8.0.12 | Build tool + dev server |
| vitest | ^2.1.8 | Unit testing |
