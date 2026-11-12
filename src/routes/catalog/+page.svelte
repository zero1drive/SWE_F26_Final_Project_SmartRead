<script lang="ts">
  import Shelf from '$lib/components/Shelf.svelte';
  let { data, form } = $props();
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

    <!-- PICTURE_SEARCH -->
  </aside>

  <section>
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
  @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
</style>
