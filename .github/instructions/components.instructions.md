---
description: "Use when creating or modifying React components in src/components/. Covers component patterns, styling conventions, and UI architecture."
applyTo: "src/components/**"
---
# Component Guidelines

## Component Architecture

All components live flat in `src/components/` — no subdirectories.

### Key Components

| Component | Purpose |
|-----------|---------|
| `Scene.jsx` | Three.js scene — the 3D knowledge globe with star nodes |
| `StarNode.jsx` | Individual question rendered as a glowing star in 3D |
| `QuestionCard.jsx` | Modal card showing question/answer with LLM judging |
| `AuthModal.jsx` | Sign in / Sign up modal (email + Google OAuth) |
| `AdminPanel.jsx` | Admin panel for question review (approve/reject/staging) |
| `ContributeForm.jsx` | Form for users to submit new questions |
| `DailyChallenge.jsx` | Daily challenge widget (inline popup) |
| `DailyChallengePage.jsx` | Full-page daily challenge experience |
| `DailyChallengeArchive.jsx` | Browse past daily challenges |
| `DailyChallengeAdmin.jsx` | Admin UI to create/schedule daily challenges |
| `EventChallenge.jsx` | Event quiz player (URL: `?event=slug`) |
| `EventAdmin.jsx` | Admin UI to create/manage events |
| `LiveQuizPlayer.jsx` | Real-time live quiz player (WebSocket via Supabase Realtime) |
| `LiveQuizAdmin.jsx` | Quizmaster panel to run live quizzes |
| `LiveQuizLeaderboard.jsx` | Real-time leaderboard for live quizzes |
| `PlayFilters.jsx` | Filter modal before starting play mode (domains, difficulty, types) |
| `FilterPanel.jsx` | Desktop sidebar filter panel |
| `Legend.jsx` | Domain color legend overlay |
| `TypeFilter.jsx` | Question type filter chips |
| `UserProfile.jsx` | User profile page with stats |
| `UsernameSetup.jsx` | First-time username selection modal |
| `OnboardingTour.jsx` | First-visit guided tour |
| `AnalyticsDashboard.jsx` | Admin analytics with Recharts |
| `LoadingScreen.jsx` | Cosmic loading animation |
| `ResetPassword.jsx` | Password reset form |

## Styling Patterns

- Use Tailwind utility classes exclusively
- Glass morphism: `className="glass glow-border rounded-xl p-4"`
- Buttons always have `cursor-pointer`
- Font Orbitron for headings: `font-orbitron`
- Cyan accent color: `text-cyan-300`, `bg-cyan-600`, `border-cyan-500`
- Dark theme: `bg-gray-950`, `text-gray-300`
- Responsive: mobile-first, use `md:` breakpoint for desktop

## State Management

- No global state library (no Redux/Zustand)
- State lives in `App.jsx` and is passed down as props
- Complex data fetching logic is in custom hooks (`src/hooks/`)
- Supabase Realtime subscriptions are managed inside hooks

## Patterns

```jsx
// Standard component structure
function MyComponent({ prop1, prop2, onAction }) {
  const [state, setState] = useState(null)
  
  // ... logic
  
  return (
    <div className="glass glow-border rounded-xl p-6">
      {/* content */}
    </div>
  )
}

export default MyComponent
```

## 3D Components (Scene + StarNode)

- `Scene.jsx` manages OrbitControls, camera animation, ambient particles
- `StarNode.jsx` renders each question as a sphere with emissive glow
- Colors are blended from domain weights using `getBlendedColor()`
- Position on sphere determined by `computePositions()` from coordinateMapper
