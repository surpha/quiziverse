/**
 * Question type definitions for standard quiz formats.
 */

const QUESTION_TYPES = {
  straight:   { label: 'Straight',        icon: '❓', description: 'Direct factual question' },
  visual:     { label: 'Visual ID',       icon: '🖼️', description: 'Identify from an image' },
  audio:      { label: 'Audio ID',        icon: '🎵', description: 'Identify from a sound' },
  video:      { label: 'Video/Audio',     icon: '🎬', description: 'Watch or listen to media' },
  connect:    { label: 'Connect',         icon: '🔗', description: 'What connects these clues?' },
  fitb:       { label: 'Fill in Blank',   icon: '✏️', description: 'Complete the phrase' },
  longform:   { label: 'Long Form',       icon: '📜', description: 'Multi-part progressive clues' },
  list:       { label: 'List',            icon: '📋', description: 'Name X things that...' },
  truefalse:  { label: 'True / False',    icon: '✅', description: 'Verify the statement' },
  bounce:     { label: 'Quick Fire',      icon: '⚡', description: 'Rapid recall' },
  cryptic:    { label: 'Cryptic',         icon: '🧩', description: 'Wordplay or lateral thinking' },
};

export const QUESTION_TYPE_KEYS = Object.keys(QUESTION_TYPES);

export default QUESTION_TYPES;
