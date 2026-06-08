---
description: "Use when creating or modifying custom hooks in src/hooks/. Covers data fetching patterns, Supabase integration, and real-time subscriptions."
applyTo: "src/hooks/**"
---
# Hooks Guidelines

## Hook Architecture

All hooks live in `src/hooks/`. Each hook encapsulates a specific data concern.

### Available Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useAuth()` | Auth state, profile, role checks | `{ user, profile, isAdmin, isQuizmaster, loading, signIn, signUp, signOut, signInWithGoogle, recoveryMode }` |
| `useQuestions()` | Load questions from Supabase or local fallback | `{ questions, loading, error, source, refetch }` |
| `useDailyChallenge(userId)` | Today's daily challenge + user's attempt | `{ challenge, attempt, loading, error, submitAnswer, refetch }` |
| `useDailyChallengeByDate(date, userId)` | Challenge for a specific date | Same as useDailyChallenge |
| `useEvent(slug, userId)` | Event data, attempts, leaderboard | `{ event, attempt, leaderboard, loading, error, submitAnswer }` |
| `useLiveQuiz(slug, userId)` | Live quiz with real-time sync | `{ quiz, response, loading, error, submitAnswer }` |
| `usePlayAttempts(userId)` | User's play mode history | `{ attempts, recordAttempt, loading }` |

## Patterns

### Supabase with Timeout + Fallback

```javascript
// Always race Supabase queries against a timeout
const queryPromise = supabase.from('table').select('*')
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timed out')), 10000)
)
const { data, error } = await Promise.race([queryPromise, timeoutPromise])
```

### Graceful Degradation

```javascript
// Check if Supabase is configured before making calls
if (!isSupabaseConfigured()) {
  setLoading(false)
  return
}
```

### Real-time Subscriptions (Live Quiz)

```javascript
// Subscribe to postgres_changes for live updates
const channel = supabase
  .channel(`live-quiz-${quiz.id}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'live_quizzes',
    filter: `id=eq.${quiz.id}`,
  }, (payload) => {
    setQuiz(payload.new)
  })
  .subscribe()

// Cleanup on unmount
return () => supabase.removeChannel(channel)
```

### Profile Fetching (with timeout)

The `useAuth` hook fetches user profile with a 4-second timeout to avoid hanging.

## Role System

- `profile.role` is one of: `'user'`, `'quizmaster'`, `'admin'`
- `isAdmin` = role is 'admin'
- `isQuizmaster` = role is 'admin' OR 'quizmaster'
- Quizmasters can create/manage live quizzes
- Admins can do everything (approve questions, manage events, analytics)

## Data Flow

```
Supabase → Hook (fetch + transform) → App.jsx (state) → Components (props)
                                                ↓
                                        Play mode logic
                                        Filter logic
                                        Zoom/spin animations
```
