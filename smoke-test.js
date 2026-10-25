const config = require('./config');
const { supabase } = require('./lib/clients');
const { embedText } = require('./lib/notes');
const { sleep } = require('./lib/retry');

const questions = [
  'What does Ask My Notes do when it cannot find an answer?',
  'Which embedding model is used?',
  'What is the capital of France?',
];

async function main() {
  for (const q of questions) {
    const embedding = await embedText(q);
    const { data, error } = await supabase.rpc('match_notes', {
      query_embedding: embedding,
      match_count: config.matchCount,
    });
    if (error) throw new Error(error.message);

    console.log(`\nQ: ${q}`);
    data.forEach((m, i) => {
      console.log(`  ${i + 1}. similarity ${m.similarity.toFixed(3)} | [${m.language}] ${m.title}`);
    });
    await sleep(config.paceDelayMs);
  }
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});