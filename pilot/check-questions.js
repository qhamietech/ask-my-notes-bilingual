const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'questions.json');

// Questions already tried with try.js. They must not be in the pilot.
const SEEN = [
  'What does the Declaration say about slavery?',
  'What does the Declaration say about torture?',
  'Does the Declaration say anything about the price of bread?',
  'Ingaba wonke umntu unama lungelo alinganayo?',
];

const norm = (s) => String(s).toLowerCase().replace(/[\s?.!]+$/g, '').trim();
const seen = new Set(SEEN.map(norm));

let questions;
try {
  questions = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (err) {
  console.log('Could not read pilot/questions.json:', err.message);
  console.log('This usually means a missing comma, a missing quotation mark or a stray character.');
  process.exit(1);
}
if (!Array.isArray(questions)) {
  console.log('questions.json must be a list, starting with [ and ending with ].');
  process.exit(1);
}

const problems = [];
const warnings = [];
const ids = new Set();

questions.forEach((q, i) => {
  const label = q && q.id ? q.id : `entry ${i + 1}`;
  if (!q || typeof q !== 'object') {
    problems.push(`${label}: not a valid entry`);
    return;
  }

  if (typeof q.id !== 'string' || !q.id) problems.push(`${label}: missing id`);
  else if (ids.has(q.id)) problems.push(`${label}: duplicate id`);
  else ids.add(q.id);

  if (!['en', 'xh', 'mixed'].includes(q.language)) {
    problems.push(`${label}: language must be en, xh or mixed`);
  }

  if (typeof q.question !== 'string' || q.question.trim().length < 8) {
    problems.push(`${label}: question text is missing or too short`);
  } else if (q.question.includes('WRITE YOUR QUESTION')) {
    problems.push(`${label}: question is still the placeholder`);
  } else if (seen.has(norm(q.question))) {
    problems.push(`${label}: this question was already tried in try.js, so it cannot be in the pilot`);
  }

  if (typeof q.answerable !== 'boolean') {
    problems.push(`${label}: answerable must be true or false, without quotation marks`);
  } else if (q.answerable) {
    const ok =
      typeof q.expected_article === 'string' &&
      (q.expected_article === 'preamble' || /^([1-9]|[12][0-9]|30)$/.test(q.expected_article));
    if (!ok) problems.push(`${label}: expected_article must be "preamble" or "1" to "30", in quotation marks`);
  } else if (q.expected_article !== null) {
    problems.push(`${label}: unanswerable questions need expected_article set to null`);
  }
});

// Each isiXhosa answerable question should ask about the same article as its English pair.
questions.forEach((q) => {
  if (!q || !q.answerable || typeof q.id !== 'string' || !q.id.startsWith('xh-')) return;
  const pair = questions.find((e) => e && e.id === q.id.replace('xh-', 'en-'));
  if (pair && pair.answerable && pair.expected_article !== q.expected_article) {
    warnings.push(`${q.id} (article ${q.expected_article}) and ${pair.id} (article ${pair.expected_article}) do not ask about the same article`);
  }
});

// Summary
const count = (lang, answerable) =>
  questions.filter((q) => q && q.language === lang && q.answerable === answerable).length;
console.log(`Questions in file: ${questions.length}`);
['en', 'xh', 'mixed'].forEach((lang) => {
  console.log(`  ${lang}: ${count(lang, true)} answerable, ${count(lang, false)} unanswerable`);
});

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.forEach((w) => console.log('  - ' + w));
}

if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s) to fix:`);
  problems.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}

console.log('\nLooks valid.');