const fs = require('fs');
const path = require('path');
const { supabase } = require('../lib/clients');
const { embedText } = require('../lib/notes');
const { sleep } = require('../lib/retry');

const EMBED_PAUSE_MS = 1500;

// How to find the preamble and the article headings in each language's text file.
const SOURCES = [
  {
    language: 'en',
    file: 'udhr_en.txt',
    preambleStart: /^Preamble$/,
    preambleEnd: /^Now, therefore,/,
    heading: /^Article\s+(\d+)\s*$/,
  },
  {
    language: 'xh',
    file: 'udhr_xh.txt',
    preambleStart: /^ISINGENISO$/,
    preambleEnd: /^NGOKU-KE NGENXA YOKO,/,
    heading: /^Inqaku\D*(\d+)\s*$/,
  },
];

function joinLines(lines) {
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Splits one language's text into the preamble plus articles 1 to 30.
function splitDeclaration(text, src) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const start = lines.findIndex((l) => src.preambleStart.test(l));
  const end = lines.findIndex((l) => src.preambleEnd.test(l));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`[${src.language}] could not find the preamble boundaries.`);
  }

  const headings = [];
  lines.forEach((line, index) => {
    if (line.length >= 30) return;
    const match = src.heading.exec(line);
    if (match) headings.push({ index, number: Number(match[1]) });
  });

  if (headings.length !== 30) {
    throw new Error(`[${src.language}] expected 30 article headings, found ${headings.length}.`);
  }
  headings.forEach((h, k) => {
    if (h.number !== k + 1) {
      throw new Error(`[${src.language}] heading ${k + 1} has number ${h.number}; expected ${k + 1}.`);
    }
  });

  const pieces = [{ article: 'preamble', content: joinLines(lines.slice(start, end)) }];
  headings.forEach((h, k) => {
    const stop = k + 1 < headings.length ? headings[k + 1].index : lines.length;
    pieces.push({ article: String(h.number), content: joinLines(lines.slice(h.index, stop)) });
  });
  return pieces;
}

async function main() {
  const dryRun = process.argv.includes('--dry');

  const all = [];
  for (const src of SOURCES) {
    const text = fs.readFileSync(path.join(__dirname, 'corpus', src.file), 'utf8');
    for (const piece of splitDeclaration(text, src)) {
      all.push({ ...piece, language: src.language });
    }
  }

  console.log(`Split into ${all.length} pieces.`);
  all.forEach((p) => {
    const preview = p.content.slice(0, 48).replace(/\n/g, ' ');
    console.log(`${p.language} | ${p.article.padEnd(8)} | ${String(p.content.length).padStart(5)} chars | ${preview}`);
  });

  if (dryRun) {
    console.log('\nDry run: nothing was embedded or saved.');
    return;
  }

  // Skip anything already loaded, so running this twice never duplicates rows.
  const { data: existing, error } = await supabase
    .from('pilot_chunks')
    .select('article, language')
    .not('embedding', 'is', null);
  if (error) throw new Error(error.message);
  const done = new Set(existing.map((r) => `${r.language}|${r.article}`));

  let saved = 0;
  for (const p of all) {
    if (done.has(`${p.language}|${p.article}`)) {
      console.log(`skip  ${p.language} ${p.article} (already loaded)`);
      continue;
    }

    const embedding = await embedText(p.content);
    const { error: upsertError } = await supabase
      .from('pilot_chunks')
      .upsert(
        { article: p.article, language: p.language, content: p.content, embedding },
        { onConflict: 'article,language' }
      );
    if (upsertError) throw new Error(upsertError.message);

    saved++;
    console.log(`saved ${p.language} ${p.article}`);
    await sleep(EMBED_PAUSE_MS);
  }

  console.log(`\nDone. Saved ${saved} new row(s).`);
}

main().catch((err) => {
  console.error('Loader failed:', err.message);
  process.exit(1);
});