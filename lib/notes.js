const config = require('../config');
const { supabase, embeddingModel } = require('./clients');
const { withRetry } = require('./retry');
const { chunkText } = require('./text');

const LANGUAGES = ['en', 'xh', 'mixed'];

async function embedText(text) {
  const result = await withRetry(() =>
    embeddingModel.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: config.embeddingDimensions,
    })
  );
  return result.embedding.values;
}

// Saves a note and its embedded chunks. Every chunk carries the note's language tag.
async function createNote(title, content, language = 'en') {
  if (!LANGUAGES.includes(language)) {
    throw new Error(`language must be one of: ${LANGUAGES.join(', ')}`);
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    throw new Error('Note content is empty.');
  }

  const { data: note, error: noteError } = await supabase
    .from('notes')
    .insert({ title, raw_content: content, language })
    .select()
    .single();

  if (noteError) throw new Error(noteError.message);

  try {
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      const { error } = await supabase
        .from('notes_chunks')
        .insert({ note_id: note.id, content: chunk, language, embedding });
      if (error) throw new Error(error.message);
    }
    return { note, chunkCount: chunks.length };
  } catch (err) {
    // Don't leave a half-saved note behind (its chunks are removed by cascade).
    await supabase.from('notes').delete().eq('id', note.id);
    throw err;
  }
}

module.exports = { embedText, createNote, LANGUAGES };