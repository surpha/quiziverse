---
description: "Use when working with utility functions, domain configuration, coordinate mapping, LLM integration, or question type definitions."
applyTo: "src/utils/**"
---
# Utilities Guidelines

## Files

### `domainConfig.js`
- Defines 13 knowledge domains with colors + emissive values for 3D rendering
- Exports: `DOMAINS` (default), `DOMAIN_KEYS`, `getBlendedColor(weights)`, `getDominantDomain(weights)`
- Domains: technology, history, geography, science, literature, arts, music, society, religion, popCulture, sports, lifestyle, business

### `coordinateMapper.js`
- Maps questions onto a 3D sphere based on domain weights + difficulty
- Angle (θ, φ) = weighted average of domain directions (circular mean)
- Radius = difficulty (easy=close to center, hard=outer)
- Exports: `computePositions(questions)` — adds `.position` [x,y,z] to each question
- Each domain has a fixed angular position on the sphere for clustering

### `questionTypes.js`
- Defines 9 question types: straight, visual, audio, connect, fitb, truefalse, cryptic, badexplain, trivia
- Each has: label, icon (emoji), description
- Exports: `QUESTION_TYPES` (default), `QUESTION_TYPE_KEYS`

### `llmJudge.js`
- LLM-as-Judge for auto-classifying questions
- Supports Groq (default, free tier Llama models) or Google Gemini
- Input: question + answer text
- Output: `{ difficulty: 1-10, weights: { domain: 1-10 }, reasoning: string }`
- Provider selected via `VITE_LLM_PROVIDER` env var
- Exports: `isLLMConfigured()`, `classifyQuestion(question, answer)`

## Domain Weight System

Questions have a `weights` object mapping each domain to a relevance score (1-10):
```json
{
  "technology": 8,
  "science": 6,
  "history": 3,
  "geography": 1,
  ...
}
```

The dominant domain (highest weight) determines the star's primary color cluster on the globe. Blended colors create unique hues for interdisciplinary questions.

## Coordinate Mapping Algorithm

1. Each domain has a fixed (θ, φ) on the sphere
2. Question's angular position = weighted circular mean of its domain angles
3. Weights are squared to emphasize dominant domains
4. Radius = `BASE_RADIUS + difficulty * SCALE` (easy=inner, hard=outer)
5. Small random jitter prevents overlap for similar questions
