const config = require('../config');
const { supabase, generationModel } = require('./clients');
const { withRetry } = require('./retry');
const { embedText } = require('./notes');

const REFUSAL = "I don't have relevant information in my notes to answer that.";

// Returns the closest chunks with their similarity scores, best first.
async function retrieve(question) {
  const embedding = await embedText(question);
  const { data, error } = await supabase.rpc('match_notes', {
    query_embedding: embedding,
    match_count: config.matchCount,
  });
  if (error) throw new Error(error.message);
  return data;
}

function buildPrompt(question, chunks) {
  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');
  return `Context:
${context}

Question: ${question}

Instructions: Answer the question using only the context above.
If the answer isn't in the context, say you don't know. Do not guess.
Answer in the same language as the question.
Answer directly and naturally, without prefacing your response with phrases like "Based on the provided context" or "According to the context."`;
}

async function answerQuestion(question) {
  const matches = await retrieve(question);
  const topScore = matches.length > 0 ? matches[0].similarity : null;
  const relevant = matches.filter((m) => m.similarity >= config.similarityThreshold);

  // Nothing close enough: refuse without calling the model.
  if (relevant.length === 0) {
    return { answer: REFUSAL, refused: true, topScore, sources: [] };
  }

  const result = await withRetry(() =>
    generationModel.generateContent(buildPrompt(question, relevant))
  );

  return {
    answer: result.response.text(),
    refused: false,
    topScore,
    sources: relevant.map((m) => ({
      noteId: m.note_id,
      title: m.title,
      language: m.language,
      similarity: m.similarity,
      passage: m.content,
    })),
  };
}

module.exports = { answerQuestion, REFUSAL };