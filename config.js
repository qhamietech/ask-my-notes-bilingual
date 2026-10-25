// All tunable settings live here, so a deprecated model or a new threshold
// is a one-line change instead of a hunt through every file.

module.exports = {
  // Models, kept as in the original project.
  embeddingModel: 'gemini-embedding-001',
  generationModel: 'gemini-2.5-flash',
  embeddingDimensions: 768,

  // Retrieval. PROVISIONAL: 0.65 was chosen from logged scores on English-only
  // notes. It has NOT been measured for isiXhosa. Re-measure per language.
  similarityThreshold: 0.65,
  matchCount: 3,

  // Free-tier rate-limit handling
  retryAttempts: 3,
  retryDelayMs: 20000,
  paceDelayMs: 5000,
};