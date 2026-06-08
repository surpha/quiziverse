import { DOMAIN_KEYS } from './domainConfig'

/**
 * LLM-as-Judge: Classifies a question's difficulty (1-10) and domain weights.
 * Supports multiple providers via VITE_LLM_PROVIDER env var:
 *   - 'groq' (default) — free tier, uses Llama models
 *   - 'gemini' — Google Gemini API
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

2. **weights** (1-10 for each of 13 domains): How relevant is this question to each domain?
   Domains: technology, history, geography, science, literature, arts, music, society, religion, popCulture, sports, lifestyle, business

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
    "lifestyle": <1-10>,
    "business": <1-10>
  },
  "reasoning": "<one sentence explaining your classification>"
}`

export function isLLMConfigured() {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'groq'
  if (provider === 'gemini') return !!import.meta.env.VITE_GEMINI_API_KEY
  return !!import.meta.env.VITE_GROQ_API_KEY
}

// Multi-key rotation for Groq — supports VITE_GROQ_API_KEY and VITE_GROQ_API_KEY_2, _3, etc.
let groqKeyIndex = 0
function getGroqKeys() {
  const keys = []
  const primary = import.meta.env.VITE_GROQ_API_KEY
  if (primary) keys.push(primary)
  for (let i = 2; i <= 10; i++) {
    const k = import.meta.env[`VITE_GROQ_API_KEY_${i}`]
    if (k) keys.push(k)
  }
  return keys
}
function getNextGroqKey() {
  const keys = getGroqKeys()
  if (keys.length === 0) return null
  const key = keys[groqKeyIndex % keys.length]
  groqKeyIndex++
  return key
}

// Separate key pool for 8B fallback — VITE_GROQ_8B_KEY, VITE_GROQ_8B_KEY_2, etc.
// Falls back to primary keys if no 8B-specific keys are set
let groq8bKeyIndex = 0
function getGroq8bKeys() {
  const keys = []
  const primary = import.meta.env.VITE_GROQ_8B_KEY
  if (primary) keys.push(primary)
  for (let i = 2; i <= 10; i++) {
    const k = import.meta.env[`VITE_GROQ_8B_KEY_${i}`]
    if (k) keys.push(k)
  }
  // If no 8B-specific keys, reuse the primary keys
  return keys.length > 0 ? keys : getGroqKeys()
}
function getNext8bKey() {
  const keys = getGroq8bKeys()
  if (keys.length === 0) return null
  const key = keys[groq8bKeyIndex % keys.length]
  groq8bKeyIndex++
  return key
}

/** Get number of available Groq keys for parallelization */
export function getGroqKeyCount() {
  return getGroqKeys().length
}

/** Retry wrapper — retries on 429 with backoff */
async function withRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isRateLimit = err.message?.includes('429')
      if (isRateLimit && attempt < maxRetries) {
        // Wait longer on each retry: 3s, 6s
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
        continue
      }
      throw err
    }
  }
}

async function callGroq(userMessage) {
  const apiKey = getNextGroqKey()
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not configured')

  const model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile'

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 400,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content
}

async function callGemini(userMessage) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not configured')

  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-lite'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

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
  return data.candidates?.[0]?.content?.parts?.[0]?.text
}

export async function classifyQuestion(question, answer) {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'groq'
  const userMessage = `Question: ${question}\nAnswer: ${answer}`

  const content = provider === 'gemini'
    ? await callGemini(userMessage)
    : await callGroq(userMessage)

  if (!content) throw new Error('Empty LLM response')

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

const VERIFY_PROMPT = `You are an answer-checking assistant for a trivia quiz. You are given:
- The question
- The correct answer (verified by the quiz creator)
- The user's submitted answer

Your job is to determine if the user's submitted answer matches the correct answer. Be lenient with:
- Spelling mistakes (e.g. "Einsten" = "Einstein")
- Abbreviations (e.g. "US", "USA", "United States" are all the same)
- Minor wording differences (e.g. "Mount Everest" = "Everest")
- Extra words that don't change meaning
- Case differences

But mark as incorrect if the meaning is fundamentally different.

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "explanation": "<brief one-sentence explanation>"
}`

async function callGroqCustom(systemPrompt, userMessage) {
  const apiKey = getNextGroqKey()
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not configured')
  const model = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile'
  return callGroqCustomWithModel(systemPrompt, userMessage, apiKey, model)
}

const FALLBACK_MODEL = import.meta.env.VITE_GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant'

async function callGroqFallback(systemPrompt, userMessage) {
  const apiKey = getNext8bKey()
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not configured')
  return callGroqCustomWithModel(systemPrompt, userMessage, apiKey, FALLBACK_MODEL)
}

async function callGroqCustomWithModel(systemPrompt, userMessage, apiKey, model) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${err}`)
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content
}

async function callGeminiCustom(systemPrompt, userMessage) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not configured')
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-lite'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
      },
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${err}`)
  }
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text
}

