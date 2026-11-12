<script lang="ts">
  import Shelf from '$lib/components/Shelf.svelte';
  import Arrow from '$lib/components/Arrow.svelte';
  let { data } = $props();
  const topNote = $derived(data.top.personalised ? 'picked for you' : 'most read this month');
</script>

<section class="intro">
  <div class="words">
    <h1>Good evening{data.user ? `, ${data.user.name.split(' ')[0]}` : ''}.</h1>
    <p class="lede">
      Old books, a warm lamp, and a shopkeeper who remembers what you liked last time.
      Browse the shelves, ask the clerk a question, or keep a journal of what you're reading.
    </p>
    <p class="note hand">{topNote} <Arrow width={110} /></p>
  </div>
  <div class="top">
    <Shelf books={data.top.books} size="lg" />
    <ol class="top-titles small">
      {#each data.top.books as b}
        <li><a href="/book/{b.id}">{b.title}</a> <span class="muted">· {b.author}</span></li>
      {/each}
    </ol>
  </div>
</section>

<section class="ruled">
  <h2>On the shelves</h2>
  {#each data.shelves as s}
    <div class="section">
      <h3><a href="/catalog?category={encodeURIComponent(s.category)}">{s.category}</a></h3>
      <Shelf books={s.books} />
    </div>
  {/each}
</section>

<style>
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
    gap: 2rem 3rem;
    align-items: end;
  }
  h1 { font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 400; font-style: italic; }
  .lede { max-width: 42ch; font-size: 1.1rem; color: var(--ink-soft); }
  .note {
    font-size: 1.6rem;
    color: var(--accent);
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 1.5rem 0 0;
    transform: rotate(-2deg);
  }
  .top-titles { margin: -1.2rem 0 0; padding-left: 1.4rem; }
  .top-titles li { margin: 0.1rem 0; }
  .section h3 { font-weight: 400; font-style: italic; margin-bottom: 0.6rem; }
  .section h3 a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--brass); }
  @media (max-width: 760px) {
    .intro { grid-template-columns: 1fr; }
  }
</style>
