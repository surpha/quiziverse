import { DOMAIN_KEYS } from './domainConfig'

/**
 * LLM-as-Judge: Classifies a question's difficulty (1-10) and domain weights.
 * Uses Google Gemini API. Requires VITE_GEMINI_API_KEY env var.
 *
 * Returns { difficulty, weights, reasoning } or null on failure.
 */

const SYSTEM_PROMPT = `You are a question classifier for a knowledge graph called Quiziverse.

Given a trivia/knowledge question and its answer, you must determine:
1. **difficulty** (1-10): How hard is this question for an educated adult?
   - 1-2: Common knowledge anyone would know
   - 3-4: Basic education level
   - 5-6: Requires specific knowledge in a domain
   - 7-8: Expert-level, requires deep study
   - 9-10: PhD/specialist level, very obscure

2. **weights** (1-10 for each of 12 domains): How relevant is this question to each domain?
   Domains: technology, history, geography, science, literature, arts, music, society, religion, popCulture, sports, lifestyle

Respond ONLY with valid JSON in this exact format:
{
  "difficulty": <number 1-10>,
  "weights": {
    "technology": <1-10>,
    "history": <1-10>,
    "geography": <1-10>,
    "science": <1-10>,
    "literature": <1-10>,
    "arts": <1-10>,
    "music": <1-10>,
    "society": <1-10>,
    "religion": <1-10>,
    "popCulture": <1-10>,
    "sports": <1-10>,
    "lifestyle": <1-10>
  },
  "reasoning": "<one sentence explaining your classification>"
}`

export function isLLMConfigured() {
  return !!import.meta.env.VITE_GEMINI_API_KEY
}

export async function classifyQuestion(question, answer) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY not configured')
  }

  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const userMessage = `Question: ${question}\nAnswer: ${answer}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!content) throw new Error('Empty Gemini response')

  // Parse JSON from response (handle markdown code blocks)
  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const result = JSON.parse(jsonStr)

  // Validate and clamp values
  const difficulty = Math.max(1, Math.min(10, Math.round(result.difficulty || 5)))
  const weights = {}
  for (const key of DOMAIN_KEYS) {
    weights[key] = Math.max(1, Math.min(10, Math.round(result.weights?.[key] || 1)))
  }

  return {
    difficulty,
    weights,
    reasoning: result.reasoning || '',
  }
}
