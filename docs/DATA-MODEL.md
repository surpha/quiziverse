# Data Model

## Entity Relationship

```
auth.users (Supabase Auth)
    │
    ├── 1:1 ──── profiles (role, username, avatar)
    │
    ├── 1:N ──── questions (submitted_by)
    │
    ├── 1:N ──── daily_attempts (user_id → daily_challenges)
    │
    ├── 1:N ──── event_attempts (user_id → events)
    │
    ├── 1:N ──── live_quiz_responses (user_id → live_quizzes)
    │
    └── 1:N ──── play_attempts (user_id + question_id)
```

## Tables

### questions
The core content table. Each row is a trivia question.

| Column | Type | Description |
|--------|------|-------------|
| id | text PK | Unique question ID |
| question | text | The question text |
| answer | text | The correct answer |
| source | text | Attribution/source |
| image_url | text | Image for visual questions |
| media_url | text | Audio/video URL |
| answer_image_url | text | Image shown with answer |
| answer_media_url | text | Media shown with answer |
| answer_explanation | text | Explanation of the answer |
| difficulty | smallint (1-10) | Difficulty rating |
| type | text | Question type (straight, visual, audio, connect, fitb, truefalse, cryptic, badexplain, trivia) |
| hints | jsonb | Array of `{ text, cost }` objects |
| weights | jsonb | Domain relevance map `{ domain: 1-10 }` |
| status | text | pending / staging / approved / rejected |
| submitted_by | uuid FK | User who contributed |
| reviewed_by | uuid FK | Admin who reviewed |
| reviewed_at | timestamptz | When reviewed |
| created_at | timestamptz | When submitted |

### profiles
User metadata and roles.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | References auth.users |
| email | text | User's email |
| role | text | user / quizmaster / admin |
| display_name | text | Display name |
| username | text UNIQUE | Public username |
| age_range | text | under18, 18-24, 25-34, 35-44, 45+ |
| favorite_domains | jsonb | Array of preferred domains |
| avatar_emoji | text | Emoji avatar (default: ✦) |
| created_at | timestamptz | Account creation |

### daily_challenges
One row per day's challenge set.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Challenge ID |
| challenge_date | date UNIQUE | IST date this challenge is for |
| questions | jsonb | Array of question objects with hints + max_score |
| merged_to_universe | boolean | Whether auto-added to main question bank |
| created_by | uuid FK | Admin who created |
| created_at | timestamptz | When created |

**Questions JSONB format**:
```json
[{
  "question": "Who painted the Mona Lisa?",
  "answer": "Leonardo da Vinci",
  "source": "Art History 101",
  "difficulty": 3,
  "type": "straight",
  "weights": { "arts": 9, "history": 7 },
  "hints": [
    { "text": "Italian Renaissance painter", "cost": 1 },
    { "text": "Also known for engineering designs", "cost": 2 },
    { "text": "His name starts with 'Leo'", "cost": 3 }
  ],
  "max_score": 10
}]
```

### daily_attempts
User progress on a daily challenge.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Attempt ID |
| user_id | uuid FK | The user |
| challenge_id | uuid FK | Which challenge |
| answers | jsonb | Array of answer objects |
| total_score | int | Cumulative score |
| completed | boolean | All questions answered? |
| current_index | int | Current question index |
| started_at | timestamptz | When started |
| completed_at | timestamptz | When finished |

**Answers JSONB format**:
```json
[{
  "question_index": 0,
  "answer": "Leonardo da Vinci",
  "verdict": "correct",
  "hints_used": [0],
  "score": 9
}]
```

### events
Event quiz sessions accessible via URL slug.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Event ID |
| slug | text UNIQUE | URL identifier (e.g. "company-quiz-2026") |
| title | text | Display title |
| description | text | Optional description |
| questions | jsonb | Same format as daily_challenges |
| is_active | boolean | Whether event is live |
| starts_at | timestamptz | Optional start time |
| ends_at | timestamptz | Optional end time |
| created_by | uuid FK | Creator |
| created_at | timestamptz | When created |

### event_attempts
User progress on events (with feedback).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Attempt ID |
| event_id | uuid FK | Which event |
| user_id | uuid FK | The user |
| answers | jsonb | Same as daily_attempts |
| total_score | int | Score |
| completed | boolean | Done? |
| current_index | int | Current question |
| started_at | timestamptz | Start |
| completed_at | timestamptz | End |
| rating_experience | smallint (1-5) | UX rating |
| rating_questions | smallint (1-5) | Question quality rating |
| feedback | text | Free-text feedback |

### live_quizzes
Real-time quiz sessions managed by quizmasters.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Quiz ID |
| slug | text UNIQUE | Join code |
| title | text | Quiz title |
| questions | jsonb | Question array |
| current_question | int | Index quizmaster is on |
| status | text | waiting / active / reviewing / finished |
| created_by | uuid FK | Quizmaster |
| created_at | timestamptz | Created |

### live_quiz_responses
Player answers in live quizzes.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Response ID |
| quiz_id | uuid FK | Which quiz |
| user_id | uuid FK | Which player |
| answers | jsonb | Array of answers per question |
| total_score | int | Running score |

### play_attempts
Free-play mode tracking (per question per user).

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid FK | User |
| question_id | text FK | Question |
| verdict | text | correct / incorrect / partial |
| answered_at | timestamptz | When answered |

**Unique constraint**: `(user_id, question_id)` — upsert pattern.

## IST Timezone Logic

Daily challenges use IST (UTC+5:30) for date boundaries:
```javascript
function getTodayIST() {
  const now = new Date()
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  return ist.toISOString().split('T')[0]  // "YYYY-MM-DD"
}
```
