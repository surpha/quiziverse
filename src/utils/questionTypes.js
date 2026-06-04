/**
 * Question type definitions for standard quiz formats.
 */

const QUESTION_TYPES = {
  straight:   { label: 'Straight',        icon: '❓', description: 'Direct factual question' },
  visual:     { label: 'Visual ID',       icon: '🖼️', description: 'Identify from an image' },
  audio:      { label: 'Audio ID',        icon: '🎵', description: 'Identify from a sound' },
  connect:    { label: 'Connect',         icon: '🔗', description: 'What connects these clues?' },
  fitb:       { label: 'Fill in Blank',   icon: '✏️', description: 'Complete the phrase' },
  truefalse:  { label: 'True / False',    icon: '✅', description: 'Verify the statement' },
  cryptic:    { label: 'Cryptic',         icon: '🧩', description: 'Wordplay or lateral thinking' },
  badexplain: { label: 'Bad Explanation', icon: '🤪', description: 'Guess from a terrible description' },
  trivia:     { label: 'GK / Trivia',     icon: '🧠', description: 'General knowledge trivia' },
};

export const QUESTION_TYPE_KEYS = Object.keys(QUESTION_TYPES);

export default QUESTION_TYPES;
