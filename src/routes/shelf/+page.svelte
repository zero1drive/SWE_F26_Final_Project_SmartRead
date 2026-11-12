<script lang="ts">
  // Bookshelf and reading journal (UC-18). Members' shelves save to their account;
  // visitors' shelves live in sessionStorage and vanish when the tab closes.
  import { onMount } from 'svelte';
  import { deserialize } from '$app/forms';
  import { page } from '$app/state';

  type Where = 'want' | 'reading' | 'finished';
  type Entry = { id: string; at: string; bookId: string; text: string; question?: string };
  type ShelfData = { books: Record<string, Where>; journal: Entry[] };

  let { data } = $props();
  const KEY = 'smartread-visitor-shelf';
  const member = $derived(data.saved !== null);
  const names: Record<Where, string> = { want: 'Want to read', reading: 'Reading', finished: 'Finished' };

  // svelte-ignore state_referenced_locally
  let shelf = $state<ShelfData>(structuredClone(data.saved ?? { books: {}, journal: [] }));
  let status = $state<{ text: string; bad?: boolean } | null>(null);
  let addId = $state('');
  let addWhere = $state<Where>('want');
  let draft = $state({ id: '', bookId: '', text: '' });
  let asking = $state('');

  const byId = $derived(new Map(data.books.map((b) => [b.id, b])));
  const onShelf = (w: Where) => Object.entries(shelf.books).filter(([, x]) => x === w).map(([id]) => byId.get(id)!).filter(Boolean);
  const shelfBooks = $derived(Object.keys(shelf.books).map((id) => byId.get(id)!).filter(Boolean));
  const journal = $derived([...shelf.journal].sort((a, b) => b.at.localeCompare(a.at)));

  onMount(() => {
    if (!member) {
      try {
        const stored = sessionStorage.getItem(KEY);
        if (stored) shelf = JSON.parse(stored);
      } catch {
        /* storage blocked: the shelf still works until you leave the page */
      }
    }
    const add = page.url.searchParams.get('add');
    if (add && byId.has(add) && !shelf.books[add]) {
      shelf.books[add] = 'want';
      save(`Added "${byId.get(add)!.title}" to Want to read.`);
    }
  });

  async function post(action: string, fields: Record<string, string>) {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    const res = await fetch(`?/${action}`, { method: 'POST', body, headers: { 'x-sveltekit-action': 'true' } });
    return deserialize(await res.text());
  }

  async function save(message: string) {
    if (!member) {
      try {
        sessionStorage.setItem(KEY, JSON.stringify(shelf));
      } catch {
        /* ignore */
      }
      status = { text: message };
      return;
    }
    const r = await post('save', { shelf: JSON.stringify(shelf) });
    status = r.type === 'success' ? { text: message } : { text: (r.type === 'failure' && (r.data?.error as string)) || 'Could not save.', bad: true };
  }

  function addBook(e: SubmitEvent) {
    e.preventDefault();
    if (!addId) return (status = { text: 'Choose a book to add.', bad: true });
    shelf.books[addId] = addWhere;
    save(`Put "${byId.get(addId)!.title}" on ${names[addWhere]}.`);
    addId = '';
  }

  function move(id: string, to: Where | 'remove') {
    const title = byId.get(id)!.title;
    if (to === 'remove') {
      delete shelf.books[id];
      save(`Took "${title}" off your shelf.`);
    } else {
      shelf.books[id] = to;
      save(`Moved "${title}" to ${names[to]}.`);
    }
  }

  function saveEntry(e: SubmitEvent) {
    e.preventDefault();
    const text = draft.text.trim();
    if (!draft.bookId) return (status = { text: 'Choose which book this entry is about.', bad: true });
    if (!text) return (status = { text: 'Write something before saving.', bad: true });
    if (draft.id) {
      const entry = shelf.journal.find((j) => j.id === draft.id);
      if (entry) Object.assign(entry, { text, bookId: draft.bookId, question: entry.text === text ? entry.question : undefined });
    } else {
      shelf.journal.push({ id: crypto.randomUUID().slice(0, 8), at: new Date().toISOString(), bookId: draft.bookId, text });
    }
    save(draft.id ? 'Entry updated.' : 'Entry saved.');
    draft = { id: '', bookId: draft.bookId, text: '' };
  }

  function edit(entry: Entry) {
    draft = { id: entry.id, bookId: entry.bookId, text: entry.text };
    document.getElementById('entry-text')?.focus();
  }

  function remove(entry: Entry) {
    shelf.journal = shelf.journal.filter((j) => j.id !== entry.id);
    save('Entry deleted.');
  }

  async function reflect(entry: Entry) {
    asking = entry.id;
    status = null;
    const r = await post('reflect', { text: entry.text, title: byId.get(entry.bookId)?.title ?? '' });
    asking = '';
    if (r.type === 'success') {
      const target = shelf.journal.find((j) => j.id === entry.id);
      if (target) target.question = String(r.data?.question ?? '');
      save('Here is a question to think about. It is saved privately with your entry.');
    } else {
      status = { text: (r.type === 'failure' && (r.data?.error as string)) || 'Could not get a question right now.', bad: true };
    }
  }
</script>

<svelte:head><title>My shelf · smartread</title></svelte:head>

