require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const { supabase } = require('./lib/clients');
const { answerQuestion } = require('./lib/answer');
const { createNote, LANGUAGES } = require('./lib/notes');
const { updateNote } = require('./lib/update-note');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const MAX_QUESTION = 1000;
const MAX_TITLE = 200;
const MAX_CONTENT = 20000;

// If ADMIN_KEY is set, adding and editing notes needs it. If it is not set
// (for example on your laptop), these routes stay open.
function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_KEY;
  if (!key) return next();
  if (req.get('x-admin-key') === key) return next();
  res.status(401).json({ error: 'Admin key required to add or edit notes.' });
}

function sendError(res, err) {
  console.error(err);
  const message =
    process.env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message;
  res.status(500).json({ error: message });
}

function validateNote(input) {
  const body = input || {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const language = body.language || 'en';

  if (!title || !content) return { error: 'Title and content are required.' };
  if (title.length > MAX_TITLE) return { error: `Title must be ${MAX_TITLE} characters or fewer.` };
  if (content.length > MAX_CONTENT) return { error: `Content must be ${MAX_CONTENT} characters or fewer.` };
  if (!LANGUAGES.includes(language)) return { error: `Language must be one of: ${LANGUAGES.join(', ')}.` };
  return { title, content, language };
}

// --- Ask a question ---
app.post('/ask', async (req, res) => {
  try {
    const body = req.body || {};
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) return res.status(400).json({ error: 'Please enter a question.' });
    if (question.length > MAX_QUESTION) {
      return res.status(400).json({ error: `Question must be ${MAX_QUESTION} characters or fewer.` });
    }
    res.json(await answerQuestion(question));
  } catch (err) {
    sendError(res, err);
  }
});

// --- List notes ---
app.get('/notes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, raw_content, language, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);
    res.json({ notes: data });
  } catch (err) {
    sendError(res, err);
  }
});

// --- Add a note ---
app.post('/notes', requireAdmin, async (req, res) => {
  try {
    const v = validateNote(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    const { note, chunkCount } = await createNote(v.title, v.content, v.language);
    res.json({ success: true, note, chunkCount });
  } catch (err) {
    sendError(res, err);
  }
});

// --- Edit a note ---
app.put('/notes/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Invalid note id.' });
    const v = validateNote(req.body);
    if (v.error) return res.status(400).json({ error: v.error });
    const { note, chunkCount } = await updateNote(id, v.title, v.content, v.language);
    res.json({ success: true, note, chunkCount });
  } catch (err) {
    sendError(res, err);
  }
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running locally on port ${PORT}`);
  });
}

module.exports = app;