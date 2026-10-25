// Splits text into overlapping pieces. Stops at the end of the text, so the
// last chunk is never duplicated.
function chunkText(text, chunkSize = 2000, overlap = 200) {
  if (overlap >= chunkSize) {
    throw new Error('overlap must be smaller than chunkSize');
  }

  const clean = text.trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = start + chunkSize;
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = end - overlap;
  }

  return chunks;
}

module.exports = { chunkText };