require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('./config');

async function main() {
  // 1. Are the three variables present? (values are never printed)
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'GEMINI_API_KEY'];
  for (const name of names) {
    console.log(`${name}:`, process.env[name] ? 'present' : 'MISSING');
  }
  if (names.some((n) => !process.env[n])) {
    console.log('Fix .env first, then run this again.');
    process.exit(1);
  }
  console.log('Supabase host:', new URL(process.env.SUPABASE_URL).host);

  // 2. Do the Supabase address and key work? (needs no tables)
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    console.log('Supabase connection:', res.ok ? 'ok' : `FAIL - HTTP ${res.status}`);
  } catch (err) {
    console.log('Supabase connection: FAIL -', err.message);
  }

  // 3. Does Gemini embed a sentence at the dimension we expect?
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: config.embeddingModel });
    const result = await model.embedContent({
      content: { parts: [{ text: 'Wonke umntu uzalwa ekhululekile.' }] },
      outputDimensionality: config.embeddingDimensions,
    });
    const dims = result.embedding.values.length;
    console.log(
      `Gemini embedding (${config.embeddingModel}):`,
      dims === config.embeddingDimensions ? `ok, ${dims} dimensions` : `UNEXPECTED dimensions = ${dims}`
    );
  } catch (err) {
    console.log('Gemini embedding: FAIL -', err.message);
  }
}

main();