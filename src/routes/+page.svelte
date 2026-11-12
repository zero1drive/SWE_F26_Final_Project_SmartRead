<script lang="ts">
  import Shelf from '$lib/components/Shelf.svelte';
  import Arrow from '$lib/components/Arrow.svelte';
  let { data } = $props();
  const topNote = $derived(data.top.personalised ? 'picked for you' : 'most read this month');
</script>

<section class="intro">
  <div class="words">
    <h1>{data.greeting},<br /><em>{data.user ? data.user.name.split(' ')[0] : 'reader'}.</em></h1>
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
  <h2><span class="fleuron" aria-hidden="true">❧</span> On the shelves</h2>
  {#each data.shelves as s}
    <div class="section">
      <h3 class="plaque">
        <a href="/catalog?category={encodeURIComponent(s.category)}">{s.category}</a>
        <span class="count">{s.books.length}</span>
      </h3>
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
  h1 { font-size: clamp(2.6rem, 5.5vw, 3.8rem); line-height: 1.02; margin-bottom: 0.4em; }
  h1 em { color: var(--accent); font-style: italic; padding-left: 0.6em; }
  .fleuron { color: var(--brass); font-size: 1.3em; margin-right: 0.15em; }
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
  /* a brass card-holder label, like the ones screwed to library shelves */
  .plaque {
    display: inline-flex;
    align-items: baseline;
    gap: 0.6rem;
    margin: 0 0 0.7rem 18px;
    padding: 0.15rem 0.8rem 0.2rem;
    font-family: var(--display-sc);
    font-size: 1.15rem;
    letter-spacing: 0.08em;
    background: var(--card);
    border: 1px solid var(--brass);
    box-shadow: inset 0 0 0 2px var(--card), inset 0 0 0 3px rgba(176, 138, 62, 0.45);
  }
  .plaque a { color: var(--ink); text-decoration: none; }
  .plaque a:hover { color: var(--accent); }
  .plaque .count { font-family: var(--serif); font-size: 0.75rem; color: var(--ink-soft); letter-spacing: 0; }
  @media (max-width: 760px) {
    .intro { grid-template-columns: 1fr; }
  }
</style>
