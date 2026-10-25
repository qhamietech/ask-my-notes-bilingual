const config = require('./config');
const { supabase } = require('./lib/clients');
const { createNote } = require('./lib/notes');
const { sleep } = require('./lib/retry');
const seedNotes = require('./seed-notes');

async function main() {
  const { count, error } = await supabase
    .from('notes')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);

  if (count > 0) {
    console.log(`The notes table already has ${count} row(s). Not seeding again.`);
    return;
  }

  for (const n of seedNotes) {
    const { note, chunkCount } = await createNote(n.title, n.content, n.language);
    console.log(`Stored note ${note.id} "${note.title}" [${note.language}] as ${chunkCount} chunk(s)`);
    await sleep(config.paceDelayMs);
  }

  console.log('Seeding complete.');
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
