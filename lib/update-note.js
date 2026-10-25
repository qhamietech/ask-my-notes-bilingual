const { supabase } = require('./clients');
const { chunkText } = require('./text');
const { embedText, LANGUAGES } = require('./notes');

// Replaces a note's text and chunks. New chunks are embedded BEFORE anything is
// changed, so an embedding failure leaves the old version untouched.
async function updateNote(id, title, content, language) {
  if (!LANGUAGES.includes(language)) {
    throw new Error(`language must be one of: ${LANGUAGES.join(', ')}`);
  }

  const chunks = chunkText(content);
  if (chunks.length === 0) {
    throw new Error('Note content is empty.');
  }

  const rows = [];
  for (const chunk of chunks) {
    rows.push({ note_id: id, content: chunk, language, embedding: await embedText(chunk) });
  }

  const { data: note, error: updateError } = await supabase
    .from('notes')
    .update({ title, raw_content: content, language, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (updateError) throw new Error(updateError.message);

  const { error: deleteError } = await supabase.from('notes_chunks').delete().eq('note_id', id);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from('notes_chunks').insert(rows);
  if (insertError) throw new Error(insertError.message);

  return { note, chunkCount: rows.length };
}

module.exports = { updateNote };