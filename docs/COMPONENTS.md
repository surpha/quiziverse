# Components Reference

All components live in `src/components/` (flat structure, no subdirectories).

---

## Core 3D Components

### Scene.jsx
**Purpose**: The Three.js 3D scene containing the knowledge globe.

**Props**:
- `onSelectQuestion(question)` — callback when a star is clicked
- `filters` — `{ domains: string[], types: string[] }` to dim non-matching stars
- `questions` — array of positioned questions
- `isSpinning` — auto-rotate the globe
- `isZooming` — animate camera toward `zoomTarget`
- `zoomTarget` — `[x, y, z]` position to zoom toward

**Contains**: OrbitControls, ambient lighting, particle field, StarNode instances.

---

### StarNode.jsx
**Purpose**: Renders a single question as a glowing sphere in 3D space.

**Props**:
- `position` — `[x, y, z]` from coordinateMapper
- `color` — hex color (blended from domain weights)
- `emissive` — hex emissive color for glow
- `size` — sphere radius
- `onClick` — click handler
- `dimmed` — reduced opacity when filtered out

**Behavior**: Hover effect (scale up), click triggers zoom animation.

---

## Authentication

### AuthModal.jsx
**Purpose**: Sign in / Sign up modal with email+password and Google OAuth.

**Props**:
- `onClose()` — close modal
- `signIn(email, password)` — from useAuth
- `signUp(email, password, profileData)` — from useAuth
- `signInWithGoogle()` — from useAuth

**Features**: Toggle between sign-in/sign-up, forgot password link, Google button.

---

### UsernameSetup.jsx
**Purpose**: First-time username selection after signup.

**Props**:
- `userId` — current user ID
- `onComplete(username)` — callback after username is set

---

### ResetPassword.jsx
**Purpose**: Password reset form (shown when recovery mode is active).

**Props**:
- `onDone()` — callback after password is reset

---

## Play Mode

### QuestionCard.jsx
**Purpose**: Full-screen card showing a question during play mode.

**Props**:
- `question` — question object with all fields
- `onNext()` — advance to next question
- `onClose()` — exit play mode
- `userId` — for recording attempts
- `recordAttempt(questionId, verdict)` — from usePlayAttempts
- `attempts` — map of past attempts for this user

**Behavior**: Shows question → user types answer → reveals answer → optional LLM judging → "I got it" / "I didn't" → records verdict.

---

### PlayFilters.jsx
**Purpose**: Modal to configure play session before starting.

**Props**:
- `onStart(filterSettings)` — start play with selected filters
- `onClose()` — cancel

**Filter settings**: `{ domains: string[], difficultyMin: number, difficultyMax: number, types: string[] }`

---

## Daily Challenge

### DailyChallenge.jsx
**Purpose**: Inline popup widget for today's daily challenge.

**Props**:
- `userId` — current user
- `onClose()` — close popup

---

### DailyChallengePage.jsx
**Purpose**: Full-page daily challenge experience (route: `/daily-challenge`).

**Props**:
- `onExit()` — navigate back to main app

**Behavior**: Sequential questions, hints with score deduction, progress bar, completion screen with score.

---

### DailyChallengeArchive.jsx
**Purpose**: Browse and replay past daily challenges.

---

### DailyChallengeAdmin.jsx
**Purpose**: Admin interface to create/schedule daily challenges.

**Access**: Admin role only.

---

## Events

### EventChallenge.jsx
**Purpose**: Event quiz player (URL: `?event=slug`).

**Props**:
- `slug` — event identifier
- `userId` — current user
- `profile` — user profile
- `onExit()` — leave event

**Behavior**: Similar to daily challenge but event-scoped with leaderboard + optional ratings.

---

### EventAdmin.jsx
**Purpose**: Admin interface to create/manage events.

**Access**: Admin role only.

---

## Live Quiz

### LiveQuizAdmin.jsx
**Purpose**: Quizmaster panel to create and run live quizzes.

**Props**:
- `userId` — quizmaster's user ID
- `isAdmin` — boolean
- `profile` — quizmaster profile
- `onClose()` — exit

**Features**: Create quiz, add questions, generate join code/QR, advance questions in real-time, evaluate answers, show leaderboard.

---

### LiveQuizPlayer.jsx
**Purpose**: Real-time quiz player interface.

**Props**:
- `slug` — quiz join code
- `userId` — player user ID
- `profile` — player profile
- `onExit()` — leave quiz

**Behavior**: Real-time question display via Supabase Realtime, submit answers, see score updates.

---

### LiveQuizLeaderboard.jsx
**Purpose**: Real-time leaderboard during live quiz.

---

## Admin & Analytics

### AdminPanel.jsx
**Purpose**: Question review panel (approve/reject/staging).

**Access**: Admin role only.

**Features**: List pending questions, preview, approve/reject with one click, bulk operations.

---

### AnalyticsDashboard.jsx
**Purpose**: Admin analytics with charts (Recharts).

**Access**: Admin role only.

**Shows**: Question stats, user activity, domain distribution, daily challenge participation.

---

## Filters & Navigation

### FilterPanel.jsx
**Purpose**: Desktop sidebar filter panel for explore mode.

### Legend.jsx
**Purpose**: Domain color legend overlay showing all 13 domains.

### TypeFilter.jsx
**Purpose**: Question type filter chips (straight, visual, audio, etc.).

---

## User

### UserProfile.jsx
**Purpose**: User profile page showing stats, achievements, favorite domains.

### ContributeForm.jsx
**Purpose**: Form for users to submit new questions (with LLM auto-classification).

---

## UX

### LoadingScreen.jsx
**Purpose**: Cosmic-themed loading animation shown during initial data fetch.

### OnboardingTour.jsx
**Purpose**: First-visit guided tour explaining the interface.
