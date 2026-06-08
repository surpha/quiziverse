# API Integrations

## 1. Supabase

### Client Setup
```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isSupabaseConfigured = () => supabase !== null
```

### Authentication

**Email + Password**:
```javascript
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signUp({ email, password })
```

**Google OAuth**:
```javascript
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

**Session management**: `onAuthStateChange` listener in `useAuth` hook.

### Database Queries

**Pattern**: Always race against timeout for resilience.
```javascript
const { data, error } = await Promise.race([
  supabase.from('table').select('*').eq('column', value),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
])
```

**Common operations**:
- `questions` — SELECT where status='approved', ordered by id
- `profiles` — SELECT/UPDATE by user id
- `daily_challenges` — SELECT by challenge_date
- `daily_attempts` — UPSERT by (user_id, challenge_id)
- `events` — SELECT by slug where is_active=true
- `play_attempts` — UPSERT by (user_id, question_id)

### Realtime (WebSocket)

Used for live quizzes — subscribes to row changes:
```javascript
supabase.channel('channel-name')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'live_quizzes',
    filter: `id=eq.${quizId}`,
  }, callback)
  .subscribe()
```

### Graceful Fallback

If Supabase is not configured (no env vars), the app:
- Uses `src/data/questions.json` as question source
- Disables auth features
- Works as a read-only demo

---

## 2. Groq API (LLM Classification)

**Purpose**: Auto-classify contributed questions (difficulty + domain weights).

**Endpoint**: `https://api.groq.com/openai/v1/chat/completions`

**Model**: Llama (free tier)

**Request**:
```javascript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Question: ${question}\nAnswer: ${answer}` }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  })
})
```

**Response format**:
```json
{
  "difficulty": 6,
  "weights": {
    "technology": 8,
    "science": 5,
    "history": 2,
    ...
  },
  "reasoning": "This question about quantum computing requires..."
}
```

---

## 3. Google Gemini API (Alternative LLM)

**Purpose**: Same as Groq — fallback/alternative provider.

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`

**Selection**: Via `VITE_LLM_PROVIDER` env var ('groq' or 'gemini').

---

## 4. Google OAuth (via Supabase)

Configured in Supabase dashboard:
- Google Cloud Console → OAuth consent screen → Client ID/Secret
- Supabase Auth → Providers → Google → enable + paste credentials
- Redirect URL: Supabase's default auth callback

---

## Environment Variables Summary

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| VITE_SUPABASE_URL | For DB features | none | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | For DB features | none | Supabase anonymous key |
| VITE_GROQ_API_KEY | For LLM | none | Groq API key |
| VITE_GEMINI_API_KEY | For LLM (alt) | none | Google Gemini key |
| VITE_LLM_PROVIDER | No | 'groq' | LLM provider selection |

**Note**: All vars prefixed with `VITE_` are exposed to the client bundle. API keys are called from the browser (acceptable for free-tier/low-risk keys, but not ideal for production secrets).
