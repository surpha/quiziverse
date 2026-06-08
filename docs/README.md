# Quiziverse Documentation

This folder contains comprehensive project documentation for developers and AI agents.

## Structure

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, data flow, deployment |
| [COMPONENTS.md](COMPONENTS.md) | All React components with props and behavior |
| [DATA-MODEL.md](DATA-MODEL.md) | Database schema, Supabase tables, RLS policies |
| [FEATURES.md](FEATURES.md) | Feature specifications and user flows |
| [3D-RENDERING.md](3D-RENDERING.md) | Three.js globe, coordinate mapping, visual system |
| [API-INTEGRATIONS.md](API-INTEGRATIONS.md) | Supabase, Groq/Gemini LLM, Google OAuth |

## For AI Agents

If you're an AI agent working on this codebase:

1. Start with `ARCHITECTURE.md` for the big picture
2. Check `FEATURES.md` for user-facing behavior
3. Reference `DATA-MODEL.md` for database operations
4. See `COMPONENTS.md` for UI patterns
5. See `3D-RENDERING.md` for the globe visualization logic

## For VS Code Copilot

The `.github/instructions/` folder contains auto-loaded context files:
- `components.instructions.md` — loaded when editing `src/components/`
- `hooks.instructions.md` — loaded when editing `src/hooks/`
- `utils.instructions.md` — loaded when editing `src/utils/`
- `database.instructions.md` — loaded when editing `supabase/`
- `app-routing.instructions.md` — loaded when editing `src/App.jsx`

The `.github/copilot-instructions.md` file is **always loaded** as base context.
