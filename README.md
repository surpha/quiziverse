# ✦ Quiziverse

**The Knowledge Galaxy** — An interactive 3D knowledge graph where questions exist as glowing stars on a spherical universe.

🌐 **Live:** [quiziverse-tau.vercel.app](https://quiziverse-tau.vercel.app/)

---

## Overview

Quiziverse visualizes a quiz question bank as a 3D constellation. Each question is a glowing sphere positioned on a spherical globe based on its properties:

- **Radius** (distance from center) = Difficulty (1–10)
- **Angular position** = Primary knowledge domain
- **Glow intensity** = Difficulty level
- **Size** = Number of active domains
- **Visual traits** (pulse, rings, flicker, halo) = Question type

Players sign in, configure filters (domains, difficulty, question type), and spin the globe to discover questions.

---

## Features

### 🌍 3D Visualization
- Spherical globe with orbit shells showing difficulty levels
- Constellation lines connecting same-domain questions
- Uniform glowing spheres with per-type visual traits (pulse speed, rings, flicker, halos)
- Starfield background, orbit controls (zoom/rotate/pan)
- Spinning globe + camera zoom animation during play

### 🎮 Play Mode
- **Play Filters** — Choose domains, difficulty range (1–10), and question types before starting
- Filtered question pool with session tracking (no repeats)
- Fallback to full pool when filtered questions are exhausted
- Spin → zoom → reveal card flow

### 🔐 Authentication
- Email/password auth via Supabase
- Landing page with spinning globe — must sign in to access questions
- Enhanced sign-up with persona fields:
  - Display name, username, age range, favorite domains, avatar emoji
- Profile shown in top-right with avatar

### 📝 Question Cards
- 11 question types: Straight, Visual ID, Audio ID, Video, Connect, Fill-in-Blank, Long Form, List, True/False, Quick Fire, Cryptic
- Difficulty dots (1–10)
- Media embed support (YouTube, audio, video, generic links)
- Image display from Supabase Storage or URL

### 🤖 AI-Powered Features
- **LLM Classification** — Auto-classify questions with difficulty score and domain weights (Groq / Llama 3.3 70B)
- **Answer Verification** — AI checks submitted answers as correct / partially correct / incorrect
- Backup provider support (Gemini)

### 🛠️ Admin Panel
- **3-tab workflow**: Pending → Staging → Live
- Inline edit/expand before approving
- AI Classify & AI Verify actions
- Delete functionality across all tabs
- Expandable questions in Live tab

### 📤 Community Contributions
- Contribution form with all fields (question, answer, type, difficulty, domains, media URL, image)
- AI Suggest button for auto-classification
- Submissions go to Pending for admin review

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 8 |
| 3D | Three.js, @react-three/fiber, @react-three/drei |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI/LLM | Groq (Llama 3.3 70B), Gemini (backup) |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── App.jsx                    # Main app with auth gating + play flow
├── components/
│   ├── LoadingScreen.jsx      # Branded splash with animated starfield
│   ├── Scene.jsx              # 3D scene (globe, shells, constellations, camera)
│   ├── StarNode.jsx           # Individual question node (sphere + glow effects)
│   ├── PlayFilters.jsx        # Pre-play filter panel (domains, difficulty, types)
│   ├── QuestionCard.jsx       # Question display with media embed
│   ├── AuthModal.jsx          # Sign-in/sign-up with persona fields
│   ├── AdminPanel.jsx         # 3-tab admin (Pending/Staging/Live)
│   ├── ContributeForm.jsx     # Community question submission
│   └── Legend.jsx             # Domain color legend
├── hooks/
│   ├── useAuth.js             # Supabase Auth + profile/role management
│   └── useQuestions.js        # Data fetching (Supabase primary, local fallback)
├── utils/
│   ├── coordinateMapper.js    # Spherical position calculation
│   ├── domainConfig.js        # 12 domains with colors + helpers
│   ├── questionTypes.js       # 11 question type definitions
│   └── llmJudge.js            # LLM classification + answer verification
├── lib/
│   └── supabase.js            # Supabase client initialization
└── data/
    └── questions.json         # Local fallback question bank
```

---

## 12 Knowledge Domains

| Domain | Color |
|--------|-------|
| Technology & Innovation | Cyan |
| History & Civilization | Amber |
| Geography & Places | Emerald |
| Science & Nature | Blue |
| Literature & Language | Violet |
| Arts & Architecture | Pink |
| Music & Performing Arts | Rose |
| Society & Politics | Slate |
| Religion & Mythology | Purple |
| Pop Culture & Entertainment | Yellow |
| Sports & Games | Green |
| Lifestyle & Practical | Orange |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (free tier)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
git clone https://github.com/surpha/quiziverse.git
cd quiziverse
npm install
```

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

VITE_LLM_PROVIDER=groq
VITE_GROQ_API_KEY=your-groq-api-key
VITE_GROQ_MODEL=llama-3.3-70b-versatile

# Optional: Gemini backup
VITE_GEMINI_API_KEY=your-gemini-key
VITE_GEMINI_MODEL=gemini-2.0-flash-lite
```

### Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor. This creates:
- `questions` table with RLS policies
- `profiles` table with persona fields + auto-creation trigger
- Admin policies for moderation

To make yourself admin:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Run

```bash
npm run dev
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables in Vercel Settings → Environment Variables
4. Deploy — auto-deploys on every push to `main`

**Important:** Add your Vercel URL to Supabase → Authentication → URL Configuration → Redirect URLs.

---

## Contributing (Branch Workflow)

We use a branch-based workflow. Never push directly to `main`.

### 1. Create a feature branch

```bash
git checkout main
git pull
git checkout -b feat/your-feature-name
```

### 2. Make changes & commit

```bash
git add -A && git commit -m "feat: short description"
```

### 3. Test locally

```bash
npm run dev
```

Open `http://localhost:5173` (or the next available port shown in terminal) and verify your changes.

### 4. Push & open a Pull Request

```bash
git push origin feat/your-feature-name
```

Go to GitHub — click the "Compare & Pull Request" banner. Add a description of what you changed, then create the PR.

### 5. Preview deployment

Vercel automatically deploys every branch as a **Preview URL** (visible in the PR). Use this to test the production build before merging.

### 6. Merge

Once reviewed and approved, merge the PR on GitHub. Production (`main`) auto-deploys.

### 7. Clean up locally

```bash
git checkout main
git pull
git branch -d feat/your-feature-name
```

### Summary

| Environment | URL |
|---|---|
| Local dev | `npm run dev` → localhost |
| Preview (per branch) | Auto-created by Vercel on push |
| Production | `main` → [quiziverse-tau.vercel.app](https://quiziverse-tau.vercel.app/) |

---

## Question Workflow

```
Contributor submits → Pending
        ↓
Admin reviews (AI Classify, AI Verify, Edit)
        ↓
    Stage (optional)
        ↓
    Approve → Live (visible on globe)
```

---

## License

MIT
