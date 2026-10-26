const fs = require('fs');
const path = require('path');

const word = process.argv.slice(2).join(' ').trim().toLowerCase();
if (!word) {
  console.log('Usage: node pilot\\find-word.js "word"');
  process.exit(0);
}

const SOURCES = [
  { label: 'English', file: 'udhr_en.txt', preamble: /^Preamble$/, heading: /^Article\s+(\d+)\s*$/ },
  { label: 'isiXhosa', file: 'udhr_xh.txt', preamble: /^ISINGENISO$/, heading: /^Inqaku\D*(\d+)\s*$/ },
];

for (const src of SOURCES) {
  const lines = fs.readFileSync(path.join(__dirname, 'corpus', src.file), 'utf8').split(/\r?\n/);
  let current = null;
  const hits = new Set();

  for (const raw of lines) {
    const line = raw.trim();
    if (src.preamble.test(line)) { current = 'preamble'; continue; }
    const match = line.length < 30 ? src.heading.exec(line) : null;
    if (match) { current = match[1]; continue; }
    if (current && line.toLowerCase().includes(word)) hits.add(current);
  }

  const sorted = [...hits].sort((a, b) => {
    if (a === 'preamble') return -1;
    if (b === 'preamble') return 1;
    return Number(a) - Number(b);
  });
  console.log(`${src.label}: "${word}" appears in ${sorted.length} piece(s): ${sorted.join(', ') || 'none'}`);
}