const config = require('../config');
const { supabase } = require('../lib/clients');
const { embedText } = require('../lib/notes');

// filterLanguage: 'en', 'xh', or null for both languages.
async function search(embedding, filterLanguage) {
  const { data, error } = await supabase.rpc('match_pilot_chunks', {
    query_embedding: embedding,
    match_count: config.matchCount,
    filter_language: filterLanguage,
  });
  if (error) throw new Error(error.message);
  return data;
}

function show(label, rows) {
  console.log(`\n${label}`);
  rows.forEach((r, i) => {
    const start = r.content.slice(0, 50).replace(/\s+/g, ' ');
    console.log(`  ${i + 1}. ${r.similarity.toFixed(3)} | ${r.language} | article ${r.article} | ${start}`);
  });
}

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question) {
    console.log('Usage: node pilot\\try.js "your question"');
    return;
  }

  const embedding = await embedText(question);
  console.log(`Question: ${question}`);
  console.log(`Threshold in config.js: ${config.similarityThreshold}`);

  show('Both languages:', await search(embedding, null));
  show('English only:', await search(embedding, 'en'));
  show('isiXhosa only:', await search(embedding, 'xh'));
}

main().catch((err) => {
  console.error('Search failed:', err.message);
  process.exit(1);
});