<script lang="ts">
  import Shelf from '$lib/components/Shelf.svelte';
  import { enhance } from '$app/forms';
  let { data, form } = $props();
  let searching = $state(false);
  const f = $derived(data.filters);
  const filtered = $derived(Boolean(f.q || f.category || f.author || f.from || f.to));
</script>

<svelte:head><title>Catalog · smartread</title></svelte:head>

<div class="layout">
  <aside>
    <form method="GET" class="filters">
      <label>Keywords <input name="q" value={f.q} placeholder="title, author, subject" /></label>
      <label>Category
        <select name="category" value={f.category}>
          <option value="">Any</option>
          {#each data.categories as c}<option>{c}</option>{/each}
        </select>
      </label>
      <label>Author
        <select name="author" value={f.author}>
          <option value="">Any</option>
          {#each data.authors as a}<option>{a}</option>{/each}
        </select>
      </label>
      <div class="years">
        <label>From year <input name="from" type="number" value={f.from ?? ''} /></label>
        <label>to <input name="to" type="number" value={f.to ?? ''} /></label>
      </div>
      <div class="row">
        <button class="primary">Search</button>
        {#if filtered}<a href="/catalog" class="small">clear</a>{/if}
      </div>
    </form>

    <form
      method="POST"
      action="?/picture"
      enctype="multipart/form-data"
      class="picture ruled"
      use:enhance={() => {
        searching = true;
        return async ({ update }) => {
          await update({ reset: false });
          searching = false;
        };
      }}
    >
      <h2 class="hand">search by picture</h2>
      <p class="small muted">Upload a photo of a cover or a figure from a book. The AI describes it and we find the closest books.</p>
      <input name="image" type="file" accept="image/*" aria-label="Picture to search with" />
      <button disabled={searching}>{searching ? 'Looking…' : 'Find this book'}</button>
    </form>
  </aside>

  <section>
    {#if form?.pictureError}<p class="notice bad">{form.pictureError}</p>{/if}
    {#if form?.picture}
      <div class="picture-results">
        <h2>Closest to your picture</h2>
        <p class="small muted"><span class="hand said">the AI saw:</span> {form.picture.description}</p>
        <Shelf books={form.picture.matches} />
        <ol class="small">
          {#each form.picture.matches as m}
            <li><a href="/book/{m.id}">{m.title}</a> · {m.author} <span class="muted">(similarity {m.score})</span></li>
          {/each}
        </ol>
      </div>
    {/if}
    <h1>{filtered ? 'Search results' : 'The whole catalog'}</h1>
    {#if data.results.length === 0}
      <p class="notice bad">No books match that search. Try fewer words or clear a filter.</p>
    {:else}
      <p class="muted small">{data.results.length} {data.results.length === 1 ? 'book' : 'books'}, oldest first</p>
      <Shelf books={data.results} />
      <table>
        <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Year</th><th>Price</th></tr></thead>
        <tbody>
          {#each data.results as b}
            <tr>
              <td><a href="/book/{b.id}">{b.title}</a></td>
              <td>{b.author}</td>
              <td>{b.category}</td>
              <td>{b.year}</td>
              <td>${b.price.toFixed(2)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>
</div>

<style>
  .layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 3rem; }
  .filters { display: grid; gap: 0.8rem; }
  .filters input, .filters select { width: 100%; margin-top: 0.2rem; }
  .years { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .row { display: flex; gap: 1rem; align-items: baseline; }
  .picture { display: grid; gap: 0.6rem; }
  .picture h2 { font-size: 1.5rem; color: var(--accent); margin: 0; font-weight: 400; }
  .picture input { max-width: 100%; font-size: 0.85rem; }
  .picture button { justify-self: start; }
  .picture-results { border-bottom: 1px solid var(--rule); margin-bottom: 2rem; }
  .said { color: var(--accent); font-size: 1.15rem; }
  @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
</style>
