# Ask My Notes

A small retrieval-augmented generation (RAG) app. It answers questions using only the notes saved in it, shows the passage it used, and says so when no note is relevant.

**Live demo:** https://ask-my-notes-psi.vercel.app

Anyone can ask questions and read the notes. Adding or editing notes needs an admin key.

> **Status: working prototype.** Retrieval, refusal and the admin lock work on a handful of hand-checked examples. **There are no accuracy figures yet, and nothing has been tested in isiXhosa yet.** See [What has and hasn't been tested](#what-has-and-hasnt-been-tested).

## Why this project

Many AI tools sound equally sure whether or not they have an answer. The goal here is a tool that refuses when it has nothing relevant, and, as the next stage, is measured separately in English and isiXhosa, with its failures published.

This version is the foundation for that work. Notes already carry a language tag (`en`, `xh`, `mixed`). The bilingual evaluation itself has not been done.

## What it does

- Saves notes, splits them into chunks, and stores an embedding for each chunk.
- Answers a question from the closest chunks only, and returns those passages with their similarity scores.
- Refuses when no chunk is close enough, without calling the language model at all.
- Tags each note and chunk with a language: English, isiXhosa or mixed.
- Protects adding and editing notes with an admin key.

## How it works

1. **Saving a note:** the text is split into chunks of up to 2,000 characters with 200 characters of overlap. Each chunk is embedded with `gemini-embedding-001` (768 dimensions) and stored in Supabase Postgres with the `pgvector` extension.
2. **Asking a question:** the question is embedded the same way, and the `match_notes` SQL function returns the 3 closest chunks by cosine similarity.
3. **Deciding whether to answer:** chunks scoring below the threshold are dropped. If none remain, the app refuses. Otherwise `gemini-2.5-flash` is asked to answer using only the remaining passages.
4. **Showing the evidence:** the response includes the passages used, their note titles, languages and scores.

All model names and the threshold live in [`config.js`](config.js), so a deprecated model or a new threshold is a one-line change.

| Setting | Value | Note |
|---|---|---|
| Embedding model | `gemini-embedding-001`, 768 dimensions | |
| Generation model | `gemini-2.5-flash` | |
| Chunk size / overlap | 2,000 / 200 characters | |
| Chunks retrieved | 3 | |
| Similarity threshold | 0.65 | **Provisional.** Chosen from English-only notes in an earlier prototype and not re-validated. Not measured for isiXhosa. |

## What has and hasn't been tested

**Checked by hand:**
- On a two-note test set, two questions ranked the expected note first (similarity 0.763 and 0.674). An unrelated question about France scored 0.408 at best.
- On the live site, a question about the app itself returned a correct answer with its source passage (similarity 0.763, matching the local test).
- On the live site, "What is the capital of France?" was refused.
- Adding a note without the admin key is refused; adding it with the key works.

**Not tested, and not claimed:**
- Accuracy of any kind. No evaluation set has been run on this version.
- Anything in isiXhosa. The prompt asks the model to answer in the language of the question, but that behaviour has not been tested.
- Whether 0.65 is a good threshold. One question scored 0.408 in a standalone script and 0.465 through the server. The cause is unknown and has not been investigated.
- An earlier prototype's 17-question English evaluation. Its results are not reproduced here and are not part of this project's claims.

## Known limitations

- Vector search only. An earlier prototype had keyword (hybrid) search; this rebuild does not.
- Single-user: there are no accounts, and every note is readable by every visitor. Do not store anything private in it.
- The question endpoint has no rate limiting, so visitors can use up the model's free-tier quota.
- There is no delete button in the app.
- The free tiers of the hosting, database and model services can run out or change.

## Roadmap

Planned, not done:
1. A bilingual (English and isiXhosa) evaluation set written by hand, with answerable, unanswerable and code-switched questions, and a small pilot run reported per language with its failures.
2. Per-language thresholds, based on measured scores.
3. A comparison of retrieval methods per language: vector only, hybrid with keywords, and hybrid with reranking.
4. A check of how stable similarity scores are between runs.
5. A second embedding model, as a comparison.

## Run it yourself

Requirements: Node.js, a Supabase project, and a Gemini API key.

```powershell
npm install
Copy-Item .env.example .env
```

(Windows PowerShell shown. On macOS or Linux, use `cp .env.example .env`.)

1. Fill in `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (the secret key, never the public one) and `GEMINI_API_KEY`. Optionally set `ADMIN_KEY` to lock adding and editing.
2. In the Supabase SQL Editor, run [`sql/001_schema.sql`](sql/001_schema.sql).
3. Check the setup, load two sample notes, and start the server:

```
node check-setup.js
node seed.js
node server.js
```

Then open http://localhost:3000. The server does not reload on changes: stop it with Ctrl+C and start it again after each edit.

## Project layout

```
config.js           models, threshold, retry settings
server.js           Express routes: /ask, /notes
lib/answer.js       retrieval, refusal and answer generation
lib/notes.js        chunking, embedding and saving notes
lib/update-note.js  editing a note
lib/clients.js      Supabase and Gemini clients
lib/retry.js        retry with backoff for rate limits
lib/text.js         chunker
public/index.html   the web page
sql/001_schema.sql  database schema and match_notes function
seed.js             loads sample notes
check-setup.js      checks the environment and connections
smoke-test.js       prints raw match scores for three questions
```

## Lessons carried over from an earlier prototype

- Models get deprecated and free-tier quotas run out, so model names live in config.
- Two overloads of one SQL function caused an "ambiguous function" error, so `match_notes` has exactly one signature.
- Inline `onclick` attributes broke on multi-line note text, so the page uses `data-*` attributes and event listeners.
- The first version's database was lost, so the full schema now lives in this repository.

Built by Qhamisa Tobie.