export async function verifyAnswer(question, correctAnswer, submittedAnswer) {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'groq'
  const userMessage = `Question: ${question}\nCorrect Answer: ${correctAnswer}\nUser's Answer: ${submittedAnswer}`

  let content
  try {
    content = await withRetry(async () => {
      return provider === 'gemini'
        ? await callGeminiCustom(VERIFY_PROMPT, userMessage)
        : await callGroqCustom(VERIFY_PROMPT, userMessage)
    })
  } catch (primaryErr) {
    // Fallback: use llama-3.1-8b-instant (higher RPD limit, lighter model)
    console.warn(`Primary model failed, falling back to ${FALLBACK_MODEL}:`, primaryErr.message)
    content = await callGroqFallback(VERIFY_PROMPT, userMessage)
  }

  if (!content) throw new Error('Empty LLM response')

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const result = JSON.parse(jsonStr)

  return {
    verdict: result.verdict || 'unknown',
    explanation: result.explanation || '',
  }
}

const HINTS_PROMPT = `You are a hint generator for a trivia quiz called Quiziverse.

Given a trivia question and its correct answer, generate exactly 3 progressive hints that help a player arrive at the answer WITHOUT giving it away directly.

Rules for hints:
- Hint 1: Vague/broad clue — narrows the domain or era without revealing the answer
- Hint 2: More specific — gives a concrete detail or secondary fact that points toward the answer
- Hint 3: Almost gives it away — very specific clue that makes the answer obvious to someone on the right track
- NEVER include the answer itself (or obvious synonyms) in any hint
- Keep each hint to 1-2 sentences max
- Make hints interesting and educational, not just "it starts with the letter X"

Respond ONLY with valid JSON in this exact format:
{
  "hints": ["<hint 1>", "<hint 2>", "<hint 3>"]
}`

export async function generateHints(question, answer) {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'groq'
  const userMessage = `Question: ${question}\nAnswer: ${answer}`

  const content = provider === 'gemini'
    ? await callGeminiCustom(HINTS_PROMPT, userMessage)
    : await callGroqCustom(HINTS_PROMPT, userMessage)

  if (!content) throw new Error('Empty LLM response')

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const result = JSON.parse(jsonStr)

  if (!Array.isArray(result.hints) || result.hints.length === 0) {
    throw new Error('Invalid hints format from LLM')
  }

  return result.hints.slice(0, 3)
}

const FACT_CHECK_PROMPT = `You are a fact-checking assistant. Given a trivia question and its submitted answer, you must:
1. Independently determine what you believe the correct answer is.
2. Compare it with the submitted answer.
3. Determine if the submitted answer is correct, partially correct, or incorrect.

Respond ONLY with valid JSON in this exact format:
{
  "verdict": "correct" | "partially_correct" | "incorrect",
  "aiAnswer": "<your independent answer>",
  "explanation": "<brief explanation of why the submitted answer is correct/incorrect, and any nuances>"
}`

export async function factCheckAnswer(question, answer) {
  const provider = import.meta.env.VITE_LLM_PROVIDER || 'groq'
  const userMessage = `Question: ${question}\nSubmitted Answer: ${answer}`

  const content = provider === 'gemini'
    ? await callGeminiCustom(FACT_CHECK_PROMPT, userMessage)
    : await callGroqCustom(FACT_CHECK_PROMPT, userMessage)

  if (!content) throw new Error('Empty LLM response')

  const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const result = JSON.parse(jsonStr)

  return {
    verdict: result.verdict || 'unknown',
    aiAnswer: result.aiAnswer || '',
    explanation: result.explanation || '',
  }
}