<h1>My shelf</h1>
{#if !member}
  <p class="notice bad">
    You're browsing as a visitor, so this shelf and journal live only in this browser tab and <strong>won't be kept</strong>
    after you close it. <a href="/login">Log in</a> to save them to an account.
  </p>
{:else}
  <p class="muted">Saved to your account. Nothing here is ever made public.</p>
{/if}
{#if status}<p class="notice" class:bad={status.bad} role="status">{status.text}</p>{/if}

<form class="add" onsubmit={addBook}>
  <label>Add a book
    <select bind:value={addId}>
      <option value="">Choose a book…</option>
      {#each data.books as b}<option value={b.id} disabled={!!shelf.books[b.id]}>{b.title}</option>{/each}
    </select>
  </label>
  <label>to
    <select bind:value={addWhere}>
      {#each Object.entries(names) as [k, n]}<option value={k}>{n}</option>{/each}
    </select>
  </label>
  <button>Add</button>
</form>

<div class="shelves">
  {#each Object.keys(names) as w}
    {@const books = onShelf(w as Where)}
    <section class="shelf">
      <h2 class="hand">{names[w as Where].toLowerCase()}</h2>
      <ul class="row">
        {#each books as b (b.id)}
          <li>
            <a href="/book/{b.id}"><img src={b.cover} alt="Cover of {b.title}" /></a>
            <select aria-label="Move {b.title}" value={w} onchange={(e) => move(b.id, e.currentTarget.value as Where | 'remove')}>
              {#each Object.entries(names) as [k, n]}<option value={k}>{n}</option>{/each}
              <option value="remove">Remove</option>
            </select>
          </li>
        {:else}
          <li class="empty muted small">nothing here yet</li>
        {/each}
      </ul>
      <div class="plank" aria-hidden="true"></div>
    </section>
  {/each}
</div>

<section class="ruled journal">
  <div class="write">
    <h2>Reading journal</h2>
    <form onsubmit={saveEntry}>
      <label>Book
        <select bind:value={draft.bookId}>
          <option value="">Choose a book on your shelf…</option>
          {#each shelfBooks as b}<option value={b.id}>{b.title}</option>{/each}
        </select>
      </label>
      <label>{draft.id ? 'Edit entry' : 'New entry'}
        <textarea id="entry-text" rows="6" bind:value={draft.text} placeholder="What struck you? What do you think will happen?"></textarea>
      </label>
      <div class="buttons">
        <button class="primary">{draft.id ? 'Save changes' : 'Save entry'}</button>
        {#if draft.id}<button type="button" onclick={() => (draft = { id: '', bookId: '', text: '' })}>Cancel</button>{/if}
      </div>
      {#if shelfBooks.length === 0}<p class="small muted">Put a book on your shelf first, then write about it here.</p>{/if}
    </form>
  </div>

  <ol class="entries">
    {#each journal as j (j.id)}
      <li>
        <p class="meta small muted">
          <strong>{byId.get(j.bookId)?.title}</strong> · {new Date(j.at).toLocaleDateString()}
        </p>
        <p class="text">{j.text}</p>
        {#if j.question}
          <p class="question"><span class="hand">think about:</span> {j.question}</p>
        {/if}
        <div class="actions small">
          <button onclick={() => reflect(j)} disabled={asking === j.id}>
            {asking === j.id ? 'Thinking…' : j.question ? 'Ask another question' : 'Ask for a reflection question'}
          </button>
          <button class="link" onclick={() => edit(j)}>edit</button>
          <button class="link" onclick={() => remove(j)}>delete</button>
        </div>
      </li>
    {:else}
      <li class="muted">No entries yet.</li>
    {/each}
  </ol>
</section>

<style>
  .add { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin: 1.5rem 0 2rem; }
  .add select { margin-top: 0.2rem; max-width: 70vw; }
  .shelves { display: grid; gap: 1.5rem; }
  .shelf h2 { font-weight: 400; font-size: 1.6rem; color: var(--accent); margin: 0 0 0.3rem; }
  .row { list-style: none; margin: 0; padding: 0 16px; display: flex; gap: 14px; align-items: flex-end; overflow-x: auto; min-height: 150px; }
  .row li { display: grid; gap: 4px; flex: 0 0 auto; }
  .row img { height: 130px; aspect-ratio: 2/3; object-fit: cover; display: block; border-radius: 1px 3px 3px 1px; }
  .row select { font-size: 0.75rem; padding: 0.1em 0.2em; width: 87px; }
  .row .empty { align-self: center; font-style: italic; }
  .plank { height: 14px; background: linear-gradient(var(--wood) 0%, #8b5e38 35%, var(--wood) 70%, var(--wood-dark) 100%); border-radius: 2px; box-shadow: 0 5px 0 -2px rgba(43, 33, 25, 0.25); }
  .journal { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 3rem; }
  .write form { display: grid; gap: 0.9rem; }
  .write select, .write textarea { width: 100%; margin-top: 0.2rem; }
  .buttons { display: flex; gap: 0.6rem; }
  .entries { list-style: none; padding: 0; margin: 0; }
  .entries li { border-bottom: 1px dashed var(--rule); padding: 0.9rem 0; }
  .entries .text { white-space: pre-wrap; margin: 0.3rem 0; max-width: var(--measure); }
  .question { background: var(--paper-deep); padding: 0.5rem 0.8rem; border-left: 3px solid var(--brass); max-width: var(--measure); }
  .question .hand { color: var(--accent); font-size: 1.2rem; margin-right: 0.3rem; }
  .actions { display: flex; gap: 1rem; align-items: baseline; }
  .actions button { font-size: 0.85rem; padding: 0.25em 0.8em; }
  button.link { border: 0; background: none; padding: 0; text-decoration: underline; color: var(--ink-soft); }
  @media (max-width: 760px) { .journal { grid-template-columns: 1fr; } }
</style>
