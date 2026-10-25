require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: config.embeddingModel });
const generationModel = genAI.getGenerativeModel({ model: config.generationModel });

module.exports = { supabase, embeddingModel, generationModel };