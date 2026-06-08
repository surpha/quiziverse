---
description: "Use when working on the main App.jsx file, routing logic, play mode, or overall app state management."
applyTo: "src/App.jsx"
---
# App.jsx Architecture

## Routing (No Library)

The app uses manual path-based routing:
- `/` → `MainApp` (3D globe + all features)
- `/daily-challenge` → `DailyChallengePage` (full-page daily challenge)
- `/live` → `LiveQuizRoute` (live quiz player or admin)
- `?event=slug` → triggers `EventChallenge` overlay in MainApp

Routing is via `window.location.pathname` checks + `window.history.pushState()`.
Vercel rewrites (`vercel.json`) ensure all routes serve `index.html`.

## App Component Hierarchy

```
App
├── DailyChallengePage (if /daily-challenge)
├── LiveQuizRoute (if /live)
│   ├── LiveQuizAdmin (no slug, quizmaster+)
│   └── LiveQuizPlayer (with ?code=slug)
└── MainApp (default)
    ├── Canvas (Three.js)
    │   └── Scene → StarNode[]
    ├── MobileFilterDropdown (domain/type filters)
    ├── QuestionCard (play mode card)
    ├── PlayFilters (modal before play)
    ├── ContributeForm (modal)
    ├── AuthModal (modal)
    ├── AdminPanel (modal)
    ├── DailyChallenge (popup)
    ├── DailyChallengeArchive (popup)
    ├── EventChallenge (if ?event=slug)
    ├── UserProfile (popup)
    ├── UsernameSetup (first-time)
    ├── OnboardingTour (first-time)
    ├── AnalyticsDashboard (admin)
    └── EventAdmin (admin)
```

## Play Mode Flow

1. User clicks "Play" → `PlayFilters` modal opens
2. User selects domains, difficulty range, question types → `startPlayMode()`
3. Globe spins for 1.5s → picks random question from filtered pool
4. Camera zooms to question's star position (1.2s)
5. `QuestionCard` appears with question + answer reveal + LLM judging
6. "Next" → spin again → pick next unshown question → repeat
7. If filtered pool exhausted, falls back to all questions

## Key State in MainApp

- `isPlayMode` — whether play session is active
- `isSpinning` / `isZooming` — animation states
- `selectedQuestion` — currently displayed question
- `zoomTarget` — [x,y,z] position camera zooms to
- `playFilters` — { domains[], difficultyMin, difficultyMax, types[] }
- `selectedDomains` / `selectedTypes` — explore mode filters (non-play)
- `showDaily` / `showArchive` / `showProfile` / `showAdmin` / etc. — modal toggles

## Landing Page (Unauthenticated)

Shows spinning globe with "QUIZIVERSE" title + "Enter the Quiziverse" button → AuthModal.
