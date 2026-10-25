// Sample notes so the app has something to search. Replace with your own later.
module.exports = [
  {
    title: 'About Ask My Notes',
    language: 'en',
    content:
      'Ask My Notes is a retrieval-augmented generation tool. It answers questions ' +
      'using only the notes its owner has saved, and it shows which passage an answer ' +
      'came from. When no saved note is relevant to a question, it refuses to answer ' +
      'instead of guessing.',
  },
  {
    title: 'How notes are stored',
    language: 'en',
    content:
      'Each note is split into overlapping chunks of about two thousand characters. ' +
      'Every chunk is turned into an embedding with gemini-embedding-001 and stored in ' +
      'Supabase Postgres using the pgvector extension. Each note and chunk carries a ' +
      'language tag: en for English, xh for isiXhosa, or mixed.',
  },
];