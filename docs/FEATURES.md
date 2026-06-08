# Features

## 1. Knowledge Globe (3D Visualization)

**What**: An interactive 3D sphere where each question is a glowing star.
**How**:
- Position determined by domain weights (angle) + difficulty (radius)
- Colors blended from domain weights
- Click a star → zoom in + show question card
- OrbitControls for rotate/zoom/pan
- Filters dim non-matching stars

**User interaction**: Rotate globe, zoom in to see easy questions (center), zoom out for hard ones (outer shell), click stars to explore.

---

## 2. Play Mode

**What**: Gamified quiz session with randomized questions.
**Flow**:
1. Click "Play" → configure filters (domains, difficulty, types)
2. Globe spins → random question selected → camera zooms to star
3. Question card shows → user answers → verdict recorded
4. "Next" repeats until user exits
5. Questions not repeated until pool exhausted

**Scoring**: Tracked via `play_attempts` table with verdicts (correct/incorrect/partial).

---

## 3. Daily Challenge

**What**: A set of questions published each day (IST timezone).
**Flow**:
1. Admin creates challenge via DailyChallengeAdmin
2. Users get auto-popup on login if not attempted
3. Sequential questions with optional hints (cost deducted from max_score)
4. Progress saved after each answer (can resume)
5. Completion shows total score

**Leaderboard**: Based on total_score + completion time.

**Routes**: `/daily-challenge` for full-page experience, or inline popup on main page.

---

## 4. Events

**What**: Custom quiz sessions accessible via URL (`?event=slug`).
**Flow**:
1. Admin creates event with slug, questions, optional time bounds
2. Share URL: `https://quiziverse.app?event=my-event`
3. Users sign in → play event → scores tracked
4. Leaderboard shows top participants
5. Optional ratings + feedback collection

**Use cases**: Corporate quizzes, class assessments, competitions.

---

## 5. Live Quiz

**What**: Real-time multiplayer quiz hosted by a quizmaster.
**Flow**:
1. Quizmaster creates quiz at `/live` → gets join code + QR
2. Players join via `/live?code=ABCDEF`
3. Quizmaster advances questions one by one (real-time via Supabase)
4. Players submit answers within time limit
5. Quizmaster evaluates → scores update live
6. Leaderboard visible to all in real-time

**Tech**: Supabase Realtime (postgres_changes) for state sync.

---

## 6. Question Contribution

**What**: Users can submit new questions for review.
**Flow**:
1. User fills ContributeForm (question, answer, type, source, hints)
2. LLM auto-classifies: difficulty + domain weights (Groq/Gemini)
3. Question saved as `status: 'pending'`
4. Admin reviews in AdminPanel → approve/reject/staging
5. Approved questions appear on the globe

---

## 7. Authentication & Roles

**Methods**: Email+password, Google OAuth
**Roles**:
- `user` — play, contribute, view profile
- `quizmaster` — all user perms + create/manage live quizzes
- `admin` — all perms + approve questions, manage events/daily, analytics

**Profile setup**: Username selection modal after first signup.

---

## 8. User Profile

**What**: Personal stats page showing quiz history and preferences.
**Shows**: Total questions answered, accuracy rate, favorite domains, daily challenge streak, avatar emoji.

---

## 9. Analytics Dashboard

**What**: Admin-only analytics powered by Recharts.
**Shows**: Question submission trends, approval rates, domain distribution, user activity, daily challenge participation.

---

## 10. Onboarding Tour

**What**: First-visit guided walkthrough explaining the UI elements.
**Triggers**: Automatically on first authenticated visit.

---

## 11. Mobile (Capacitor)

**What**: Native Android + iOS apps wrapping the same web app.
**How**: Capacitor WebView loads the built SPA from `public/`.
**Specifics**: No native-specific code; same React app with responsive CSS.
